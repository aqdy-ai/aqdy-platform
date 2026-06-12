import { describe, test, expect, beforeEach, jest } from "@jest/globals";

// ── Mock Setup ────────────────────────────────────────────────────────────────

const mockExtract = jest.fn() as jest.Mock<any>;
jest.unstable_mockModule("../../src/agents/extractor.agent.js", () => ({
  extractorAgent: { extract: mockExtract },
}));

const mockClassify = jest.fn() as jest.Mock<any>;
jest.unstable_mockModule("../../src/agents/riskClassifier.agent.js", () => ({
  riskClassifierAgent: { classify: mockClassify },
}));

const mockGenerateRedline = jest.fn() as jest.Mock<any>;
jest.unstable_mockModule("../../src/agents/redline.agent.js", () => ({
  redlineAgent: { generate: mockGenerateRedline },
}));

const mockSearchKB = jest.fn() as jest.Mock<any>;
jest.unstable_mockModule("../../src/services/rag.service.js", () => ({
  ragService: { searchKB: mockSearchKB },
}));

// Mock Langfuse Callback Handler factory
jest.unstable_mockModule("../../src/config/langfuse.config.js", () => ({
  createLangfuseHandler: jest.fn().mockReturnValue({
    shutdownAsync: jest.fn().mockResolvedValue(true),
  }),
  logAgentExecution: jest.fn(),
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

const { OrchestratorService } = await import(
  "../../src/pipeline/orchestrator.service.js"
);

// ── Tests ────────────────────────────────────────────────────────────────────

describe("OrchestratorService", () => {
  let orchestrator: InstanceType<typeof OrchestratorService>;

  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator = new OrchestratorService();

    // Default RAG mock
    mockSearchKB.mockResolvedValue({
      matches: [],
      confidence: 0,
      hasMatch: false,
    });
  });

  test("should successfully execute full pipeline for a contract", async () => {
    // 1. Mock Extractor returning 2 clauses
    mockExtract.mockResolvedValue({
      clauses: [
        { clauseNumber: 1, clauseText: "Low risk clause text", clauseType: "general" },
        { clauseNumber: 2, clauseText: "Risky clause text", clauseType: "liability" },
      ],
      language: "en",
      modelUsed: "gemini-3.5-flash",
      usedFallback: false,
      chunkCount: 1,
      durationMs: 100,
    });

    // 2. Mock Classifier responses
    mockClassify
      .mockResolvedValueOnce({
        riskLevel: "low",
        confidence: 0.9,
        explanation: { ar: "منخفض", en: "Low" },
        sourceFromKB: null,
      })
      .mockResolvedValueOnce({
        riskLevel: "high",
        confidence: 0.85,
        explanation: { ar: "مرتفع", en: "High" },
        sourceFromKB: "kb_clause_002",
      });

    // 3. Mock Redline response (only called for clause 2)
    mockGenerateRedline.mockResolvedValue({
      suggestedText: "Capped liability text",
      explanation: { ar: "بديل", en: "Alternative" },
      talkingPoints: { ar: ["نقطة"], en: ["Point"] },
      confidence: 0.88,
    });

    const result = await orchestrator.run("contract_123", "user_123", "Contract Text", "en");

    // 4. Assertions
    expect(mockExtract).toHaveBeenCalledTimes(1);
    expect(mockClassify).toHaveBeenCalledTimes(2);
    expect(mockGenerateRedline).toHaveBeenCalledTimes(1); // Only for the high risk one
    expect(mockGenerateRedline).toHaveBeenCalledWith(
      "Risky clause text",
      "high",
      "liability",
      "en",
      undefined // No RAG match found in this test
    );

    expect(result.executiveSummary.overallRisk).toBe("high");
    expect(result.executiveSummary.riskyClausesCount).toBe(1);
    expect(result.executiveSummary.totalClauses).toBe(2);
    expect(result.clauseAnalysis).toHaveLength(2);
    expect(result.clauseAnalysis[0].riskLevel).toBe("low");
    expect(result.clauseAnalysis[0].redlineSuggestion).toBeUndefined();
    expect(result.clauseAnalysis[1].riskLevel).toBe("high");
    expect(result.clauseAnalysis[1].redlineSuggestion).toBe("Capped liability text");
  });

  test("should isolate classifier failure and continue processing other clauses", async () => {
    mockExtract.mockResolvedValue({
      clauses: [
        { clauseNumber: 1, clauseText: "Clause 1", clauseType: "general" },
        { clauseNumber: 2, clauseText: "Clause 2", clauseType: "general" },
      ],
      language: "en",
      modelUsed: "gemini-3.5-flash",
      usedFallback: false,
      chunkCount: 1,
      durationMs: 100,
    });

    // Clause 1 classifier throws error, Clause 2 succeeds
    mockClassify
      .mockRejectedValueOnce(new Error("Classifier crashed!"))
      .mockResolvedValueOnce({
        riskLevel: "medium",
        confidence: 0.8,
        explanation: { ar: "متوسط", en: "Medium" },
        sourceFromKB: null,
      });

    mockGenerateRedline.mockResolvedValue({
      suggestedText: "Redline suggest",
      explanation: { ar: "بديل", en: "Alternative" },
      talkingPoints: { ar: ["نقطة"], en: ["Point"] },
      confidence: 0.9,
    });

    const result = await orchestrator.run("contract_123", "user_123", "Contract Text", "en");

    expect(mockClassify).toHaveBeenCalledTimes(2);
    expect(mockGenerateRedline).toHaveBeenCalledTimes(1); // Called for Clause 2 (medium risk)

    expect(result.clauseAnalysis).toHaveLength(2);
    // Clause 1 has default unknown fallback
    expect(result.clauseAnalysis[0].riskLevel).toBe("unknown");
    expect(result.clauseAnalysis[0].confidence).toBe(0.0);
    // Clause 2 classified and redlined successfully
    expect(result.clauseAnalysis[1].riskLevel).toBe("medium");
    expect(result.clauseAnalysis[1].redlineSuggestion).toBe("Redline suggest");
  });

  test("should isolate redliner failure and preserve classification for that clause", async () => {
    mockExtract.mockResolvedValue({
      clauses: [{ clauseNumber: 1, clauseText: "Clause 1", clauseType: "liability" }],
      language: "en",
      modelUsed: "gemini-3.5-flash",
      usedFallback: false,
      chunkCount: 1,
      durationMs: 100,
    });

    mockClassify.mockResolvedValue({
      riskLevel: "critical",
      confidence: 0.95,
      explanation: { ar: "حرِج", en: "Critical" },
      sourceFromKB: null,
    });

    // Redliner fails
    mockGenerateRedline.mockRejectedValueOnce(new Error("Redliner crashed!"));

    const result = await orchestrator.run("contract_123", "user_123", "Contract Text", "en");

    expect(result.clauseAnalysis).toHaveLength(1);
    expect(result.clauseAnalysis[0].riskLevel).toBe("critical");
    expect(result.clauseAnalysis[0].confidence).toBe(0.95);
    expect(result.clauseAnalysis[0].redlineSuggestion).toBeUndefined(); // graceful fallback
  });

  test("should pass RAG safer alternative to Redliner if available", async () => {
    mockExtract.mockResolvedValue({
      clauses: [{ clauseNumber: 1, clauseText: "Risky clause", clauseType: "liability" }],
      language: "en",
      modelUsed: "gemini-3.5-flash",
      usedFallback: false,
      chunkCount: 1,
      durationMs: 100,
    });

    mockSearchKB.mockResolvedValue({
      hasMatch: true,
      matches: [
        {
          id: "kb_match_99",
          score: 0.88,
          saferAlternative: {
            ar: "البديل العربي",
            en: "The safer alternative text from KB",
          },
        },
      ],
      confidence: 0.9,
    });

    mockClassify.mockResolvedValue({
      riskLevel: "high",
      confidence: 0.9,
      explanation: { ar: "شرح", en: "Explain" },
      sourceFromKB: "kb_match_99",
      saferAlternative: "The safer alternative text from KB",
    });

    mockGenerateRedline.mockResolvedValue({
      suggestedText: "Redline revision",
      explanation: { ar: "شرح التعديل", en: "Explain change" },
      talkingPoints: { ar: ["نقطة"], en: ["Point"] },
      confidence: 0.92,
    });

    await orchestrator.run("contract_123", "user_123", "Contract Text", "en");

    // mockSearchKB is internal to riskClassifierAgent.classify which is fully mocked —
    // the safer alternative is propagated via classification.saferAlternative instead.
    expect(mockGenerateRedline).toHaveBeenCalledWith(
      "Risky clause",
      "high",
      "liability",
      "en",
      "The safer alternative text from KB"
    );
  });

  test("should throw error if the Extractor fails completely", async () => {
    mockExtract.mockRejectedValue(new Error("Extractor crashed completely!"));

    await expect(
      orchestrator.run("contract_123", "user_123", "Contract Text", "en")
    ).rejects.toThrow("Extractor crashed completely!");

    expect(mockClassify).not.toHaveBeenCalled();
    expect(mockGenerateRedline).not.toHaveBeenCalled();
  });
});
