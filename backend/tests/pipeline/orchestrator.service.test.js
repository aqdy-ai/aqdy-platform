import { describe, test, expect, beforeEach, jest } from "@jest/globals";
// ── Mock Setup ────────────────────────────────────────────────────────────────
const mockExtract = jest.fn();
jest.unstable_mockModule("../../src/agents/extractor.agent.js", () => ({
    extractorAgent: { extract: mockExtract },
}));
const mockClassify = jest.fn();
jest.unstable_mockModule("../../src/agents/riskClassifier.agent.js", () => ({
    riskClassifierAgent: { classify: mockClassify },
}));
const mockGenerateRedline = jest.fn();
jest.unstable_mockModule("../../src/agents/redline.agent.js", () => ({
    redlineAgent: { generate: mockGenerateRedline },
}));
const mockSearchKB = jest.fn();
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
const { OrchestratorService } = await import("../../src/pipeline/orchestrator.service.js");
// ── Tests ────────────────────────────────────────────────────────────────────
describe("OrchestratorService", () => {
    let orchestrator;
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
                {
                    clauseNumber: 1,
                    clauseText: "Low risk clause text",
                    clauseType: "general",
                },
                {
                    clauseNumber: 2,
                    clauseText: "Risky clause text",
                    clauseType: "liability",
                },
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
        expect(mockGenerateRedline).toHaveBeenCalledWith("Risky clause text", "high", "liability", "en", undefined, // No RAG match found in this test
        expect.objectContaining({ callbacks: expect.any(Array) }));
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
            clauses: [
                { clauseNumber: 1, clauseText: "Clause 1", clauseType: "liability" },
            ],
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
            clauses: [
                {
                    clauseNumber: 1,
                    clauseText: "Risky clause",
                    clauseType: "liability",
                },
            ],
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
        expect(mockGenerateRedline).toHaveBeenCalledWith("Risky clause", "high", "liability", "en", "The safer alternative text from KB", expect.objectContaining({ callbacks: expect.any(Array) }));
    });
    test("should throw error if the Extractor fails completely", async () => {
        mockExtract.mockRejectedValue(new Error("Extractor crashed completely!"));
        await expect(orchestrator.run("contract_123", "user_123", "Contract Text", "en")).rejects.toThrow("Extractor crashed completely!");
        expect(mockClassify).not.toHaveBeenCalled();
        expect(mockGenerateRedline).not.toHaveBeenCalled();
    });
    // ── Regression: Task 5.30 — Risk Score Aggregation ───────────────────────
    // These tests guard against overallRisk being hardcoded or miscalculated.
    describe("Task 5.30 regression: overallRisk aggregation", () => {
        /**
         * LOW-RISK FIXTURE
         * All clauses are classified as 'low'. The orchestrator's max-weight
         * aggregation must produce overallRisk = 'low'.
         */
        test("low-risk contract fixture: all low clauses → overallRisk 'low'", async () => {
            mockExtract.mockResolvedValue({
                clauses: [
                    { clauseNumber: 1, clauseText: "Standard confidentiality clause.", clauseType: "confidentiality" },
                    { clauseNumber: 2, clauseText: "Routine governing law clause.", clauseType: "governing_law" },
                    { clauseNumber: 3, clauseText: "Standard payment terms of net-30.", clauseType: "payment" },
                    { clauseNumber: 4, clauseText: "Usual intellectual property assignment.", clauseType: "ip" },
                    { clauseNumber: 5, clauseText: "Boilerplate force majeure clause.", clauseType: "force_majeure" },
                ],
                language: "en",
                modelUsed: "gemini-flash",
                usedFallback: false,
                chunkCount: 1,
                durationMs: 50,
            });
            // Every clause comes back as 'low'
            mockClassify.mockResolvedValue({
                riskLevel: "low",
                confidence: 0.92,
                explanation: { ar: "منخفض المخاطر", en: "Low risk standard clause" },
                sourceFromKB: null,
                durationMs: 30,
            });
            // Redline is NOT called for low-risk clauses (orchestrator guard: riskLevel !== 'low')
            mockGenerateRedline.mockResolvedValue({ suggestedText: "N/A", durationMs: 0 });
            const result = await orchestrator.run("low_risk_contract", "user_low", "Low risk contract text", "en");
            // Core assertion: low-risk contract must produce overallRisk = 'low'
            expect(result.executiveSummary.overallRisk).toBe("low");
            // No risky clauses should be counted
            expect(result.executiveSummary.riskyClausesCount).toBe(0);
            expect(result.executiveSummary.totalClauses).toBe(5);
            // Redline should not have been called for any low-risk clause
            expect(mockGenerateRedline).not.toHaveBeenCalled();
        });
        /**
         * HIGH-RISK FIXTURE
         * Clauses include critical and high risk levels. The orchestrator must
         * produce overallRisk = 'critical' (max weight wins).
         */
        test("high-risk contract fixture: critical/high clauses → overallRisk 'critical'", async () => {
            mockExtract.mockResolvedValue({
                clauses: [
                    { clauseNumber: 1, clauseText: "Unlimited liability clause with no cap.", clauseType: "liability" },
                    { clauseNumber: 2, clauseText: "Unilateral termination without cause.", clauseType: "termination" },
                    { clauseNumber: 3, clauseText: "Automatic renewal with 90-day lock-in.", clauseType: "renewal" },
                    { clauseNumber: 4, clauseText: "Arbitration in foreign jurisdiction with no appeal.", clauseType: "dispute_resolution" },
                    { clauseNumber: 5, clauseText: "Penalty clause with no ceiling.", clauseType: "penalty" },
                ],
                language: "en",
                modelUsed: "gemini-flash",
                usedFallback: false,
                chunkCount: 1,
                durationMs: 50,
            });
            // Mix of critical and high to exercise max-weight logic
            mockClassify
                .mockResolvedValueOnce({
                riskLevel: "critical",
                confidence: 0.97,
                explanation: { ar: "بالغ الخطورة", en: "Critical: unlimited liability" },
                sourceFromKB: "kb_unlimited_liability",
                durationMs: 35,
            })
                .mockResolvedValueOnce({
                riskLevel: "high",
                confidence: 0.93,
                explanation: { ar: "عالي الخطورة", en: "High: unilateral termination" },
                sourceFromKB: "kb_termination",
                durationMs: 30,
            })
                .mockResolvedValueOnce({
                riskLevel: "high",
                confidence: 0.88,
                explanation: { ar: "عالي الخطورة", en: "High: auto-renewal lock-in" },
                sourceFromKB: null,
                durationMs: 28,
            })
                .mockResolvedValueOnce({
                riskLevel: "critical",
                confidence: 0.95,
                explanation: { ar: "بالغ الخطورة", en: "Critical: foreign arbitration" },
                sourceFromKB: "kb_arbitration",
                durationMs: 32,
            })
                .mockResolvedValueOnce({
                riskLevel: "high",
                confidence: 0.9,
                explanation: { ar: "عالي الخطورة", en: "High: unlimited penalty" },
                sourceFromKB: "kb_penalty",
                durationMs: 29,
            });
            mockGenerateRedline.mockResolvedValue({
                suggestedText: "Revised safer clause text",
                durationMs: 20,
            });
            const result = await orchestrator.run("high_risk_contract", "user_high", "High risk contract text", "en");
            // Core assertion: high-risk contract must produce overallRisk = 'critical'
            expect(result.executiveSummary.overallRisk).toBe("critical");
            // All 5 clauses must be counted as risky (none are 'low' or 'unknown')
            expect(result.executiveSummary.riskyClausesCount).toBe(5);
            expect(result.executiveSummary.totalClauses).toBe(5);
            // Redline must be called for every non-low clause
            expect(mockGenerateRedline).toHaveBeenCalledTimes(5);
        });
        /**
         * ORDERING INVARIANT
         * The high-risk contract must produce a numerically higher RISK_WEIGHT
         * than the low-risk contract. This guards against any future regression
         * that could collapse all contracts to the same score.
         */
        test("high-risk overallRisk weight must exceed low-risk overallRisk weight", async () => {
            const RISK_WEIGHTS = {
                unknown: 0, low: 1, medium: 2, high: 3, critical: 4,
            };
            // ── Low-risk run ─────────────────────────────────────────────────────
            mockExtract.mockResolvedValue({
                clauses: [
                    { clauseNumber: 1, clauseText: "Simple NDA clause.", clauseType: "confidentiality" },
                    { clauseNumber: 2, clauseText: "Standard payment terms.", clauseType: "payment" },
                ],
                language: "en",
                modelUsed: "gemini-flash",
                usedFallback: false,
                chunkCount: 1,
                durationMs: 30,
            });
            mockClassify.mockResolvedValue({
                riskLevel: "low",
                confidence: 0.9,
                explanation: { ar: "منخفض", en: "Low risk" },
                sourceFromKB: null,
                durationMs: 20,
            });
            const lowResult = await orchestrator.run("low_contract", "user_test", "Low text", "en");
            jest.clearAllMocks();
            // Reset RAG default mock after clearAllMocks
            mockSearchKB.mockResolvedValue({ matches: [], confidence: 0, hasMatch: false });
            // ── High-risk run ─────────────────────────────────────────────────────
            mockExtract.mockResolvedValue({
                clauses: [
                    { clauseNumber: 1, clauseText: "Unlimited liability clause.", clauseType: "liability" },
                    { clauseNumber: 2, clauseText: "Penalty with no ceiling.", clauseType: "penalty" },
                ],
                language: "en",
                modelUsed: "gemini-flash",
                usedFallback: false,
                chunkCount: 1,
                durationMs: 30,
            });
            mockClassify.mockResolvedValue({
                riskLevel: "critical",
                confidence: 0.96,
                explanation: { ar: "حرج", en: "Critical risk" },
                sourceFromKB: "kb_critical",
                durationMs: 25,
            });
            mockGenerateRedline.mockResolvedValue({ suggestedText: "Safer version", durationMs: 15 });
            const highResult = await orchestrator.run("high_contract", "user_test", "High text", "en");
            const lowWeight = RISK_WEIGHTS[lowResult.executiveSummary.overallRisk] ?? 0;
            const highWeight = RISK_WEIGHTS[highResult.executiveSummary.overallRisk] ?? 0;
            // The high-risk contract must produce a strictly higher weight than the low-risk one
            expect(highWeight).toBeGreaterThan(lowWeight);
            // And the high-risk result must exceed the minimum threshold for 'high'
            expect(highWeight).toBeGreaterThanOrEqual(RISK_WEIGHTS["high"]);
        });
    });
});
//# sourceMappingURL=orchestrator.service.test.js.map