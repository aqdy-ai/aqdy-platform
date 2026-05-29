import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { orchestratorService } from "../pipeline/orchestrator.service.js";
import { llmService } from "../services/llm.service.js";
import { ragService } from "../services/rag.service.js";
import { metrics } from "../utils/metrics.js";

// --- Simple mocks to avoid external API calls ---
// Replace llmService.call with a fast mock that returns deterministic outputs
const originalLLMCall = llmService.call.bind(llmService);
(llmService as any).call = async (prompt: string, options: any = {}) => {
  // Heuristic: decide based on system prompt or prompt content
  const sys = options?.systemPrompt || "";

  // Extractor prompt contains "EXTRACTOR" in system prompt constant name
  if (sys.includes("EXTRACTOR") || prompt.includes("clauses")) {
    // Return a tiny JSON with a couple of clauses
    const clauses = [
      { clauseNumber: 1, clauseText: "Sample clause A.", clauseType: "other" },
      { clauseNumber: 2, clauseText: "Sample clause B.", clauseType: "termination" },
    ];
    return { content: JSON.stringify(clauses), model: "mock-llm", usedFallback: false };
  }

  // Risk classifier: return fixed classification
  if (sys.includes("RISK_CLASSIFIER") || prompt.includes("classify")) {
    return {
      content: JSON.stringify({ riskLevel: "medium", explanation: { ar: "..", en: ".." }, confidence: 0.8 }),
      model: "mock-llm",
      usedFallback: false,
    };
  }

  // Redline: return a suggested text
  if (sys.includes("REDLINE") || prompt.includes("redline")) {
    return {
      content: JSON.stringify({ suggestedText: "Suggested fix.", explanation: { ar: "..", en: ".." }, talkingPoints: { ar: [".."], en: [".."] }, confidence: 0.85 }),
      model: "mock-llm",
      usedFallback: false,
    };
  }

  // Default fallback
  return { content: "{}", model: "mock-llm", usedFallback: false };
};

// Mock RAG search to return none
(ragService as any).searchKB = async (_: string) => ({ matches: [], confidence: 0, hasMatch: false });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, "../fixtures/sample-contracts");
const files = fs.readdirSync(fixturesDir).filter((f) => f.endsWith(".txt"));

// Build test corpus sizes: small (one file), medium (concatenate 5), large (repeat to reach ~100KB)
const small = fs.readFileSync(path.join(fixturesDir, files[0]), "utf8");
let medium = "";
for (let i = 0; i < Math.min(5, files.length); i++) medium += "\n" + fs.readFileSync(path.join(fixturesDir, files[i]), "utf8");

let large = medium;
while (Buffer.byteLength(large, "utf8") < 100_000) {
  large += "\n" + medium;
}

const tests = [
  { name: "small", text: small },
  { name: "medium", text: medium },
  { name: "large", text: large },
];

async function run() {
  console.log("Starting contract benchmark (mocked LLM/RAG)...");

  const results: any[] = [];

  for (const t of tests) {
    const start = process.hrtime.bigint();
    const res = await orchestratorService.run("benchmark-contract", "perf-user", t.text, "en");
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

    console.log(`Test ${t.name}: orchestrator returned durationMs=${res.durationMs} (measured ${Math.round(durationMs)} ms)`);

    results.push({
      name: t.name,
      orchestratorDurationMs: res.durationMs,
      measuredMs: Math.round(durationMs),
      totalClauses: res.extractionMeta.chunkCount ? res.extractionMeta.chunkCount : res.clauseAnalysis.length,
      clauseAnalysisCount: res.clauseAnalysis.length,
    });

    // Small cooldown
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log("Metrics snapshot:", JSON.stringify(metrics.getMetrics(), null, 2));

  const out = path.resolve(__dirname, "../../performance_results.json");
  fs.writeFileSync(out, JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));

  console.log(`Wrote results to ${out}`);

  // restore llmService if needed
  (llmService as any).call = originalLLMCall;
}

run().catch((err) => {
  console.error("Benchmark failed:", err);
  (llmService as any).call = originalLLMCall;
});
