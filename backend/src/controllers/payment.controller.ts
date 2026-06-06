import { Request, Response, NextFunction } from "express";
import { paymentService } from "../services/payment.service.js";
import { AppError } from "../middlewares/errorHandler.js";
import { ApiResponse } from "../types/index.js";
import { logger } from "../utils/logger.js";

interface AuthRequest extends Request {
  user: {
    _id: { toString(): string };
  };
}

export class PaymentController {
  /**
   * POST /api/payments/checkout
   *
   * Body: { planSlug: string }
   *
   * Creates a Stripe Checkout session for the authenticated user and returns
   * the hosted checkout URL to redirect them to.
   */
  async createCheckoutSession(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { planSlug } = req.body;
      if (!planSlug || typeof planSlug !== "string") {
        throw new AppError(400, "planSlug is required.");
      }

      const userId = req.user._id.toString();

      // Pass planSlug — paymentService.createCheckoutSession resolves it
      const result = await paymentService.createCheckoutSession(
        userId,
        planSlug,
      );

      logger.info(
        `Checkout session created for user ${userId}, plan ${planSlug}`,
      );

      const response: ApiResponse<{ url: string | null }> = {
        success: true,
        data: result,
        message: "Checkout session created successfully",
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/success?session_id=:sessionId
   *
   * Stripe redirects here after a successful payment. Verifies the session,
   * ensures the subscription is activated and credits are topped up, then
   * returns the confirmation to the frontend.
   */
  async confirmSession(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { session_id } = req.query;
      if (!session_id || typeof session_id !== "string") {
        throw new AppError(400, "session_id is required.");
      }

      const result = await paymentService.confirmSession(session_id);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message:
          result.status === "succeeded"
            ? "Payment confirmed. Your plan has been activated."
            : "Payment is still being processed.",
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/cancel
   *
   * Stripe redirects here when the user cancels the checkout flow.
   * This endpoint is intentionally read-only — no subscription or credit
   * data is modified.
   */
  async cancelSession(req: Request, res: Response): Promise<void> {
    logger.info("User cancelled checkout session");

    res.status(200).json({
      success: true,
      message: "Payment cancelled. No charges were made.",
    });
  }

  /**
   * POST /api/payments/webhook
   *
   * Stripe webhook receiver. Must be registered with raw body parsing
   * (express.raw) so the signature can be verified.
   */
  async handleWebhook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const signature = req.headers["stripe-signature"] as string;
      if (!signature) {
        throw new AppError(400, "Missing stripe-signature header");
      }

      // req.body must be the raw Buffer — ensure express.raw() middleware is
      // applied to this route before the controller
      await paymentService.handleWebhook(req.body as Buffer, signature);

      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
