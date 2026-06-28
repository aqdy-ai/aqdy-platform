import { z } from "zod";
import { loadSecrets } from "./secrets.js";

await loadSecrets();

/** Dummy values for required vars when running under Jest (CI may leave secrets empty). */
const TEST_ENV_DEFAULTS: Record<string, string> = {
  MONGODB_URI: "mongodb://127.0.0.1:27017/aqdy_test",
  GEMINI_API_KEY: "test",
  OPENAI_API_KEY: "test",
  PINECONE_API_KEY: "test",
  PINECONE_INDEX: "test",
  LANGFUSE_SECRET_KEY: "test",
  LANGFUSE_PUBLIC_KEY: "test",
  JWT_SECRET: "test",
  STRIPE_SECRET_KEY: "test",
  STRIPE_PUBLISHABLE_KEY: "test",
  STRIPE_WEBHOOK_SECRET: "test",
  SMTP_HOST: "test",
  SMTP_PORT: "587",
  SMTP_USER: "test",
  SMTP_PASS: "test",
  SMTP_FROM: "test@test.com",
};

if (process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID) {
  for (const [key, value] of Object.entries(TEST_ENV_DEFAULTS)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const envSchema = z.object({
  PORT: z.string().default("5000"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  PINECONE_API_KEY: z.string().min(1, "PINECONE_API_KEY is required"),
  PINECONE_INDEX: z.string().min(1, "PINECONE_INDEX is required"),
  LANGFUSE_SECRET_KEY: z.string().min(1, "LANGFUSE_SECRET_KEY is required"),
  LANGFUSE_PUBLIC_KEY: z.string().min(1, "LANGFUSE_PUBLIC_KEY is required"),
  LANGFUSE_URL: z.string().default("https://cloud.langfuse.com"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  CREDIT_BASE_COST: z.coerce.number().nonnegative().default(0),
  CREDIT_TOKEN_RATE: z.coerce.number().nonnegative().default(0.001),
  CHAT_CREDIT_COST: z.coerce.number().nonnegative().default(5),
  CREDIT_BASE_FEE: z.coerce.number().nonnegative().default(10),
  CREDIT_OUTPUT_WEIGHT: z.coerce.number().nonnegative().default(4),
  CREDIT_TOKEN_UNIT: z.coerce.number().positive().default(4000),
  CREDIT_CHAT_BASE: z.coerce.number().nonnegative().default(3),
  FREE_PLAN_CREDITS: z.coerce.number().positive().default(300),
  CLAUSE_CHAT_RATE_LIMIT: z.coerce.number().nonnegative().default(20),
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_PUBLISHABLE_KEY: z
    .string()
    .min(1, "STRIPE_PUBLISHABLE_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default("587"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("no-reply@aqdy.eg"),

  REDIS_URL: z.string().default("redis://localhost:6379"),

  CLAUSE_ANALYSIS_CONCURRENCY: z.coerce.number().positive().default(5),

  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  GOOGLE_CLIENT_ID: z.string().optional(),
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
