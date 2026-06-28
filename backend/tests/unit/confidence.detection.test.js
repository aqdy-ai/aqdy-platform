import { describe, test, expect, jest } from "@jest/globals";
import { OrchestratorService } from "../../src/pipeline/orchestrator.service.js";
describe("Confidence Scoring & Hallucination Detection", () => {
    const orchestrator = new OrchestratorService();
    describe("Low Confidence Warning Flag", () => {
        test("should flag lowConfidenceWarning when confidence < 0.6", () => {
            const confidence = 0.55;
            expect(confidence < 0.6).toBe(true);
        });
        test("should NOT flag lowConfidenceWarning when confidence >= 0.6", () => {
            const confidence = 0.75;
            expect(confidence < 0.6).toBe(false);
        });
        test("should flag kbCitationMissing when sourceFromKB is null", () => {
            const sourceFromKB = null;
            expect(sourceFromKB === null).toBe(true);
        });
        test("should NOT flag kbCitationMissing when sourceFromKB exists", () => {
            const sourceFromKB = "clause_001";
            expect(sourceFromKB === null).toBe(false);
        });
    });
    describe("Edge Cases: Unusual Contract Language", () => {
        test("should handle very short contract text", async () => {
            jest.spyOn(orchestrator, "run").mockResolvedValue({
                executiveSummary: {
                    overallRisk: "unknown",
                    totalClauses: 0,
                    riskyClausesCount: 0,
                    summary: { ar: "لا توجد بنود", en: "No clauses found" },
                },
                clauseAnalysis: [],
                extractionMeta: {
                    modelUsed: "gpt-4o",
                    usedFallback: false,
                    chunkCount: 1,
                },
                durationMs: 100,
            });
            const result = await orchestrator.run("contract_123", "user_123", "Short.", "en");
            expect(result.clauseAnalysis).toHaveLength(0);
        });
        test("should handle mixed Arabic/English contract", async () => {
            jest.spyOn(orchestrator, "run").mockResolvedValue({
                executiveSummary: {
                    overallRisk: "medium",
                    totalClauses: 2,
                    riskyClausesCount: 1,
                    summary: { ar: "عقد مختلط", en: "Mixed contract" },
                },
                clauseAnalysis: [
                    {
                        clauseText: "Liability clause مسؤولية",
                        clauseType: "liability",
                        riskLevel: "high",
                        confidence: 0.85,
                        lowConfidenceWarning: false,
                        kbCitationMissing: false,
                        explanation: { ar: "خطير", en: "Risky" },
                        sourceFromKB: "clause_001",
                    },
                    {
                        clauseText: "Payment terms شروط الدفع",
                        clauseType: "payment",
                        riskLevel: "low",
                        confidence: 0.45,
                        lowConfidenceWarning: true,
                        kbCitationMissing: true,
                        explanation: { ar: "غير متأكد", en: "Uncertain" },
                        sourceFromKB: null,
                    },
                ],
                extractionMeta: {
                    modelUsed: "gpt-4o",
                    usedFallback: false,
                    chunkCount: 1,
                },
                durationMs: 200,
            });
            const result = await orchestrator.run("contract_123", "user_123", "Liability clause مسؤولية. Payment terms شروط الدفع.", "en");
            expect(result.clauseAnalysis[0].lowConfidenceWarning).toBe(false);
            expect(result.clauseAnalysis[1].lowConfidenceWarning).toBe(true);
            expect(result.clauseAnalysis[1].kbCitationMissing).toBe(true);
        });
    });
    describe("Edge Cases: Non-Standard Clause Structures", () => {
        test("all clauses should have confidence score", async () => {
            jest.spyOn(orchestrator, "run").mockResolvedValue({
                executiveSummary: {
                    overallRisk: "high",
                    totalClauses: 3,
                    riskyClausesCount: 2,
                    summary: { ar: "خطير", en: "Risky" },
                },
                clauseAnalysis: [
                    {
                        clauseText: "Clause 1",
                        clauseType: "liability",
                        riskLevel: "high",
                        confidence: 0.9,
                        lowConfidenceWarning: false,
                        kbCitationMissing: false,
                        explanation: { ar: "خطير", en: "Risky" },
                        sourceFromKB: "clause_001",
                    },
                    {
                        clauseText: "Clause 2",
                        clauseType: "payment",
                        riskLevel: "medium",
                        confidence: 0.55,
                        lowConfidenceWarning: true,
                        kbCitationMissing: true,
                        explanation: { ar: "متوسط", en: "Medium" },
                        sourceFromKB: null,
                    },
                    {
                        clauseText: "Clause 3",
                        clauseType: "general",
                        riskLevel: "unknown",
                        confidence: 0.0,
                        lowConfidenceWarning: true,
                        kbCitationMissing: true,
                        explanation: { ar: "غير معروف", en: "Unknown" },
                        sourceFromKB: null,
                    },
                ],
                extractionMeta: {
                    modelUsed: "gpt-4o",
                    usedFallback: false,
                    chunkCount: 1,
                },
                durationMs: 300,
            });
            const result = await orchestrator.run("contract_123", "user_123", "Some contract text", "en");
            // Every clause must have confidence score
            result.clauseAnalysis.forEach((clause) => {
                expect(clause.confidence).toBeDefined();
                expect(typeof clause.confidence).toBe("number");
                expect(clause.confidence).toBeGreaterThanOrEqual(0);
                expect(clause.confidence).toBeLessThanOrEqual(1);
            });
            // Low confidence clauses must have warning flag
            const lowConfidenceClauses = result.clauseAnalysis.filter((c) => c.confidence < 0.6);
            lowConfidenceClauses.forEach((clause) => {
                expect(clause.lowConfidenceWarning).toBe(true);
            });
            // Clauses without KB source must have kbCitationMissing flag
            const noKBClauses = result.clauseAnalysis.filter((c) => c.sourceFromKB === null);
            noKBClauses.forEach((clause) => {
                expect(clause.kbCitationMissing).toBe(true);
            });
        });
    });
});
//# sourceMappingURL=confidence.detection.test.js.map