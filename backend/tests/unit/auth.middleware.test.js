import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import crypto from "crypto";
const mockFindById = jest.fn();
const mockVerifyAccessToken = jest.fn();
jest.unstable_mockModule("../../src/models/user.model.js", () => ({
    User: {
        findById: mockFindById,
    },
}));
jest.unstable_mockModule("../../src/services/auth.service.js", () => ({
    verifyAccessToken: mockVerifyAccessToken,
}));
const { authenticateJwt, requireAuth, requireAdmin, verifyJWT } = await import("../../src/middlewares/auth.middleware.js");
describe("Auth Middleware", () => {
    let mockRequest;
    let mockResponse;
    let mockNext;
    beforeEach(() => {
        jest.clearAllMocks();
        mockRequest = {
            headers: {},
        };
        mockResponse = {};
        mockNext = jest.fn();
    });
    test("should reject requests with missing authentication cookie", async () => {
        await authenticateJwt(mockRequest, mockResponse, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
    });
    test("should reject requests with an invalid token", async () => {
        mockRequest.cookies = { accessToken: "invalid.token.value" };
        mockVerifyAccessToken.mockImplementation(() => {
            throw new Error("Invalid token");
        });
        await authenticateJwt(mockRequest, mockResponse, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
    });
    test("should reject requests for a missing or inactive user", async () => {
        mockRequest.cookies = { accessToken: "valid.token.value" };
        mockVerifyAccessToken.mockReturnValue({ sub: "missing-user" });
        mockFindById.mockResolvedValue(null);
        await authenticateJwt(mockRequest, mockResponse, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
    });
    test("should allow requests with a valid token and active user", async () => {
        mockRequest.cookies = { accessToken: "valid.token.value" };
        mockVerifyAccessToken.mockReturnValue({ sub: "active-user" });
        mockFindById.mockResolvedValue({ status: "active" });
        await authenticateJwt(mockRequest, mockResponse, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockRequest.user).toBeDefined();
    });
    test("requireAuth should throw if authentication state is missing", () => {
        const mockReq = {};
        const mockNextFn = jest.fn();
        requireAuth(mockReq, mockResponse, mockNextFn);
        expect(mockNextFn).toHaveBeenCalledTimes(1);
        expect(mockNextFn.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
    });
    describe("requireAdmin", () => {
        test("should allow access for user with admin role", () => {
            const mockReq = { user: { role: "super_admin" } };
            const mockNextFn = jest.fn();
            requireAdmin(mockReq, mockResponse, mockNextFn);
            expect(mockNextFn).toHaveBeenCalledTimes(1);
            expect(mockNextFn.mock.calls[0][0]).toBeUndefined();
        });
        test("should reject access with 403 if user is not admin", () => {
            const mockReq = { user: { role: "user" } };
            const mockNextFn = jest.fn();
            requireAdmin(mockReq, mockResponse, mockNextFn);
            expect(mockNextFn).toHaveBeenCalledTimes(1);
            expect(mockNextFn.mock.calls[0][0]).toMatchObject({
                statusCode: 403,
                message: "Forbidden",
            });
        });
        test("should reject access with 401 if user is not authenticated", () => {
            const mockReq = { headers: {} };
            const mockNextFn = jest.fn();
            requireAdmin(mockReq, mockResponse, mockNextFn);
            expect(mockNextFn).toHaveBeenCalledTimes(1);
            expect(mockNextFn.mock.calls[0][0]).toMatchObject({
                statusCode: 401,
                message: "Authentication required.",
            });
        });
    });
    describe("verifyJWT utility", () => {
        test("should return null for malformed token format (not 3 parts)", () => {
            expect(verifyJWT("part1.part2")).toBeNull();
            expect(verifyJWT("part1")).toBeNull();
            expect(verifyJWT("")).toBeNull();
        });
        test("should return null if the signature is tampered or doesn't match HMAC expected signature", () => {
            // Form a token with a valid structural look but arbitrary parts
            const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
            const payload = Buffer.from(JSON.stringify({ sub: "user123", role: "user" })).toString("base64url");
            const badSignature = "thisIsAFakeSignatureThatWillNotMatchTheHmacExpectation12345";
            const token = `${header}.${payload}.${badSignature}`;
            expect(verifyJWT(token)).toBeNull();
        });
        test("should parse and return payload for a correctly signed token", () => {
            const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
            const payloadObj = {
                sub: "user123",
                role: "user",
                exp: Date.now() + 10000,
            };
            const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
            // Calculate signature manually (verifyJWT expects process.env.JWT_SECRET or env.JWT_SECRET)
            const jwtSecret = process.env.JWT_SECRET || "test-secret";
            const hmac = crypto.createHmac("sha256", jwtSecret);
            hmac.update(`${header}.${payload}`);
            const expectedSignature = hmac.digest("base64url");
            const token = `${header}.${payload}.${expectedSignature}`;
            const decoded = verifyJWT(token);
            expect(decoded).toBeDefined();
            expect(decoded.sub).toBe("user123");
            expect(decoded.role).toBe("user");
        });
    });
});
//# sourceMappingURL=auth.middleware.test.js.map