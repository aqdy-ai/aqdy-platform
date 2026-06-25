import { describe, test, expect, beforeEach, jest } from "@jest/globals";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSave = jest.fn() as jest.Mock<any>;
mockSave.mockResolvedValue(true);
const mockFindOne = jest.fn() as jest.Mock<any>;
const mockFind = jest.fn() as jest.Mock<any>;

jest.unstable_mockModule("../../src/models/riskAnalysis.model.js", () => ({
  RiskAnalysis: jest.fn().mockImplementation(() => ({ save: mockSave })),
  RiskAnalysisZodSchema: {
    parse: jest.fn().mockReturnValue(true),
  },
}));

// Mock AuditLog constructor + save
const mockAuditSave = jest.fn() as jest.Mock<any>;
mockAuditSave.mockResolvedValue(true);
jest.unstable_mockModule("../../src/models/auditLog.model.js", () => ({
  AuditLog: jest.fn().mockImplementation(() => ({ save: mockAuditSave })),
}));

// Mock orchestratorService
const mockRun = jest.fn() as jest.Mock<any>;
jest.unstable_mockModule("../../src/pipeline/orchestrator.service.js", () => ({
  orchestratorService: { run: mockRun },
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

const { AnalysisService } =
  await import("../../src/services/analysis.service.js");
const { RiskAnalysis } = await import("../../src/models/riskAnalysis.model.js");

(RiskAnalysis as any).findOne = mockFindOne;
(RiskAnalysis as any).find = mockFind;

const analysisService = new AnalysisService(3, 1);

// ── Tests ────────────────────────────────────────────────────────────────────

describe("AnalysisService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(null),
    });
  });

  // ── saveAnalysis() ────────────────────────────────────────────────────────

  describe("saveAnalysis()", () => {
    test("should save analysis successfully", async () => {
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

    test("should get analysis by contract ID", async () => {
      const mockAnalysis = { _id: "analysis_123", contractId: "contract_123" };
      const mockSort = jest.fn() as jest.Mock<any>;
      mockSort.mockResolvedValue(mockAnalysis);

      mockFindOne.mockReturnValue({ sort: mockSort });

      const result =
        await analysisService.getAnalysisByContractId("contract_123");
      expect(result).toEqual(mockAnalysis);
    });

    test("should return null if analysis not found", async () => {
      const mockSortNull = jest.fn() as jest.Mock<any>;
      mockSortNull.mockResolvedValue(null);

      mockFindOne.mockReturnValue({ sort: mockSortNull });

      const result =
        await analysisService.getAnalysisByContractId("nonexistent");
      expect(result).toBeNull();
    });
  });

  // ── triggerAnalysis() — success ───────────────────────────────────────────

  describe("triggerAnalysis() — success", () => {
    const MOCK_ORCHESTRATOR_RESULT = {
      executiveSummary: {
        overallRisk: "high" as const,
        totalClauses: 2,
        riskyClausesCount: 1,
        summary: { ar: "ملخص العقد", en: "Contract summary" },
      },
      clauseAnalysis: [
        {
          clauseText: "The employee shall serve as Senior Engineer.",
          clauseType: "employment-terms",
          riskLevel: "low" as const,
          confidence: 0.95,
          explanation: { ar: "لا توجد مخاطر", en: "No risks" },
          sourceFromKB: null,
        },
        {
          clauseText: "Either party may terminate with 30 days notice.",
          clauseType: "termination",
          riskLevel: "high" as const,
          confidence: 0.85,
          explanation: { ar: "مخاطر عالية", en: "High risks" },
          sourceFromKB: "kb_match_123",
          redlineSuggestion: "Suggested redline text",
        },
      ],
      extractionMeta: {
        modelUsed: "gemini-3.5-flash",
        usedFallback: false,
        chunkCount: 1,
      },
      durationMs: 1200,
    };

    beforeEach(() => {
      mockRun.mockResolvedValue(MOCK_ORCHESTRATOR_RESULT);
    });

    test("should call orchestratorService.run with the correct arguments", async () => {
      await analysisService.triggerAnalysis(
        "contract_abc",
        "user_xyz",
        "Contract text here.",
        "en",
      );

      expect(mockRun).toHaveBeenCalledTimes(1);
      expect(mockRun).toHaveBeenCalledWith(
        "contract_abc",
        "user_xyz",
        "Contract text here.",
        "en",
      );
    });

    test("should persist the analysis with all orchestrator outputs", async () => {
      await analysisService.triggerAnalysis(
        "contract_abc",
        "user_xyz",
        "Contract text here.",
        "en",
      );

      expect(mockSave).toHaveBeenCalled();
    });

    test("should write ANALYSIS_COMPLETED audit log on success", async () => {
      await analysisService.triggerAnalysis(
        "contract_abc",
        "user_xyz",
        "Contract text here.",
        "en",
      );

      expect(mockAuditSave).toHaveBeenCalled();
    });
  });

  // ── triggerAnalysis() — retry behavior ───────────────────────────────────

  describe("triggerAnalysis() — retry behavior", () => {
    test("should retry transient orchestrator failures and succeed", async () => {
      const retryService = new AnalysisService(3, 1);
      let attempts = 0;
      mockRun.mockImplementation(async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error("Transient orchestrator network error");
        }

        return {
          executiveSummary: {
            overallRisk: "low",
            totalClauses: 1,
            riskyClausesCount: 0,
            summary: { ar: "ملخص", en: "Summary" },
          },
          clauseAnalysis: [],
          extractionMeta: {
            modelUsed: "gemini-3.5-flash",
            usedFallback: false,
            chunkCount: 1,
          },
          durationMs: 500,
        };
      });

      await retryService.triggerAnalysis(
        "contract_retry",
        "user_retry",
        "Contract text here.",
        "en",
      );

      expect(mockRun).toHaveBeenCalledTimes(2);
      expect(mockSave).toHaveBeenCalled();
      expect(mockAuditSave).toHaveBeenCalled();
    });

    test("should write ANALYSIS_FAILED after exhausting retries", async () => {
      const retryService = new AnalysisService(2, 1);
      mockRun.mockRejectedValue(new Error("LLM service unavailable"));

      await expect(
        retryService.triggerAnalysis(
          "contract_fail",
          "user_retry",
          "Some text.",
          "en",
        ),
      ).resolves.toBeUndefined();

      expect(mockRun).toHaveBeenCalledTimes(2);
      expect(mockSave).not.toHaveBeenCalled();
      expect(mockAuditSave).toHaveBeenCalled();
    });
  });
});
