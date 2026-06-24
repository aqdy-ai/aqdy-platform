import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import request from "supertest";

// ── Mock Setup ────────────────────────────────────────────────────────────────

const mockParsePdf = jest.fn() as jest.Mock<any>;
jest.unstable_mockModule("../../src/services/pdf.service.js", () => ({
  pdfService: { parsePdf: mockParsePdf },
}));

const mockSaveContract = jest.fn() as jest.Mock<any>;
jest.unstable_mockModule("../../src/services/contract.service.js", () => ({
  contractService: { saveContract: mockSaveContract },
}));

const mockLogEvent = jest.fn() as jest.Mock<any>;
jest.unstable_mockModule("../../src/services/auditLog.service.js", () => ({
  auditLogService: { logEvent: mockLogEvent },
  logAdmin: {
    viewLogs: jest.fn().mockResolvedValue(undefined),
  },
  logRole: {
    assign: jest.fn().mockResolvedValue(undefined),
    revoke: jest.fn().mockResolvedValue(undefined),
  },
  logSupport: {
    emailVerify: jest.fn().mockResolvedValue(undefined),
    passwordReset: jest.fn().mockResolvedValue(undefined),
    creditAdjustment: jest.fn().mockResolvedValue(undefined),
  },
  logContent: {
    update: jest.fn().mockResolvedValue(undefined),
  },
  writeLog: jest.fn().mockResolvedValue(undefined),
}));

const mockTriggerAnalysis = jest.fn() as jest.Mock<any>;
jest.unstable_mockModule("../../src/services/analysis.service.js", () => ({
  analysisService: { triggerAnalysis: mockTriggerAnalysis },
}));

jest.unstable_mockModule("../../src/services/credits.service.js", () => ({
  creditsService: {
    getBalance: jest.fn().mockResolvedValue(100),
  },
}));

jest.unstable_mockModule("../../src/middlewares/auth.middleware.js", () => ({
  authenticateJwt: (req: any, _res: any, next: any) => {
    req.user = {
      _id: "6a21a76caad3374228b4d6b0",
      email: "user@example.com",
      status: "active",
      isEmailVerified: true,
    };
    next();
  },
  requireAuth: (_req: any, _res: any, next: any) => {
    next();
  },
  requireAdmin: (_req: any, _res: any, next: any) => {
    next();
  },
  requireEmailVerified: (_req: any, _res: any, next: any) => {
    next();
  },
  requireRole:
    (..._roles: string[]) =>
    (_req: any, _res: any, next: any) => {
      next();
    },
  requirePermission:
    (_section: string, _action: string) =>
    (_req: any, _res: any, next: any) => {
      next();
    },
  verifyJWT: () => ({ sub: "6a21a76caad3374228b4d6b0" }),
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

const { resetRateLimitStores } =
  await import("../../src/middlewares/rateLimit.js");
const { default: app } = await import("../../src/index.js");

const mockParsedPdf = {
  text: "This is a sample anonymous upload contract text.",
  pages: 1,
  fileSize: 1024,
  filename: "contract.pdf",
  language: "en",
};

const mockSavedContract = {
  _id: "64f1b2c3d4e5f6a7b8c9d0e1",
};

// ── Integration Tests ────────────────────────────────────────────────────────

describe("Anonymous IP Rate Limit Integration", () => {
  beforeEach(() => {
    resetRateLimitStores();
    jest.clearAllMocks();

    mockParsePdf.mockResolvedValue(mockParsedPdf);
    mockSaveContract.mockResolvedValue(mockSavedContract);
    mockLogEvent.mockResolvedValue(undefined);
    mockTriggerAnalysis.mockResolvedValue(undefined);
  });

  test("should allow 20 anonymous uploads from the same IP and block the 21st", async () => {
    const ipAddress = "203.0.113.1";

    for (let i = 0; i < 20; i += 1) {
      const res = await request(app)
        .post("/api/upload")
        .set("x-forwarded-for", ipAddress)
        .attach(
          "contract",
          Buffer.from("%PDF-1.4 dummy pdf data"),
          "contract.pdf",
        );

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("processing");
      expect(mockParsePdf).toHaveBeenCalledTimes(i + 1);
      expect(mockSaveContract).toHaveBeenCalledTimes(i + 1);
    }

    const blocked = await request(app)
      .post("/api/upload")
      .set("x-forwarded-for", ipAddress)
      .attach(
        "contract",
        Buffer.from("%PDF-1.4 dummy pdf data"),
        "contract.pdf",
      );

    expect(blocked.status).toBe(429);
    expect(blocked.body.success).toBe(false);
    expect(blocked.body.error).toContain(
      "Too many requests from this IP address",
    );
    expect(blocked.headers["retry-after"]).toBeDefined();
  });
});
