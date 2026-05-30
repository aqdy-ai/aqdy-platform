import { MongoMemoryServer } from "mongodb-memory-server";

const mongoServer = await MongoMemoryServer.create({
  binary: { version: process.env.MONGOMS_BINARY_VERSION || "6.0.12" },
});

process.env.MONGODB_URI = mongoServer.getUri();

const stopMongo = async () => {
  try {
    await mongoServer.stop();
  } catch (e) {
    // ignore
  }
};

process.on("exit", stopMongo);
process.on("SIGINT", stopMongo);
process.on("SIGTERM", stopMongo);
process.on("uncaughtException", stopMongo);

process.env.GEMINI_API_KEY = "test";
process.env.PINECONE_API_KEY = "test";
process.env.PINECONE_INDEX = "test";
process.env.LANGFUSE_SECRET_KEY = "test";
process.env.LANGFUSE_PUBLIC_KEY = "test";
process.env.JWT_SECRET = "test";
process.env.PORT = "3000";
process.env.NODE_ENV = "test";
