import {
  Stack,
  StackProps,
  CfnOutput,
  aws_ec2 as ec2,
  aws_ecs as ecs,

  aws_elasticloadbalancingv2 as elbv2,
  aws_secretsmanager as secretsmanager,
  aws_iam as iam,
  aws_logs as logs,
  RemovalPolicy,
  Duration,
} from "aws-cdk-lib";
import { Construct } from "constructs";

const REPO_OWNER = "aqdy-ai";
const REPO_NAME = "aqdy-platform";
const CLUSTER_NAME = "aqdy-staging";
const BACKEND_IMAGE = `ghcr.io/${REPO_OWNER}/${REPO_NAME}/aqdy-platform-backend:develop`;
const FRONTEND_IMAGE = `ghcr.io/${REPO_OWNER}/${REPO_NAME}/aqdy-platform-frontend:develop`;

export class AqdyPlatformStagingStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // ── VPC ──
    const vpc = ec2.Vpc.fromLookup(this, "Vpc", { isDefault: true });

    // ── Secrets Manager (Doppler token) ──
    const dopplerTokenSecret = new secretsmanager.Secret(
      this,
      "DopplerToken",
      {
        secretName: "doppler/aqdy-staging",
        description:
          "Doppler service token for aqdy-platform staging environment",
        generateSecretString: {
          secretStringTemplate: JSON.stringify({
            DOPPLER_TOKEN: "PLACEHOLDER_REPLACE_WITH_REAL_TOKEN",
          }),
          generateStringKey: "placeholder",
          excludePunctuation: true,
        },
      }
    );

    // ── IAM Roles ──
    const executionRole = new iam.Role(this, "EcsExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
      ],
    });
    dopplerTokenSecret.grantRead(executionRole);

    const taskRole = new iam.Role(this, "EcsTaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    // ── Security Groups ──
    const albSg = new ec2.SecurityGroup(this, "AlbSecurityGroup", {
      vpc,
      description: "ALB security group",
      allowAllOutbound: true,
    });
    albSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "Allow HTTP from anywhere"
    );

    const backendSg = new ec2.SecurityGroup(this, "BackendSecurityGroup", {
      vpc,
      description: "Backend ECS security group",
      allowAllOutbound: true,
    });

    const frontendSg = new ec2.SecurityGroup(this, "FrontendSecurityGroup", {
      vpc,
      description: "Frontend ECS security group",
      allowAllOutbound: true,
    });

    // ── ECS Cluster ──
    const cluster = new ecs.Cluster(this, "AqdyCluster", {
      clusterName: CLUSTER_NAME,
      vpc,
      enableFargateCapacityProviders: true,
    });

    // ── CloudWatch Log Groups ──
    const backendLogGroup = new logs.LogGroup(this, "BackendLogGroup", {
      logGroupName: `/ecs/${CLUSTER_NAME}/backend`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const frontendLogGroup = new logs.LogGroup(this, "FrontendLogGroup", {
      logGroupName: `/ecs/${CLUSTER_NAME}/frontend`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // ── Backend Task Definition ──
    const backendTaskDef = new ecs.FargateTaskDefinition(
      this,
      "BackendTaskDefinition",
      {
        family: "aqdy-platform-backend-staging",
        cpu: 512,
        memoryLimitMiB: 1024,
        executionRole,
        taskRole,
      }
    );

    backendTaskDef.addContainer("BackendContainer", {
      image: ecs.ContainerImage.fromRegistry(BACKEND_IMAGE),
      containerName: "backend",
      portMappings: [{ containerPort: 3000 }],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "backend",
        logGroup: backendLogGroup,
      }),
      environment: {
        NODE_ENV: "production",
        DOPPLER_PROJECT: "backend",
        DOPPLER_CONFIG: "staging",
      },
      secrets: {
        DOPPLER_TOKEN: ecs.Secret.fromSecretsManager(dopplerTokenSecret, "DOPPLER_TOKEN"),
      },
      healthCheck: {
        command: [
          "CMD-SHELL",
          "node -e \"require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))\"",
        ],
        interval: Duration.seconds(30),
        timeout: Duration.seconds(10),
        startPeriod: Duration.seconds(60),
        retries: 3,
      },
    });

    // ── Frontend Task Definition ──
    const frontendTaskDef = new ecs.FargateTaskDefinition(
      this,
      "FrontendTaskDefinition",
      {
        family: "aqdy-platform-frontend-staging",
        cpu: 256,
        memoryLimitMiB: 512,
        executionRole,
      }
    );

    frontendTaskDef.addContainer("FrontendContainer", {
      image: ecs.ContainerImage.fromRegistry(FRONTEND_IMAGE),
      containerName: "frontend",
      portMappings: [{ containerPort: 80 }],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "frontend",
        logGroup: frontendLogGroup,
      }),
      healthCheck: {
        command: [
          "CMD-SHELL",
          "curl -f http://localhost/ || exit 1",
        ],
        interval: Duration.seconds(30),
        timeout: Duration.seconds(10),
        startPeriod: Duration.seconds(15),
        retries: 3,
      },
    });

    // ── Application Load Balancer ──
    const alb = new elbv2.ApplicationLoadBalancer(this, "Alb", {
      vpc,
      internetFacing: true,
      loadBalancerName: `${CLUSTER_NAME}-alb`,
      securityGroup: albSg,
    });

    // ── ALB Listener (HTTP) ──
    const listener = alb.addListener("HttpListener", {
      port: 80,
      open: true,
    });

    // ── Target Groups ──
    const backendTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      "BackendTargetGroup",
      {
        vpc,
        port: 3000,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targetType: elbv2.TargetType.IP,
        healthCheck: {
          path: "/api/health",
          healthyHttpCodes: "200",
          interval: Duration.seconds(30),
          timeout: Duration.seconds(10),
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 3,
        },
      }
    );

    const frontendTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      "FrontendTargetGroup",
      {
        vpc,
        port: 80,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targetType: elbv2.TargetType.IP,
        healthCheck: {
          path: "/",
          healthyHttpCodes: "200",
          interval: Duration.seconds(30),
          timeout: Duration.seconds(10),
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 3,
        },
      }
    );

    // ── Listener Rules (path-based routing) ──
    listener.addAction("BackendRule", {
      priority: 1,
      conditions: [elbv2.ListenerCondition.pathPatterns(["/api/*"])],
      action: elbv2.ListenerAction.forward([backendTargetGroup]),
    });

    listener.addAction("DefaultAction", {
      action: elbv2.ListenerAction.forward([frontendTargetGroup]),
    });

    // ── ECS Services ──
    const backendService = new ecs.FargateService(this, "BackendService", {
      cluster,
      serviceName: "aqdy-platform-backend-staging",
      taskDefinition: backendTaskDef,
      desiredCount: 0,
      assignPublicIp: true,
      securityGroups: [backendSg],
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });
    backendService.attachToApplicationTargetGroup(backendTargetGroup);

    const frontendService = new ecs.FargateService(this, "FrontendService", {
      cluster,
      serviceName: "aqdy-platform-frontend-staging",
      taskDefinition: frontendTaskDef,
      desiredCount: 0,
      assignPublicIp: true,
      securityGroups: [frontendSg],
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });
    frontendService.attachToApplicationTargetGroup(frontendTargetGroup);

    // ── Outputs ──
    new CfnOutput(this, "ClusterName", {
      value: cluster.clusterName,
    });
    new CfnOutput(this, "AlbDnsName", {
      value: alb.loadBalancerDnsName,
    });
    new CfnOutput(this, "StagingUrl", {
      value: `http://${alb.loadBalancerDnsName}`,
    });
    new CfnOutput(this, "BackendTaskDefinitionFamily", {
      value: backendTaskDef.family,
    });
    new CfnOutput(this, "FrontendTaskDefinitionFamily", {
      value: frontendTaskDef.family,
    });
    new CfnOutput(this, "DopplerTokenSecretArn", {
      value: dopplerTokenSecret.secretArn,
    });
    new CfnOutput(this, "BackendServiceName", {
      value: backendService.serviceName,
    });
    new CfnOutput(this, "FrontendServiceName", {
      value: frontendService.serviceName,
    });
  }
}
