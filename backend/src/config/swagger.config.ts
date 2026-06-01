import dotenv from "dotenv";
import swaggerJsdoc from "swagger-jsdoc";

dotenv.config();

const swaggerServerUrl = `http://localhost:${process.env.PORT || "3000"}`;

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Aqdy API",
      version: "1.0.0",
      description: "AI-powered contract review API for MENA region",
    },
    servers: [{ url: swaggerServerUrl, description: "Development server" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Contract: {
          type: "object",
          properties: {
            _id: { type: "string", example: "64abc123def456" },
            filename: { type: "string", example: "contract.pdf" },
            language: { type: "string", enum: ["ar", "en"] },
            text: { type: "string", example: "Contract text..." },
            userId: { type: "string", example: "user_123" },
            fileSize: { type: "number", example: 1024 },
            uploadedAt: { type: "string", format: "date-time" },
          },
        },
        UploadContractRequest: {
          type: "object",
          required: ["filename", "language", "text", "userId", "fileSize"],
          properties: {
            filename: { type: "string", example: "contract.pdf" },
            language: { type: "string", enum: ["ar", "en"] },
            text: { type: "string", example: "Contract text..." },
            userId: { type: "string", example: "user_123" },
            fileSize: { type: "number", example: 1024 },
          },
        },
        AnalyzeRequest: {
          type: "object",
          required: ["contractId", "userId"],
          properties: {
            contractId: { type: "string", example: "64abc123def456" },
            userId: { type: "string", example: "user_123" },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string", example: "Ahmed Ali" },
            email: {
              type: "string",
              format: "email",
              example: "ahmed@example.com",
            },
            password: { type: "string", example: "StrongPass123!" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "ahmed@example.com",
            },
            password: { type: "string", example: "StrongPass123!" },
          },
        },
        RefreshRequest: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: {
              type: "string",
              example: "refresh_token_example_123",
            },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                token: { type: "string" },
                refreshToken: { type: "string" },
                user: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    email: { type: "string" },
                    name: { type: "string" },
                    role: { type: "string" },
                    plan: { type: "string" },
                  },
                },
              },
            },
            message: { type: "string" },
          },
        },
        UserResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                user: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    email: { type: "string" },
                    name: { type: "string" },
                    role: { type: "string" },
                    plan: { type: "string" },
                  },
                },
              },
            },
            message: { type: "string" },
          },
        },
        ClauseAnalysis: {
          type: "object",
          properties: {
            clauseText: { type: "string" },
            clauseType: { type: "string", example: "liability" },
            riskLevel: {
              type: "string",
              enum: ["low", "medium", "high", "critical", "unknown"],
            },
            confidence: { type: "number", example: 0.95 },
            classificationDurationMs: { type: "number", example: 420 },
            explanation: {
              type: "object",
              properties: {
                ar: { type: "string" },
                en: { type: "string" },
              },
            },
            sourceFromKB: { type: "string", nullable: true },
            redlineSuggestion: { type: "string" },
            redlineDurationMs: { type: "number", example: 550 },
          },
        },
        RiskAnalysis: {
          type: "object",
          properties: {
            _id: { type: "string" },
            contractId: { type: "string" },
            userId: { type: "string" },
            executiveSummary: {
              type: "object",
              properties: {
                overallRisk: {
                  type: "string",
                  enum: ["low", "medium", "high", "critical"],
                },
                totalClauses: { type: "number" },
                riskyClausesCount: { type: "number" },
                summary: {
                  type: "object",
                  properties: {
                    ar: { type: "string" },
                    en: { type: "string" },
                  },
                },
              },
            },
            clauseAnalysis: {
              type: "array",
              items: { $ref: "#/components/schemas/ClauseAnalysis" },
            },
            analysisDuration: { type: "number", example: 2300 },
          },
        },
        ApiResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" },
            message: { type: "string" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Error message" },
          },
        },
        Plan: {
          type: "object",
          properties: {
            _id: { type: "string", example: "64abc123def456" },
            name: { type: "string", example: "Pro" },
            slug: { type: "string", example: "pro" },
            price: { type: "number", nullable: true, example: 29 },
            billingCycle: {
              type: "string",
              enum: ["monthly", "annual"],
              example: "monthly",
            },
            features: {
              type: "array",
              items: { type: "string" },
              example: ["100 analyses/month", "Unlimited contracts"],
            },
            analysisLimit: { type: "number", example: 100 },
            storageLimit: { type: "number", example: -1 },
            isActive: { type: "boolean", example: true },
          },
        },
        PlanResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/Plan" },
            message: {
              type: "string",
              example: "Plan details retrieved successfully",
            },
          },
        },
        PlansListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Plan" },
            },
            message: {
              type: "string",
              example: "Active plans retrieved successfully",
            },
          },
        },
      },
    },
    paths: {
      "/api/health": {
        get: {
          tags: ["Health"],
          summary: "Health check",
          responses: {
            200: { description: "Server is healthy" },
          },
        },
      },
      "/api/plans": {
        get: {
          tags: ["Plans"],
          summary: "Get all active pricing plans",
          responses: {
            200: {
              description: "Active plans retrieved successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PlansListResponse" },
                },
              },
            },
            500: {
              description: "Server error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/plans/{slug}": {
        get: {
          tags: ["Plans"],
          summary: "Get details for a specific plan by slug",
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              schema: { type: "string" },
              example: "pro",
            },
          ],
          responses: {
            200: {
              description: "Plan details retrieved successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PlanResponse" },
                },
              },
            },
            404: {
              description: "Plan not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            500: {
              description: "Server error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/contracts/upload": {
        post: {
          tags: ["Contracts"],
          summary: "Upload a contract",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UploadContractRequest" },
              },
            },
          },
          responses: {
            201: {
              description: "Contract uploaded successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiResponse" },
                },
              },
            },
            400: { description: "Validation error" },
            500: { description: "Server error" },
          },
        },
      },
      "/api/auth/register": {
        post: {
          tags: ["Authentication"],
          summary: "Register a new user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterRequest" },
              },
            },
          },
          responses: {
            201: {
              description: "User registered successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthResponse" },
                },
              },
            },
            400: {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            409: {
              description: "Email already in use",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            500: {
              description: "Server error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Authentication"],
          summary: "Log in with email and password",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Login successful",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthResponse" },
                },
              },
            },
            400: {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            401: {
              description: "Invalid credentials",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            500: {
              description: "Server error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/auth/logout": {
        post: {
          tags: ["Authentication"],
          summary: "Logout a refresh token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RefreshRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Logout successful",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiResponse" },
                },
              },
            },
            400: {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            401: {
              description: "Invalid refresh token",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            500: {
              description: "Server error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/auth/refresh": {
        post: {
          tags: ["Authentication"],
          summary: "Refresh JWT using a valid refresh token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RefreshRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Token refreshed successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthResponse" },
                },
              },
            },
            400: { description: "Validation error" },
            401: { description: "Invalid or expired refresh token" },
            500: { description: "Server error" },
          },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Authentication"],
          summary: "Fetch authenticated user profile",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Authenticated user information",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UserResponse" },
                },
              },
            },
            401: {
              description: "Authentication required",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/contracts/{id}": {
        get: {
          tags: ["Contracts"],
          summary: "Get contract by ID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Contract found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Contract" },
                },
              },
            },
            404: { description: "Contract not found" },
          },
        },
      },
      "/api/analysis/analyze": {
        post: {
          tags: ["Analysis"],
          summary: "Start contract analysis",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AnalyzeRequest" },
              },
            },
          },
          responses: {
            202: {
              description: "Analysis started",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiResponse" },
                },
              },
            },
            400: { description: "Validation error" },
            404: { description: "Contract not found" },
          },
        },
      },
      "/api/analysis/{contractId}": {
        get: {
          tags: ["Analysis"],
          summary: "Get analysis results",
          parameters: [
            {
              name: "contractId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Analysis results",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/RiskAnalysis" },
                },
              },
            },
            404: { description: "Analysis not found" },
          },
        },
      },
      "/api/admin/accounts": {
        get: {
          tags: ["Admin Accounts"],
          summary:
            "Get paginated, filterable, and searchable list of user accounts",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
            {
              name: "pageSize",
              in: "query",
              schema: { type: "integer", default: 20 },
            },
            {
              name: "planSlug",
              in: "query",
              schema: {
                type: "string",
                enum: ["free", "premium", "enterprise"],
              },
            },
            {
              name: "status",
              in: "query",
              schema: { type: "string", enum: ["active", "suspended"] },
            },
            {
              name: "search",
              in: "query",
              schema: { type: "string" },
              description: "Search by email or name",
            },
          ],
          responses: {
            200: {
              description: "List of accounts retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      pagination: {
                        type: "object",
                        properties: {
                          page: { type: "integer" },
                          pageSize: { type: "integer" },
                          total: { type: "integer" },
                          totalPages: { type: "integer" },
                          hasNext: { type: "boolean" },
                          hasPrev: { type: "boolean" },
                        },
                      },
                      data: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            _id: { type: "string" },
                            name: { type: "string" },
                            email: { type: "string" },
                            role: { type: "string" },
                            status: { type: "string" },
                            planSlug: { type: "string" },
                            createdAt: { type: "string", format: "date-time" },
                            updatedAt: { type: "string", format: "date-time" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden" },
          },
        },
      },
      "/api/admin/accounts/{id}": {
        get: {
          tags: ["Admin Accounts"],
          summary:
            "Get full account detail including subscription, usage stats, and recent activity",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Account details retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          user: { type: "object" },
                          subscription: {
                            type: "object",
                            properties: {
                              planSlug: { type: "string" },
                              status: { type: "string" },
                            },
                          },
                          usageStats: {
                            type: "object",
                            properties: {
                              contractsCount: { type: "integer" },
                              totalFileSizeBytes: { type: "integer" },
                            },
                          },
                          recentActivity: {
                            type: "array",
                            items: { type: "object" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { description: "Invalid user ID format" },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden" },
            404: { description: "User not found" },
          },
        },
        patch: {
          tags: ["Admin Accounts"],
          summary: "Update user plan, status, or role",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    plan: {
                      type: "string",
                      enum: ["free", "premium", "enterprise"],
                    },
                    planSlug: {
                      type: "string",
                      enum: ["free", "premium", "enterprise"],
                    },
                    status: { type: "string", enum: ["active", "suspended"] },
                    role: { type: "string", enum: ["admin", "user"] },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "User updated successfully" },
            400: { description: "Invalid payload or user ID format" },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden" },
            404: { description: "User not found" },
          },
        },
        delete: {
          tags: ["Admin Accounts"],
          summary: "Hard delete user account (requires confirmation flag)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["confirm"],
                  properties: {
                    confirm: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "User hard deleted successfully" },
            400: {
              description:
                "Confirmation flag missing or invalid user ID format",
            },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden" },
            404: { description: "User not found" },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
