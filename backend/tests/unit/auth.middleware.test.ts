import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { Request, Response, NextFunction } from "express";

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

const { authenticateJwt, requireAuth } = await import(
  "../../src/middlewares/auth.middleware.js"
);

describe("Auth Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock<any, any>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      headers: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  test("should reject requests with missing Authorization header", async () => {
    await authenticateJwt(
      mockRequest as Request,
      mockResponse as Response,
      mockNext as unknown as NextFunction,
    );

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
  });

  test("should reject requests with an invalid token", async () => {
    mockRequest.headers = { authorization: "Bearer invalid.token.value" };
    mockVerifyAccessToken.mockImplementation(() => {
      throw new Error("Invalid token");
    });

    await authenticateJwt(
      mockRequest as Request,
      mockResponse as Response,
      mockNext as unknown as NextFunction,
    );

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
  });

  test("should reject requests for a missing or inactive user", async () => {
    mockRequest.headers = { authorization: "Bearer valid.token.value" };
    mockVerifyAccessToken.mockReturnValue({ sub: "missing-user" });
    mockFindById.mockResolvedValue(null);

    await authenticateJwt(
      mockRequest as Request,
      mockResponse as Response,
      mockNext as unknown as NextFunction,
    );

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
  });

  test("should allow requests with a valid token and active user", async () => {
    mockRequest.headers = { authorization: "Bearer valid.token.value" };
    mockVerifyAccessToken.mockReturnValue({ sub: "active-user" });
    mockFindById.mockResolvedValue({ status: "active" });

    await authenticateJwt(
      mockRequest as Request,
      mockResponse as Response,
      mockNext as unknown as NextFunction,
    );

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext.mock.calls[0][0]).toBeUndefined();
  });

  test("requireAuth should throw if authentication state is missing", () => {
    const mockReq: Partial<Request> = {};
    const mockNextFn = jest.fn();

    requireAuth(mockReq as Request, mockResponse as Response, mockNextFn as unknown as NextFunction);

    expect(mockNextFn).toHaveBeenCalledTimes(1);
    expect(mockNextFn.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
  });
});
