import dotenv from "dotenv";

type SecretsSource = "dotenv" | "doppler" | "test-defaults";

let loadedSource: SecretsSource | null = null;

export function getSecretsSource(): SecretsSource | null {
  return loadedSource;
}

async function loadFromDoppler(): Promise<void> {
  const DopplerSDK = (await import("@dopplerhq/node-sdk")).default;

  const token = process.env.DOPPLER_TOKEN;
  if (!token) {
    throw new Error(
      "DOPPLER_TOKEN is not set. Generate a service token at " +
        "https://dashboard.doppler.com → your project → Access → Service Tokens.",
    );
  }

  const doppler = new DopplerSDK({ accessToken: token });

  const project = process.env.DOPPLER_PROJECT || null;
  const config = process.env.DOPPLER_CONFIG || null;
  const secrets = await doppler.secrets.download(project, config);

  if (!secrets || typeof secrets !== "object") {
    throw new Error(
      `Doppler returned no secrets (project: ${process.env.DOPPLER_PROJECT || "backend"}, config: ${process.env.DOPPLER_CONFIG || "prd"})`,
    );
  }

  for (const [key, value] of Object.entries(secrets)) {
    if (typeof value === "string" && !(key in process.env)) {
      process.env[key] = value;
    }
  }

  console.log("Secrets loaded from Doppler", {
    config: process.env.DOPPLER_CONFIG || "prd",
    count: Object.keys(secrets).length,
  });

  loadedSource = "doppler";
}

function loadFromDotenv(): void {
  dotenv.config();
  loadedSource = "dotenv";
  console.log("Secrets loaded from .env file");
}

export async function loadSecrets(): Promise<void> {
  if (process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID) {
    loadedSource = "test-defaults";
    return;
  }

  const useDoppler =
    process.env.NODE_ENV === "production" || !!process.env.DOPPLER_TOKEN;

  if (useDoppler) {
    try {
      await loadFromDoppler();
      return;
    } catch (error: unknown) {
      const details =
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack?.split("\n").slice(0, 3).join("|"),
            }
          : { raw: String(error) };
      console.error(
        "Doppler secrets fetch failed — falling back to .env file",
        details,
      );
    }
  }

  loadFromDotenv();
}
