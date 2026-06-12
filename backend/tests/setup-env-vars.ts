/**
 * Synchronous test env bootstrap — runs via Jest setupFiles before any test
 * module (or env.ts) is evaluated.
 */
const TEST_ENV_DEFAULTS: Record<string, string> = {
  NODE_ENV: "test",
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
};

for (const [key, value] of Object.entries(TEST_ENV_DEFAULTS)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}
