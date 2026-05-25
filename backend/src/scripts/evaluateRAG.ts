process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/dummy";
process.env.LANGFUSE_SECRET_KEY = process.env.LANGFUSE_SECRET_KEY || "dummy";
process.env.LANGFUSE_PUBLIC_KEY = process.env.LANGFUSE_PUBLIC_KEY || "dummy";
process.env.JWT_SECRET = process.env.JWT_SECRET || "dummy";

import * as fs from "fs";
import * as path from "path";

const { ragService } = await import("../services/rag.service.js");
const { logger } = await import("../utils/logger.js");

// Disable noisy logger output for evaluation script
logger.level = "warn";

interface EvaluationTestCase {
  targetClauseId: string;
  queryText: string;
  description: string;
  category: string;
  riskLevel: string;
}

const EVALUATION_SUITE: EvaluationTestCase[] = [
  {
    targetClauseId: "clause_001_unlimited_liability",
    queryText: "The company will be responsible for all direct and indirect damages without any cap on liability.",
    description: "Paraphrase of unlimited liability (English)",
    category: "Liability",
    riskLevel: "critical",
  },
  {
    targetClauseId: "clause_001_unlimited_liability",
    queryText: "يتحمل الطرف الثاني كامل المسؤولية عن الأضرار بدون حد أقصى للتعويضات المالية.",
    description: "Paraphrase of unlimited liability (Arabic)",
    category: "Liability",
    riskLevel: "critical",
  },
  {
    targetClauseId: "clause_002_perpetual_confidentiality",
    queryText: "NDA obligations remain active forever after the contract ends.",
    description: "Paraphrase of perpetual NDA (English)",
    category: "Confidentiality",
    riskLevel: "high",
  },
  {
    targetClauseId: "clause_002_perpetual_confidentiality",
    queryText: "تبقى التزامات السرية سارية إلى الأبد دون تحديد مدة انتهاء للالتزام.",
    description: "Paraphrase of perpetual NDA (Arabic)",
    category: "Confidentiality",
    riskLevel: "high",
  },
  {
    targetClauseId: "clause_003_noncompete_5years",
    queryText: "You are banned from working for any competitor anywhere for five years.",
    description: "Paraphrase of excessive non-compete (English)",
    category: "Non-Compete",
    riskLevel: "critical",
  },
  {
    targetClauseId: "clause_003_noncompete_5years",
    queryText: "لا يحق للموظف العمل لدى أي منافس لمدة خمس سنوات كاملة بعد انتهاء الخدمة.",
    description: "Paraphrase of excessive non-compete (Arabic)",
    category: "Non-Compete",
    riskLevel: "critical",
  },
  {
    targetClauseId: "clause_005_mandatory_overtime",
    queryText: "Employee has to work extra hours on weekends and public holidays without any overtime pay.",
    description: "Paraphrase of unpaid overtime (English)",
    category: "Working Conditions",
    riskLevel: "high",
  },
  {
    targetClauseId: "clause_016_unilateral_probation_extension",
    queryText: "يجوز لصاحب العمل تمديد فترة التجربة لتصبح ستة أشهر بدلاً من ثلاثة دون موافقة الموظف.",
    description: "Paraphrase of illegal probation period extension (Arabic)",
    category: "Employment Terms",
    riskLevel: "medium",
  }
];

async function runEvaluation() {
  console.log("\n==============================================================");
  console.log("🔍 STARTING RAG SYSTEM EVALUATION & DIAGNOSTICS");
  console.log("==============================================================");
  console.log(`Suite Size: ${EVALUATION_SUITE.length} test cases (English/Arabic mix)`);
  console.log(`Embedding Index Model: multilingual-e5-large`);
  console.log("--------------------------------------------------------------\n");

  const results: any[] = [];
  let totalLatency = 0;
  let matchesFoundCount = 0;

  for (let i = 0; i < EVALUATION_SUITE.length; i++) {
    const testCase = EVALUATION_SUITE[i];
    console.log(`[Test ${i + 1}/${EVALUATION_SUITE.length}] Evaluating: "${testCase.description}"`);
    console.log(`   Query: "${testCase.queryText}"`);
    
    // Evaluate standard vs expanded vs MMR
    const start = Date.now();
    
    // Perform search with full suite options (expansion + MMR)
    let searchResults;
    try {
      searchResults = await ragService.search(testCase.queryText, {
        topK: 5,
        enableQueryExpansion: true,
        enableMMR: true,
        lambda: 0.5,
      });
    } catch (e) {
      console.error(`❌ Search failed for query: "${testCase.queryText}"`, e);
      continue;
    }

    const duration = Date.now() - start;
    totalLatency += duration;

    // Check if target clause is in the top-5 retrieved clauses
    const retrievedIds = searchResults.map(r => r.id);
    const targetIdx = retrievedIds.indexOf(testCase.targetClauseId);
    const isMatched = targetIdx !== -1;
    
    if (isMatched) {
      matchesFoundCount++;
    }

    // Measure diversity (average pairwise similarity between top-3 hits if vectors were returned)
    // Note: cosineSimilarity helper would be needed but hits are already mapped to RagClauseRecord 
    // which does not carry raw vectors. For diagnostic output we show retrieved IDs and ranks.

    console.log(`   ⚡ Latency: ${duration}ms | Target Matched: ${isMatched ? `✅ (Rank ${targetIdx + 1})` : "❌ Not Found"}`);
    console.log(`   Top 3 retrieved:`);
    searchResults.slice(0, 3).forEach((r, idx) => {
      console.log(`      ${idx + 1}. [${r.id}] (Score: ${r.score.toFixed(4)}, Cat: ${r.category}, Risk: ${r.riskLevel})`);
    });
    console.log("");

    results.push({
      case: testCase.description,
      target: testCase.targetClauseId,
      matched: isMatched,
      rank: targetIdx !== -1 ? targetIdx + 1 : -1,
      latency: duration,
      topScore: searchResults[0]?.score || 0,
    });
  }

  // Calculate Aggregated Metrics
  const avgLatency = totalLatency / EVALUATION_SUITE.length;
  const recallAt5 = (matchesFoundCount / EVALUATION_SUITE.length) * 100;
  
  console.log("==============================================================");
  console.log("📊 EVALUATION RESULTS SUMMARY");
  console.log("==============================================================");
  console.log(`Average Retrieval Latency : ${avgLatency.toFixed(2)} ms`);
  console.log(`Recall@5 Accuracy         : ${recallAt5.toFixed(2)}% (${matchesFoundCount}/${EVALUATION_SUITE.length})`);
  console.log("--------------------------------------------------------------");
  console.log("| Test Case Description | Target Clause ID | Matched? | Rank | Latency |");
  console.log("|-----------------------|------------------|----------|------|---------|");
  results.forEach(r => {
    console.log(`| ${r.case.padEnd(21)} | ${r.target.padEnd(16)} | ${r.matched ? "✅ Yes " : "❌ No  "} | ${r.rank !== -1 ? r.rank.toString().padEnd(4) : "N/A "} | ${r.latency.toString().padEnd(5)} ms |`);
  });
  console.log("==============================================================\n");
}

runEvaluation().catch(err => {
  console.error("❌ Evaluation failed:", err);
  process.exit(1);
});
