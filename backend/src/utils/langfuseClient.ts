import { Langfuse } from "langfuse";

// Initialize Langfuse client using environment variables.
// Expected env vars: LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_HOST (optional)
const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY ?? "",
  secretKey: process.env.LANGFUSE_SECRET_KEY ?? "",
  baseUrl: process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com",
});

export default langfuse;
