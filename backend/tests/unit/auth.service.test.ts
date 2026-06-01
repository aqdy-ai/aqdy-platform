import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import { AppError } from "../../src/middlewares/errorHandler.js";
import { env } from "../../src/config/env.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const mockFindOne = jest.fn();
const mockSave = jest.fn();

class MockUser {
  static findOne = mockFindOne;
  [key: string]: any;

  constructor(data: Record<string, unknown>) {
    Object.assign(this, data);
    this.save = mockSave;
  }
}

jest.unstable_mockModule("../../src/models/user.model.js", () => ({
  User: MockUser,
}));

const { registerUser, loginUser, logoutUser, refreshTokens, verifyAccessToken } =
  await import("../../src/services/auth.service.js");

describe("Auth Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  test("registerUser creates a new user and returns access and refresh tokens", async () => {
    mockFindOne.mockResolvedValue(null);
    mockSave.mockResolvedValue(undefined);

    const result = await registerUser({
      name: "New User",
      email: "new.user@example.com",
      password: "Password123!",
    });

    expect(result.user.email).toBe("new.user@example.com");
    expect(result.token).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(mockSave).toHaveBeenCalled();
  });

  test("registerUser rejects duplicate email with 409", async () => {
    mockFindOne.mockResolvedValue({});

    await expect(
      registerUser({
        name: "Duplicate",
        email: "duplicate@example.com",
        password: "Password123!",
      }),
    ).rejects.toThrow(AppError);
  });

  test("loginUser returns tokens for valid credentials", async () => {
    const foundUser = {
      email: "login.user@example.com",
      status: "active",
      verifyPassword: jest.fn().mockResolvedValue(true),
      save: mockSave,
      role: "user",
      plan: "free",
      _id: "uid123",
    } as any;

    mockFindOne.mockReturnValue({ select: jest.fn().mockResolvedValue(foundUser) });
    mockSave.mockResolvedValue(undefined);

    const result = await loginUser({
      email: "login.user@example.com",
      password: "Password123!",
    });

    expect(result.token).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.email).toBe("login.user@example.com");
    expect(foundUser.verifyPassword).toHaveBeenCalledWith("Password123!");
  });

  test("loginUser rejects wrong password with 401", async () => {
    const foundUser = {
      email: "wrong.password@example.com",
      status: "active",
      verifyPassword: jest.fn().mockResolvedValue(false),
      save: mockSave,
      role: "user",
      plan: "free",
      _id: "uid123",
    } as any;

    mockFindOne.mockReturnValue({ select: jest.fn().mockResolvedValue(foundUser) });

    await expect(
      loginUser({ email: "wrong.password@example.com", password: "BadPass987!" }),
    ).rejects.toThrow(AppError);
  });

  test("logoutUser invalidates refresh token and saves the user", async () => {
    const existingUser = {
      refreshToken: "valid-refresh-token",
      refreshTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
      status: "active",
      save: mockSave,
    } as any;

    mockFindOne.mockReturnValue({ select: jest.fn().mockResolvedValue(existingUser) });
    mockSave.mockResolvedValue(undefined);

    await logoutUser("valid-refresh-token");

    expect(existingUser.refreshToken).toBeUndefined();
    expect(existingUser.refreshTokenExpiresAt).toBeUndefined();
    expect(mockSave).toHaveBeenCalled();
  });

  test("logoutUser rejects an invalid refresh token with 401", async () => {
    mockFindOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    await expect(logoutUser("invalid-refresh-token")).rejects.toThrow(AppError);
  });

  test("refreshTokens returns a new access token and refresh token", async () => {
    const existingUser = {
      refreshToken: "valid-refresh-token",
      refreshTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
      status: "active",
      save: mockSave,
      role: "user",
      plan: "free",
      _id: "uid123",
    } as any;

    mockFindOne.mockReturnValue({ select: jest.fn().mockResolvedValue(existingUser) });
    mockSave.mockResolvedValue(undefined);

    const result = await refreshTokens("valid-refresh-token");

    expect(result.token).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.refreshToken).not.toBe("valid-refresh-token");
    expect(mockSave).toHaveBeenCalled();
  });

  test("refreshTokens rejects an expired or missing refresh token with 401", async () => {
    const expiredUser = {
      refreshToken: "expired-refresh-token",
      refreshTokenExpiresAt: new Date(Date.now() - 1000),
      status: "active",
      save: mockSave,
    } as any;

    mockFindOne.mockReturnValue({ select: jest.fn().mockResolvedValue(expiredUser) });

    await expect(refreshTokens("expired-refresh-token")).rejects.toThrow(AppError);
  });

  test("verifyAccessToken accepts a valid JWT and rejects an invalid JWT", () => {
    const payload = { sub: "uid123", email: "token.user@example.com", role: "user", plan: "free" };
    const token = jwt.sign(payload, env.JWT_SECRET, { algorithm: "HS256" });

    expect(verifyAccessToken(token)).toMatchObject(payload);
    expect(() => verifyAccessToken("bad.token.value")).toThrow(AppError);
  });
});
