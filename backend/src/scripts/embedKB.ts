import { Pinecone } from "@pinecone-database/pinecone";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();
// Fallback: If run from within the backend directory, look for .env in the root project directory
if (!process.env.PINECONE_API_KEY) {
  dotenv.config({ path: path.join(process.cwd(), "../.env") });
}

// ─── Clause interfaces ────────────────────────────────────────────────────────

/** Old flat-array format (legalKB.json, v1) */
interface ClauseV1 {
  id: string;
  category: string;
  riskLevel: string;
  clausePattern: string;
  keywords?: string[];
  explanation: { ar: string; en: string };
  whyRisky: { ar: string; en: string };
  saferAlternative: { ar: string; en: string };
  relatedLaw?: string;
  contractTypes: string[];
}

/** New structured-object format (legal_kb.json, v2) */
interface ClauseV2 {
  id: string;
  category: string;
  riskLevel: string;
  clausePattern: string;
  explanation: { ar: string; en: string };
  whyRisky: { ar: string; en: string };
  saferAlternative: { ar: string; en: string };
  negotiationTips?: { ar: string; en: string };
  context?: {
    contractTypes: string[];
    frequency?: string;
    applicableRegions?: string[];
  };
  relatedLaw?: string | { egyptianLaw?: string; country?: string };
  precedents?: string[];
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Normalised clause used internally by the embedding pipeline */
interface NormalisedClause {
  id: string;
  category: string;
  riskLevel: string;
  clausePattern: string;
  keywords: string[];
  explanation: { ar: string; en: string };
  whyRisky: { ar: string; en: string };
  saferAlternative: { ar: string; en: string };
  negotiationTips_ar: string;
  negotiationTips_en: string;
  relatedLaw: string;
  contractTypes: string[];
  frequency: string;
  applicableRegions: string[];
}

/** Top-level structure of the v2 KB file */
interface KBFileV2 {
  version: string;
  lastUpdated: string;
  totalEntries: number;
  embeddingModel: string;
  embeddingDimensions: number;
  clauses: ClauseV2[];
}

// ─── Normalisation helpers ────────────────────────────────────────────────────

function normaliseRelatedLaw(raw: ClauseV2["relatedLaw"]): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  return raw.egyptianLaw ?? "";
}

function normaliseFromV2(c: ClauseV2): NormalisedClause {
  return {
    id: c.id,
    category: c.category,
    riskLevel: c.riskLevel,
    clausePattern: c.clausePattern,
    keywords: [],                          // v2 does not have a keywords field
    explanation: c.explanation,
    whyRisky: c.whyRisky,
    saferAlternative: c.saferAlternative,
    negotiationTips_ar: c.negotiationTips?.ar ?? "",
    negotiationTips_en: c.negotiationTips?.en ?? "",
    relatedLaw: normaliseRelatedLaw(c.relatedLaw),
    contractTypes: c.context?.contractTypes ?? [],
    frequency: c.context?.frequency ?? "",
    applicableRegions: c.context?.applicableRegions ?? [],
  };
}

function normaliseFromV1(c: ClauseV1): NormalisedClause {
  return {
    id: c.id,
    category: c.category,
    riskLevel: c.riskLevel,
    clausePattern: c.clausePattern,
    keywords: c.keywords ?? [],
    explanation: c.explanation,
    whyRisky: c.whyRisky,
    saferAlternative: c.saferAlternative,
    negotiationTips_ar: "",
    negotiationTips_en: "",
    relatedLaw: c.relatedLaw ?? "",
    contractTypes: c.contractTypes,
    frequency: "",
    applicableRegions: [],
  };
}

// ─── KB loader ────────────────────────────────────────────────────────────────

/**
 * Resolves the KB file path and returns normalised clauses.
 * Supports both:
 *   • v1  legalKB.json  — plain JSON array
 *   • v2  legal_kb.json — structured object with metadata header
 *
 * Priority: legal_kb.json (v2, 100+ clauses) → legalKB.json (v1, 50 clauses)
 */
