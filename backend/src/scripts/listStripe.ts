import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

async function main() {
  console.log("Listing Stripe Products:");
  const products = await stripe.products.list();
  for (const product of products.data) {
    console.log(`Product: ${product.name} (ID: ${product.id}), Active: ${product.active}`);
    const prices = await stripe.prices.list({ product: product.id });
    for (const price of prices.data) {
      console.log(`  Price: ${price.unit_amount ? price.unit_amount / 100 : 0} ${price.currency} (ID: ${price.id}), type: ${price.type}, interval: ${price.recurring?.interval}`);
    }
  }
}

main().catch(console.error);
