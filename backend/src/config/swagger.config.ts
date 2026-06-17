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
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
          description: "Authenticated users must have an accessToken cookie.",
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
          description:
            "No request body required. The refresh token is expected in the httpOnly cookie named 'refreshToken'.",
          properties: {},
        },
        AuthResponse: {
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
        ProfileResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                name: { type: "string" },
                email: { type: "string" },
                plan: { type: "string" },
                memberSince: { type: "string", format: "date-time" },
                lastLogin: { type: "string", format: "date-time" },
              },
            },
            message: { type: "string" },
          },
        },
        UpdateProfileRequest: {
          type: "object",
          properties: {
            name: { type: "string", example: "Ahmed Ali" },
            email: {
              type: "string",
              format: "email",
              example: "ahmed@example.com",
            },
            password: { type: "string", example: "NewStrongPass123!" },
            currentPassword: { type: "string", example: "OldStrongPass123!" },
          },
        },
        SubscriptionResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              required: ["subscription", "usage"],
              properties: {
                subscription: {
                  type: "object",
                  properties: {
                    _id: { type: "string" },
                    planId: { type: "string" },
                    status: { type: "string", example: "active" },
                  },
                  additionalProperties: true,
                },
                usage: {
                  type: "object",
                  required: ["analysesUsed", "analysesAllowed"],
                  properties: {
                    analysesUsed: { type: "number", example: 5 },
                    analysesAllowed: { type: "number", example: 10 },
                    periodStart: { type: "string", format: "date-time" },
                    periodEnd: { type: "string", format: "date-time" },
                    renewalDate: { type: "string", example: "2025-06-21" },
                  },
                },
              },
            },
            message: {
              type: "string",
              example: "Subscription retrieved successfully",
            },
          },
        },
        UpgradeSubscriptionRequest: {
          type: "object",
          required: ["planId"],
          properties: {
            planId: {
              type: "string",
              example: "64abc123def456",
            },
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
        Payment: {
          type: "object",
          properties: {
            _id: { type: "string" },
            amount: { type: "number" },
            currency: { type: "string" },
            status: { type: "string" },
            providerTxId: { type: "string" },
            description: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        PaymentListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                payments: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Payment" },
                },
                pagination: {
                  type: "object",
                  properties: {
                    total: { type: "number" },
                    page: { type: "number" },
                    totalPages: { type: "number" },
                  },
                },
              },
            },
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
        CheckoutSessionRequest: {
          type: "object",
          required: ["planSlug"],
          properties: {
            planSlug: {
              type: "string",
              enum: ["free", "pro", "enterprise"],
              example: "pro",
            },
          },
        },
        CheckoutSessionResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            url: { type: "string", example: "https://checkout.stripe.com/..." },
          },
        },
        ConfirmSessionResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            status: { type: "string", example: "succeeded" },
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
        ContractListItem: {
          type: "object",
          properties: {
            contractId: { type: "string", example: "64abc123def456" },
            filename: { type: "string", example: "employment-contract.pdf" },
            uploadDate: { type: "string", format: "date-time" },
            language: { type: "string", enum: ["ar", "en"] },
            fileSize: { type: "number", example: 2048 },
            status: { type: "string", enum: ["analyzed", "pending", "failed"] },
            riskLevel: {
              type: "string",
              nullable: true,
              enum: ["low", "medium", "high", "critical"],
              example: "high",
            },
            analysisId: {
              type: "string",
              nullable: true,
              example: "64abc789ghi012",
            },
          },
        },
        ContractListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                contracts: {
                  type: "array",
                  items: { $ref: "#/components/schemas/ContractListItem" },
                },
                total: { type: "number", example: 25 },
                page: { type: "number", example: 1 },
                totalPages: { type: "number", example: 3 },
                limit: { type: "number", example: 10 },
              },
            },
            message: {
              type: "string",
              example: "Contract list retrieved successfully",
            },
          },
        },
        AdminStatsResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            period: {
              type: "object",
              properties: {
                month: { type: "string", example: "2026-06" },
                from: { type: "string", format: "date-time" },
                to: { type: "string", format: "date-time" },
              },
            },
            data: {
              type: "object",
              properties: {
                totalAccounts: { type: "integer", example: 150 },
                activeSubscriptions: { type: "integer", example: 42 },
                revenueThisMonth: {
                  type: "object",
                  description:
                    "Revenue totals keyed by currency code (e.g. USD, EGP)",
                  additionalProperties: { type: "number" },
                  example: { USD: 1290.0 },
                },
                analysesThisMonth: { type: "integer", example: 318 },
                creditsConsumedThisMonth: {
                  type: "integer",
                  example: 9450,
                  description:
                    "Sum of credits deducted this month (analysis_deduction + chat_deduction only). Excludes topups and refunds.",
                },
              },
            },
          },
        },
        AdminPaymentItem: {
          type: "object",
          properties: {
            _id: { type: "string", example: "64abc123def456" },
            amount: { type: "number", example: 49.99 },
            currency: { type: "string", example: "USD" },
            status: {
              type: "string",
              enum: ["pending", "succeeded", "failed", "refunded"],
              example: "succeeded",
            },
            provider: { type: "string", example: "stripe" },
            providerTxId: {
              type: "string",
              example: "pi_3OxampleStripe",
            },
            description: {
              type: "string",
              nullable: true,
              example: "Premium plan subscription",
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            userId: {
              type: "object",
              description: "Populated user reference",
              properties: {
                _id: { type: "string" },
                name: { type: "string", example: "Ahmed Ali" },
                email: {
                  type: "string",
                  format: "email",
                  example: "ahmed@example.com",
                },
                planSlug: {
                  type: "string",
                  enum: ["free", "pro", "enterprise"],
                  example: "pro",
                },
                status: {
                  type: "string",
                  enum: ["active", "suspended", "deleted"],
                  example: "active",
                },
              },
            },
          },
        },
        AdminPaymentsListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            pagination: {
              type: "object",
              properties: {
                page: { type: "integer", example: 1 },
                pageSize: { type: "integer", example: 20 },
                total: { type: "integer", example: 84 },
                totalPages: { type: "integer", example: 5 },
                hasNext: { type: "boolean", example: true },
                hasPrev: { type: "boolean", example: false },
              },
            },
            filters: {
              type: "object",
              properties: {
                status: { type: "string", nullable: true },
                userId: { type: "string", nullable: true },
                dateFrom: { type: "string", nullable: true },
                dateTo: { type: "string", nullable: true },
              },
            },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/AdminPaymentItem" },
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
      "/api/payments/checkout": {
        post: {
          tags: ["Payments"],
          summary: "Create a Stripe Checkout session",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CheckoutSessionRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Session created",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/CheckoutSessionResponse",
                  },
                },
              },
            },
            400: { description: "Invalid plan or user state" },
            401: { description: "Unauthorized" },
            404: { description: "User or Plan not found" },
          },
        },
      },
      "/api/payments/success": {
        get: {
          tags: ["Payments"],
          summary: "Stripe success callback",
          parameters: [
            {
              name: "session_id",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Session confirmed",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ConfirmSessionResponse",
                  },
                },
              },
            },
          },
        },
      },
      "/api/payments/cancel": {
        get: {
          tags: ["Payments"],
          summary: "Stripe cancel callback",
          responses: {
            200: {
              description: "Payment cancelled message",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiResponse" },
                },
              },
            },
          },
        },
      },
      "/api/payments/webhook": {
        post: {
          tags: ["Payments"],
          summary: "Stripe Webhook handler",
          description:
            "Receives asynchronous events from Stripe (raw body required)",
          responses: {
            200: {
              description: "Webhook received",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      received: { type: "boolean", example: true },
                    },
                  },
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
              description:
                "User registered successfully. Access and refresh tokens are set in httpOnly cookies named 'accessToken' and 'refreshToken'.",
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
              description:
                "Login successful. Access and refresh tokens are set in httpOnly cookies named 'accessToken' and 'refreshToken'.",
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
          summary: "Logout (clear refresh token from httpOnly cookie)",
          responses: {
            200: {
              description: "Logout successful.",
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
          summary: "Refresh JWT (reads refresh token from httpOnly cookie)",
          responses: {
            200: {
              description: "Token refreshed successfully.",
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
          summary:
            "Fetch authenticated user profile (requires accessToken cookie)",
          responses: {
            200: {
              description:
                "Authenticated user information (reads from httpOnly accessToken cookie)",
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
      "/api/account/profile": {
        get: {
          tags: ["Account"],
          summary: "Fetch user profile",

          responses: {
            200: {
              description: "Profile information",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ProfileResponse" },
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
            404: { description: "User not found" },
          },
        },
        patch: {
          tags: ["Account"],
          summary: "Update user profile",

          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateProfileRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Profile updated successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UserResponse" },
                },
              },
            },
            400: { description: "Validation error" },
            401: { description: "Authentication required" },
            403: { description: "Invalid current password" },
            404: { description: "User not found" },
            409: { description: "Email already in use" },
          },
        },
      },
      "/api/account": {
        delete: {
          tags: ["Account"],
          summary: "Delete user account (soft delete)",

          responses: {
            200: {
              description: "Account deleted successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiResponse" },
                },
              },
            },
            401: { description: "Authentication required" },
            404: { description: "User not found or already deleted" },
          },
        },
      },
      "/api/account/payments": {
        get: {
          tags: ["Account Payments"],
          summary: "Get paginated payment history for current user",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 10 },
            },
          ],
          responses: {
            200: {
              description: "Payment history retrieved",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PaymentListResponse" },
                },
              },
            },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/account/payments/{id}": {
        get: {
          tags: ["Account Payments"],
          summary: "Get single payment detail",
          security: [{ cookieAuth: [] }],
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
              description: "Payment details",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: { $ref: "#/components/schemas/Payment" },
                    },
                  },
                },
              },
            },
            404: { description: "Payment not found" },
          },
        },
      },
      "/api/account/payments/{id}/invoice": {
        get: {
          tags: ["Account Payments"],
          summary: "Download PDF invoice",
          security: [{ cookieAuth: [] }],
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
              description: "PDF invoice file",
              content: {
                "application/pdf": {
                  schema: { type: "string", format: "binary" },
                },
              },
            },
            404: { description: "Payment not found" },
          },
        },
      },
      "/api/account/subscription": {
        get: {
          tags: ["Account"],
          summary:
            "Get current user subscription (requires accessToken cookie)",
          security: [{ cookieAuth: [] }],
          responses: {
            200: {
              description: "Subscription retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/SubscriptionResponse",
                  },
                },
              },
            },
            401: {
              description: "Authentication required",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                },
              },
            },
          },
        },
      },
      "/api/account/subscription/upgrade": {
        post: {
          tags: ["Account"],
          summary: "Upgrade user subscription (requires accessToken cookie)",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UpgradeSubscriptionRequest",
                },
              },
            },
          },
          responses: {
            200: {
              description: "Subscription upgraded successfully",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ApiResponse",
                  },
                },
              },
            },
            400: {
              description: "Invalid plan",
            },
            401: {
              description: "Authentication required",
            },
          },
        },
      },
      "/api/account/subscription/cancel": {
        post: {
          tags: ["Account"],
          summary: "Cancel current subscription (requires accessToken cookie)",
          security: [{ cookieAuth: [] }],
          responses: {
            200: {
              description: "Subscription cancelled successfully",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ApiResponse",
                  },
                },
              },
            },
            401: {
              description: "Authentication required",
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
      "/api/contracts/{contractId}/clauses/{clauseIndexStr}/chat": {
        post: {
          tags: ["Contracts"],
          summary:
            "Have a focused AI conversation about a specific contract clause",
          parameters: [
            {
              name: "contractId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "The 24-character contract ID",
            },
            {
              name: "clauseIndexStr",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "The 0-based index of the clause in the analysis",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["message"],
                  properties: {
                    message: {
                      type: "string",
                      example: "What does this indemnity clause cover?",
                    },
                    history: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          role: { type: "string", enum: ["user", "assistant"] },
                          content: { type: "string" },
                        },
                      },
                      example: [],
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description:
                "Streamed Server-Sent Events (SSE) response containing the AI answer chunks",
              content: {
                "text/event-stream": {
                  schema: {
                    type: "string",
                    example:
                      'data: {"text":"According"}\n\ndata: {"text":" to"}\n\ndata: [DONE]\n\n',
                  },
                },
              },
            },
            400: { description: "Invalid input or index format" },
            402: { description: "Insufficient credits available" },
            429: {
              description:
                "Rate limit exceeded (Max 20 messages per clause per 24 hours)",
            },
            404: { description: "Contract analysis or clause index not found" },
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
                enum: ["free", "pro", "enterprise"],
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
                      enum: ["free", "pro", "enterprise"],
                    },
                    planSlug: {
                      type: "string",
                      enum: ["free", "pro", "enterprise"],
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
      "/api/account/contracts": {
        get: {
          tags: ["Contract History"],
          summary: "Get paginated list of user contracts",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
              description: "Page number",
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 10, maximum: 50 },
              description: "Items per page (max 50)",
            },
            {
              name: "uploadedAfter",
              in: "query",
              schema: { type: "string", format: "date-time" },
              description: "Filter contracts uploaded after this date",
            },
            {
              name: "uploadedBefore",
              in: "query",
              schema: { type: "string", format: "date-time" },
              description: "Filter contracts uploaded before this date",
            },
            {
              name: "status",
              in: "query",
              schema: {
                type: "string",
                enum: ["analyzed", "pending", "failed"],
              },
              description: "Filter by analysis status",
            },
            {
              name: "filename",
              in: "query",
              schema: { type: "string" },
              description: "Partial filename search (case-insensitive)",
            },
            {
              name: "sortBy",
              in: "query",
              schema: {
                type: "string",
                enum: ["uploadedAt", "analyzedAt", "riskLevel"],
                default: "uploadedAt",
              },
              description: "Sort field",
            },
            {
              name: "sortOrder",
              in: "query",
              schema: {
                type: "string",
                enum: ["asc", "desc"],
                default: "desc",
              },
              description: "Sort order",
            },
          ],
          responses: {
            200: {
              description: "Contract list retrieved successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ContractListResponse" },
                },
              },
            },
            401: { description: "Authentication required" },
            500: { description: "Server error" },
          },
        },
      },
      "/api/account/contracts/{contractId}": {
        get: {
          tags: ["Contract History"],
          summary: "Get full contract detail with latest analysis",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "contractId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Contract ID",
            },
          ],
          responses: {
            200: {
              description: "Contract detail retrieved successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiResponse" },
                },
              },
            },
            401: { description: "Authentication required" },
            403: {
              description: "Access denied - you do not own this contract",
            },
            404: { description: "Contract not found" },
            500: { description: "Server error" },
          },
        },
        delete: {
          tags: ["Contract History"],
          summary: "Soft delete a contract (hides from list, keeps in DB)",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "contractId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Contract ID",
            },
          ],
          responses: {
            200: {
              description: "Contract deleted successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiResponse" },
                },
              },
            },
            401: { description: "Authentication required" },
            403: {
              description: "Access denied - you do not own this contract",
            },
            404: { description: "Contract not found or already deleted" },
            500: { description: "Server error" },
          },
        },
      },
      "/api/admin/stats": {
        get: {
          tags: ["Admin"],
          summary: "Get platform-wide stats for the current calendar month",
          description:
            "Returns total accounts, active subscriptions, revenue by currency, analyses run, and credits consumed (deduction events only). Requires admin role.",
          security: [{ cookieAuth: [] }],
          responses: {
            200: {
              description: "Stats retrieved successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AdminStatsResponse" },
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
            403: {
              description: "Admin role required",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            500: { description: "Server error" },
          },
        },
      },
      "/api/admin/payments": {
        get: {
          tags: ["Admin"],
          summary: "List all payments across all accounts (paginated)",
          description:
            "Returns a paginated, filterable list of all payments. Each payment includes a populated user sub-document. Requires admin role.",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "status",
              in: "query",
              schema: {
                type: "string",
                enum: ["pending", "succeeded", "failed", "refunded"],
              },
              description: "Filter by payment status",
            },
            {
              name: "userId",
              in: "query",
              schema: { type: "string" },
              description: "Filter by user MongoDB ObjectId",
            },
            {
              name: "dateFrom",
              in: "query",
              schema: { type: "string", format: "date-time" },
              description: "Filter payments created on or after this ISO date",
            },
            {
              name: "dateTo",
              in: "query",
              schema: { type: "string", format: "date-time" },
              description: "Filter payments created on or before this ISO date",
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1, minimum: 1 },
              description: "Page number",
            },
            {
              name: "pageSize",
              in: "query",
              schema: {
                type: "integer",
                default: 20,
                minimum: 1,
                maximum: 100,
              },
              description: "Results per page (max 100)",
            },
          ],
          responses: {
            200: {
              description: "Payments list retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AdminPaymentsListResponse",
                  },
                },
              },
            },
            400: {
              description: "Invalid filter parameter",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
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
            403: {
              description: "Admin role required",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            500: { description: "Server error" },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
