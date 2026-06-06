import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("5000"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),

  PINECONE_API_KEY: z.string().min(1, "PINECONE_API_KEY is required"),
  PINECONE_INDEX: z.string().min(1, "PINECONE_INDEX is required"),

  LANGFUSE_SECRET_KEY: z.string().min(1, "LANGFUSE_SECRET_KEY is required"),
  LANGFUSE_PUBLIC_KEY: z.string().min(1, "LANGFUSE_PUBLIC_KEY is required"),
  LANGFUSE_URL: z.string().default("https://cloud.langfuse.com"),

  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),

  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_PUBLISHABLE_KEY: z
    .string()
    .min(1, "STRIPE_PUBLISHABLE_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),

  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error(
    `Invalid environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
  );
}

export const env = parsed.data;
