import { describe, test, expect, beforeEach, jest } from "@jest/globals";

// Mock قبل أي import
const mockSave = jest.fn().mockResolvedValue(undefined as any);
const mockFindById = jest.fn();
const mockFind = jest.fn();

jest.unstable_mockModule("../../src/models/contract.model.js", () => ({
  Contract: jest.fn().mockImplementation(() => ({ save: mockSave })),
  ContractZodSchema: {
    parse: jest.fn().mockImplementation((data: any) => {
      if (!data.filename) throw new Error("Validation failed");
      return data;
    }),
  },
}));

const { ContractService } =
  await import("../../src/services/contract.service.js");
const { Contract } = await import("../../src/models/contract.model.js");

(Contract as any).findById = mockFindById;
(Contract as any).find = mockFind;

const contractService = new ContractService();

describe("ContractService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("should save a contract successfully", async () => {
    mockSave.mockResolvedValue({ _id: "mock_id_123" });

    const result = await contractService.saveContract({
      filename: "test.pdf",
      language: "en",
      text: "Sample contract text",
      userId: "user_123",
      fileSize: 1024,
    });

    expect(mockSave).toHaveBeenCalled();
  });

  test("should get contract by ID", async () => {
    const mockContract = { _id: "mock_id_123", filename: "test.pdf" };
    mockFindById.mockResolvedValue(mockContract);

    const result = await contractService.getContractById("mock_id_123");
    expect(result).toEqual(mockContract);
  });

  test("should return null if contract not found", async () => {
    mockFindById.mockResolvedValue(null);

    const result = await contractService.getContractById("nonexistent_id");
    expect(result).toBeNull();
  });

  test("should get contracts by user", async () => {
    const mockContracts = [{ _id: "1" }, { _id: "2" }];
    mockFind.mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockContracts),
    });

    const result = await contractService.getContractsByUser("user_123");
    expect(result).toHaveLength(2);
  });

  test("should fail validation with invalid data", async () => {
    await expect(
      contractService.saveContract({
        filename: "",
        language: "en",
        text: "text",
        userId: "user_123",
        fileSize: 1024,
      }),
    ).rejects.toThrow();
  });
});
