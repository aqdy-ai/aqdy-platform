// backend/tests/judge.service.test.ts
// Jest unit test for judgeService.evaluateAnalysis

import { judgeService } from "../src/services/judge.service.js";
import { Evaluation } from "../src/models/evaluation.model.js";
import { IRiskAnalysis } from "../src/models/riskAnalysis.model.js";
import langfuse from "../src/utils/langfuseClient.js";
// Cast to any for test compatibility
const langfuseMock = langfuse;
import { llmService } from "../src/services/llm.service.js";

// Mock the LLM response – static JSON fixture
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

jest.mock("../src/services/llm.service", () => ({
  llmService: {
    callPrimary: jest.fn().mockResolvedValue({
      content: mockLlmResponse,
      model: "gpt-4o",
      usedFallback: false,
    }),
  },
}));

jest.mock("../src/utils/langfuseClient", () => ({
  __esModule: true,
  default: {
    trace: jest.fn().mockReturnValue({ id: "mock-trace-id" }),
    score: jest.fn(),
  },
}));

// Use in‑memory MongoDB for isolation
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

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
    const fakeAnalysis: IRiskAnalysis = {
      _id: new mongoose.Types.ObjectId(),
      userId: "user-123",
      executiveSummary: { summary: { en: "Sample answer" } },
      // other required fields are omitted for brevity – they are not accessed in the service
    } as unknown as IRiskAnalysis;

    await judgeService.evaluateAnalysis(fakeAnalysis);

    // Verify Evaluation document persisted
    const evalDoc = await Evaluation.findOne({ analysisId: fakeAnalysis._id });
    expect(evalDoc).toBeTruthy();
    expect(evalDoc?.faithfulness).toBe(5);
    expect(evalDoc?.relevancy).toBe(4);
    expect(evalDoc?.precision).toBe(3);
    expect(evalDoc?.recall).toBe(2);
    expect(evalDoc?.traceId).toBe("mock-trace-id");

    // Verify Langfuse scoring calls
    expect(langfuseMock.score as jest.Mock).toHaveBeenCalledTimes(4);
    const scoreCalls = (langfuseMock.score as jest.Mock).mock.calls.map(
      (c) => c[0],
    );
    expect(scoreCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "faithfulness",
          value: 5,
          traceId: "mock-trace-id",
        }),
        expect.objectContaining({
          name: "relevancy",
          value: 4,
          traceId: "mock-trace-id",
        }),
        expect.objectContaining({
          name: "precision",
          value: 3,
          traceId: "mock-trace-id",
        }),
        expect.objectContaining({
          name: "recall",
          value: 2,
          traceId: "mock-trace-id",
        }),
      ]),
    );
  });
});
