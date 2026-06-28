import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { config } from "dotenv";
config();
let app;
describe("CSRF Protection and CORS Integration", () => {
    beforeAll(async () => {
        process.env.NODE_ENV = "test";
        const mongoURI = process.env.MONGODB_URI.replace("aqdy_db", "aqdy_test");
        await mongoose.connect(mongoURI);
        const imported = await import("../../src/index.js");
        app = imported.default;
    });
    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    });
    test("Registration and Login should set secure SameSite=Strict cookies", async () => {
        // Generate a unique email to avoid duplicate error
        const uniqueEmail = `csrf-test-${Date.now()}@example.com`;
        const registerRes = await request(app).post("/api/auth/register").send({
            name: "CSRF Test User",
            email: uniqueEmail,
            password: "StrongPass123!",
        });
        expect(registerRes.status).toBe(201);
        const setCookies = registerRes.headers["set-cookie"] || [];
        // Check SameSite=Strict and HttpOnly parameters
        const accessCookie = setCookies.find((c) => c.startsWith("accessToken="));
        const refreshCookie = setCookies.find((c) => c.startsWith("refreshToken="));
        expect(accessCookie).toBeDefined();
        expect(accessCookie).toContain("HttpOnly");
        expect(accessCookie).toContain("SameSite=Strict");
        expect(refreshCookie).toBeDefined();
        expect(refreshCookie).toContain("HttpOnly");
        expect(refreshCookie).toContain("SameSite=Strict");
    });
    test("CORS should allow requests from allowed origin http://localhost:5173", async () => {
        const res = await request(app)
            .options("/api/auth/login")
            .set("Origin", "http://localhost:5173")
            .set("Access-Control-Request-Method", "POST");
        expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
        expect(res.headers["access-control-allow-credentials"]).toBe("true");
    });
    test("CORS should not allow requests from untrusted origins", async () => {
        const res = await request(app)
            .options("/api/auth/login")
            .set("Origin", "http://malicious-site.com")
            .set("Access-Control-Request-Method", "POST");
        // Express CORS middleware by default either omits the Access-Control-Allow-Origin header
        // or does not match it to the malicious origin when configured dynamically.
        expect(res.headers["access-control-allow-origin"]).not.toBe("http://malicious-site.com");
    });
});
//# sourceMappingURL=csrf.integration.test.js.map