/**
 * Performance Benchmark — Contract Analysis Pipeline.
 *
 * Simulates processing of contracts of varying sizes to measure pipeline
 * throughput, processing times, and resource scaling.
 *
 * Sizes simulated:
 *   - Small: 5 KB (approx. 1 clause, ~500 words)
 *   - Medium: 50 KB (approx. 10 clauses, ~5,000 words)
 *   - Large: 150 KB (approx. 30 clauses, ~15,000 words)
 */
import { orchestratorService } from "../../src/pipeline/orchestrator.service.js";
import { jest } from "@jest/globals";
import { logger } from "../../src/utils/logger.js";
// Disable noisy logging during benchmark
logger.level = "error";
// ── Synthetic Contract Generators ────────────────
function generateContractText(kbSize) {
    const paragraph = "This contract clause constitutes a binding agreement. Either party may terminate it with notice.\n";
    return paragraph.repeat(Math.ceil((kbSize * 1024) / paragraph.length));
}
// ── Mock Setup for LLM Latency Simulation ────────
const mockExtract = jest.fn();
const mockClassify = jest.fn();
const mockGenerateRedline = jest.fn();
const mockSearchKB = jest.fn();
// Mock dependencies
jest.unstable_mockModule("../../src/agents/extractor.agent.js", () => ({
    extractorAgent: { extract: mockExtract },
}));
jest.unstable_mockModule("../../src/agents/riskClassifier.agent.js", () => ({
    riskClassifierAgent: { classify: mockClassify },
}));
jest.unstable_mockModule("../../src/agents/redline.agent.js", () => ({
    redlineAgent: { generate: mockGenerateRedline },
}));
jest.unstable_mockModule("../../src/services/rag.service.js", () => ({
    ragService: { searchKB: mockSearchKB },
}));
jest.unstable_mockModule("../../src/config/langfuse.config.js", () => ({
    createLangfuseHandler: jest.fn().mockReturnValue(null),
    logAgentExecution: jest.fn(),
}));
// ── Latency Simulation Configs ────────────────────
const LATENCY = {
    EXTRACT_PER_CHUNK: 800, // ms
    CLASSIFY_PER_CLAUSE: 400, // ms
    REDLINE_PER_CLAUSE: 500, // ms
    RAG_PER_CLAUSE: 150, // ms
};
// Helper to wait
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// ── Main Runner ───────────────────────────────────
export async function runBenchmark() {
    console.log("==================================================");
    console.log("   CONTRACT PIPELINE PERFORMANCE BENCHMARK   ");
    console.log("==================================================");
    const testCases = [
        { name: "Small Contract (5KB)", sizeKb: 5, clauses: 2 },
        { name: "Medium Contract (50KB)", sizeKb: 50, clauses: 12 },
        { name: "Large Contract (150KB)", sizeKb: 150, clauses: 35 },
    ];
    for (const tc of testCases) {
        console.log(`\n▶ Starting Test: ${tc.name} [Size: ${tc.sizeKb}KB, Clauses: ${tc.clauses}]`);
        const text = generateContractText(tc.sizeKb);
        // Setup simulated latency mocks
        mockExtract.mockImplementation(async () => {
            await sleep(LATENCY.EXTRACT_PER_CHUNK * Math.ceil(tc.sizeKb / 80));
            return {
                clauses: Array.from({ length: tc.clauses }, (_, idx) => ({
                    clauseNumber: idx + 1,
                    clauseText: `Mock clause content ${idx + 1}`,
                    clauseType: idx % 3 === 0 ? "liability" : "termination",
                })),
                language: "en",
                modelUsed: "gemini-3.5-flash",
                usedFallback: false,
                chunkCount: Math.ceil(tc.sizeKb / 80),
            };
        });
        mockSearchKB.mockImplementation(async () => {
            await sleep(LATENCY.RAG_PER_CLAUSE);
            return { matches: [], confidence: 0, hasMatch: false };
        });
        mockClassify.mockImplementation(async () => {
            await sleep(LATENCY.CLASSIFY_PER_CLAUSE);
            return {
                riskLevel: Math.random() > 0.5 ? "high" : "low",
                confidence: 0.9,
                explanation: { ar: "شرح", en: "Explanation" },
                sourceFromKB: null,
            };
        });
        mockGenerateRedline.mockImplementation(async () => {
            await sleep(LATENCY.REDLINE_PER_CLAUSE);
            return {
                suggestedText: "Suggested redline text",
                explanation: { ar: "بديل", en: "Safer wording" },
                talkingPoints: { ar: ["نقطة"], en: ["Point"] },
                confidence: 0.95,
            };
        });
        const runStart = Date.now();
        const result = await orchestratorService.run("bench_contract", "bench_user", text, "en");
        const runDuration = Date.now() - runStart;
        console.log(`✔ Finished: ${tc.name}`);
        console.log(`  - Total Elapsed Time: ${(runDuration / 1000).toFixed(2)}s`);
        console.log(`  - Clauses Extracted:  ${result.executiveSummary.totalClauses}`);
        console.log(`  - Risky Clauses Found: ${result.executiveSummary.riskyClausesCount}`);
        console.log(`  - Overall Risk Level: ${result.executiveSummary.overallRisk}`);
        console.log(`  - Processing Speed:  ${(text.length / (runDuration / 1000)).toFixed(0)} chars/sec`);
    }
    console.log("\n==================================================");
    console.log("              BENCHMARK COMPLETED                 ");
    console.log("==================================================");
}
//# sourceMappingURL=benchmark.js.map