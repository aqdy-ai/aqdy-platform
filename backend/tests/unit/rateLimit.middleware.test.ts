import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { Request, Response, NextFunction } from "express";
import {
  anonymousIpRateLimit,
  resetRateLimitStores,
  userAnalysisRateLimit,
} from "../../src/middlewares/rateLimit.js";

describe("Rate Limit Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockStatus: jest.Mock<any, any>;
  let mockJson: jest.Mock<any, any>;

  beforeEach(() => {
    resetRateLimitStores();
    mockStatus = jest.fn().mockReturnThis();
    mockJson = jest.fn();
    mockResponse = {
      status: mockStatus,
      json: mockJson,
      setHeader: jest.fn(),
    } as unknown as Response;
    mockNext = jest.fn() as NextFunction;
    mockRequest = {
      body: {},
      headers: {},
      ip: "127.0.0.1",
    };
  });

  test("should allow free tier user requests within the daily limit", () => {
    const middleware = userAnalysisRateLimit();
    mockRequest.body = { userId: "user-1" } as any;

    for (let i = 0; i < 10; i += 1) {
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
    }

    expect(mockNext).toHaveBeenCalledTimes(10);
    expect(mockStatus).not.toHaveBeenCalled();
  });

  test("should allow the request exactly at the free tier daily limit", () => {
    const middleware = userAnalysisRateLimit();
    mockRequest.body = { userId: "user-2" } as any;

    for (let i = 0; i < 9; i += 1) {
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
    }

    middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(10);
    expect(mockStatus).not.toHaveBeenCalled();
  });

  test("should block a free tier user one request over the daily limit with 429 and Retry-After", () => {
    const middleware = userAnalysisRateLimit();
    mockRequest.body = { userId: "user-3" } as any;

    for (let i = 0; i < 10; i += 1) {
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
    }

    middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(10);
    expect(mockStatus).toHaveBeenCalledWith(429);
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      "Retry-After",
      expect.any(String),
    );
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining("Free tier daily analysis limit exceeded"),
      }),
    );
  });

  test("should limit unauthenticated anonymous IP requests", () => {
    const middleware = anonymousIpRateLimit();
    mockRequest.headers = {};
    mockRequest.ip = "10.10.10.10";

    for (let i = 0; i < 20; i += 1) {
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
    }

    middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(20);
    expect(mockStatus).toHaveBeenCalledWith(429);
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      "Retry-After",
      expect.any(String),
    );
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining("Too many requests from this IP address"),
      }),
    );
  });
});
