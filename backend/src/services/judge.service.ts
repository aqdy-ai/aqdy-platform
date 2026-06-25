import { llmService } from "./llm.service.js";
import { JUDGE_SYSTEM_PROMPT, JUDGE_USER_PROMPT } from "./judgePrompt.js";
import { Evaluation } from "../models/evaluation.model.js";
import langfuse from "../utils/langfuseClient.js";
import { logger } from "../utils/logger.js";
import type { IRiskAnalysis } from "../models/riskAnalysis.model.js";

function buildClauseContext(analysis: IRiskAnalysis): string {
  if (!analysis.clauseAnalysis || analysis.clauseAnalysis.length === 0) {
    return "";
  }
  return analysis.clauseAnalysis
    .map(
      (clause, i) =>
        `[Clause ${i + 1}]
Type: ${clause.clauseType}
Risk Level: ${clause.riskLevel}
Confidence: ${(clause.confidence * 100).toFixed(0)}%
KB Source: ${clause.sourceFromKB ?? "none"}
Text: ${clause.clauseText}
Redline Suggestion: ${clause.redlineSuggestion ?? "not generated"}`,
    )
    .join("\n\n");
}

function buildAnalysisAnswer(analysis: IRiskAnalysis): string {
  const summary = analysis.executiveSummary;
  const lines: string[] = [
    `Overall Risk: ${summary.overallRisk}`,
    `Total Clauses: ${summary.totalClauses}`,
    `Risky Clauses: ${summary.riskyClausesCount}`,
    `Summary (EN): ${summary.summary.en ?? ""}`,
    `Summary (AR): ${summary.summary.ar ?? ""}`,
  ];
  return lines.join("\n");
}

export const judgeService = {
  async evaluateAnalysis(analysis: IRiskAnalysis): Promise<void> {
    try {
      const trace = langfuse.trace({
        name: `Analysis Evaluation ${analysis._id}`,
        userId: analysis.userId,
        metadata: {
          analysisId: analysis._id.toString(),
          overallRisk: analysis.executiveSummary.overallRisk,
          totalClauses: analysis.executiveSummary.totalClauses,
        },
      });

      const question = "Evaluate the quality of this contract analysis.";
      const answer = buildAnalysisAnswer(analysis);
      const context = buildClauseContext(analysis);
      const userPrompt = JUDGE_USER_PROMPT(question, answer, context);

      const { content } = await llmService.call(userPrompt, {
        systemPrompt: JUDGE_SYSTEM_PROMPT,
        temperature: 0,
        maxTokens: 1024,
      });

      let parsed: any;
      try {
        parsed = JSON.parse(content.trim());
      } catch (err) {
        logger.error("JudgeService – failed to parse LLM JSON", {
          raw: content,
          error: err instanceof Error ? err.message : String(err),
          analysisId: analysis._id.toString(),
        });
        return;
      }

      const {
        faithfulness,
        relevancy,
        precision,
        recall,
        reasoning = {},
      } = parsed;

      const evaluation = new Evaluation({
        analysisId: analysis._id,
        traceId: trace.id,
        faithfulness,
        relevancy,
        precision,
        recall,
        reasoning,
        createdAt: new Date(),
      });
      await evaluation.save();

      const scoreOpts = (name: string, value: number, comment?: string) => ({
        name,
        value,
        traceId: trace.id,
        comment,
      });

      langfuse.score(
        scoreOpts("faithfulness", faithfulness, reasoning.faithfulness),
      );
      langfuse.score(scoreOpts("relevancy", relevancy, reasoning.relevancy));
      langfuse.score(scoreOpts("precision", precision, reasoning.precision));
      langfuse.score(scoreOpts("recall", recall, reasoning.recall));

      logger.info("JudgeService – evaluation stored", {
        analysisId: analysis._id.toString(),
        evaluationId: evaluation._id.toString(),
        traceId: trace.id,
        scores: { faithfulness, relevancy, precision, recall },
      });
    } catch (err) {
      logger.error("JudgeService – unexpected error", {
        error: err instanceof Error ? err.message : String(err),
        analysisId: (analysis as any)?._id?.toString(),
      });
    }
  },
};
