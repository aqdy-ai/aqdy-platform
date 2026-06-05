import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import mongoose from "mongoose";
import request from "supertest";
import { config } from "dotenv";

config();

const mockParsePdf = jest.fn().mockResolvedValue({
  text: "This is a sample anonymous upload contract text.",
  pages: 1,
  fileSize: 1024,
  filename: "contract.pdf",
  language: "en",
});

const mockSaveContract = jest.fn().mockResolvedValue({
  _id: new mongoose.Types.ObjectId(),
  userId: "anonymous",
});

const mockLogEvent = jest.fn().mockResolvedValue(undefined);
const mockTriggerAnalysis = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule("../../src/services/pdf.service.js", () => ({
  pdfService: { parsePdf: mockParsePdf },
}));

jest.unstable_mockModule("../../src/services/contract.service.js", () => ({
  contractService: { saveContract: mockSaveContract },
}));

jest.unstable_mockModule("../../src/services/auditLog.service.js", () => ({
  auditLogService: { logEvent: mockLogEvent },
  logAdmin: {
    viewLogs: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.unstable_mockModule("../../src/services/analysis.service.js", () => ({
  analysisService: { triggerAnalysis: mockTriggerAnalysis },
}));

jest.unstable_mockModule("../../src/middlewares/auth.middleware.js", () => ({
  authenticateJwt: (req: any, res: any, next: any) => {
    req.user = {
      _id: "6a21a76caad3374228b4d6b0",
      email: "user@example.com",
      status: "active",
    };
    next();
  },
  requireAuth: (req: any, res: any, next: any) => {
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => {
    next();
  },
  verifyJWT: () => ({ sub: "6a21a76caad3374228b4d6b0" }),
}));

const { resetRateLimitStores } = await import("../../src/middlewares/rateLimit.js");
const app = (await import("../../src/index.js")).default;

describe("Anonymous IP Rate Limit Integration", () => {
  beforeAll(async () => {
    const mongoURI = process.env.MONGODB_URI!.replace("aqdy_db", "aqdy_test");
    await mongoose.connect(mongoURI);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(() => {
    resetRateLimitStores();
    mockParsePdf.mockClear();
    mockSaveContract.mockClear();
    mockLogEvent.mockClear();
    mockTriggerAnalysis.mockClear();
  });

  test("should allow 20 anonymous uploads from the same IP and block the 21st", async () => {
    const ipAddress = "203.0.113.1";

    for (let i = 0; i < 20; i += 1) {
      const res = await request(app)
        .post("/api/upload/")
        .set("x-forwarded-for", ipAddress)
        .attach("contract", Buffer.from("%PDF-1.4 dummy pdf data"), "contract.pdf");

      expect(res.status).toBe(202);
      expect(res.body.status).toBe("processing");
      expect(mockParsePdf).toHaveBeenCalledTimes(i + 1);
      expect(mockSaveContract).toHaveBeenCalledTimes(i + 1);
    }

    const blocked = await request(app)
      .post("/api/upload/")
      .set("x-forwarded-for", ipAddress)
      .attach("contract", Buffer.from("%PDF-1.4 dummy pdf data"), "contract.pdf");

    expect(blocked.status).toBe(429);
    expect(blocked.body.success).toBe(false);
    expect(blocked.body.error).toContain("Too many requests from this IP address");
    expect(blocked.headers["retry-after"]).toBeDefined();
  });
});
