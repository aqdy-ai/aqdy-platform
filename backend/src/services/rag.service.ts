import { Pinecone } from "@pinecone-database/pinecone";
import { env } from "../config/env.js";
import { llmService } from "./llm.service.js";
import { logger } from "../utils/logger.js";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface RagClauseRecord {
  id: string;
  score: number;
  category: string;
  riskLevel: string;
  clausePattern: string;
  explanation: { ar: string; en: string };
  whyRisky: { ar: string; en: string };
  saferAlternative: { ar: string; en: string };
  negotiationTips?: { ar: string; en: string };
  relatedLaw?: string;
  contractTypes: string[];
  frequency?: string;
  applicableRegions?: string[];
}

export interface SearchOptions {
  topK?: number;
  category?: string;
  riskLevel?: string;
  contractType?: string;      // Singular contract type filter
  contractTypes?: string[];    // Array of contract types
  enableQueryExpansion?: boolean;
  enableMMR?: boolean;
  lambda?: number;             // MMR diversity parameter (0 = max diversity, 1 = max relevance)
}

// ─── Normalisation Helpers ───────────────────────────────────────────────────

function normaliseCategoryFilter(category: string): string {
  const mapping: { [key: string]: string } = {
    "liability": "Liability",
    "termination": "Termination",
    "payment": "Payment",
    "intellectual_property": "IP Rights",
    "ip rights": "IP Rights",
    "ip_rights": "IP Rights",
    "non_compete": "Non-Compete",
    "non-compete": "Non-Compete",
    "confidentiality": "Confidentiality",
    "dispute_resolution": "Dispute Resolution",
    "dispute-resolution": "Dispute Resolution",
    "privacy": "Privacy",
    "working_conditions": "Working Conditions",
    "working-conditions": "Working Conditions",
    "compensation": "Compensation",
    "leave": "Leave",
    "scope_of_work": "Scope of Work",
    "scope-of-work": "Scope of Work",
    "force_majeure": "Force Majeure",
    "force-majeure": "Force Majeure",
    "warranties": "Warranties",
    "non_solicitation": "Non-Solicitation",
    "non-solicitation": "Non-Solicitation",
    "exclusivity": "Exclusivity",
    "employment_terms": "Employment Terms",
    "employment-terms": "Employment Terms",
    "performance": "Performance",
    "amendment": "Amendment",
    "indemnification": "Indemnification",
    "obligations": "Obligations",
    "penalties": "Penalties",
    "notices": "Notices",
    "governing_law": "Governing Law",
    "governing-law": "Governing Law"
  };
  const lower = category.toLowerCase().trim();
  return mapping[lower] || category;
}

function normaliseContractType(type: string): string {
  const mapping: { [key: string]: string } = {
    "employment": "Employment Agreement",
    "employment_agreement": "Employment Agreement",
    "employment-agreement": "Employment Agreement",
    "freelance": "Freelance Contract",
    "freelance_contract": "Freelance Contract",
    "freelance-contract": "Freelance Contract",
    "service_agreement": "Service Agreement",
    "service-agreement": "Service Agreement",
    "service agreement": "Service Agreement",
    "consulting": "Consulting Agreement",
    "consulting_agreement": "Consulting Agreement",
    "consulting-agreement": "Consulting Agreement",
    "nda": "NDA",
    "non-disclosure-agreement": "NDA",
    "non_disclosure_agreement": "NDA",
    "vendor": "Vendor Agreement",
    "vendor_agreement": "Vendor Agreement",
    "vendor-agreement": "Vendor Agreement",
    "subscription": "Subscription Agreement",
    "subscription_agreement": "Subscription Agreement",
    "subscription-agreement": "Subscription Agreement"
  };
  const lower = type.toLowerCase().trim();
  return mapping[lower] || type;
}

function typeToV1Legacy(type: string): string {
  const mapping: { [key: string]: string } = {
    "Employment Agreement": "employment",
    "Freelance Contract": "freelance",
    "Service Agreement": "service_agreement",
    "Consulting Agreement": "consulting",
    "NDA": "nda",
    "Vendor Agreement": "vendor",
    "Subscription Agreement": "subscription"
  };
  return mapping[type] || type.toLowerCase();
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct;
}

function mapHitToRecord(hit: any): RagClauseRecord {
  const fields = hit.fields || {};
  return {
    id: hit._id || hit.id,
    score: hit._score || hit.score || 0,
    category: fields.category || "",
    riskLevel: fields.riskLevel || "",
    clausePattern: fields.clausePattern || "",
    explanation: {
      ar: fields.explanation_ar || "",
      en: fields.explanation_en || "",
    },
    whyRisky: {
      ar: fields.whyRisky_ar || "",
      en: fields.whyRisky_en || "",
    },
    saferAlternative: {
      ar: fields.saferAlternative_ar || "",
      en: fields.saferAlternative_en || "",
    },
    negotiationTips: {
      ar: fields.negotiationTips_ar || "",
      en: fields.negotiationTips_en || "",
    },
    relatedLaw: fields.relatedLaw || "",
    contractTypes: fields.contractTypes || [],
    frequency: fields.frequency || "",
    applicableRegions: fields.applicableRegions || [],
  };
}

// ─── RagService Class ────────────────────────────────────────────────────────

export class RagService {
  private pc: Pinecone;
  private indexName: string;

  constructor() {
    this.pc = new Pinecone({ apiKey: env.PINECONE_API_KEY });
    this.indexName = env.PINECONE_INDEX;
  }

