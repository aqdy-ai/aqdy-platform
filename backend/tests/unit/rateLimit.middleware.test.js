import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { anonymousIpRateLimit, resetRateLimitStores, userAnalysisRateLimit, } from "../../src/middlewares/rateLimit.js";
describe("Rate Limit Middleware", () => {
    let mockRequest;
    let mockResponse;
    let mockNext;
    let mockStatus;
    let mockJson;
    beforeEach(() => {
        resetRateLimitStores();
        mockStatus = jest.fn().mockReturnThis();
        mockJson = jest.fn();
        mockResponse = {
            status: mockStatus,
            json: mockJson,
            setHeader: jest.fn(),
        };
        mockNext = jest.fn();
        mockRequest = {
            body: {},
            headers: {},
            ip: "127.0.0.1",
        };
    });
    test("should allow free tier user requests within the daily limit", () => {
        const middleware = userAnalysisRateLimit();
        mockRequest.body = { userId: "user-1" };
        for (let i = 0; i < 10; i += 1) {
            middleware(mockRequest, mockResponse, mockNext);
        }
        expect(mockNext).toHaveBeenCalledTimes(10);
        expect(mockStatus).not.toHaveBeenCalled();
    });
    test("should allow the request exactly at the free tier daily limit", () => {
        const middleware = userAnalysisRateLimit();
        mockRequest.body = { userId: "user-2" };
        for (let i = 0; i < 9; i += 1) {
            middleware(mockRequest, mockResponse, mockNext);
        }
        middleware(mockRequest, mockResponse, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(10);
        expect(mockStatus).not.toHaveBeenCalled();
    });
    test("should block a free tier user one request over the daily limit with 429 and Retry-After", () => {
        const middleware = userAnalysisRateLimit();
        mockRequest.body = { userId: "user-3" };
        for (let i = 0; i < 10; i += 1) {
            middleware(mockRequest, mockResponse, mockNext);
        }
        middleware(mockRequest, mockResponse, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(10);
        expect(mockStatus).toHaveBeenCalledWith(429);
        expect(mockResponse.setHeader).toHaveBeenCalledWith("Retry-After", expect.any(String));
        expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            error: expect.stringContaining("Free tier daily analysis limit exceeded"),
        }));
    });
    test("should limit unauthenticated anonymous IP requests", () => {
        const middleware = anonymousIpRateLimit();
        mockRequest.headers = {};
        mockRequest.ip = "10.10.10.10";
        for (let i = 0; i < 20; i += 1) {
            middleware(mockRequest, mockResponse, mockNext);
        }
        middleware(mockRequest, mockResponse, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(20);
        expect(mockStatus).toHaveBeenCalledWith(429);
        expect(mockResponse.setHeader).toHaveBeenCalledWith("Retry-After", expect.any(String));
        expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            error: expect.stringContaining("Too many requests from this IP address"),
        }));
    });
    test("should reset the daily analysis limit counter when a new day starts (date changes)", () => {
        jest.useFakeTimers();
        // Set explicit starting time
        const initialTime = new Date("2026-06-02T12:00:00.000Z").getTime();
        jest.setSystemTime(initialTime);
        const middleware = userAnalysisRateLimit();
        mockRequest.body = { userId: "user-reset-test" };
        // Day 1: Consume all 10 free analysis limits
        for (let i = 0; i < 10; i += 1) {
            middleware(mockRequest, mockResponse, mockNext);
        }
        expect(mockNext).toHaveBeenCalledTimes(10);
        // 11th request on Day 1 is blocked
        middleware(mockRequest, mockResponse, mockNext);
        expect(mockStatus).toHaveBeenCalledWith(429);
        expect(mockNext).toHaveBeenCalledTimes(10);
        // Travel 24.5 hours in the future to Day 2
        jest.setSystemTime(initialTime + 24.5 * 60 * 60 * 1000);
        mockStatus.mockClear();
        // Day 2: Request should bypass blocks and proceed successfully
        middleware(mockRequest, mockResponse, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(11);
        expect(mockStatus).not.toHaveBeenCalled();
        jest.useRealTimers();
    });
});
//# sourceMappingURL=rateLimit.middleware.test.js.map