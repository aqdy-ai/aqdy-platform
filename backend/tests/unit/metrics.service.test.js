import { describe, test, expect, beforeEach } from "@jest/globals";
import { MetricsService } from "../../src/services/metrics.service.js";
describe("MetricsService - Cost Calculation", () => {
    const metricsService = new MetricsService();
    test("should calculate cost for gemini-3.5-flash", () => {
        const cost = metricsService.calculateCost("gemini-3.5-flash", {
            inputTokens: 1000,
            outputTokens: 500,
            totalTokens: 1500,
        });
        expect(cost).toBeGreaterThan(0);
    });
    test("should calculate cost for gemini-3.1-flash-lite", () => {
        const cost = metricsService.calculateCost("gemini-3.1-flash-lite", {
            inputTokens: 1000,
            outputTokens: 500,
            totalTokens: 1500,
        });
        expect(cost).toBeGreaterThan(0);
    });
    test("gemini-3.5-flash should cost more than gemini-3.1-flash-lite", () => {
        const tokens = { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 };
        const primaryCost = metricsService.calculateCost("gemini-3.5-flash", tokens);
        const fallbackCost = metricsService.calculateCost("gemini-3.1-flash-lite", tokens);
        expect(primaryCost).toBeGreaterThan(fallbackCost);
    });
    test("should return 0 cost for 0 tokens", () => {
        const cost = metricsService.calculateCost("gemini-3.5-flash", {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
        });
        expect(cost).toBe(0);
    });
});
describe("MetricsService - Token Estimation", () => {
    const metricsService = new MetricsService();
    test("should estimate tokens from text", () => {
        const tokens = metricsService.estimateTokens("Hello world");
        expect(tokens).toBeGreaterThan(0);
    });
    test("should estimate more tokens for longer text", () => {
        const short = metricsService.estimateTokens("Hi");
        const long = metricsService.estimateTokens("This is a much longer contract text with many words");
        expect(long).toBeGreaterThan(short);
    });
});
describe("MetricsService - Rolling Average", () => {
    let metricsService;
    beforeEach(() => {
        metricsService = new MetricsService();
    });
    test("should return 0 for empty history", () => {
        expect(metricsService.getRollingAverageTokens()).toBe(0);
    });
    test("should return 0 error rate for empty history", () => {
        expect(metricsService.getErrorRateInWindow()).toBe(0);
    });
    test("should track analysis and update history", () => {
        metricsService.trackAnalysis({
            contractId: "contract_123",
            userId: "user_123",
            totalTokens: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
            totalCostUSD: 0.001,
            totalLatencyMs: 2000,
            agentCalls: [],
            clauseCount: 10,
            success: true,
        });
        expect(metricsService.getRollingAverageTokens()).toBe(1500);
    });
    test("should calculate error rate correctly", () => {
        metricsService.trackAnalysis({
            contractId: "c1",
            userId: "u1",
            totalTokens: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
            totalCostUSD: 0.001,
            totalLatencyMs: 1000,
            agentCalls: [],
            clauseCount: 5,
            success: true,
        });
        metricsService.trackAnalysis({
            contractId: "c2",
            userId: "u1",
            totalTokens: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
            totalCostUSD: 0.001,
            totalLatencyMs: 1000,
            agentCalls: [],
            clauseCount: 5,
            success: false,
        });
        const errorRate = metricsService.getErrorRateInWindow();
        expect(errorRate).toBeCloseTo(33, 0);
    });
});
describe("MetricsService - Dashboard Summary", () => {
    test("should return dashboard with correct structure", () => {
        const metricsService = new MetricsService();
        const summary = metricsService.getDashboardSummary();
        expect(summary.analyses).toBeDefined();
        expect(summary.performance).toBeDefined();
        expect(summary.costs).toBeDefined();
        expect(summary.alerts).toBeDefined();
        expect(summary.analyses.total).toBeDefined();
        expect(summary.performance.avgLatencyMs).toBeDefined();
        expect(summary.costs.estimatedCostUSD).toBeDefined();
    });
});
//# sourceMappingURL=metrics.service.test.js.map