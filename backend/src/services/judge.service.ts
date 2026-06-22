import { llmService } from "./llm.service.js";
import { JUDGE_SYSTEM_PROMPT, JUDGE_USER_PROMPT } from "./judgePrompt.js";
import { Evaluation } from "../models/evaluation.model.js";
import langfuse from "../utils/langfuseClient.js";
import { logger } from "../utils/logger.js";
import type { IRiskAnalysis } from "../models/riskAnalysis.model.js";

/**
 * Calls the LLM judge (GPT‑4o) to evaluate a completed analysis, saves the scores
 * into the `Evaluation` collection, and logs each metric as a Langfuse score.
 */
export const judgeService = {
  async evaluateAnalysis(analysis: IRiskAnalysis): Promise<void> {
    try {
      // ---------------------------------------------------------------------
      // 1️⃣ Create a Langfuse trace – this will group the scores under a single run.
      // ---------------------------------------------------------------------
      const trace = langfuse.trace({
        name: `Analysis Evaluation ${analysis._id}`,
        userId: analysis.userId,
        metadata: { analysisId: analysis._id.toString() },
      });

      // ---------------------------------------------------------------------
      // 2️⃣ Build the prompt.  For now we supply a minimal context – the
      // executive summary (English) as the answer and an empty context string.
      // This can be expanded later to include the original contract text.
      // ---------------------------------------------------------------------
      const question = "[Evaluation]"; // placeholder – no specific question needed.
      const answer = analysis.executiveSummary.summary.en ?? "";
      const context = ""; // could be concatenated clause texts if required.
      const userPrompt = JUDGE_USER_PROMPT(question, answer, context);

      // ---------------------------------------------------------------------
      // 3️⃣ Invoke the LLM with the system prompt that defines the rubric.
      // ---------------------------------------------------------------------
      const { content } = await llmService.callPrimary(userPrompt, {
        systemPrompt: JUDGE_SYSTEM_PROMPT,
        temperature: 0,
        maxTokens: 1024,
      });

      // ---------------------------------------------------------------------
      // 4️⃣ Parse the JSON output.  If parsing fails we log and abort – we do
      //    not want malformed data entering the DB.
      // ---------------------------------------------------------------------
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

      // ---------------------------------------------------------------------
      // 5️⃣ Persist the evaluation document.
      // ---------------------------------------------------------------------
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

      // ---------------------------------------------------------------------
      // 6️⃣ Log each metric as a Langfuse score, attaching the reasoning as a
      //    comment where appropriate.
      // ---------------------------------------------------------------------
      const scoreOpts = (name: string, value: number, comment?: string) => ({
        name,
        value,
        traceId: trace.id,
        comment,
      });

      langfuse.score(scoreOpts("faithfulness", faithfulness, reasoning.faithfulness));
      langfuse.score(scoreOpts("relevancy", relevancy, reasoning.relevancy));
      langfuse.score(scoreOpts("precision", precision, reasoning.precision));
      langfuse.score(scoreOpts("recall", recall, reasoning.recall));

      logger.info("JudgeService – evaluation stored", {
        analysisId: analysis._id.toString(),
        evaluationId: evaluation._id.toString(),
        traceId: trace.id,
      });
    } catch (err) {
      logger.error("JudgeService – unexpected error", {
        error: err instanceof Error ? err.message : String(err),
        analysisId: (analysis as any)?._id?.toString(),
      });
    }
  },
};
