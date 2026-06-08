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
 *  - Estimates token count from the contract text length.
 *  - Calls creditsService.estimateCost(estimatedTokens) to get the required credits.
 *  - Calls creditsService.getBalance(userId) to fetch the current balance.
 *  - If balance < estimatedCost → responds 402 with { currentBalance, requiredCredits }.
 *  - Otherwise attaches { estimatedCreditCost, estimatedTokens } to req and calls next().
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

    // ── Estimate token count ──────────────────────────────────────────────
    // The contract text isn't on req.body directly at this point (only contractId
    // is), so we load it from the DB. contractService.getContractById is already
    // called in the controller, but we need the text here for the estimate.
    const { contractId } = req.body as { contractId?: string };

    let estimatedTokens = 500; // safe default when no text is available

    if (contractId) {
      try {
        const contract = await contractService.getContractById(contractId);
        if (contract?.text) {
          // Approximation: 1 token ≈ 4 characters (GPT-style tokenisation heuristic)
          estimatedTokens = Math.ceil(contract.text.length / 4);
        }
      } catch {
        // Non-critical — fall back to the default estimate
        logger.warn(
          `creditsEnforcement: could not load contract ${contractId} for token estimation`,
        );
      }
    }

    // ── Cost estimation & balance check ──────────────────────────────────
    const estimatedCost = await creditsService.estimateCost(estimatedTokens);
    const currentBalance = await creditsService.getBalance(userId);

    logger.info("creditsEnforcement: pre-analysis credit check", {
      userId,
      contractId,
      estimatedTokens,
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
    req.estimatedTokens = estimatedTokens;

    next();
  } catch (error) {
    logger.error("creditsEnforcement: unexpected error in pre-analysis check", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail open — do not block the request on an internal error
    next();
  }
}
