import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  jest,
} from "@jest/globals";
import mongoose from "mongoose";
import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";

// ── Mock Setup ───────────────────────────────────
const mockStream = jest.fn();

jest.unstable_mockModule("@langchain/openai", () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    stream: mockStream,
  })),
}));

// Import after mocking (required for ESM mock hoisting)
const { User } = await import("../src/models/user.model.js");
const { Contract } = await import("../src/models/contract.model.js");
const { RiskAnalysis } = await import("../src/models/riskAnalysis.model.js");
const { default: contractRouter } =
  await import("../src/routes/contract.route.js");
const { generateAccessToken } = await import("../src/services/auth.service.js");
const { errorHandler } = await import("../src/middlewares/errorHandler.js");
const { resetClauseChatLimits } =
  await import("../src/controllers/clauseChat.controller.js");
const { env } = await import("../src/config/env.js");

const testApp = express();
testApp.use(express.json());
testApp.use(cookieParser());
testApp.use("/api/contracts", contractRouter);
testApp.use(errorHandler);

beforeAll(async () => {
  const mongoURI =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aqdy-chat-test";
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoURI);
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe("Clause Chat API Endpoint", () => {
  let user: any;
  let contract: any;
  let riskAnalysis: any;
  let userToken: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    resetClauseChatLimits();

    await User.deleteMany({});
    await Contract.deleteMany({});
    await RiskAnalysis.deleteMany({});

    // Create user with some credit balance
    user = await User.create({
      name: "Chat User",
      email: "chat@user.com",
      role: "user",
      status: "active",
      planSlug: "pro",
      passwordHash: "dummyHash",
      creditBalance: 20,
    });

    userToken = generateAccessToken(user);

    // Create contract owned by user
    contract = await Contract.create({
      filename: "test.pdf",
      language: "en",
      text: "This is a full contract text.",
      userId: user._id.toString(),
      fileSize: 200,
    });

    // Create RiskAnalysis for contract
    riskAnalysis = await RiskAnalysis.create({
      contractId: contract._id,
      userId: user._id.toString(),
      executiveSummary: {
        overallRisk: "medium",
        totalClauses: 1,
        riskyClausesCount: 1,
        summary: { ar: "ملخص", en: "summary" },
      },
      clauseAnalysis: [
        {
          clauseText:
            "The Indemnifying Party shall hold harmless the Indemnified Party.",
          clauseType: "indemnity",
          riskLevel: "medium",
          confidence: 0.9,
          lowConfidenceWarning: false,
          kbCitationMissing: false,
          explanation: { ar: "توضيح", en: "Explanation of indemnity risk" },
          sourceFromKB: "kb-source-123",
          redlineSuggestion: "Limit liability to 1x fees.",
        },
      ],
      analysisDuration: 1000,
    });

    // Default mock stream behavior
    mockStream.mockImplementation(async (messages: any) => {
      async function* generator() {
        yield { content: "AI response chunk" };
      }
      return generator();
    });
  });

  test("should return 401 when access token is missing", async () => {
    const res = await request(testApp)
      .post(`/api/contracts/${contract._id}/clauses/0/chat`)
      .send({ message: "Hello" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("should return 400 when message is empty", async () => {
    const res = await request(testApp)
      .post(`/api/contracts/${contract._id}/clauses/0/chat`)
      .set("Cookie", `accessToken=${userToken}`)
      .send({ message: "", history: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("should return 400 when clauseIndex is invalid format", async () => {
    const res = await request(testApp)
      .post(`/api/contracts/${contract._id}/clauses/abc/chat`)
      .set("Cookie", `accessToken=${userToken}`)
      .send({ message: "Explain this clause", history: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("Invalid clause index format");
  });

  test("should return 404 when clauseIndex is out of bounds", async () => {
    const res = await request(testApp)
      .post(`/api/contracts/${contract._id}/clauses/99/chat`)
      .set("Cookie", `accessToken=${userToken}`)
      .send({ message: "Explain this clause", history: [] });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("out of bounds");
  });

  test("should return 402 with current balance and NOT deduct credits if balance is insufficient", async () => {
    // Set user credits to 0
    await User.findByIdAndUpdate(user._id, { creditBalance: 0 });

    const res = await request(testApp)
      .post(`/api/contracts/${contract._id}/clauses/0/chat`)
      .set("Cookie", `accessToken=${userToken}`)
      .send({ message: "Explain this clause", history: [] });

    expect(res.status).toBe(402);
    expect(res.body.success).toBe(false);
    expect(res.body.balance).toBe(0);

    // Verify credits were not deducted (remains 0)
    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.creditBalance).toBe(0);
    expect(mockStream).not.toHaveBeenCalled();
  });

  test("should return 429 and NOT deduct credits if rate limit is exceeded", async () => {
    // Artificially trigger rate limit by sending max messages (default 20)
    const chatLimit = env.CLAUSE_CHAT_RATE_LIMIT;
    const rateLimitKey = `${user._id}:${contract._id}:0`;

    // Set count to match the limit
    const { clauseChatLimits } =
      await import("../src/controllers/clauseChat.controller.js");
    clauseChatLimits.set(rateLimitKey, {
      count: chatLimit,
      resetAt: Date.now() + 10000,
    });

    const res = await request(testApp)
      .post(`/api/contracts/${contract._id}/clauses/0/chat`)
      .set("Cookie", `accessToken=${userToken}`)
      .send({ message: "Explain this clause", history: [] });

    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);

    // Verify credit balance is unchanged (still 20)
    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.creditBalance).toBe(20);
    expect(mockStream).not.toHaveBeenCalled();
  });

  test("should successfully stream SSE response, inject correct context, and deduct credits", async () => {
    const res = await request(testApp)
      .post(`/api/contracts/${contract._id}/clauses/0/chat`)
      .set("Cookie", `accessToken=${userToken}`)
      .send({
        message: "What is the risk level?",
        history: [
          { role: "user", content: "Hi" },
          { role: "assistant", content: "Hello" },
        ],
      });

    // Verify headers
    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(res.headers["cache-control"]).toBe("no-cache");
    expect(res.headers["connection"]).toBe("keep-alive");

    // Verify SSE payload structure
    expect(res.text).toContain('data: {"text":"AI response chunk"}');
    expect(res.text).toContain("data: [DONE]");

    // Verify credit deduction (20 -> 15)
    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.creditBalance).toBe(15);

    // Verify context injection in mock stream
    expect(mockStream).toHaveBeenCalled();
    const systemPromptMessage = mockStream.mock.calls[0][0][0]; // First element in the array of messages
    const systemPromptText = systemPromptMessage.content;

    expect(systemPromptText).toContain(
      "The Indemnifying Party shall hold harmless the Indemnified Party.",
    );
    expect(systemPromptText).toContain("medium");
    expect(systemPromptText).toContain("Explanation of indemnity risk");
    expect(systemPromptText).toContain("kb-source-123");
    expect(systemPromptText).toContain("Limit liability to 1x fees.");
    expect(systemPromptText).toContain(
      "ONLY answer questions about this specific clause",
    );
    expect(systemPromptText).toContain(
      "Do NOT speculate beyond the provided context",
    );
  });
});
