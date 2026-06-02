import { MongoMemoryServer } from "mongodb-memory-server";

// Retry creating the in-memory MongoDB server to avoid flakey startup timeouts
const MONGO_STARTUP_ATTEMPTS = 5;
const MONGO_RETRY_DELAY_MS = 5000;

let mongoServer: MongoMemoryServer | undefined;
for (let attempt = 1; attempt <= MONGO_STARTUP_ATTEMPTS; attempt++) {
  try {
    mongoServer = await MongoMemoryServer.create({
      binary: { version: process.env.MONGOMS_BINARY_VERSION || "6.0.12" },
    });
    break;
  } catch (err) {
    if (attempt === MONGO_STARTUP_ATTEMPTS) throw err;
    // wait then retry
    // eslint-disable-next-line no-await-in-loop
    await new Promise((res) => setTimeout(res, MONGO_RETRY_DELAY_MS));
  }
}

if (!mongoServer) throw new Error("Failed to start in-memory MongoDB server");

process.env.MONGODB_URI = mongoServer.getUri();
process.env.GEMINI_API_KEY = "test";
process.env.PINECONE_API_KEY = "test";
process.env.PINECONE_INDEX = "test";
process.env.LANGFUSE_SECRET_KEY = "test";
process.env.LANGFUSE_PUBLIC_KEY = "test";
process.env.JWT_SECRET = "test";
process.env.PORT = "3000";
process.env.NODE_ENV = "test";

const stopMongo = async () => {
  try {
    await mongoServer.stop();
  } catch (e) {
    // ignore
  }
};

if (typeof afterAll !== "undefined") {
  afterAll(async () => {
    await stopMongo();
  });
}

process.on("beforeExit", stopMongo);
process.on("exit", stopMongo);
process.on("SIGINT", stopMongo);
process.on("SIGTERM", stopMongo);
process.on("uncaughtException", stopMongo);