  /**
   * Performs semantic query expansion using fallback Gemma LLM.
   * Generates related terms, synonyms, and translations to enrich search query.
   */
  async expandQuery(queryText: string): Promise<string> {
    try {
      const systemPrompt = 
        "You are a legal search query expansion assistant. Your task is to analyze the user's contract clause query (which may be in English or Arabic) " +
        "and generate related legal concepts, synonyms, search keywords, and bilingual translations. " +
        "Output ONLY the expansion terms separated by spaces, with no introductory text, conversational filler, or markdown.";

      const response = await llmService.callFallback(queryText, {
        systemPrompt,
        temperature: 0.1,
      });

      const expanded = response.content.trim().replace(/[\r\n]+/g, " ");
      logger.info("RAG Query Expansion generated terms successfully", {
        original: queryText,
        expanded,
      });
      return `${queryText} ${expanded}`;
    } catch (error) {
      logger.warn("Query expansion failed, falling back to original query", { error });
      return queryText;
    }
  }

  /**
   * Reranks candidate records using Maximal Marginal Relevance (MMR).
   * Balances semantic relevance (score) and document diversity to eliminate redundant matches.
   */
  applyMMR(hits: any[], topK: number, lambda: number = 0.5): any[] {
    if (hits.length === 0) return [];
    if (topK >= hits.length) return hits;

    const selected: any[] = [];
    const candidates = [...hits];

    // Select the first (highest similarity score) candidate
    const first = candidates.shift()!;
    selected.push(first);

    while (selected.length < topK && candidates.length > 0) {
      let bestScore = -Infinity;
      let bestIndex = -1;

      for (let i = 0; i < candidates.length; i++) {
        const cand = candidates[i];
        const candVector = cand.values || cand.vector;

        if (!candVector) {
          // If vectors are not present, fallback to standard ranking
          bestIndex = 0;
          break;
        }

        // Compute max cosine similarity with any already-selected record
        let maxSim = -Infinity;
        for (const sel of selected) {
          const selVector = sel.values || sel.vector;
          if (selVector) {
            const sim = cosineSimilarity(candVector, selVector);
            if (sim > maxSim) {
              maxSim = sim;
            }
          }
        }

        const candSimilarity = cand._score || cand.score || 0;
        const mmrScore = lambda * candSimilarity - (1 - lambda) * (maxSim === -Infinity ? 0 : maxSim);

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIndex = i;
        }
      }

      if (bestIndex !== -1) {
        selected.push(candidates.splice(bestIndex, 1)[0]);
      } else {
        break;
      }
    }

    return selected;
  }

  /**
   * Main vector similarity search endpoint.
   * Supports metadata filtering, query expansion, and MMR reranking.
   */
  async search(queryText: string, options: SearchOptions = {}): Promise<RagClauseRecord[]> {
    const startTime = Date.now();
    const topK = options.topK || 5;
    const enableExpansion = options.enableQueryExpansion ?? true;
    const enableMMR = options.enableMMR ?? true;
    const lambda = options.lambda ?? 0.5;

    // 1. Query Expansion
    const finalQueryText = enableExpansion 
      ? await this.expandQuery(queryText) 
      : queryText;

    // 2. Build Pinecone Filters
    const filter: any = {};
    const andFilters: any[] = [];

    // Filter by category (supports Title Case and lowercase)
    if (options.category) {
      const normalisedCat = normaliseCategoryFilter(options.category);
      andFilters.push({
        $or: [
          { category: { $eq: normalisedCat } },
          { category: { $eq: normalisedCat.toLowerCase() } }
        ]
      });
    }

    // Filter by riskLevel
    if (options.riskLevel) {
      andFilters.push({
        riskLevel: { $eq: options.riskLevel.toLowerCase() }
      });
    }

    // Filter by contractType/contractTypes
    const inputTypes = options.contractTypes || (options.contractType ? [options.contractType] : []);
    if (inputTypes.length > 0) {
      const typeOrConditions: any[] = [];
      for (const t of inputTypes) {
        const normalisedType = normaliseContractType(t);
        const legacyType = typeToV1Legacy(normalisedType);
        typeOrConditions.push(
          { contractTypes: { $in: [normalisedType] } },
          { contractTypes: { $in: [normalisedType.toLowerCase()] } },
          { contractTypes: { $in: [legacyType] } }
        );
      }
      andFilters.push({ $or: typeOrConditions });
    }

    // Assemble final filter
    if (andFilters.length > 0) {
      if (andFilters.length === 1) {
        Object.assign(filter, andFilters[0]);
      } else {
        filter.$and = andFilters;
      }
    }

    // 3. Query Pinecone (fetch more if MMR is enabled)
    const fetchK = enableMMR ? topK * 3 : topK;
    const index = this.pc.index(this.indexName);

    logger.info("Executing Pinecone similarity search", {
      originalQuery: queryText,
      finalQuery: finalQueryText,
      filter,
      topK,
      fetchK,
    });

    try {
      const response = await index.searchRecords({
        query: {
          inputs: { text: finalQueryText },
          topK: fetchK,
          includeValues: enableMMR, // Vectors only needed if MMR is active
          ...(Object.keys(filter).length > 0 ? { filter } : {}),
        }
      });

      const hits = response.result?.hits || [];

      // 4. MMR Reranking
      const rerankedHits = enableMMR 
        ? this.applyMMR(hits, topK, lambda) 
        : hits.slice(0, topK);

      const records = rerankedHits.map(mapHitToRecord);
      const duration = Date.now() - startTime;

      logger.info("RAG search completed successfully", {
        hitsReturned: hits.length,
        recordsReturned: records.length,
        durationMs: duration,
      });

      return records;
    } catch (error) {
      logger.error("Pinecone search failed", { error });
      throw new Error(`RAG search operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const ragService = new RagService();
