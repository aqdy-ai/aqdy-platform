import { describe, test, expect, beforeEach, jest } from "@jest/globals";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSave = jest.fn() as jest.Mock<any>;
mockSave.mockResolvedValue(true);
const mockFindOneChain = { sort: jest.fn() as jest.Mock<any> };
const mockFind = jest.fn() as jest.Mock<any>;

jest.unstable_mockModule("../../src/models/riskAnalysis.model.js", () => ({
  RiskAnalysis: jest.fn().mockImplementation(() => ({ save: mockSave })),
  RiskAnalysisZodSchema: {
    parse: jest.fn().mockReturnValue(true),
  },
}));

jest.unstable_mockModule("../../src/models/auditLog.model.js", () => ({
  AuditLog: jest.fn().mockImplementation(() => ({ save: jest.fn() })),
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

const { AnalysisService } =
  await import("../../src/services/analysis.service.js");
const { RiskAnalysis } = await import("../../src/models/riskAnalysis.model.js");

(RiskAnalysis as any).findOne = jest.fn();
(RiskAnalysis as any).find = mockFind;

const analysisService = new AnalysisService();

// ── Tests ────────────────────────────────────────────────────────────────────

describe("AnalysisService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (RiskAnalysis as any).findOne.mockReturnValue(mockFindOneChain);
    mockFindOneChain.sort.mockResolvedValue(null);
    mockSave.mockResolvedValue(true);
  });

  // ── saveAnalysis() ────────────────────────────────────────────────────────

  describe("saveAnalysis()", () => {
    test("should save analysis successfully", async () => {
      mockFindOneChain.sort.mockResolvedValue(null);

      await analysisService.saveAnalysis({
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

    test("should auto-increment version when previous analysis exists", async () => {
      const previousAnalysis = {
        _id: "prev_001",
        contractId: "contract_123",
        version: 3,
        clauseAnalysis: [],
      };
      mockFindOneChain.sort.mockResolvedValue(previousAnalysis);

      await analysisService.saveAnalysis({
        contractId: "contract_123",
        userId: "user_123",
        executiveSummary: {
          overallRisk: "medium",
          totalClauses: 5,
          riskyClausesCount: 1,
          summary: { ar: "ملخص", en: "Summary" },
        },
        clauseAnalysis: [],
        analysisDuration: 1000,
      });

      expect(mockSave).toHaveBeenCalled();
    });
  });

  // ── getAnalysisByContractId() ────────────────────────────────────────────

  describe("getAnalysisByContractId()", () => {
    test("should get analysis by contract ID", async () => {
      const mockAnalysis = { _id: "analysis_123", contractId: "contract_123" };
      mockFindOneChain.sort.mockResolvedValue(mockAnalysis);

      const result =
        await analysisService.getAnalysisByContractId("contract_123");
      expect(result).toEqual(mockAnalysis);
    });

    test("should return null if analysis not found", async () => {
      mockFindOneChain.sort.mockResolvedValue(null);

      const result =
        await analysisService.getAnalysisByContractId("nonexistent");
      expect(result).toBeNull();
    });
  });

  // ── getAnalysesByUser() ─────────────────────────────────────────────────

  describe("getAnalysesByUser()", () => {
    test("should return list of analyses for a user", async () => {
      const mockAnalyses = [
        { _id: "a1", userId: "user_123" },
        { _id: "a2", userId: "user_123" },
      ];
      mockFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockAnalyses),
      });

      const result = await analysisService.getAnalysesByUser("user_123");
      expect(result).toHaveLength(2);
    });
  });

  // ── getAnalysisVersionsByContractId() ──────────────────────────────────

  describe("getAnalysisVersionsByContractId()", () => {
    test("should return version list with select and lean", async () => {
      const mockVersions = [
        { _id: "v1", version: 1, createdAt: new Date() },
        { _id: "v2", version: 2, createdAt: new Date() },
      ];
      const mockSelect = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockVersions),
        }),
      });
      mockFind.mockReturnValue({ select: mockSelect });

      const result =
        await analysisService.getAnalysisVersionsByContractId("contract_123");
      expect(result).toHaveLength(2);
    });
  });

  // ── getAnalysisById() ─────────────────────────────────────────────────

  describe("getAnalysisById()", () => {
    test("should find analysis by ID", async () => {
      const mockAnalysis = { _id: "analysis_123" };
      (RiskAnalysis as any).findById = jest
        .fn()
        .mockResolvedValue(mockAnalysis);

      const result = await analysisService.getAnalysisById("analysis_123");
      expect(result).toEqual(mockAnalysis);
    });
  });

  // ── generateDiffSummary() ─────────────────────────────────────────────

  describe("generateDiffSummary()", () => {
    test("should generate diff summary between two clause sets", () => {
      const previousClauses = [
        { clauseType: "termination", riskLevel: "low", clauseText: "30 days" },
      ];
      const currentClauses = [
        {
          clauseType: "termination",
          riskLevel: "high",
          clauseText: "60 days",
        },
      ];

      const diff = analysisService.generateDiffSummary(
        previousClauses as any,
        currentClauses as any,
        1,
      );

      expect(diff.totalChanged).toBe(1);
      expect(diff.changedClauses[0].direction).toBe("escalated");
      expect(diff.comparedToVersion).toBe(1);
    });

    test("should return no changes when risk levels are identical", () => {
      const clauses = [
        { clauseType: "termination", riskLevel: "low", clauseText: "30 days" },
      ];

      const diff = analysisService.generateDiffSummary(
        clauses as any,
        clauses as any,
        1,
      );

      expect(diff.totalChanged).toBe(0);
    });
  });
});
