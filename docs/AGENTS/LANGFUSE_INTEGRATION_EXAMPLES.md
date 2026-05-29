/**
 * EXAMPLE: Agent Tracing Integration
 *
 * This file demonstrates best practices for integrating Langfuse tracing
 * with agent executions in the Aqdy platform.
 *
 * Key concepts:
 * 1. Automatic tracing via LangChain CallbackHandler
 * 2. Manual tracing wrapper for custom logic
 * 3. Pipeline-level tracing coordination
 * 4. Metrics collection and reporting
 */

// ─────────────────────────────────────────────────────────────────────
// EXAMPLE 1: Basic Agent Execution with Tracing
// ─────────────────────────────────────────────────────────────────────

import { traceAgent } from "../services/langfuse.tracing.js";
import { extractorAgent } from "../agents/extractor.agent.js";

export async function extractContractClausesExample(
  contractId: string,
  userId: string,
  contractText: string,
  language: "ar" | "en",
) {
  // Wrap agent execution with automatic tracing
  const result = await traceAgent(
    () => extractorAgent.extract(contractText, language),
    {
      agentName: "extractor",
      contractId,
      userId,
      language,
    },
  );

  // Handle result
  if (result.success) {
    console.log(`✓ Extraction completed in ${result.duration}ms`);
    console.log(`  Clauses extracted: ${result.data.clauses.length}`);
    console.log(`  Model used: ${result.data.modelUsed}`);
  } else {
    console.error(`✗ Extraction failed: ${result.error}`);
    console.error(`  Duration: ${result.duration}ms`);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────
// EXAMPLE 2: Per-Clause Agent Execution
// ─────────────────────────────────────────────────────────────────────

import { riskClassifierAgent } from "../agents/riskClassifier.agent.js";

export async function classifyClauseRiskExample(
  contractId: string,
  userId: string,
  clauseNumber: number,
  clauseText: string,
  clauseType: string,
  language: "ar" | "en",
) {
  // Trace individual clause classification
  const result = await traceAgent(
    () => riskClassifierAgent.classify(clauseText, clauseType, language),
    {
      agentName: "riskClassifier",
      contractId,
      userId,
      language,
      clauseNumber, // Include clause number for detailed tracking
    },
  );

  if (result.success) {
    console.log(
      `✓ Clause ${clauseNumber} classified as ${result.data.riskLevel}`,
    );
  } else {
    console.error(
      `✗ Clause ${clauseNumber} classification failed: ${result.error}`,
    );
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────
// EXAMPLE 3: Full Pipeline Tracing
// ─────────────────────────────────────────────────────────────────────

import { tracePipeline, logAgentMetricsReport } from "../services/langfuse.tracing.js";
import { redlineAgent } from "../agents/redline.agent.js";

export async function analyzeContractPipelineExample(
  contractId: string,
  userId: string,
  contractText: string,
  language: "ar" | "en",
) {
  // Wrap entire pipeline with tracing
  const pipelineResult = await tracePipeline(
    async () => {
      // Step 1: Extract clauses
      const extractionResult = await traceAgent(
        () => extractorAgent.extract(contractText, language),
        {
          agentName: "extractor",
          contractId,
          userId,
          language,
        },
      );

      if (!extractionResult.success) {
        throw new Error(`Extraction failed: ${extractionResult.error}`);
      }

      const executionResults = [extractionResult];

      // Step 2 & 3: Classify and redline each clause
      for (const clause of extractionResult.data.clauses) {
        // Classification
        const classificationResult = await traceAgent(
          () => riskClassifierAgent.classify(
            clause.clauseText,
            clause.clauseType,
            language,
          ),
          {
            agentName: "riskClassifier",
            contractId,
            userId,
            language,
            clauseNumber: clause.clauseNumber,
          },
        );

        executionResults.push(classificationResult);

        // Redline only for risky clauses
        if (
          classificationResult.success &&
          classificationResult.data.riskLevel !== "low"
        ) {
          const redlineResult = await traceAgent(
            () => redlineAgent.generate(
              clause.clauseText,
              classificationResult.data.riskLevel,
              clause.clauseType,
              language,
            ),
            {
              agentName: "redline",
              contractId,
              userId,
              language,
              clauseNumber: clause.clauseNumber,
            },
          );

          executionResults.push(redlineResult);
        }
      }

      // Log summary metrics
      logAgentMetricsReport(executionResults, `contract-${contractId}`);

      return {
        extraction: extractionResult,
        executions: executionResults,
      };
    },
    {
      contractId,
      userId,
      language,
    },
  );

  // Report pipeline results
  if (pipelineResult.success) {
    console.log(
      `✓ Pipeline completed in ${(pipelineResult.duration / 1000).toFixed(2)}s`,
    );
    console.log(
      `  Total executions: ${pipelineResult.data.executions.length}`,
    );
  } else {
    console.error(`✗ Pipeline failed: ${pipelineResult.error}`);
  }

  return pipelineResult;
}

// ─────────────────────────────────────────────────────────────────────
// EXAMPLE 4: Error Handling & Retry Logic
// ─────────────────────────────────────────────────────────────────────

async function extractWithRetryExample(
  contractId: string,
  userId: string,
  contractText: string,
  language: "ar" | "en",
  maxRetries: number = 3,
) {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Extraction attempt ${attempt}/${maxRetries}...`);

    const result = await traceAgent(
      () => extractorAgent.extract(contractText, language),
      {
        agentName: "extractor",
        contractId,
        userId,
        language,
      },
    );

    if (result.success) {
      console.log(`✓ Success on attempt ${attempt}`);
      return result;
    }

    lastError = result.error;
    console.warn(`✗ Attempt ${attempt} failed: ${result.error}`);

    // Exponential backoff
    if (attempt < maxRetries) {
      const delayMs = 1000 * Math.pow(2, attempt - 1);
      console.log(`  Waiting ${delayMs}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`Extraction failed after ${maxRetries} attempts: ${lastError}`);
}

// ─────────────────────────────────────────────────────────────────────
// EXAMPLE 5: Batch Processing with Metrics
// ─────────────────────────────────────────────────────────────────────

import { formatAgentMetrics } from "../services/langfuse.tracing.js";

export async function batchAnalyzeClauses(
  contractId: string,
  userId: string,
  clauses: Array<{
    number: number;
    text: string;
    type: string;
  }>,
  language: "ar" | "en",
) {
  const results = [];
  const startTime = Date.now();

  console.log(`Processing ${clauses.length} clauses...`);

  for (const clause of clauses) {
    const result = await traceAgent(
      () => riskClassifierAgent.classify(clause.text, clause.type, language),
      {
        agentName: "riskClassifier",
        contractId,
        userId,
        language,
        clauseNumber: clause.number,
      },
    );

    results.push(result);

    // Print per-clause status
    console.log(`  ${formatAgentMetrics(result)}`);
  }

  // Summary statistics
  const totalDuration = Date.now() - startTime;
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.length - successCount;
  const avgDuration = Math.round(totalDuration / results.length);

  console.log("\n📊 Batch Processing Summary:");
  console.log(`  Total clauses: ${results.length}`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Failed: ${failureCount}`);
  console.log(`  Total time: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`  Avg per clause: ${avgDuration}ms`);
  console.log(`  Success rate: ${((successCount / results.length) * 100).toFixed(1)}%`);

  return results;
}

// ─────────────────────────────────────────────────────────────────────
// EXAMPLE 6: Integration with Service Layer
// ─────────────────────────────────────────────────────────────────────

// In your analysis.service.ts:

export class AnalysisServiceExample {
  async analyzeContract(
    contractId: string,
    userId: string,
    contractText: string,
    language: "ar" | "en",
  ) {
    // Use tracePipeline for the entire analysis workflow
    const result = await tracePipeline(
      async () => {
        // Your complete analysis logic here
        const extraction = await extractorAgent.extract(
          contractText,
          language,
        );

        const clauseAnalyses = await Promise.all(
          extraction.clauses.map((clause) =>
            riskClassifierAgent.classify(
              clause.clauseText,
              clause.clauseType,
              language,
            ),
          ),
        );

        return { extraction, clauseAnalyses };
      },
      {
        contractId,
        userId,
        language,
      },
    );

    // Save results to database
    if (result.success) {
      // await this.saveAnalysis(contractId, result.data);
      console.log("Analysis saved to database");
    } else {
      // Handle error
      console.error(`Analysis failed: ${result.error}`);
    }

    return result;
  }
}

// ─────────────────────────────────────────────────────────────────────
// EXAMPLE 7: Langfuse Dashboard Query Examples
// ─────────────────────────────────────────────────────────────────────

/*
LANGFUSE DASHBOARD QUERIES:

1. Find all extractions for a specific contract:
   ┌──────────────────────────────────────────────────────────┐
   │ Filter: contractId = "contract-123" AND agentName = "extractor" │
   │ Order: timestamp DESC                              │
   └──────────────────────────────────────────────────────────┘

2. Find slow classifications (>5 seconds):
   ┌──────────────────────────────────────────────────────────┐
   │ Filter: agentName = "riskClassifier" AND duration > 5000 │
   │ Order: duration DESC                               │
   └──────────────────────────────────────────────────────────┘

3. Error analysis:
   ┌──────────────────────────────────────────────────────────┐
   │ Filter: statusMessage = "error"                          │
   │ Group by: agentName                                      │
   │ Metric: count (to see error frequency per agent)        │
   └──────────────────────────────────────────────────────────┘

4. Performance comparison:
   ┌──────────────────────────────────────────────────────────┐
   │ Filter: timestamp > 7 days ago                           │
   │ Group by: agentName                                      │
   │ Metrics: avg(duration), max(duration), min(duration)     │
   │ Chart: Bar chart                                         │
   └──────────────────────────────────────────────────────────┘

5. User activity:
   ┌──────────────────────────────────────────────────────────┐
   │ Group by: userId                                         │
   │ Metric: count (contracts analyzed per user)             │
   │ Time range: Last 30 days                                 │
   │ Order: count DESC                                        │
   └──────────────────────────────────────────────────────────┘
*/

// ─────────────────────────────────────────────────────────────────────
// BEST PRACTICES
// ─────────────────────────────────────────────────────────────────────

/*
✓ DO:
  - Always include contractId, userId, and language in trace metadata
  - Use clauseNumber for per-clause tracing
  - Wrap agent calls with traceAgent() for consistent logging
  - Use tracePipeline() for multi-agent workflows
  - Call logAgentMetricsReport() to summarize batch operations
  - Handle errors gracefully (Langfuse will log them)
  - Flush traces before shutdown (handled in index.ts)

✗ DON'T:
  - Log large text samples directly (use substring)
  - Create excessive trace objects for trivial operations
  - Skip error logging to Langfuse
  - Call Langfuse API directly (use helper functions)
  - Block on Langfuse operations (it's async/batched)
  - Hardcode contract/user IDs in production
*/
