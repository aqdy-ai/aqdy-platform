import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import bcrypt from "bcryptjs";
import { AppError } from "../../src/middlewares/errorHandler.js";
const mockFindById = jest.fn();
const mockFindOne = jest.fn();
const mockSave = jest.fn();
class MockQuery {
    result;
    constructor(result) {
        this.result = result;
    }
    select(path) {
        return this;
    }
    then(onfulfilled, onrejected) {
        return Promise.resolve(this.result).then(onfulfilled, onrejected);
    }
}
class MockUser {
    static findById = (id) => {
        const val = mockFindById(id);
        return new MockQuery(val);
    };
    static findOne = mockFindOne;
    constructor(data) {
        Object.assign(this, data);
        this.save = mockSave;
    }
}
jest.unstable_mockModule("../../src/models/user.model.js", () => ({
    User: MockUser,
}));
const { getProfile, updateProfile, deleteAccount } = await import("../../src/services/account.service.js");
const createUser = async (overrides = {}) => {
    const passwordHash = await bcrypt.hash("StrongPass123!", 12);
    const user = {
        _id: "uid123",
        name: "Test User",
        email: "test@example.com",
        plan: "free",
        status: "active",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        lastLogin: new Date("2025-02-01T00:00:00Z"),
        passwordHash,
        verifyPassword: jest
            .fn()
            .mockResolvedValue(true),
        save: mockSave,
        ...overrides,
    };
    user.select = jest
        .fn()
        .mockResolvedValue(user);
    return user;
};
describe("Account Service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    test("getProfile returns profile data for active user", async () => {
        const user = await createUser();
        mockFindById.mockReturnValue(user);
        const profile = await getProfile("uid123");
        expect(profile).toEqual({
            name: "Test User",
            email: "test@example.com",
            plan: "free",
            memberSince: user.createdAt,
            lastLogin: user.lastLogin,
            hasPassword: true,
        });
        expect(mockFindById).toHaveBeenCalledWith("uid123");
    });
    test("getProfile throws 404 for missing or inactive user", async () => {
        mockFindById.mockReturnValue(null);
        await expect(getProfile("uid123")).rejects.toThrow(AppError);
    });
    test("updateProfile updates name and email", async () => {
        const user = await createUser({
            email: "old@example.com",
            name: "Old Name",
        });
        mockFindById.mockReturnValue(user);
        mockFindOne.mockResolvedValue(null);
        mockSave.mockResolvedValue(undefined);
        const updated = await updateProfile("uid123", {
            name: "New Name",
            email: "new@example.com",
        });
        expect(updated.name).toBe("New Name");
        expect(updated.email).toBe("new@example.com");
        expect(mockFindOne).toHaveBeenCalledWith({ email: "new@example.com" });
        expect(mockSave).toHaveBeenCalled();
    });
    test("updateProfile rejects duplicate email", async () => {
        const user = await createUser();
        mockFindById.mockReturnValue(user);
        mockFindOne.mockResolvedValue({ _id: "other" });
        await expect(updateProfile("uid123", { email: "duplicate@example.com" })).rejects.toThrow(AppError);
        expect(mockFindOne).toHaveBeenCalledWith({
            email: "duplicate@example.com",
        });
    });
    test("updateProfile changes password with valid current password", async () => {
        const user = await createUser();
        user.verifyPassword = jest
            .fn()
            .mockResolvedValue(true);
        mockFindById.mockReturnValue(user);
        mockFindOne.mockResolvedValue(null);
        mockSave.mockResolvedValue(undefined);
        const updated = await updateProfile("uid123", {
            password: "NewStrongPass123!",
            currentPassword: "StrongPass123!",
        });
        expect(user.verifyPassword).toHaveBeenCalledWith("StrongPass123!");
        expect(updated.passwordHash).not.toBeUndefined();
        const matches = await bcrypt.compare("NewStrongPass123!", updated.passwordHash);
        expect(matches).toBe(true);
        expect(mockSave).toHaveBeenCalled();
    });
    test("updateProfile rejects password change without current password", async () => {
        const user = await createUser();
        mockFindById.mockReturnValue(user);
        await expect(updateProfile("uid123", { password: "NewStrongPass123!" })).rejects.toThrow(AppError);
        expect(mockSave).not.toHaveBeenCalled();
    });
    test("updateProfile rejects incorrect current password", async () => {
        const user = await createUser();
        user.verifyPassword = jest
            .fn()
            .mockResolvedValue(false);
        mockFindById.mockReturnValue(user);
        await expect(updateProfile("uid123", {
            password: "NewStrongPass123!",
            currentPassword: "WrongPass123!",
        })).rejects.toThrow(AppError);
        expect(user.verifyPassword).toHaveBeenCalledWith("WrongPass123!");
        expect(mockSave).not.toHaveBeenCalled();
    });
    test("deleteAccount soft deletes active user", async () => {
        const user = await createUser();
        mockFindById.mockReturnValue(user);
        mockSave.mockResolvedValue(undefined);
        await deleteAccount("uid123");
        expect(user.status).toBe("deleted");
        expect(user.refreshToken).toBeUndefined();
        expect(user.refreshTokenExpiresAt).toBeUndefined();
        expect(mockSave).toHaveBeenCalled();
    });
    test("deleteAccount rejects already deleted or missing user", async () => {
        const user = await createUser({ status: "deleted" });
        mockFindById.mockReturnValue(user);
        await expect(deleteAccount("uid123")).rejects.toThrow(AppError);
    });
});
//# sourceMappingURL=account.service.test.js.map