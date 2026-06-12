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
    storageLimit: -1, // -1 means unlimited
    creditAllowance: 4000,
    isActive: true,
    stripePriceId: null as string | null,
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
    analysisLimit: -1, // -1 means unlimited
    storageLimit: -1, // -1 means unlimited
    creditAllowance: 40000,
    isActive: true,
    stripePriceId: null as string | null,
  },
];

const getOrCreateStripePrice = async (planName: string, slug: string, priceAmount: number) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    logger.warn(`⚠️ No STRIPE_SECRET_KEY found, using placeholder for ${planName}`);
    return `price_${slug}_placeholder`;
  }

  try {
    // 1. Search for existing product
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

    // 2. Search for existing active price for this product and price amount
    const prices = await stripe.prices.list({ product: product.id, active: true });
    let price = prices.data.find(
      (p) => p.unit_amount === priceAmount * 100 && p.recurring?.interval === "month"
    );

    if (!price) {
      logger.info(`Creating Stripe monthly price of $${priceAmount} for ${planName}...`);
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: priceAmount * 100,
        currency: "usd",
        recurring: { interval: "month" },
      });
    }

    return price.id;
  } catch (error) {
    logger.error(`❌ Failed to configure Stripe product/price for ${planName}, falling back to placeholder:`, error);
    return `price_${slug}_placeholder`;
  }
};

const seedPlans = async () => {
  try {
    logger.info("🌱 Starting Pricing Plans seeding...");

    // Connect to database
    await connectDB();

    // Configure Stripe prices
    for (const plan of plansData) {
      if (plan.price > 0) {
        plan.stripePriceId = await getOrCreateStripePrice(plan.name, plan.slug, plan.price);
        logger.info(`Price configured for ${plan.name}: ${plan.stripePriceId}`);
      }
    }

    // Clear existing plans
    logger.info("Cleaning up existing plans...");
    await Plan.deleteMany({});

    // Seed new plans
    logger.info(`Seeding ${plansData.length} plans...`);
    const inserted = await Plan.insertMany(plansData);

    logger.info(`✅ Successfully seeded ${inserted.length} plans!`);

    // Disconnect
    await mongoose.disconnect();
    logger.info("🔌 Disconnected from database.");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Seeding failed:", error as object);
    process.exit(1);
  }
};

seedPlans();