function loadKB(cwd: string): NormalisedClause[] {
  const candidates = [
    // v2 — new expanded KB (preferred)
    { file: "backend/src/data/legal_kb.json",  format: "v2" as const },
    { file: "src/data/legal_kb.json",          format: "v2" as const },
    // v1 — legacy flat-array KB
    { file: "backend/src/data/legalKB.json",   format: "v1" as const },
    { file: "src/data/legalKB.json",           format: "v1" as const },
  ];

  for (const { file, format } of candidates) {
    const fullPath = path.join(cwd, file);
    if (!fs.existsSync(fullPath)) continue;

    const raw = JSON.parse(fs.readFileSync(fullPath, "utf-8"));

    if (format === "v2") {
      const kb = raw as KBFileV2;
      if (!kb.clauses || !Array.isArray(kb.clauses)) {
        console.warn(`⚠️  ${file} has no 'clauses' array — skipping.`);
        continue;
      }
      console.log(
        `📂 Loaded ${kb.clauses.length} clauses from ${file}` +
        ` (KB v${kb.version}, updated ${kb.lastUpdated})`
      );
      return kb.clauses.map(normaliseFromV2);
    }

    // v1 — plain array
    if (Array.isArray(raw)) {
      console.log(`📂 Loaded ${raw.length} clauses from ${file} (KB v1 legacy format)`);
      return (raw as ClauseV1[]).map(normaliseFromV1);
    }
  }

  console.error("❌ Legal KB file not found. Checked: " + candidates.map(c => c.file).join(", "));
  process.exit(1);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const INDEX_NAME = "legal-kb";

async function main() {
  console.log("🚀 Starting Legal KB Embedding pipeline (multilingual-e5-large)...");

  // 1. Load and normalise clauses (auto-detects v1 or v2 schema)
  const clauses = loadKB(process.cwd());

  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    console.error("❌ PINECONE_API_KEY is not set in environmental variables.");
    process.exit(1);
  }

  // 2. Connect to Pinecone; create index if it doesn't exist
  const pc = new Pinecone({ apiKey });
  const indexList = await pc.listIndexes();
  const indexExists = indexList.indexes?.some((idx) => idx.name === INDEX_NAME);

  if (!indexExists) {
    console.log(
      `🏗️  Index "${INDEX_NAME}" does not exist. Creating serverless index` +
      ` with model "multilingual-e5-large"…`
    );
    await pc.createIndexForModel({
      name: INDEX_NAME,
      cloud: "aws",
      region: "us-east-1",
      embed: {
        model: "multilingual-e5-large",
        fieldMap: { text: "text" },
      },
      waitUntilReady: true,
    });
    console.log(`✅ Index "${INDEX_NAME}" created successfully.`);
  } else {
    console.log(`✅ Index "${INDEX_NAME}" already exists.`);
  }

  const index = pc.index(INDEX_NAME);

  // 3. Build Pinecone records
  // The embedded text field is: clausePattern + English explanation + Arabic explanation
  // All other fields are stored as metadata for retrieval-time filtering.
  const records = clauses.map((c) => ({
    _id: c.id,
    text: `${c.clausePattern}\n${c.explanation.en}\n${c.explanation.ar}`,
    // Core fields
    category:              c.category,
    riskLevel:             c.riskLevel,
    explanation_ar:        c.explanation.ar,
    explanation_en:        c.explanation.en,
    whyRisky_ar:           c.whyRisky.ar,
    whyRisky_en:           c.whyRisky.en,
    saferAlternative_ar:   c.saferAlternative.ar,
    saferAlternative_en:   c.saferAlternative.en,
    // v2 extended fields (empty string for v1 clauses)
    negotiationTips_ar:    c.negotiationTips_ar,
    negotiationTips_en:    c.negotiationTips_en,
    frequency:             c.frequency,
    applicableRegions:     c.applicableRegions,
    // Shared fields
    relatedLaw:            c.relatedLaw,
    contractTypes:         c.contractTypes,
    keywords:              c.keywords,
  }));

  // 4. Batch upsert (25 records per batch to respect Pinecone rate limits)
  console.log(`\n📤 Upserting ${records.length} clauses to Pinecone index "${INDEX_NAME}"…`);

  const batchSize = 25;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    console.log(`   Upserting batch ${Math.floor(i / batchSize) + 1} (${batch.length} records)…`);
    await index.upsertRecords({ records: batch });
  }

  console.log(
    `\n🎉 Success: Confirmed that all ${records.length} clauses have been` +
    ` embedded and upserted into Pinecone!`
  );
}

main().catch((err) => {
  console.error("❌ Embedding pipeline failed:", err);
  process.exit(1);
});
