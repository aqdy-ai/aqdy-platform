import mongoose from "mongoose";
import Stripe from "stripe";
import PDFDocument from "pdfkit";
import { IPayment } from "../models/payment.model.js";
import { ISubscription } from "../models/subscription.model.js";
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

// Interface for Payment document after population
export interface IPopulatedPayment extends Omit<IPayment, "subscriptionId"> {
  subscriptionId: ISubscription & { planId: IPlan };
}

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
  async createCheckoutSession(
    userId: string,
    planSlugOrId: string,
    billingCycle: "monthly" | "annual" = "monthly",
  ) {
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

    // Pick the correct Stripe price for the billing cycle
    const priceId =
      billingCycle === "annual" && plan.stripeAnnualPriceId
        ? plan.stripeAnnualPriceId
        : plan.stripePriceId;

    if (!priceId) {
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
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/pricing`,
      // Store both slug and ObjectId in metadata for reliable lookup
      metadata: {
        userId,
        planId: String(plan._id),
        planSlug: plan.slug,
        billingCycle,
      },
    });

    logger.info(
      `🛒 Checkout session created for user ${userId}, plan ${plan.slug} (${billingCycle})`,
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
          {
            status: "cancelled",
            cancelledAt: new Date(),
            endDate: new Date(),
          },
          { new: true },
        );
        if (subDoc) {
          // Only downgrade to free if the user hasn't already switched to a
          // newer active subscription (prevents race when Stripe deletes the
          // old subscription milliseconds after a new checkout.session.completed).
          const newerSub = await Subscription.findOne({
            userId: subDoc.userId,
            status: "active",
          });
          if (!newerSub) {
            const freePlan = await Plan.findOne({ slug: "free" });
            if (freePlan) {
              await User.findByIdAndUpdate(subDoc.userId, {
                plan: freePlan.slug,
                planSlug: freePlan.slug,
                creditBalance: 0,
              });
              if (freePlan.creditAllowance > 0) {
                await creditsService.topup(
                  String(subDoc.userId),
                  freePlan.creditAllowance,
                  "plan_topup",
                );
              }
            } else {
              await User.findByIdAndUpdate(subDoc.userId, {
                plan: "free",
                planSlug: "free",
              });
            }
          } else {
            logger.info(
              `customer.subscription.deleted: user ${subDoc.userId} already has a newer active subscription — skipping downgrade`,
            );
          }
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as unknown as StripeSubWithPeriod;
        const updatedSub = await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: sub.id },
          {
            status: sub.status === "active" ? "active" : "past_due",
            endDate: new Date(sub.current_period_end * 1000),
          },
          { new: true },
        );
        // If a past_due subscription transitions back to active (e.g. Stripe
        // retry succeeded), restore the user's status so they can use the platform.
        if (updatedSub && sub.status === "active") {
          await User.findByIdAndUpdate(updatedSub.userId, { status: "active" });
        }
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

    // 0. Expire any existing active subscriptions for this user so only one remains
    await Subscription.updateMany(
      {
        userId: new mongoose.Types.ObjectId(userId),
        status: "active",
      },
      { status: "expired" },
    );

    // 1. Create subscription record (duplicate-key-safe — webhook + success callback may race)
    let subscription: ISubscription;
    try {
      subscription = await Subscription.create({
        userId: new mongoose.Types.ObjectId(userId),
        planId: plan._id,
        status: "active",
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId,
        startDate: new Date(stripeSub.current_period_start * 1000),
        endDate: new Date(stripeSub.current_period_end * 1000),
        renewalDate: new Date(stripeSub.current_period_end * 1000),
      });
    } catch (err: unknown) {
      // E11000 = duplicate key — another caller already created this subscription
      if ((err as any)?.code === 11000) {
        logger.info(
          `fulfillSubscription: subscription ${stripeSubscriptionId} already exists (race winner)`,
        );
        return;
      }
      throw err;
    }

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

    // 4. Record payment (handle duplicate key errors gracefully)
    try {
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
      logger.info(`✅ Payment recorded for providerTxId ${session.id}`);
    } catch (err) {
      // If duplicate key error, treat as already recorded
      if ((err as any).code === 11000) {
        logger.info(
          `✅ Payment already exists for providerTxId ${session.id}, skipping creation`,
        );
      } else {
        throw err;
      }
    }

    logger.info(
      `✅ Subscription fulfilled for user ${userId}, plan ${plan.slug}`,
    );
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
  /**
   * Handles successful invoice.paid events (subscription renewal).
   */
  private async handleSuccessfulRenewal(invoice: Stripe.Invoice) {
    const stripeSubscriptionId = (
      invoice as Stripe.Invoice & { subscription: string }
    ).subscription;
    const stripeSub = (await stripe.subscriptions.retrieve(
      stripeSubscriptionId,
    )) as unknown as StripeSubWithPeriod;

    // Update subscription status and dates
    const subDoc = await Subscription.findOneAndUpdate(
      { stripeSubscriptionId },
      {
        status: "active",
        endDate: new Date(stripeSub.current_period_end * 1000),
        renewalDate: new Date(stripeSub.current_period_end * 1000),
      },
      { new: true },
    );

    if (!subDoc) {
      logger.warn(
        `handleSuccessfulRenewal: subscription ${stripeSubscriptionId} not found`,
      );
      return;
    }

    // Restore user to active if they were suspended due to prior payment failure
    await User.findByIdAndUpdate(subDoc.userId, { status: "active" });

    const plan = await Plan.findById(subDoc.planId);
    if (plan && plan.creditAllowance && plan.creditAllowance > 0) {
      await creditsService.topup(
        subDoc.userId.toString(),
        plan.creditAllowance,
        "plan_topup",
      );
      logger.info(
        `💳 Renewal topup: ${plan.creditAllowance} credits for user ${subDoc.userId}`,
      );
    } else {
      logger.warn(
        `⚠️ No credit allowance found for plan during renewal for subscription ${subDoc._id}`,
      );
    }

    await Payment.create({
      userId: subDoc.userId,
      subscriptionId: subDoc._id,
      amount: (invoice.amount_paid || 0) / 100,
      currency: invoice.currency || "usd",
      status: "succeeded",
      provider: "stripe",
      providerTxId: invoice.id,
      description: `Subscription renewal: ${stripeSubscriptionId}`,
    });
  }

  /**
   * Get paginated list of payments for a user
   */
  async getUserPayments(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [payments, total] = (await Promise.all([
      Payment.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "subscriptionId",
          populate: { path: "planId", select: "name slug" },
        }) as unknown as Promise<IPopulatedPayment[]>,
      Payment.countDocuments({ userId }),
    ])) as [IPopulatedPayment[], number]; // Explicitly cast the Promise.all result

    return {
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get detailed payment record, ensuring user ownership
   */
  async getPaymentById(paymentId: string, userId: string) {
    const payment = await Payment.findOne({
      _id: paymentId,
      userId,
    }).populate<IPopulatedPayment>({
      path: "subscriptionId",
      populate: { path: "planId", select: "name slug" },
    });

    if (!payment) throw new AppError(404, "Payment record not found");
    if (payment.userId.toString() !== userId) {
      throw new AppError(403, "Forbidden");
    }
    return payment;
  }

  /**
   * Generates a simple PDF invoice for a specific payment
   */
  async generateInvoicePdf(paymentId: string, userId: string): Promise<Buffer> {
    const payment = (await this.getPaymentById(
      paymentId,
      userId,
    )) as IPopulatedPayment; // Ensure it's non-null and correctly typed
    const planName =
      payment.subscriptionId?.planId?.name || "Subscription Plan";

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      doc.fontSize(20).text("INVOICE", { align: "right" });
      doc.fontSize(12).text("Aqdy Platform", 50, 50);
      doc.fontSize(10).text("AI Contract Analysis", 50, 65);
      doc.moveDown();

      doc.text(`Invoice ID: ${payment.providerTxId || payment._id}`);
      doc.text(`Date: ${new Date(payment.createdAt).toLocaleDateString()}`);
      doc.text(`Status: ${payment.status.toUpperCase()}`);
      doc.moveDown();

      doc.fontSize(12).text("Description", 50, 150);
      doc.text("Amount", 400, 150, { align: "right" });
      doc.moveTo(50, 165).lineTo(550, 165).stroke();

      doc.fontSize(10).text(`Subscription Renewal - ${planName}`, 50, 180);
      doc.text(
        `${payment.amount} ${payment.currency.toUpperCase()}`,
        400,
        180,
        { align: "right" },
      );

      doc.moveTo(50, 200).lineTo(550, 200).stroke();
      doc.fontSize(12).text("Total", 350, 215);
      doc.text(
        `${payment.amount} ${payment.currency.toUpperCase()}`,
        400,
        215,
        { align: "right" },
      );

      doc.end();
    });
  }
}

export const paymentService = new PaymentService();
