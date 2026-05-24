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

// Mock extractorAgent
// Give a permissive mock type so resolved values aren't inferred as `never`.
const mockExtract = jest.fn() as jest.Mock<any>;
jest.unstable_mockModule("../../src/agents/extractor.agent.js", () => ({
  extractorAgent: { extract: mockExtract },
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

const { AnalysisService } = await import(
  "../../src/services/analysis.service.js"
);
const { RiskAnalysis } = await import(
  "../../src/models/riskAnalysis.model.js"
);

(RiskAnalysis as any).findOne = mockFindOne;
(RiskAnalysis as any).find = mockFind;

const analysisService = new AnalysisService();

// ── Tests ────────────────────────────────────────────────────────────────────

describe("AnalysisService", () => {
  beforeEach(() => jest.clearAllMocks());

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
    const MOCK_CLAUSES = [
      {
        clauseNumber: 1,
        clauseText: "The employee shall serve as Senior Engineer.",
        clauseType: "employment-terms",
      },
      {
        clauseNumber: 2,
        clauseText: "Either party may terminate with 30 days notice.",
        clauseType: "termination",
      },
    ];

    beforeEach(() => {
      mockExtract.mockResolvedValue({
        clauses: MOCK_CLAUSES,
        language: "en",
        modelUsed: "gemini-3.5-flash",
        usedFallback: false,
        chunkCount: 1,
        durationMs: 1200,
      });
    });

    test("should call extractorAgent.extract with the correct arguments", async () => {
      await analysisService.triggerAnalysis(
        "contract_abc",
        "user_xyz",
        "Contract text here.",
        "en",
      );

      expect(mockExtract).toHaveBeenCalledTimes(1);
      expect(mockExtract).toHaveBeenCalledWith("Contract text here.", "en");
    });

    test("should persist the analysis with all extracted clauses", async () => {
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

    test("should map extracted clauses to clauseAnalysis with default risk values", async () => {
      const { RiskAnalysis: MockRiskAnalysis } = await import(
        "../../src/models/riskAnalysis.model.js"
      );
      let capturedData: any;
      (MockRiskAnalysis as unknown as jest.Mock).mockImplementation((data) => {
        capturedData = data;
        return { save: mockSave };
      });

      await analysisService.triggerAnalysis(
        "contract_abc",
        "user_xyz",
        "Contract text here.",
        "en",
      );

      expect(capturedData.clauseAnalysis).toHaveLength(2);
      expect(capturedData.clauseAnalysis[0].clauseText).toBe(
        MOCK_CLAUSES[0].clauseText,
      );
      expect(capturedData.clauseAnalysis[0].clauseType).toBe(
        MOCK_CLAUSES[0].clauseType,
      );
      expect(capturedData.clauseAnalysis[0].riskLevel).toBe("unknown");
      expect(capturedData.clauseAnalysis[0].confidence).toBe(1.0);
    });

    test("should set correct executiveSummary totalClauses count", async () => {
      const { RiskAnalysis: MockRiskAnalysis } = await import(
        "../../src/models/riskAnalysis.model.js"
      );
      let capturedData: any;
      (MockRiskAnalysis as unknown as jest.Mock).mockImplementation((data) => {
        capturedData = data;
        return { save: mockSave };
      });

      await analysisService.triggerAnalysis(
        "contract_abc",
        "user_xyz",
        "Contract text here.",
        "en",
      );

      expect(capturedData.executiveSummary.totalClauses).toBe(2);
      expect(capturedData.executiveSummary.overallRisk).toBe("low");
    });
  });

  describe("triggerAnalysis() — retry behavior", () => {
    test("should retry transient extractor failures and succeed", async () => {
      const retryService = new AnalysisService(3, 1);
      let attempts = 0;
      mockExtract.mockImplementation(async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error("Transient LLM error");
        }

        return {
          clauses: [
            {
              clauseNumber: 1,
              clauseText: "The employee shall serve as Senior Engineer.",
              clauseType: "employment-terms",
            },
          ],
          language: "en",
          modelUsed: "gemini-3.5-flash",
          usedFallback: false,
          chunkCount: 1,
          durationMs: 1200,
        };
      });

      await retryService.triggerAnalysis(
        "contract_retry",
        "user_retry",
        "Contract text here.",
        "en",
      );

      expect(mockExtract).toHaveBeenCalledTimes(2);
      expect(mockSave).toHaveBeenCalled();
      expect(mockAuditSave).toHaveBeenCalled();
    });

    test("should write ANALYSIS_FAILED after exhausting retries", async () => {
      const retryService = new AnalysisService(2, 1);
      mockExtract.mockRejectedValue(new Error("LLM unavailable"));

      await expect(
        retryService.triggerAnalysis(
          "contract_fail",
          "user_retry",
          "Some text.",
          "en",
        ),
      ).resolves.toBeUndefined();

      expect(mockExtract).toHaveBeenCalledTimes(2);
      expect(mockSave).not.toHaveBeenCalled();
      expect(mockAuditSave).toHaveBeenCalled();
    });
  });

  // ── triggerAnalysis() — failure ───────────────────────────────────────────

  describe("triggerAnalysis() — extractor failure", () => {
    test("should write ANALYSIS_FAILED audit log when extractor throws", async () => {
      mockExtract.mockRejectedValue(new Error("LLM unavailable"));

      // Should NOT throw — errors are swallowed and audited
      await expect(
        analysisService.triggerAnalysis(
          "contract_fail",
          "user_xyz",
          "Some text.",
          "en",
        ),
      ).resolves.toBeUndefined();

      // AuditLog.save() should have been called (for ANALYSIS_FAILED)
      expect(mockAuditSave).toHaveBeenCalled();
    });

    test("should NOT persist analysis when extractor fails", async () => {
      mockExtract.mockRejectedValue(new Error("Network error"));

      await analysisService.triggerAnalysis(
        "contract_fail",
        "user_xyz",
        "Some text.",
        "en",
      );

      // RiskAnalysis.save() should NOT have been called
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  // ── triggerAnalysis() — Arabic contract ───────────────────────────────────

  describe("triggerAnalysis() — Arabic contract", () => {
    test("should pass Arabic language to the extractor agent", async () => {
      mockExtract.mockResolvedValue({
        clauses: [
          {
            clauseNumber: 1,
            clauseText: "يلتزم الموظف بأداء المهام المنوطة به.",
            clauseType: "employment-terms",
          },
        ],
        language: "ar",
        modelUsed: "gemini-3.5-flash",
        usedFallback: false,
        chunkCount: 1,
        durationMs: 900,
      });

      await analysisService.triggerAnalysis(
        "contract_ar",
        "user_ar",
        "يلتزم الموظف بأداء المهام المنوطة به.",
        "ar",
      );

      expect(mockExtract).toHaveBeenCalledWith(
        "يلتزم الموظف بأداء المهام المنوطة به.",
        "ar",
      );
      expect(mockSave).toHaveBeenCalled();
    });
  });
});