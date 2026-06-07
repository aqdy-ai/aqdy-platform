import mongoose from "mongoose";
import Stripe from "stripe";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../middlewares/errorHandler.js";
import { AuditLog } from "../models/auditLog.model.js";
import Payment from "../models/payment.model.js";
import { Plan, IPlan } from "../models/plan.model.js";
import { Subscription } from "../models/subscription.model.js";
import { User, IUser } from "../models/user.model.js";
import { creditsService } from "./credits.service.js";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY);

/** Intersection type to handle period fields missing in newer SDK versions */
type StripeSubWithPeriod = Stripe.Subscription & {
  current_period_start: number;
  current_period_end: number;
};

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
   * Creates a Stripe Checkout Session for a user to upgrade their plan.
   *
   * Accepts either a plan slug (string) or a plan ObjectId — the controller
   * always passes a slug from the request body, so we resolve it here.
   */
  async createCheckoutSession(userId: string, planSlugOrId: string) {
    const user = (await User.findById(userId)) as IUser;
    if (!user) throw new AppError(404, "User not found");

    // Resolve by slug first, fall back to ObjectId lookup
    let plan: IPlan | null = await Plan.findOne({
      slug: planSlugOrId,
      isActive: true,
    });

    if (!plan && mongoose.Types.ObjectId.isValid(planSlugOrId)) {
      plan = await Plan.findById(planSlugOrId);
    }

    if (!plan || !plan.isActive) {
      throw new AppError(400, "Invalid or inactive plan");
    }

    if (!plan.stripePriceId) {
      throw new AppError(400, "Plan is not configured for payments");
    }

    // Prevent downgrade to free plan via checkout
    if (plan.slug === "free") {
      throw new AppError(400, "Cannot checkout for the free plan");
    }

    // Ensure Stripe customer exists
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() },
      });
      stripeCustomerId = customer.id;
      await User.findByIdAndUpdate(userId, { stripeCustomerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/pricing`,
      // Store both slug and ObjectId in metadata for reliable lookup
      metadata: { userId, planId: String(plan._id), planSlug: plan.slug },
    });

    logger.info(
      `🛒 Checkout session created for user ${userId}, plan ${plan.slug}`,
    );
    return { url: session.url };
  }

  /**
   * Verifies a session manually — used by the /payment/success callback.
   * Returns the updated subscription and new credit balance.
   */
  async confirmSession(sessionId: string) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      await this.fulfillSubscription(session);

      const userId = session.metadata?.userId;
      const creditBalance = userId
        ? await creditsService.getBalance(userId)
        : null;

      return {
        status: "succeeded",
        ...(creditBalance !== null && { creditBalance }),
      };
    }

    return { status: "pending" };
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

    // Idempotency check: skip already-processed events
    const existingLog = await AuditLog.findOne({
      "metadata.stripeEventId": event.id,
    });
    if (existingLog) {
      logger.info(`Skipping already processed Stripe event: ${event.id}`);
      return;
    }

    logger.info(`🔔 Received Stripe webhook event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.fulfillSubscription(session);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if (
          (invoice as Stripe.Invoice & { subscription: string }).subscription
        ) {
          await this.handleSuccessfulRenewal(invoice);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handleFailedPayment(invoice);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subDoc = await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: subscription.id },
          { status: "cancelled", cancelledAt: new Date(), endDate: new Date() },
          { new: true },
        );
        if (subDoc) {
          await User.findByIdAndUpdate(subDoc.userId, {
            plan: "free",
            planSlug: "free",
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as unknown as StripeSubWithPeriod;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: sub.id },
          {
            status: sub.status === "active" ? "active" : "past_due",
            endDate: new Date(sub.current_period_end * 1000),
          },
        );
        break;
      }
    }

    // Log the processed event for idempotency
    await AuditLog.create({
      action: "STRIPE_WEBHOOK",
      outcome: "success",
      metadata: {
        stripeEventId: event.id,
        eventType: event.type,
      },
    });
  }

  /**
   * Core fulfillment logic — idempotent, safe to call from both webhook and
   * the /success callback.
   *
   * Key fixes vs. original:
   *  1. Uses creditsService.topup() so a CreditLedger entry is written.
   *  2. Uses plan.creditAllowance (not plan.analysisLimit) for topup amount.
   *  3. Does NOT double-increment creditBalance via $inc after creditsService
   *     already did the atomic update.
   */
  async fulfillSubscription(session: Stripe.Checkout.Session): Promise<void> {
    const { userId, planId } = session.metadata || {};
    if (!userId || !planId) {
      logger.warn(
        "fulfillSubscription: missing userId or planId in session metadata",
      );
      return;
    }

    const stripeSubscriptionId = session.subscription as string;

    // Idempotency: bail if subscription already fulfilled
    const exists = await Subscription.findOne({ stripeSubscriptionId });
    if (exists) {
      logger.info(
        `fulfillSubscription: already fulfilled for ${stripeSubscriptionId}`,
      );
      return;
    }

    const plan = (await Plan.findById(planId)) as IPlan;
    if (!plan) {
      logger.error(`fulfillSubscription: plan ${planId} not found`);
      return;
    }

    const stripeSub = (await stripe.subscriptions.retrieve(
      stripeSubscriptionId,
    )) as unknown as StripeSubWithPeriod;

    // 1. Create subscription record
    const subscription = await Subscription.create({
      userId: new mongoose.Types.ObjectId(userId),
      planId: plan._id,
      status: "active",
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId,
      startDate: new Date(stripeSub.current_period_start * 1000),
      endDate: new Date(stripeSub.current_period_end * 1000),
      renewalDate: new Date(stripeSub.current_period_end * 1000),
    });

    // 2. Update user's plan (do NOT touch creditBalance here — creditsService handles it)
    await User.findByIdAndUpdate(userId, {
      plan: plan.slug,
      planSlug: plan.slug,
      status: "active",
    });

    // 3. Top up credits via creditsService so a ledger entry is written
    if (plan.creditAllowance > 0) {
      try {
        await creditsService.topup(userId, plan.creditAllowance, "plan_topup");
        logger.info(
          `💳 Topped up ${plan.creditAllowance} credits for user ${userId} (plan: ${plan.slug})`,
        );
      } catch (err) {
        // Credit topup failure must not roll back the subscription — log and alert
        logger.error(
          `❌ Credit topup failed for user ${userId} after successful payment:`,
          err,
        );
      }
    }

    // 4. Record payment
    await Payment.create({
      userId,
      subscriptionId: subscription._id,
      amount: (session.amount_total || 0) / 100,
      currency: session.currency || "usd",
      status: "succeeded",
      provider: "stripe",
      providerTxId: session.id,
      description: `Initial payment for ${plan.name} plan`,
    });

    logger.info(
      `✅ Subscription fulfilled for user ${userId}, plan ${plan.slug}`,
    );
  }

  private async handleSuccessfulRenewal(invoice: Stripe.Invoice) {
    const stripeSubscriptionId = (
      invoice as Stripe.Invoice & { subscription: string }
    ).subscription;

    const stripeSub = (await stripe.subscriptions.retrieve(
      stripeSubscriptionId,
    )) as unknown as StripeSubWithPeriod;

    const subscription = await Subscription.findOneAndUpdate(
      { stripeSubscriptionId },
      {
        status: "active",
        endDate: new Date(stripeSub.current_period_end * 1000),
        renewalDate: new Date(stripeSub.current_period_end * 1000),
      },
      { new: true },
    );

    if (!subscription) return;

    // Top up credits on renewal too
    const plan = await Plan.findById(subscription.planId);
    if (plan && plan.creditAllowance > 0) {
      try {
        await creditsService.topup(
          String(subscription.userId),
          plan.creditAllowance,
          "plan_topup",
        );
        logger.info(
          `💳 Renewal topup: ${plan.creditAllowance} credits for user ${subscription.userId}`,
        );
      } catch (err) {
        logger.error(
          `❌ Renewal credit topup failed for user ${subscription.userId}:`,
          err,
        );
      }
    }

    await Payment.create({
      userId: subscription.userId,
      subscriptionId: subscription._id,
      amount: (invoice.amount_paid || 0) / 100,
      currency: invoice.currency || "usd",
      status: "succeeded",
      provider: "stripe",
      providerTxId: invoice.id,
      description: `Subscription renewal: ${stripeSubscriptionId}`,
    });
  }

  private async handleFailedPayment(invoice: Stripe.Invoice) {
    const stripeSubscriptionId = (
      invoice as Stripe.Invoice & { subscription: string }
    ).subscription;

    const subscription = await Subscription.findOneAndUpdate(
      { stripeSubscriptionId },
      { status: "past_due" },
      { new: true },
    );

    if (subscription) {
      await User.findByIdAndUpdate(subscription.userId, {
        status: "suspended",
      });
    }

    if (!subscription) return;

    await Payment.create({
      userId: subscription.userId,
      subscriptionId: subscription._id,
      amount: (invoice.amount_due || 0) / 100,
      currency: invoice.currency || "usd",
      status: "failed",
      provider: "stripe",
      providerTxId: invoice.id,
      description: `Payment failed for renewal: ${stripeSubscriptionId}`,
    });
  }
}

export const paymentService = new PaymentService();
