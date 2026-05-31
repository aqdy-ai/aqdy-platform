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
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
