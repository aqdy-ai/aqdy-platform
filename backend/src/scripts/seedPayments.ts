import mongoose from "mongoose";
import connectDB from "../config/database.js";
import { User } from "../models/user.model.js";
import { Plan } from "../models/plan.model.js";
import { Subscription } from "../models/subscription.model.js";
import Payment from "../models/payment.model.js";
import { CreditLedger } from "../models/creditLedger.model.js";
import { logger } from "../utils/logger.js";

const shouldClear = process.argv.includes("--clear");

const seedPayments = async () => {
  try {
    logger.info("🌱 Starting Payment data seeding...");
    await connectDB();

    // ── 1. Ensure demo user exists ────────────────────────────
    let demoUser = await User.findOne({ email: "payment_demo@example.com" });
    if (!demoUser) {
      logger.info("Creating demo user payment_demo@example.com...");
      demoUser = await User.create({
        name: "Payment Demo",
        email: "payment_demo@example.com",
        password: "Demo@123456",
        role: "super_admin",
        plan: "pro",
        planSlug: "pro",
        creditBalance: 4000,
        isEmailVerified: true,
      });
      logger.info(`Demo user created: ${demoUser._id}`);
    } else {
      logger.info(`Using existing demo user: ${demoUser._id}`);
    }

    // ── 2. Ensure plans exist ────────────────────────────────
    const plans = await Plan.find({ isActive: true }).lean();
    if (plans.length === 0) {
      logger.warn("⚠️  No plans found. Run 'npm run seed:plans' first.");
      logger.warn("   Skipping subscription/payment seeding.");
      await mongoose.disconnect();
      process.exit(0);
    }
    logger.info(`Found ${plans.length} active plans.`);

    // ── 3. Create subscriptions for each plan ────────────────
    if (shouldClear) {
      await Subscription.deleteMany({ userId: demoUser._id });
      logger.info("Cleared existing subscriptions for demo user.");
    }

    const now = new Date();
    const subscriptions: Array<{
      planName: string;
      sub: mongoose.Document;
    }> = [];

    for (const plan of plans) {
      const existingSub = await Subscription.findOne({
        userId: demoUser._id,
        planId: plan._id,
      });
      if (existingSub) {
        logger.info(`Subscription for ${plan.name} already exists, reusing.`);
        subscriptions.push({ planName: plan.name, sub: existingSub });
        continue;
      }

      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 2);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      const renewalDate = new Date(endDate);

      const sub = await Subscription.create({
        userId: demoUser._id,
        planId: plan._id,
        status: "active",
        startDate,
        endDate,
        renewalDate,
        stripeCustomerId: "cus_demo_" + plan.slug,
        stripeSubscriptionId: "sub_demo_" + plan.slug + "_" + Date.now(),
      });
      logger.info(`Created subscription for ${plan.name}: ${sub._id}`);
      subscriptions.push({ planName: plan.name, sub });
    }

    // ── 4. Create sample payment records ──────────────────────
    if (shouldClear) {
      await Payment.deleteMany({ userId: demoUser._id });
      logger.info("Cleared existing payments for demo user.");
    }

    const proSub = subscriptions.find((s) => s.planName === "Pro")?.sub;
    const enterpriseSub = subscriptions.find(
      (s) => s.planName === "Enterprise",
    )?.sub;
    const freeSub = subscriptions.find((s) => s.planName === "Free")?.sub;

    const samplePayments = [
      {
        userId: demoUser._id,
        subscriptionId: proSub?._id ?? demoUser._id,
        amount: 9,
        currency: "USD",
        status: "succeeded" as const,
        provider: "stripe",
        providerTxId: "pi_demo_succeeded_pro_001",
        description: "Pro plan monthly payment",
        createdAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
      },
      {
        userId: demoUser._id,
        subscriptionId: proSub?._id ?? demoUser._id,
        amount: 9,
        currency: "USD",
        status: "succeeded" as const,
        provider: "stripe",
        providerTxId: "pi_demo_succeeded_pro_002",
        description: "Pro plan monthly payment",
        createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        userId: demoUser._id,
        subscriptionId: enterpriseSub?._id ?? demoUser._id,
        amount: 39,
        currency: "USD",
        status: "succeeded" as const,
        provider: "stripe",
        providerTxId: "pi_demo_succeeded_ent_001",
        description: "Enterprise plan monthly payment",
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        userId: demoUser._id,
        subscriptionId: proSub?._id ?? demoUser._id,
        amount: 9,
        currency: "USD",
        status: "failed" as const,
        provider: "stripe",
        providerTxId: "pi_demo_failed_pro_001",
        description: "Pro plan payment — card declined",
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        userId: demoUser._id,
        subscriptionId: enterpriseSub?._id ?? demoUser._id,
        amount: 39,
        currency: "USD",
        status: "refunded" as const,
        provider: "stripe",
        providerTxId: "pi_demo_refunded_ent_001",
        description: "Enterprise plan refund — customer request",
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        userId: demoUser._id,
        subscriptionId: freeSub?._id ?? demoUser._id,
        amount: 0,
        currency: "USD",
        status: "succeeded" as const,
        provider: "stripe",
        providerTxId: "pi_demo_succeeded_free_001",
        description: "Free plan activation",
        createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      },
    ];

    let insertedCount = 0;
    for (const pmt of samplePayments) {
      const existing = await Payment.findOne({
        providerTxId: pmt.providerTxId,
      });
      if (!existing) {
        await Payment.create(pmt);
        insertedCount++;
      } else {
        logger.info(`Payment ${pmt.providerTxId} already exists, skipping.`);
      }
    }
    logger.info(`Inserted ${insertedCount} new payment records.`);

    // ── 5. Create CreditLedger entries for succeeded payments ─
    if (shouldClear) {
      await CreditLedger.deleteMany({
        userId: demoUser._id,
        reason: "plan_topup",
      });
      logger.info("Cleared existing credit ledger entries for demo user.");
    }

    let ledgerCount = 0;
    for (const pmt of samplePayments) {
      if (pmt.status !== "succeeded" || pmt.amount === 0) continue;

      const existingLedger = await CreditLedger.findOne({
        userId: demoUser._id,
        reason: "plan_topup",
        "metadata.paymentTxId": pmt.providerTxId,
      });
      if (existingLedger) continue;

      const creditAmount = pmt.amount * 100;
      const currentBalance =
        (
          await CreditLedger.findOne({ userId: demoUser._id })
            .sort({ createdAt: -1 })
            .select("balanceAfter")
            .lean()
        )?.balanceAfter ?? demoUser.creditBalance;

      await CreditLedger.create({
        userId: demoUser._id,
        delta: creditAmount,
        balanceAfter: currentBalance + creditAmount,
        reason: "plan_topup",
        metadata: {
          paymentTxId: pmt.providerTxId,
        },
      });
      ledgerCount++;
    }
    logger.info(`Inserted ${ledgerCount} credit ledger entries.`);

    await mongoose.disconnect();
    logger.info("✅ Payment data seeding complete.");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Payment seeding failed:", error as object);
    process.exit(1);
  }
};

seedPayments();
