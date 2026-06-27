import { describe, test, expect, beforeAll, afterAll, beforeEach, } from "@jest/globals";
import mongoose from "mongoose";
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { User } from "../src/models/user.model.js";
import { AuditLog } from "../src/models/auditLog.model.js";
import adminRolesRouter from "../src/routes/admin.roles.route.js";
import adminSupportRouter from "../src/routes/admin.support.route.js";
import adminFinancialRouter from "../src/routes/admin.financial.route.js";
import adminContentRouter from "../src/routes/admin.content.route.js";
import adminOperationsRouter from "../src/routes/admin.operations.route.js";
import requestIdMiddleware from "../src/middlewares/requestId.middleware.js";
import { errorHandler } from "../src/middlewares/errorHandler.js";
import { env } from "../src/config/env.js";
const testApp = express();
testApp.use(express.json());
testApp.use(cookieParser());
testApp.use(requestIdMiddleware);
// Setup routes
testApp.use("/api/admin/roles", adminRolesRouter);
testApp.use("/api/admin/support", adminSupportRouter);
testApp.use("/api/admin/financial", adminFinancialRouter);
testApp.use("/api/admin/content", adminContentRouter);
testApp.use("/api/admin/operations", adminOperationsRouter);
testApp.use(errorHandler);
function generateToken(payload) {
    return jwt.sign(payload, env.JWT_SECRET);
}
beforeAll(async () => {
    const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aqdy-roles-test";
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoURI);
    }
});
afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});
beforeEach(async () => {
    await User.deleteMany({});
    await AuditLog.deleteMany({});
});
describe("Admin RBAC & Role Management System (Tasks 5.20-5.25)", () => {
    let superAdminUser;
    let superAdminToken;
    beforeEach(async () => {
        // Seed a Super Admin user
        superAdminUser = await User.create({
            name: "Super Admin",
            email: "superadmin@test.com",
            role: "super_admin",
            status: "active",
            planSlug: "free",
            passwordHash: "dummy",
        });
        superAdminToken = generateToken({
            sub: superAdminUser._id.toString(),
            email: superAdminUser.email,
            role: "super_admin",
        });
    });
    describe("Task 5.20: Super Admin & Role Management Constraints", () => {
        test("allows Super Admin to assign and revoke admin roles", async () => {
            const targetUser = await User.create({
                name: "Target User",
                email: "target@test.com",
                role: "user",
                status: "active",
                planSlug: "free",
                passwordHash: "dummy",
            });
            // Assign support_admin role
            let res = await request(testApp)
                .post("/api/admin/roles/assign")
                .set("Cookie", `accessToken=${superAdminToken}`)
                .send({ userId: targetUser._id.toString(), role: "support_admin" });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            let updatedUser = await User.findById(targetUser._id);
            expect(updatedUser?.role).toBe("support_admin");
            // Verify Audit Log entry was created
            const logs = await AuditLog.find({ action: "ROLE_ASSIGNED" });
            expect(logs).toHaveLength(1);
            expect(logs[0].metadata?.newRole).toBe("support_admin");
            // Revoke role
            res = await request(testApp)
                .post("/api/admin/roles/revoke")
                .set("Cookie", `accessToken=${superAdminToken}`)
                .send({ userId: targetUser._id.toString() });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            updatedUser = await User.findById(targetUser._id);
            expect(updatedUser?.role).toBe("user");
            const revokeLogs = await AuditLog.find({ action: "ROLE_REVOKED" });
            expect(revokeLogs).toHaveLength(1);
        });
        test("enforces maximum limit of 2 Super Admin users", async () => {
            // 1 Super Admin already exists from beforeEach
            // Seed a 2nd user to be made Super Admin
            const secondUser = await User.create({
                name: "Second User",
                email: "second@test.com",
                role: "user",
                status: "active",
                planSlug: "free",
                passwordHash: "dummy",
            });
            // Seed a 3rd user
            const thirdUser = await User.create({
                name: "Third User",
                email: "third@test.com",
                role: "user",
                status: "active",
                planSlug: "free",
                passwordHash: "dummy",
            });
            // Assign 2nd Super Admin (Total = 2)
            let res = await request(testApp)
                .post("/api/admin/roles/assign")
                .set("Cookie", `accessToken=${superAdminToken}`)
                .send({ userId: secondUser._id.toString(), role: "super_admin" });
            expect(res.status).toBe(200);
            // Attempting to assign 3rd Super Admin should fail
            res = await request(testApp)
                .post("/api/admin/roles/assign")
                .set("Cookie", `accessToken=${superAdminToken}`)
                .send({ userId: thirdUser._id.toString(), role: "super_admin" });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toContain("Maximum of 2 active Super Admin accounts allowed");
        });
    });
    describe("Role Access Boundaries (Tasks 5.21 - 5.25)", () => {
        let financialAdminToken;
        let supportAdminToken;
        let contentAdminToken;
        let operationsAdminToken;
        let analyticsAdminToken;
        beforeEach(async () => {
            // Seed all admin types
            const fin = await User.create({ name: "F", email: "f@test.com", role: "financial_admin", status: "active", planSlug: "free", passwordHash: "h" });
            const sup = await User.create({ name: "S", email: "s@test.com", role: "support_admin", status: "active", planSlug: "free", passwordHash: "h" });
            const con = await User.create({ name: "C", email: "c@test.com", role: "content_admin", status: "active", planSlug: "free", passwordHash: "h" });
            const ope = await User.create({ name: "O", email: "o@test.com", role: "operations_admin", status: "active", planSlug: "free", passwordHash: "h" });
            const ana = await User.create({ name: "A", email: "a@test.com", role: "analytics_admin", status: "active", planSlug: "free", passwordHash: "h" });
            financialAdminToken = generateToken({ sub: fin._id.toString(), email: fin.email, role: "financial_admin" });
            supportAdminToken = generateToken({ sub: sup._id.toString(), email: sup.email, role: "support_admin" });
            contentAdminToken = generateToken({ sub: con._id.toString(), email: con.email, role: "content_admin" });
            operationsAdminToken = generateToken({ sub: ope._id.toString(), email: ope.email, role: "operations_admin" });
            analyticsAdminToken = generateToken({ sub: ana._id.toString(), email: ana.email, role: "analytics_admin" });
        });
        test("Financial Admin (Task 5.21) can access billing routes but not support or content routes", async () => {
            // Access allowed
            let res = await request(testApp)
                .get("/api/admin/financial/overview")
                .set("Cookie", `accessToken=${financialAdminToken}`);
            expect(res.status).toBe(200);
            // Access denied to support
            res = await request(testApp)
                .get("/api/admin/support/users/search")
                .set("Cookie", `accessToken=${financialAdminToken}`);
            expect(res.status).toBe(403);
            // Access denied to content
            res = await request(testApp)
                .get("/api/admin/content/knowledge-base")
                .set("Cookie", `accessToken=${financialAdminToken}`);
            expect(res.status).toBe(403);
        });
        test("Support Admin (Task 5.22) can access support routes but not financial or operations routes", async () => {
            // Access allowed
            let res = await request(testApp)
                .get("/api/admin/support/users/search")
                .set("Cookie", `accessToken=${supportAdminToken}`);
            expect(res.status).toBe(200);
            // Access denied to financial
            res = await request(testApp)
                .get("/api/admin/financial/overview")
                .set("Cookie", `accessToken=${supportAdminToken}`);
            expect(res.status).toBe(403);
            // Access denied to operations
            res = await request(testApp)
                .get("/api/admin/operations/system-health")
                .set("Cookie", `accessToken=${supportAdminToken}`);
            expect(res.status).toBe(403);
        });
        test("Content Admin (Task 5.23) can access KB/prompts but not financial or operations health routes", async () => {
            // Access allowed
            let res = await request(testApp)
                .get("/api/admin/content/knowledge-base")
                .set("Cookie", `accessToken=${contentAdminToken}`);
            expect(res.status).toBe(200);
            // Access denied to operations health
            res = await request(testApp)
                .get("/api/admin/operations/system-health")
                .set("Cookie", `accessToken=${contentAdminToken}`);
            expect(res.status).toBe(403);
        });
        test("Operations Admin (Task 5.24) can access operations routes but not KB content writing", async () => {
            // Access allowed
            let res = await request(testApp)
                .get("/api/admin/operations/system-health")
                .set("Cookie", `accessToken=${operationsAdminToken}`);
            expect(res.status).toBe(200);
            // Access denied to KB
            res = await request(testApp)
                .get("/api/admin/content/knowledge-base")
                .set("Cookie", `accessToken=${operationsAdminToken}`);
            expect(res.status).toBe(403);
        });
        test("Analytics Admin (Task 5.25) has read-only access to all admin sections but cannot perform write operations", async () => {
            // Read access allowed (GET routes)
            let res = await request(testApp)
                .get("/api/admin/financial/overview")
                .set("Cookie", `accessToken=${analyticsAdminToken}`);
            expect(res.status).toBe(200);
            res = await request(testApp)
                .get("/api/admin/content/knowledge-base")
                .set("Cookie", `accessToken=${analyticsAdminToken}`);
            expect(res.status).toBe(200);
            res = await request(testApp)
                .get("/api/admin/operations/system-health")
                .set("Cookie", `accessToken=${analyticsAdminToken}`);
            expect(res.status).toBe(200);
            // Write access denied (POST/PUT/DELETE routes)
            res = await request(testApp)
                .post("/api/admin/content/knowledge-base")
                .set("Cookie", `accessToken=${analyticsAdminToken}`)
                .send({ clauseText: "Test Clause", contractType: "General", category: "Liability" });
            expect(res.status).toBe(403);
            res = await request(testApp)
                .put("/api/admin/content/prompts/extractor")
                .set("Cookie", `accessToken=${analyticsAdminToken}`)
                .send({ prompt: "New Prompt text" });
            expect(res.status).toBe(403);
        });
    });
});
//# sourceMappingURL=roles.test.js.map