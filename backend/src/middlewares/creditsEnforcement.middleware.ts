import { Response, NextFunction } from "express";
import { creditsService } from "../services/credits.service.js";
import { contractService } from "../services/contract.service.js";
import { logger } from "../utils/logger.js";
import { AuthenticatedRequest } from "../types/auth.js";

/**
 * Middleware: enforce credits balance BEFORE an analysis run begins.
 *
 * Pipeline position (analysis route):
 *   authenticateJwt → requireAuth → validate → verifyContractOwnership
 *   → userAnalysisRateLimit → enforceCreditsBeforeAnalysis → analyzeContract
 *
 * Behaviour:
 *  - Estimates input/output token counts from the contract text length.
 *  - Calls creditsService.calculateAnalysisCost(inputTokens, outputTokens).
 *  - Calls creditsService.getBalance(userId) to fetch the current balance.
 *  - If balance < estimatedCost → responds 402 with { currentBalance, requiredCredits }.
 *  - Otherwise attaches { estimatedCreditCost, estimatedTokens } to req and calls next().
 *
 * Token split heuristic (matches post-analysis deduction):
 *   inputTokens  ≈ text.length / 4        (chars → tokens at ~4 chars/token)
 *   outputTokens ≈ inputTokens × 0.30     (conservative pipeline output estimate)
 */
export async function enforceCreditsBeforeAnalysis(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?._id?.toString();

    // Pass-through if there is no authenticated user (auth middleware handles 401).
    if (!userId) {
      next();
      return;
    }

    // ── Estimate token counts from contract text ──────────────────────────
    const { contractId } = req.body as { contractId?: string };

    let estimatedInputTokens = 400; // safe defaults
    let estimatedOutputTokens = 120;

    if (contractId) {
      try {
        const contract = await contractService.getContractById(contractId);
        if (contract?.text) {
          // ~4 chars per token (GPT-style heuristic)
          estimatedInputTokens = Math.ceil(contract.text.length / 4);
          // Pipeline output is roughly 30% of input for multi-agent workflows
          estimatedOutputTokens = Math.ceil(estimatedInputTokens * 0.3);
        }
      } catch {
        // Non-critical — fall back to the default estimate
        logger.warn(
          `creditsEnforcement: could not load contract ${contractId} for token estimation`,
        );
      }
    }

    // ── Cost estimation & balance check ──────────────────────────────────
    const estimatedCost = creditsService.calculateAnalysisCost(
      estimatedInputTokens,
      estimatedOutputTokens,
    );
    const currentBalance = await creditsService.getBalance(userId);

    logger.info("creditsEnforcement: pre-analysis credit check", {
      userId,
      contractId,
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCost,
      currentBalance,
    });

    if (currentBalance < estimatedCost) {
      logger.warn("creditsEnforcement: insufficient credits", {
        userId,
        currentBalance,
        estimatedCost,
      });

      res.status(402).json({
        success: false,
        error: "Insufficient credits",
        details: {
          currentBalance,
          requiredCredits: estimatedCost,
          message: `You need at least ${estimatedCost} credits to run this analysis. Your current balance is ${currentBalance}.`,
        },
      });
      return;
    }

    // ── Attach estimates for downstream use ──────────────────────────────
    req.estimatedCreditCost = estimatedCost;
    req.estimatedTokens = estimatedInputTokens + estimatedOutputTokens;

    next();
  } catch (error) {
    logger.error("creditsEnforcement: unexpected error in pre-analysis check", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail open — do not block the request on an internal error
    next();
  }
}
