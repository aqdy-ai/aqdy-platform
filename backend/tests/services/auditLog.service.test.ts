import { describe, test, expect, beforeEach, jest } from "@jest/globals";

const mockSave = jest.fn().mockResolvedValue(true);
const mockFind = jest.fn();

jest.unstable_mockModule("../../src/models/auditLog.model.js", () => ({
  AuditLog: jest.fn().mockImplementation(() => ({ save: mockSave })),
}));

const { AuditLogService } = await import("../../src/services/auditLog.service.js");
const { AuditLog } = await import("../../src/models/auditLog.model.js");

(AuditLog as any).find = mockFind;

const auditLogService = new AuditLogService();

describe("AuditLogService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("should log an event successfully", async () => {
    await auditLogService.logEvent({
      contractId: "contract_123",
      userId: "user_123",
      action: "CONTRACT_UPLOADED",
    });

    expect(mockSave).toHaveBeenCalled();
  });

  test("should get logs by contract", async () => {
    const mockLogs = [{ _id: "1" }, { _id: "2" }];
    mockFind.mockReturnValue({ sort: jest.fn().mockResolvedValue(mockLogs) });

    const result = await auditLogService.getLogsByContract("contract_123");
    expect(result).toHaveLength(2);
  });

  test("should get logs by user", async () => {
    const mockLogs = [{ _id: "1" }];
    mockFind.mockReturnValue({ sort: jest.fn().mockResolvedValue(mockLogs) });

    const result = await auditLogService.getLogsByUser("user_123");
    expect(result).toHaveLength(1);
  });
});