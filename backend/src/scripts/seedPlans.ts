import mongoose from "mongoose";
import dotenv from "dotenv";
import Stripe from "stripe";
import { Plan } from "../models/plan.model.js";
import connectDB from "../config/database.js";
import { logger } from "../utils/logger.js";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const plansData = [
  {
    name: "Free",
    slug: "free",
    price: 0,
    billingCycle: "monthly" as const,
    features: [
      "~3 avg contract analyses",
      "10 contracts max",
      "No export"
    ],
    analysisLimit: 5,
    storageLimit: 10,
    creditAllowance: 300,
    isActive: true,
    stripePriceId: null as string | null,
    stripeAnnualPriceId: null as string | null,
  },
  {
    name: "Pro",
    slug: "pro",
    price: 9,
    billingCycle: "monthly" as const,
    features: [
      "~40 avg contract analyses/month",
      "Unlimited contracts",
      "Full history export",
      "Priority support",
    ],
    analysisLimit: 100,
    storageLimit: -1,
    creditAllowance: 4000,
    isActive: true,
    stripePriceId: null as string | null,
    stripeAnnualPriceId: null as string | null,
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    price: 39,
    billingCycle: "monthly" as const,
    features: [
      "~400 avg contract analyses/month",
      "Unlimited contracts",
      "Custom contract history",
      "SLA guarantee",
    ],
    analysisLimit: -1,
    storageLimit: -1,
    creditAllowance: 40000,
    isActive: true,
    stripePriceId: null as string | null,
    stripeAnnualPriceId: null as string | null,
  },
];

/**
 * Finds or creates a Stripe product, then finds or creates a price
 * for the given interval (month or year).
 */
const getOrCreateStripePrice = async (
  planName: string,
  slug: string,
  unitAmountCents: number,
  interval: "month" | "year",
) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    logger.warn(`⚠️ No STRIPE_SECRET_KEY found, using placeholder for ${planName} (${interval})`);
    return `price_${slug}_${interval}_placeholder`;
  }

  try {
    // 1. Find or create product
    const products = await stripe.products.list();
    let product = products.data.find(
      (p) => p.name === planName || p.metadata?.slug === slug
    );

    if (!product) {
      logger.info(`Creating Stripe product for ${planName}...`);
      product = await stripe.products.create({
        name: planName,
        metadata: { slug },
      });
    }

    // 2. Find existing active price matching amount + interval
    const prices = await stripe.prices.list({ product: product.id, active: true });
    let price = prices.data.find(
      (p) =>
        p.unit_amount === unitAmountCents &&
        p.recurring?.interval === interval
    );

    if (!price) {
      logger.info(`Creating Stripe ${interval}ly price of $${unitAmountCents / 100} for ${planName}...`);
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: unitAmountCents,
        currency: "usd",
        recurring: { interval },
      });
    }

    return price.id;
  } catch (error) {
    logger.error(
      `❌ Failed to configure Stripe ${interval} price for ${planName}, falling back to placeholder:`,
      error,
    );
    return `price_${slug}_${interval}_placeholder`;
  }
};

const seedPlans = async () => {
  try {
    logger.info("🌱 Starting Pricing Plans seeding...");

    await connectDB();

    // Configure Stripe prices for paid plans
    for (const plan of plansData) {
      if (plan.price > 0) {
        // Monthly price: e.g. $9/mo = 900 cents
        plan.stripePriceId = await getOrCreateStripePrice(
          plan.name,
          plan.slug,
          plan.price * 100,
          "month",
        );
        logger.info(`Monthly price configured for ${plan.name}: ${plan.stripePriceId}`);

        // Annual price: "2 months free" → pay for 10 months yearly
        // e.g. Pro = $9 * 10 = $90/yr = 9000 cents
        const annualAmount = plan.price * 10 * 100;
        plan.stripeAnnualPriceId = await getOrCreateStripePrice(
          plan.name,
          plan.slug,
          annualAmount,
          "year",
        );
        logger.info(`Annual price configured for ${plan.name}: ${plan.stripeAnnualPriceId}`);
      }
    }

    // Clear existing plans
    logger.info("Cleaning up existing plans...");
    await Plan.deleteMany({});

    // Seed new plans
    logger.info(`Seeding ${plansData.length} plans...`);
    const inserted = await Plan.insertMany(plansData);

    logger.info(`✅ Successfully seeded ${inserted.length} plans!`);

    await mongoose.disconnect();
    logger.info("🔌 Disconnected from database.");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Seeding failed:", error as object);
    process.exit(1);
  }
};

seedPlans();
