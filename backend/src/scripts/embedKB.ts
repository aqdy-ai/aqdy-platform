import { Pinecone } from "@pinecone-database/pinecone";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();
// Fallback: If run from within the backend directory, look for .env in the root project directory
if (!process.env.PINECONE_API_KEY) {
  dotenv.config({ path: path.join(process.cwd(), "../.env") });
}

// Define clause interface matching JSON structure
interface Clause {
  id: string;
  category: string;
  riskLevel: string;
  clausePattern: string;
  keywords: string[];
  explanation: {
    ar: string;
    en: string;
  };
  whyRisky: {
    ar: string;
    en: string;
  };
  saferAlternative: {
    ar: string;
    en: string;
  };
  relatedLaw?: string;
  contractTypes: string[];
}

const INDEX_NAME = "legal-kb";

async function main() {
  console.log(
    "🚀 Starting Legal KB Embedding pipeline (multilingual-e5-large)...",
  );

  // 1. Loads 50+ legal clauses from 'backend/src/data/legalKB.json'
  let kbPath = path.join(process.cwd(), "backend/src/data/legalKB.json");
  if (!fs.existsSync(kbPath)) {
    // Fallback: if executed from the backend directory itself
    kbPath = path.join(process.cwd(), "src/data/legalKB.json");
  }
  if (!fs.existsSync(kbPath)) {
    console.error(`❌ Legal KB file not found at: ${kbPath}`);
    process.exit(1);
  }

  const clauses: Clause[] = JSON.parse(fs.readFileSync(kbPath, "utf-8"));
  console.log(
    `📂 Loaded ${clauses.length} clauses from backend/src/data/legalKB.json`,
  );

  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    console.error("❌ PINECONE_API_KEY is not set in environmental variables.");
    process.exit(1);
  }

  // 2. Connects to Pinecone index 'legal-kb' with serverless embedding (multilingual-e5-large)
  const pc = new Pinecone({ apiKey });

  // Check if index exists
  const indexList = await pc.listIndexes();
  const indexExists = indexList.indexes?.some((idx) => idx.name === INDEX_NAME);

  if (!indexExists) {
    console.log(
      `🏗️ Index "${INDEX_NAME}" does not exist. Creating serverless index with model "multilingual-e5-large"…`,
    );
    await pc.createIndexForModel({
      name: INDEX_NAME,
      cloud: "aws",
      region: "us-east-1",
      embed: {
        model: "multilingual-e5-large",
        fieldMap: {
          text: "text", // Maps the 'text' field to the embedding model
        },
      },
      waitUntilReady: true,
    });
    console.log(`✅ Index "${INDEX_NAME}" created successfully.`);
  } else {
    console.log(`✅ Index "${INDEX_NAME}" already exists.`);
  }

  const index = pc.index(INDEX_NAME);

  // 3. Prepare records for upserting
  // Combine clausePattern + explanation.en + explanation.ar as the text field
  // Stores clause metadata (category, riskLevel, explanation_ar, explanation_en, saferAlternative_ar, saferAlternative_en, etc.)
  const records = clauses.map((c) => {
    const text = `${c.clausePattern}\n${c.explanation.en}\n${c.explanation.ar}`;
    return {
      _id: c.id, // using _id as required by upsertRecords
      text: text,
      category: c.category,
      riskLevel: c.riskLevel,
      explanation_ar: c.explanation.ar,
      explanation_en: c.explanation.en,
      whyRisky_ar: c.whyRisky.ar,
      whyRisky_en: c.whyRisky.en,
      saferAlternative_ar: c.saferAlternative.ar,
      saferAlternative_en: c.saferAlternative.en,
      relatedLaw: c.relatedLaw ?? "",
      contractTypes: c.contractTypes,
      keywords: c.keywords,
    };
  });

  // 4. Upsert records to Pinecone
  console.log(
    `\n📤 Upserting ${records.length} clauses to Pinecone index "${INDEX_NAME}"…`,
  );

  // Batching the upserts into chunks of 25
  const batchSize = 25;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    console.log(
      `   Upserting batch ${Math.floor(i / batchSize) + 1} (${batch.length} records)…`,
    );

    // Call the Pinecone SDK upsertRecords method
    await index.upsertRecords({ records: batch });
  }

  // 5. Logs progress and confirms all 50+ clauses are embedded
  console.log(
    `\n🎉 Success: Confirmed that all ${records.length} clauses have been embedded and upserted into Pinecone!`,
  );
}

main().catch((err) => {
  console.error("❌ Embedding pipeline failed:", err);
  process.exit(1);
});
