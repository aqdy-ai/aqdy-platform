import { describe, test, expect, beforeAll, afterAll, beforeEach, } from "@jest/globals";
import mongoose from "mongoose";
import request from "supertest";
import express from "express";
import { AuditLog } from "../src/models/auditLog.model.js";
import auditService, { getIP } from "../src/services/auditLog.service.js";
import auditLogsRouter from "../src/routes/auditLogs.route.js";
import requestIdMiddleware from "../src/middlewares/requestId.middleware.js";
// Setup test Express app for routing tests
const testApp = express();
testApp.use(express.json());
testApp.use(requestIdMiddleware);
// Middleware to inject mocked req.user based on headers for testing
testApp.use((req, res, next) => {
    const userHeader = req.headers["x-test-user"];
    if (userHeader) {
        try {
            req.user = JSON.parse(userHeader);
        }
        catch (e) {
            req.user = null;
        }
    }
    next();
});
testApp.use("/api/admin/audit-logs", auditLogsRouter);
beforeAll(async () => {
    const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aqdy-audit-test";
    // Safe connection setup
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoURI);
    }
});
afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});
beforeEach(async () => {
    await AuditLog.deleteMany({});
});
// --- Test Group 1 — AuditLog Model ---
describe("Test Group 1 — AuditLog Model", () => {
    test("saves a valid log entry successfully", async () => {
        const entry = new AuditLog({
            action: "AUTH_LOGIN_SUCCESS",
            outcome: "success",
            timestamp: new Date(),
            userEmail: "user@test.com",
        });
        const saved = await entry.save();
        expect(saved._id).toBeDefined();
        expect(saved.action).toBe("AUTH_LOGIN_SUCCESS");
    });
    test("rejects entry with missing required field 'action'", async () => {
        const entry = new AuditLog({
            outcome: "success",
        });
        await expect(entry.save()).rejects.toThrow();
    });
    test("rejects entry with invalid action value not in enum", async () => {
        const entry = new AuditLog({
            action: "INVALID_ACTION_NAME",
            outcome: "success",
        });
        await expect(entry.save()).rejects.toThrow();
    });
    test("rejects entry with invalid outcome value", async () => {
        const entry = new AuditLog({
            action: "AUTH_LOGIN_SUCCESS",
            outcome: "invalid_outcome",
        });
        await expect(entry.save()).rejects.toThrow();
    });
    test("saves entry with null userId (anonymous events allowed)", async () => {
        const entry = new AuditLog({
            action: "AUTH_LOGIN_FAILED",
            outcome: "failure",
            userId: null,
        });
        const saved = await entry.save();
        expect(saved.userId).toBeNull();
    });
    test("timestamp defaults to current time if not provided", async () => {
        const entry = new AuditLog({
            action: "AUTH_LOGIN_SUCCESS",
            outcome: "success",
        });
        const saved = await entry.save();
        expect(saved.timestamp).toBeDefined();
        expect(saved.timestamp instanceof Date).toBe(true);
    });
});
// --- Test Group 2 — logAuth ---
describe("Test Group 2 — logAuth", () => {
    test("loginSuccess saves correct action, userId, userEmail, ipAddress, outcome: 'success'", async () => {
        const req = { headers: { "x-forwarded-for": "1.2.3.4" } };
        const userId = new mongoose.Types.ObjectId();
        const user = { _id: userId, email: "success@test.com" };
        const log = await auditService.logAuth.loginSuccess(req, user);
        expect(log).toBeDefined();
        expect(log.action).toBe("AUTH_LOGIN_SUCCESS");
        expect(log.outcome).toBe("success");
        expect(log.userId.toString()).toBe(userId.toString());
        expect(log.userEmail).toBe("success@test.com");
        expect(log.ipAddress).toBe("1.2.3.4");
    });
    test("loginFailed saves outcome: 'failure', correct email and failReason in metadata", async () => {
        const req = { headers: {} };
        const log = await auditService.logAuth.loginFailed(req, "failed@test.com", "wrong_password");
        expect(log).toBeDefined();
        expect(log.action).toBe("AUTH_LOGIN_FAILED");
        expect(log.outcome).toBe("failure");
        expect(log.userEmail).toBe("failed@test.com");
        expect(log.metadata).toEqual({ failReason: "wrong_password" });
    });
    test("logout saves AUTH_LOGOUT with correct userId", async () => {
        const userId = new mongoose.Types.ObjectId();
        const req = { user: { _id: userId, email: "out@test.com" }, headers: {} };
        const log = await auditService.logAuth.logout(req);
        expect(log).toBeDefined();
        expect(log.action).toBe("AUTH_LOGOUT");
        expect(log.userId.toString()).toBe(userId.toString());
    });
    test("passwordReset saves AUTH_PASSWORD_RESET with correct email", async () => {
        const req = { headers: {} };
        const log = await auditService.logAuth.passwordReset(req, "reset@test.com");
        expect(log).toBeDefined();
        expect(log.action).toBe("AUTH_PASSWORD_RESET");
        expect(log.userEmail).toBe("reset@test.com");
    });
});
// --- Test Group 3 — logContract ---
describe("Test Group 3 — logContract", () => {
    test("upload saves CONTRACT_UPLOAD with correct fileName, fileSizeBytes, contractId in metadata", async () => {
        const req = { headers: {} };
        const file = {
            originalname: "contract.pdf",
            size: 5000,
            mimetype: "application/pdf",
        };
        const contractId = new mongoose.Types.ObjectId();
        const contract = { _id: contractId };
        const log = await auditService.logContract.upload(req, file, contract, "en", "success");
        expect(log).toBeDefined();
        expect(log.action).toBe("CONTRACT_UPLOAD");
        expect(log.metadata.fileName).toBe("contract.pdf");
        expect(log.metadata.fileSizeBytes).toBe(5000);
        expect(log.metadata.contractId).toBe(contractId.toString());
    });
    test("upload with outcome: 'failure' saves failure outcome and errorMessage", async () => {
        const req = { headers: {} };
        const error = new Error("S3 Upload Failed");
        const log = await auditService.logContract.upload(req, null, null, "en", "failure", error);
        expect(log).toBeDefined();
        expect(log.outcome).toBe("failure");
        expect(log.errorMessage).toBe("S3 Upload Failed");
    });
    test("delete saves CONTRACT_DELETE with contractId", async () => {
        const req = { headers: {} };
        const log = await auditService.logContract.delete(req, "contract_123", "success");
        expect(log).toBeDefined();
        expect(log.action).toBe("CONTRACT_DELETE");
        expect(log.metadata.contractId).toBe("contract_123");
    });
});
// --- Test Group 4 — logAgent ---
describe("Test Group 4 — logAgent", () => {
    test("run with agentName variations saves the correct action", async () => {
        const req = { headers: {} };
        const dataExtractor = {
            agentName: "extractor",
            contractId: "123",
            durationMs: 100,
        };
        const logExtractor = await auditService.logAgent.run(req, dataExtractor);
        expect(logExtractor.action).toBe("AGENT_EXTRACTOR");
        const dataClassifier = {
            agentName: "risk_classifier",
            contractId: "123",
            durationMs: 200,
        };
        const logClassifier = await auditService.logAgent.run(req, dataClassifier);
        expect(logClassifier.action).toBe("AGENT_RISK_CLASSIFIER");
        const dataRedline = {
            agentName: "redline",
            contractId: "123",
            durationMs: 300,
        };
        const logRedline = await auditService.logAgent.run(req, dataRedline);
        expect(logRedline.action).toBe("AGENT_REDLINE");
    });
    test("run saves durationMs, tokensUsed, model correctly in metadata", async () => {
        const req = { headers: {} };
        const data = {
            agentName: "extractor",
            contractId: "123",
            durationMs: 150,
            tokensUsed: { prompt: 10, completion: 20, total: 30 },
            model: "gpt-4",
            clauseCount: 5,
        };
        const log = await auditService.logAgent.run(req, data);
        expect(log.metadata.durationMs).toBe(150);
        expect(log.metadata.tokensUsed).toEqual({
            prompt: 10,
            completion: 20,
            total: 30,
        });
        expect(log.metadata.model).toBe("gpt-4");
    });
    test("pipeline saves AGENT_PIPELINE with totalDurationMs, agentsRun, clausesAnalyzed", async () => {
        const req = { headers: {} };
        const data = {
            contractId: "123",
            totalDurationMs: 1200,
            totalTokens: 500,
            agentsRun: ["extractor", "redline"],
            clausesAnalyzed: 10,
        };
        const log = await auditService.logAgent.pipeline(req, data);
        expect(log.action).toBe("AGENT_PIPELINE");
        expect(log.metadata.totalDurationMs).toBe(1200);
        expect(log.metadata.agentsRun).toEqual(["extractor", "redline"]);
        expect(log.metadata.clausesAnalyzed).toBe(10);
    });
});
// --- Test Group 5 — logKB ---
describe("Test Group 5 — logKB", () => {
    test("search saves KB_SEARCH with query, resultCount, topResultIds, topScores, durationMs", async () => {
        const req = { headers: {} };
        const data = {
            query: "NDA terms",
            language: "en",
            durationMs: 45,
            results: [
                { id: "res1", score: 0.95 },
                { id: "res2", score: 0.82 },
                { id: "res3", score: 0.71 },
                { id: "res4", score: 0.44 },
            ],
        };
        const log = await auditService.logKB.search(req, data);
        expect(log.action).toBe("KB_SEARCH");
        expect(log.metadata.query).toBe("NDA terms");
        expect(log.metadata.resultCount).toBe(4);
        expect(log.metadata.topResultIds).toEqual(["res1", "res2", "res3"]);
        expect(log.metadata.topScores).toEqual([0.95, 0.82, 0.71]);
        expect(log.metadata.durationMs).toBe(45);
    });
    test("search saves correct language field", async () => {
        const req = { headers: {} };
        const data = { query: "عقد", language: "ar", results: [], durationMs: 10 };
        const log = await auditService.logKB.search(req, data);
        expect(log.metadata.language).toBe("ar");
    });
});
// --- Test Group 6 — Admin Route GET / ---
describe("Test Group 6 — Admin Route GET /", () => {
    const adminUser = {
        _id: new mongoose.Types.ObjectId().toString(),
        role: "super_admin",
        email: "admin@test.com",
    };
    const regularUser = {
        _id: new mongoose.Types.ObjectId().toString(),
        role: "user",
        email: "user@test.com",
    };
    beforeEach(async () => {
        await AuditLog.create([
            {
                action: "AUTH_LOGIN_SUCCESS",
                outcome: "success",
                userEmail: "target@test.com",
                timestamp: new Date("2026-05-01"),
            },
            {
                action: "AUTH_LOGIN_FAILED",
                outcome: "failure",
                userEmail: "other@test.com",
                timestamp: new Date("2026-05-15"),
            },
        ]);
    });
    test("returns 200 with paginated results when called by admin", async () => {
        const res = await request(testApp)
            .get("/api/admin/audit-logs")
            .set("x-test-user", JSON.stringify(adminUser));
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(2);
    });
    test("returns 401 when no user on request", async () => {
        const res = await request(testApp).get("/api/admin/audit-logs");
        expect(res.status).toBe(401);
    });
    test("returns 403 when user is not admin", async () => {
        const res = await request(testApp)
            .get("/api/admin/audit-logs")
            .set("x-test-user", JSON.stringify(regularUser));
        expect(res.status).toBe(403);
    });
    test("filters by action type correctly (only returns matching action)", async () => {
        const res = await request(testApp)
            .get("/api/admin/audit-logs?action=AUTH_LOGIN_FAILED")
            .set("x-test-user", JSON.stringify(adminUser));
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].action).toBe("AUTH_LOGIN_FAILED");
    });
    test("filters by outcome correctly", async () => {
        const res = await request(testApp)
            .get("/api/admin/audit-logs?outcome=failure")
            .set("x-test-user", JSON.stringify(adminUser));
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].outcome).toBe("failure");
    });
    test("filters by email partial match", async () => {
        const res = await request(testApp)
            .get("/api/admin/audit-logs?email=targ")
            .set("x-test-user", JSON.stringify(adminUser));
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].userEmail).toBe("target@test.com");
    });
    test("filters by dateFrom and dateTo correctly", async () => {
        const res = await request(testApp)
            .get("/api/admin/audit-logs?dateFrom=2026-05-10&dateTo=2026-05-20")
            .set("x-test-user", JSON.stringify(adminUser));
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].action).toBe("AUTH_LOGIN_FAILED");
    });
    test("returns correct pagination metadata (total, totalPages, hasNext, hasPrev)", async () => {
        const res = await request(testApp)
            .get("/api/admin/audit-logs?page=1&pageSize=1")
            .set("x-test-user", JSON.stringify(adminUser));
        expect(res.status).toBe(200);
        expect(res.body.pagination).toEqual({
            page: 1,
            pageSize: 1,
            total: 2,
            totalPages: 2,
            hasNext: true,
            hasPrev: false,
        });
    });
    test("returns 400 for invalid userId format", async () => {
        const res = await request(testApp)
            .get("/api/admin/audit-logs?userId=invalidId")
            .set("x-test-user", JSON.stringify(adminUser));
        expect(res.status).toBe(400);
    });
    test("returns 400 for invalid action value", async () => {
        const res = await request(testApp)
            .get("/api/admin/audit-logs?action=NOT_A_VALID_ACTION")
            .set("x-test-user", JSON.stringify(adminUser));
        expect(res.status).toBe(400);
    });
    test("pageSize is capped at 100", async () => {
        const res = await request(testApp)
            .get("/api/admin/audit-logs?pageSize=200")
            .set("x-test-user", JSON.stringify(adminUser));
        expect(res.status).toBe(200);
        expect(res.body.pagination.pageSize).toBe(100);
    });
});
// --- Test Group 7 — Admin Route GET /stats ---
describe("Test Group 7 — Admin Route GET /stats", () => {
    const adminUser = {
        _id: new mongoose.Types.ObjectId().toString(),
        role: "super_admin",
        email: "admin@test.com",
    };
    beforeEach(async () => {
        const now = new Date();
        const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48h ago
        await AuditLog.create([
            { action: "AUTH_LOGIN_SUCCESS", outcome: "success", timestamp: now },
            { action: "AUTH_LOGIN_FAILED", outcome: "failure", timestamp: now },
            { action: "CONTRACT_UPLOAD", outcome: "success", timestamp: now },
            { action: "AGENT_EXTRACTOR", outcome: "success", timestamp: now },
            { action: "AGENT_PIPELINE", outcome: "success", timestamp: now },
            // Old record (should not count in 24h stats)
            { action: "AUTH_LOGIN_FAILED", outcome: "failure", timestamp: oldDate },
        ]);
    });
    test("returns totalEvents, failedLogins, contractUploads, agentRuns for last 24h", async () => {
        const res = await request(testApp)
            .get("/api/admin/audit-logs/stats")
            .set("x-test-user", JSON.stringify(adminUser));
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.last24h).toBeDefined();
    });
    test("counts are accurate based on seeded data within 24h", async () => {
        const res = await request(testApp)
            .get("/api/admin/audit-logs/stats")
            .set("x-test-user", JSON.stringify(adminUser));
        expect(res.body.last24h.totalEvents).toBe(5);
        expect(res.body.last24h.failedLogins).toBe(1);
        expect(res.body.last24h.contractUploads).toBe(1);
        expect(res.body.last24h.agentRuns).toBe(2);
    });
});
// --- Test Group 8 — Edge Cases ---
describe("Test Group 8 — Edge Cases", () => {
    test("audit logging never crashes main code even if MongoDB is down (write fails silently)", async () => {
        // Force disconnect to simulate db failure
        await mongoose.connection.close();
        // Logging should not throw
        const log = await auditService.logAuth.loginFailed({}, "anonymous@test.com", "db_down");
        expect(log).toBeNull(); // Safe return value on error
        // Reconnect for remaining tests
        const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aqdy-audit-test";
        await mongoose.connect(mongoURI);
    });
    test("IP extraction uses x-forwarded-for header when present", () => {
        const req = { headers: { "x-forwarded-for": "10.0.0.1, 10.0.0.2" } };
        expect(getIP(req)).toBe("10.0.0.1");
    });
    test("IP extraction falls back to req.ip when no proxy headers", () => {
        const req = { ip: "192.168.1.100", headers: {} };
        expect(getIP(req)).toBe("192.168.1.100");
    });
    test("langfuseTraceId is saved correctly when provided on req object", async () => {
        const req = { langfuseTraceId: "trace_999", headers: {} };
        const log = await auditService.logAuth.passwordReset(req, "test@test.com");
        expect(log.langfuseTraceId).toBe("trace_999");
    });
    test("requestId is saved correctly from req.requestId", async () => {
        const req = { requestId: "req_unique_abc", headers: {} };
        const log = await auditService.logAuth.loginFailed(req, "user@test.com", "wrong");
        expect(log.requestId).toBe("req_unique_abc");
    });
});
//# sourceMappingURL=auditLog.test.js.map