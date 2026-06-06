import Stripe from "stripe";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../middlewares/errorHandler.js";
import { AuditLog } from "../models/auditLog.model.js";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY);

/** 🛡️ Intersection type to handle period fields missing in newer SDK versions */

export class PaymentService {
  /**
   * Verify Stripe sandbox connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const products = await stripe.products.list({ limit: 1 });

      logger.info(
        `✅ Stripe sandbox connected successfully. Products found: ${products.data.length}`,
      );

      return true;
    } catch (error) {
      logger.error("❌ Failed to connect to Stripe sandbox", error);
      return false;
    }
  }

  /**
   * Processes incoming Stripe webhooks.
   */
  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      logger.error("⚠️ Webhook signature verification failed.", err);
      throw new AppError(400, "Webhook signature verification failed");
    }

    // 🛡️ Idempotency check: Ensure we don't process the same event twice
    const existingLog = await AuditLog.findOne({
      "metadata.stripeEventId": event.id,
    });
    if (existingLog) {
      logger.info(`Skipping already processed Stripe event: ${event.id}`);
      return;
    }

    logger.info(`🔔 Received Stripe webhook event: ${event.type}`);
  }
}

export const paymentService = new PaymentService();
