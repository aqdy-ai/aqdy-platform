#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AqdyPlatformStagingStack } from "../lib/aqdy-platform-stack";

const app = new cdk.App();
new AqdyPlatformStagingStack(app, "AqdyPlatformStaging", {
  env: {
    account: "610489688044",
    region: "eu-north-1",
  },
  description: "Aqdy Platform Staging — ECS Fargate + ALB + Route53",
});
