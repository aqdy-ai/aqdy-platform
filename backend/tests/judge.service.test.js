import { jest } from '@jest/globals';
import { Evaluation } from "../src/models/evaluation.model.js";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { judgeService } from "../src/services/judge.service.js";
import langfuse from "../src/utils/langfuseClient.js";
import { llmService } from "../src/services/llm.service.js";
const langfuseMock = langfuse;
const mockLlmResponse = JSON.stringify({
    faithfulness: 5,
    relevancy: 4,
    precision: 3,
    recall: 2,
    reasoning: {
        faithfulness: "Perfect factual match",
        relevancy: "Mostly on topic",
        precision: "Some extra context",
        recall: "Missing a few clauses",
        overall: "Good overall evaluation",
    },
});
jest.spyOn(llmService, 'call').mockResolvedValue({
    content: mockLlmResponse,
    model: "gpt-4o",
    usedFallback: false,
});
jest.spyOn(langfuseMock, 'trace').mockReturnValue({ id: "mock-trace-id" });
jest.spyOn(langfuseMock, 'score').mockImplementation(() => { });
let mongoServer;
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});
afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});
afterEach(async () => {
    await Evaluation.deleteMany({});
    jest.clearAllMocks();
});
describe("judgeService.evaluateAnalysis", () => {
    it("processes LLM output, stores Evaluation, and logs Langfuse scores", async () => {
        const fakeAnalysis = {
            _id: new mongoose.Types.ObjectId(),
            userId: "user-123",
            executiveSummary: {
                overallRisk: "medium",
                totalClauses: 14,
                riskyClausesCount: 5,
                summary: { en: "Sample answer", ar: "ملخص" },
            },
            clauseAnalysis: [
                {
                    clauseText: "This is a sample clause",
                    clauseType: "employment-terms",
                    riskLevel: "low",
                    confidence: 0.95,
                    lowConfidenceWarning: false,
                    kbCitationMissing: false,
                    explanation: { ar: "شرح", en: "explanation" },
                    sourceFromKB: "clause_001_test",
                    redlineSuggestion: "Consider adding...",
                },
            ],
        };
        await judgeService.evaluateAnalysis(fakeAnalysis);
        const evalDoc = await Evaluation.findOne({ analysisId: fakeAnalysis._id });
        expect(evalDoc).toBeTruthy();
        expect(evalDoc?.faithfulness).toBe(5);
        expect(evalDoc?.relevancy).toBe(4);
        expect(evalDoc?.precision).toBe(3);
        expect(evalDoc?.recall).toBe(2);
        expect(evalDoc?.traceId).toBe("mock-trace-id");
        expect(langfuseMock.score).toHaveBeenCalledTimes(4);
        const scoreCalls = langfuseMock.score.mock.calls.map((c) => c[0]);
        expect(scoreCalls).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: "faithfulness", value: 5, traceId: "mock-trace-id" }),
            expect.objectContaining({ name: "relevancy", value: 4, traceId: "mock-trace-id" }),
            expect.objectContaining({ name: "precision", value: 3, traceId: "mock-trace-id" }),
            expect.objectContaining({ name: "recall", value: 2, traceId: "mock-trace-id" }),
        ]));
    });
    it("handles analyses without clauseAnalysis gracefully", async () => {
        const fakeAnalysis = {
            _id: new mongoose.Types.ObjectId(),
            userId: "user-456",
            executiveSummary: {
                overallRisk: "low",
                totalClauses: 0,
                riskyClausesCount: 0,
                summary: { en: "No clauses", ar: "لا يوجد" },
            },
        };
        await judgeService.evaluateAnalysis(fakeAnalysis);
        const evalDoc = await Evaluation.findOne({ analysisId: fakeAnalysis._id });
        expect(evalDoc).toBeTruthy();
    });
});
//# sourceMappingURL=judge.service.test.js.map