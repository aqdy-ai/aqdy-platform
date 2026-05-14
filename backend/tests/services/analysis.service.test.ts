import { describe, test, expect, beforeEach, jest } from "@jest/globals";

const mockSave = jest.fn().mockResolvedValue(true);
const mockFindOne = jest.fn();
const mockFind = jest.fn();

jest.unstable_mockModule("../../src/models/riskAnalysis.model.js", () => ({
  RiskAnalysis: jest.fn().mockImplementation(() => ({ save: mockSave })),
  RiskAnalysisZodSchema: {
    parse: jest.fn().mockReturnValue(true),
  },
}));

const { AnalysisService } = await import("../../src/services/analysis.service.js");
const { RiskAnalysis } = await import("../../src/models/riskAnalysis.model.js");

(RiskAnalysis as any).findOne = mockFindOne;
(RiskAnalysis as any).find = mockFind;

const analysisService = new AnalysisService();

describe("AnalysisService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("should save analysis successfully", async () => {
    const result = await analysisService.saveAnalysis({
      contractId: "contract_123",
      userId: "user_123",
      executiveSummary: {
        overallRisk: "high",
        totalClauses: 10,
        riskyClausesCount: 3,
        summary: { ar: "ملخص", en: "Summary" },
      },
      clauseAnalysis: [],
      analysisDuration: 2500,
    });

    expect(mockSave).toHaveBeenCalled();
  });

  test("should get analysis by contract ID", async () => {
    const mockAnalysis = { _id: "analysis_123", contractId: "contract_123" };
    mockFindOne.mockReturnValue({ sort: jest.fn().mockResolvedValue(mockAnalysis) });

    const result = await analysisService.getAnalysisByContractId("contract_123");
    expect(result).toEqual(mockAnalysis);
  });

  test("should return null if analysis not found", async () => {
    mockFindOne.mockReturnValue({ sort: jest.fn().mockResolvedValue(null) });

    const result = await analysisService.getAnalysisByContractId("nonexistent");
    expect(result).toBeNull();
  });
});