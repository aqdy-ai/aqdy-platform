import mongoose from "mongoose";
import request from "supertest";
import { describe, test, expect, beforeAll, afterAll, beforeEach, } from "@jest/globals";
import app from "../../src/index.js";
import { Contract } from "../../src/models/contract.model.js";
import { RiskAnalysis } from "../../src/models/riskAnalysis.model.js";
import { Plan } from "../../src/models/plan.model.js";
import { Subscription } from "../../src/models/subscription.model.js";
let authToken;
let userId;
let proAuthToken;
let proUserId;
// Helper: register user and get token
async function registerUser(email, name = "Test User") {
    const res = await request(app)
        .post("/api/auth/register")
        .send({ name, email, password: "Test@1234" });
    return {
        token: res.body.data.token,
        userId: res.body.data.user.id,
    };
}
// Helper: create contract directly in DB
async function createContract(userId, overrides = {}) {
    return await Contract.create({
        filename: "test.pdf",
        language: "en",
        text: "Sample contract text",
        userId,
        fileSize: 1024,
        uploadedAt: new Date(),
        ...overrides,
    });
}
// Helper: create analysis for contract
async function createAnalysis(contractId, userId, overallRisk = "high") {
    return await RiskAnalysis.create({
        contractId,
        userId,
        executiveSummary: {
            overallRisk,
            totalClauses: 5,
            riskyClausesCount: 2,
            summary: { ar: "ملخص", en: "Summary" },
        },
        clauseAnalysis: [
            {
                clauseText: "Liability clause",
                clauseType: "liability",
                riskLevel: overallRisk,
                confidence: 0.9,
                explanation: { ar: "شرح", en: "Explanation" },
                sourceFromKB: "kb_001",
            },
        ],
        analysisDuration: 2000,
    });
}
beforeAll(async () => {
    const mongoURI = process.env.MONGODB_URI.replace("aqdy_db", "aqdy_test");
    await mongoose.connect(mongoURI);
    // Register free user
    const freeUser = await registerUser(`free_${Date.now()}@test.com`);
    authToken = freeUser.token;
    userId = freeUser.userId;
    // Register pro user
    const proUser = await registerUser(`pro_${Date.now()}@test.com`, "Pro User");
    proAuthToken = proUser.token;
    proUserId = proUser.userId;
    // Create Pro plan and subscription for pro user
    let proPlan = await Plan.findOne({ slug: "pro" });
    if (!proPlan) {
        proPlan = await Plan.create({
            name: "Pro",
            slug: "pro",
            price: 9.99,
            billingCycle: "monthly",
            features: ["unlimited analyses", "export"],
            analysisLimit: -1,
            storageLimit: -1,
            isActive: true,
        });
    }
    await Subscription.findOneAndUpdate({ userId: proUserId }, {
        userId: proUserId,
        planId: proPlan._id,
        status: "active",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }, { upsert: true, new: true });
});
afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});
beforeEach(async () => {
    await Contract.deleteMany({ userId: { $in: [userId, proUserId] } });
    await RiskAnalysis.deleteMany({ userId: { $in: [userId, proUserId] } });
});
// ── Full Flow ─────────────────────────────────────
describe("Full Contract History Flow", () => {
    test("should upload, analyze, and appear in history with correct status", async () => {
        // Create contract
        const contract = await createContract(userId);
        const contractId = String(contract._id);
        // Initially pending
        const pendingRes = await request(app)
            .get("/api/account/contracts")
            .set("Authorization", `Bearer ${authToken}`);
        expect(pendingRes.status).toBe(200);
        expect(pendingRes.body.data.contracts[0].status).toBe("pending");
        // Create analysis
        await createAnalysis(contractId, userId, "high");
        // Now should be analyzed
        const analyzedRes = await request(app)
            .get("/api/account/contracts")
            .set("Authorization", `Bearer ${authToken}`);
        expect(analyzedRes.body.data.contracts[0].status).toBe("analyzed");
        expect(analyzedRes.body.data.contracts[0].riskLevel).toBe("high");
    });
});
// ── Pagination ────────────────────────────────────
describe("Pagination", () => {
    test("should return 10 contracts on page 1 and 5 on page 2", async () => {
        // Create 15 contracts
        for (let i = 0; i < 15; i++) {
            await createContract(userId, { filename: `contract_${i}.pdf` });
        }
        const page1 = await request(app)
            .get("/api/account/contracts?page=1&limit=10")
            .set("Authorization", `Bearer ${authToken}`);
        expect(page1.status).toBe(200);
        expect(page1.body.data.contracts).toHaveLength(10);
        expect(page1.body.data.total).toBe(15);
        expect(page1.body.data.totalPages).toBe(2);
        const page2 = await request(app)
            .get("/api/account/contracts?page=2&limit=10")
            .set("Authorization", `Bearer ${authToken}`);
        expect(page2.body.data.contracts).toHaveLength(5);
    });
    test("should respect limit parameter", async () => {
        for (let i = 0; i < 5; i++) {
            await createContract(userId, { filename: `contract_${i}.pdf` });
        }
        const res = await request(app)
            .get("/api/account/contracts?limit=3")
            .set("Authorization", `Bearer ${authToken}`);
        expect(res.body.data.contracts).toHaveLength(3);
    });
});
// ── Filters ───────────────────────────────────────
describe("Filters", () => {
    test("should filter by filename", async () => {
        await createContract(userId, { filename: "employment_contract.pdf" });
        await createContract(userId, { filename: "nda_agreement.pdf" });
        const res = await request(app)
            .get("/api/account/contracts?filename=employment")
            .set("Authorization", `Bearer ${authToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.contracts).toHaveLength(1);
        expect(res.body.data.contracts[0].filename).toBe("employment_contract.pdf");
    });
    test("should filter by date range", async () => {
        await createContract(userId, {
            filename: "old.pdf",
            uploadedAt: new Date("2025-01-01"),
        });
        await createContract(userId, {
            filename: "new.pdf",
            uploadedAt: new Date("2026-06-01"),
        });
        const res = await request(app)
            .get("/api/account/contracts?uploadedAfter=2026-01-01&uploadedBefore=2026-12-31")
            .set("Authorization", `Bearer ${authToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.contracts).toHaveLength(1);
        expect(res.body.data.contracts[0].filename).toBe("new.pdf");
    });
    test("should filter by status analyzed", async () => {
        const contract1 = await createContract(userId, {
            filename: "analyzed.pdf",
        });
        await createContract(userId, { filename: "pending.pdf" });
        await createAnalysis(String(contract1._id), userId, "medium");
        const res = await request(app)
            .get("/api/account/contracts?status=analyzed")
            .set("Authorization", `Bearer ${authToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.contracts).toHaveLength(1);
        expect(res.body.data.contracts[0].filename).toBe("analyzed.pdf");
    });
    test("should filter by status pending", async () => {
        const contract1 = await createContract(userId, {
            filename: "analyzed.pdf",
        });
        await createContract(userId, { filename: "pending.pdf" });
        await createAnalysis(String(contract1._id), userId);
        const res = await request(app)
            .get("/api/account/contracts?status=pending")
            .set("Authorization", `Bearer ${authToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.contracts[0].filename).toBe("pending.pdf");
    });
});
// ── Sort ──────────────────────────────────────────
describe("Sort Order", () => {
    test("should sort by riskLevel descending", async () => {
        const c1 = await createContract(userId, { filename: "low.pdf" });
        const c2 = await createContract(userId, { filename: "critical.pdf" });
        const c3 = await createContract(userId, { filename: "medium.pdf" });
        await createAnalysis(String(c1._id), userId, "low");
        await createAnalysis(String(c2._id), userId, "critical");
        await createAnalysis(String(c3._id), userId, "medium");
        const res = await request(app)
            .get("/api/account/contracts?sortBy=riskLevel&sortOrder=desc")
            .set("Authorization", `Bearer ${authToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.contracts[0].riskLevel).toBe("critical");
        expect(res.body.data.contracts[2].riskLevel).toBe("low");
    });
    test("should sort by riskLevel ascending", async () => {
        const c1 = await createContract(userId, { filename: "high.pdf" });
        const c2 = await createContract(userId, { filename: "low.pdf" });
        await createAnalysis(String(c1._id), userId, "high");
        await createAnalysis(String(c2._id), userId, "low");
        const res = await request(app)
            .get("/api/account/contracts?sortBy=riskLevel&sortOrder=asc")
            .set("Authorization", `Bearer ${authToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.contracts[0].riskLevel).toBe("low");
    });
});
// ── Soft Delete ───────────────────────────────────
describe("Soft Delete", () => {
    test("should hide contract from list after soft delete", async () => {
        const contract = await createContract(userId);
        const contractId = String(contract._id);
        // Verify it appears in list
        const beforeDelete = await request(app)
            .get("/api/account/contracts")
            .set("Authorization", `Bearer ${authToken}`);
        expect(beforeDelete.body.data.contracts).toHaveLength(1);
        // Soft delete
        const deleteRes = await request(app)
            .delete(`/api/account/contracts/${contractId}`)
            .set("Authorization", `Bearer ${authToken}`);
        expect(deleteRes.status).toBe(200);
        // Should be hidden from list
        const afterDelete = await request(app)
            .get("/api/account/contracts")
            .set("Authorization", `Bearer ${authToken}`);
        expect(afterDelete.body.data.contracts).toHaveLength(0);
    });
    test("should still exist in database after soft delete", async () => {
        const contract = await createContract(userId);
        const contractId = String(contract._id);
        await request(app)
            .delete(`/api/account/contracts/${contractId}`)
            .set("Authorization", `Bearer ${authToken}`);
        const dbContract = await Contract.findById(contractId);
        expect(dbContract).not.toBeNull();
        expect(dbContract?.deletedAt).toBeDefined();
    });
    test("should return 404 when accessing deleted contract detail", async () => {
        const contract = await createContract(userId);
        const contractId = String(contract._id);
        await request(app)
            .delete(`/api/account/contracts/${contractId}`)
            .set("Authorization", `Bearer ${authToken}`);
        const res = await request(app)
            .get(`/api/account/contracts/${contractId}`)
            .set("Authorization", `Bearer ${authToken}`);
        expect(res.status).toBe(404);
    });
});
// ── Export ────────────────────────────────────────
describe("Export", () => {
    test("should return 403 for Free user on CSV export", async () => {
        const res = await request(app)
            .get("/api/account/contracts/export?format=csv")
            .set("Authorization", `Bearer ${authToken}`);
        expect(res.status).toBe(403);
        expect(res.body.details.upgradeUrl).toBeDefined();
    });
    test("should return CSV for Pro user", async () => {
        await createContract(proUserId, { filename: "pro_contract.pdf" });
        const res = await request(app)
            .get("/api/account/contracts/export?format=csv")
            .set("Authorization", `Bearer ${proAuthToken}`);
        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toContain("text/csv");
        expect(res.text).toContain("Filename");
        expect(res.text).toContain("pro_contract.pdf");
    });
    test("should return JSON for Pro user", async () => {
        await createContract(proUserId, { filename: "pro_contract.pdf" });
        const res = await request(app)
            .get("/api/account/contracts/export?format=json")
            .set("Authorization", `Bearer ${proAuthToken}`);
        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toContain("application/json");
        const data = JSON.parse(res.text);
        expect(data).toHaveProperty("contracts");
    });
    test("should return 400 for invalid format", async () => {
        const res = await request(app)
            .get("/api/account/contracts/export?format=xml")
            .set("Authorization", `Bearer ${proAuthToken}`);
        expect(res.status).toBe(400);
    });
});
// ── Ownership ─────────────────────────────────────
describe("Ownership Enforcement", () => {
    test("should only return contracts for authenticated user", async () => {
        await createContract(userId, { filename: "my_contract.pdf" });
        await createContract(proUserId, { filename: "other_contract.pdf" });
        const res = await request(app)
            .get("/api/account/contracts")
            .set("Authorization", `Bearer ${authToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.contracts).toHaveLength(1);
        expect(res.body.data.contracts[0].filename).toBe("my_contract.pdf");
    });
    test("should not allow accessing another user contract detail", async () => {
        const otherContract = await createContract(proUserId);
        const res = await request(app)
            .get(`/api/account/contracts/${String(otherContract._id)}`)
            .set("Authorization", `Bearer ${authToken}`);
        expect([403, 404]).toContain(res.status);
    });
});
//# sourceMappingURL=contractHistory.integration.test.js.map