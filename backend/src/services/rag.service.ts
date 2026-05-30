import { Pinecone } from "@pinecone-database/pinecone";
import { env } from "../config/env.js";
import { llmService } from "./llm.service.js";
import { logger } from "../utils/logger.js";
import { getStableHash } from "../utils/text.utils.js";

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
  contractType?: string; // Singular contract type filter
  contractTypes?: string[]; // Array of contract types
  enableQueryExpansion?: boolean;
  enableMMR?: boolean;
  lambda?: number; // MMR diversity parameter (0 = max diversity, 1 = max relevance)
}

/**
 * A single knowledge base match returned from Pinecone.
 * Fields map to the metadata stored during embedKB.ts ingestion.
 */
export interface KBMatch {
  id: string;
  score: number;
  category: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  clausePattern: string;
  explanation: { ar: string; en: string };
  whyRisky: { ar: string; en: string };
  saferAlternative: { ar: string; en: string };
  relatedLaw?: string;
}

/**
 * Full RAG search result including matches, confidence, and match status.
 */
export interface RAGResult {
  matches: KBMatch[];
  confidence: number;
  hasMatch: boolean;
}

export interface PineconeHit {
  _id?: string;
  id?: string;
  _score?: number;
  score?: number;
  fields?: {
    category?: string;
    riskLevel?: string;
    clausePattern?: string;
    text?: string;
    explanation_ar?: string;
    explanation_en?: string;
    whyRisky_ar?: string;
    whyRisky_en?: string;
    saferAlternative_ar?: string;
    saferAlternative_en?: string;
    negotiationTips_ar?: string;
    negotiationTips_en?: string;
    relatedLaw?: string;
    contractTypes?: string[];
    frequency?: string;
    applicableRegions?: string[];
  };
  values?: number[];
  vector?: number[];
}

// ─── Normalisation Helpers ───────────────────────────────────────────────────

function normaliseCategoryFilter(category: string): string {
  const mapping: { [key: string]: string } = {
    liability: "Liability",
    termination: "Termination",
    payment: "Payment",
    intellectual_property: "IP Rights",
    "ip rights": "IP Rights",
    ip_rights: "IP Rights",
    non_compete: "Non-Compete",
    "non-compete": "Non-Compete",
    confidentiality: "Confidentiality",
    dispute_resolution: "Dispute Resolution",
    "dispute-resolution": "Dispute Resolution",
    privacy: "Privacy",
    working_conditions: "Working Conditions",
    "working-conditions": "Working Conditions",
    compensation: "Compensation",
    leave: "Leave",
    scope_of_work: "Scope of Work",
    "scope-of-work": "Scope of Work",
    force_majeure: "Force Majeure",
    "force-majeure": "Force Majeure",
    warranties: "Warranties",
    non_solicitation: "Non-Solicitation",
    "non-solicitation": "Non-Solicitation",
    exclusivity: "Exclusivity",
    employment_terms: "Employment Terms",
    "employment-terms": "Employment Terms",
    performance: "Performance",
    amendment: "Amendment",
    indemnification: "Indemnification",
    obligations: "Obligations",
    penalties: "Penalties",
    notices: "Notices",
    governing_law: "Governing Law",
    "governing-law": "Governing Law",
  };
  const lower = category.toLowerCase().trim();
  return mapping[lower] || category;
}

function normaliseContractType(type: string): string {
  const mapping: { [key: string]: string } = {
    employment: "Employment Agreement",
    employment_agreement: "Employment Agreement",
    "employment-agreement": "Employment Agreement",
    freelance: "Freelance Contract",
    freelance_contract: "Freelance Contract",
    "freelance-contract": "Freelance Contract",
    service_agreement: "Service Agreement",
    "service-agreement": "Service Agreement",
    "service agreement": "Service Agreement",
    consulting: "Consulting Agreement",
    consulting_agreement: "Consulting Agreement",
    "consulting-agreement": "Consulting Agreement",
    nda: "NDA",
    "non-disclosure-agreement": "NDA",
    non_disclosure_agreement: "NDA",
    vendor: "Vendor Agreement",
    vendor_agreement: "Vendor Agreement",
    "vendor-agreement": "Vendor Agreement",
    subscription: "Subscription Agreement",
    subscription_agreement: "Subscription Agreement",
    "subscription-agreement": "Subscription Agreement",
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
    NDA: "nda",
    "Vendor Agreement": "vendor",
    "Subscription Agreement": "subscription",
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

function mapHitToRecord(hit: PineconeHit): RagClauseRecord {
  const fields = hit.fields || {};
  return {
    id: hit._id || hit.id || "",
    score: hit._score || hit.score || 0,
    category: fields.category || "",
    riskLevel: fields.riskLevel || "",
    clausePattern: fields.clausePattern || fields.text || "",
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

// ─── RAGService Class ────────────────────────────────────────────────────────

export class RAGService {
  private readonly pinecone: Pinecone;
  private readonly indexName: string;
  private readonly searchCache = new Map<string, RAGResult>();
  private readonly pc: Pinecone; // Alias for backward compatibility with HEAD

  constructor(indexName?: string) {
    this.pinecone = new Pinecone({ apiKey: env.PINECONE_API_KEY });
    this.indexName = indexName ?? env.PINECONE_INDEX;
    this.pc = this.pinecone;
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
      logger.warn("Query expansion failed, falling back to original query", {
        error,
      });
      return queryText;
    }
  }

  /**
   * Dual-mode MMR implementation to support both HEAD (vector-based MMR) and develop (category-based diversity).
   */
  applyMMR(
    hitsOrMatches: (PineconeHit | KBMatch)[],
    topKOrLambda?: number,
    lambdaValue?: number,
  ): (PineconeHit | KBMatch)[] {
    if (
      topKOrLambda === undefined ||
      (topKOrLambda < 1.0 && lambdaValue === undefined)
    ) {
      const lambda = topKOrLambda ?? 0.7;
      return this.applyCategoryMMR(hitsOrMatches as KBMatch[], lambda);
    } else {
      const topK = topKOrLambda;
      const lambda = lambdaValue ?? 0.5;
      return this.applyVectorMMR(hitsOrMatches as PineconeHit[], topK, lambda);
    }
  }

  /**
   * Category-based MMR for develop searchKB pipeline.
   */
  private applyCategoryMMR(matches: KBMatch[], lambda = 0.7): KBMatch[] {
    if (matches.length <= 1) return matches;

    const selected: KBMatch[] = [matches[0]];
    const remaining = [...matches.slice(1)];

    while (
      selected.length < Math.min(3, matches.length) &&
      remaining.length > 0
    ) {
      let bestScore = -Infinity;
      let bestIdx = 0;

      remaining.forEach((candidate, idx) => {
        const relevanceScore = candidate.score;

        // Category-based diversity: penalize candidates from same category
        const maxSimilarity = Math.max(
          ...selected.map((s) =>
            s.category === candidate.category ? 0.8 : 0.2,
          ),
        );

        const mmrScore = lambda * relevanceScore - (1 - lambda) * maxSimilarity;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIdx = idx;
        }
      });

      selected.push(remaining[bestIdx]);
      remaining.splice(bestIdx, 1);
    }

    return selected;
  }

  /**
   * Vector similarity-based MMR for HEAD search pipeline.
   */
  private applyVectorMMR(
    hits: PineconeHit[],
    topK: number,
    lambda: number = 0.5,
  ): PineconeHit[] {
    if (hits.length === 0) return [];
    if (topK >= hits.length) return hits;

    const selected: PineconeHit[] = [];
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
        const mmrScore =
          lambda * candSimilarity -
          (1 - lambda) * (maxSim === -Infinity ? 0 : maxSim);

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
  async search(
    queryText: string,
    options: SearchOptions = {},
  ): Promise<RagClauseRecord[]> {
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
    const filter: Record<string, unknown> = {};
    const andFilters: Record<string, unknown>[] = [];

    // Filter by category (supports Title Case and lowercase)
    if (options.category) {
      const normalisedCat = normaliseCategoryFilter(options.category);
      andFilters.push({
        $or: [
          { category: { $eq: normalisedCat } },
          { category: { $eq: normalisedCat.toLowerCase() } },
        ],
      });
    }

    // Filter by riskLevel
    if (options.riskLevel) {
      andFilters.push({
        riskLevel: { $eq: options.riskLevel.toLowerCase() },
      });
    }

    // Filter by contractType/contractTypes
    const inputTypes =
      options.contractTypes ||
      (options.contractType ? [options.contractType] : []);
    if (inputTypes.length > 0) {
      const typeOrConditions: Record<string, unknown>[] = [];
      for (const t of inputTypes) {
        const normalisedType = normaliseContractType(t);
        const legacyType = typeToV1Legacy(normalisedType);
        typeOrConditions.push(
          { contractTypes: { $in: [normalisedType] } },
          { contractTypes: { $in: [normalisedType.toLowerCase()] } },
          { contractTypes: { $in: [legacyType] } },
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
        },
      });

      const hits = response.result?.hits || [];

      // 4. MMR Reranking
      const rerankedHits = enableMMR
        ? this.applyMMR(hits, topK, lambda)
        : hits.slice(0, topK);

      const records = rerankedHits.map((h) => mapHitToRecord(h as PineconeHit));
      const duration = Date.now() - startTime;

      logger.info("RAG search completed successfully", {
        hitsReturned: hits.length,
        recordsReturned: records.length,
        durationMs: duration,
      });

      return records;
    } catch (error) {
      logger.error("Pinecone search failed", { error });
      throw new Error(
        `RAG search operation failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  // ── Semantic Search (Integrated Inference) ──────

  /**
   * Searches the KB using Pinecone's integrated inference API.
   *
   * @param query - Raw clause text to search against
   * @param topK  - Maximum number of matches (default: 5)
   * @returns Array of KB matches sorted by similarity (highest first)
   */
  async semanticSearch(query: string, topK = 5): Promise<KBMatch[]> {
    const index = this.pinecone.index(this.indexName);

    const response = await index.searchRecords({
      query: {
        inputs: { text: query.trim() },
        topK,
      },
    });

    const hits = response.result?.hits ?? [];

    // Filter out low-similarity noise (score < 0.5)
    return hits
      .filter((hit) => (hit._score ?? 0) > 0.5)
      .map((hit) => this.mapHitToKBMatch(hit));
  }

  // ── Confidence Scoring ──────────────────────────

  /**
   * Calculates confidence score based on the top match's similarity.
   */
  calculateConfidence(matches: KBMatch[]): number {
    if (matches.length === 0) return 0;

    const topScore = matches[0].score;

    if (topScore >= 0.9) return 0.95;
    if (topScore >= 0.8) return 0.85;
    if (topScore >= 0.7) return 0.75;
    if (topScore >= 0.6) return 0.6;
    return 0.4;
  }

  // ── Main Search Function ────────────────────────

  /**
   * Full KB search pipeline:
   * 1. Semantic search via Pinecone integrated inference
   * 2. MMR reranking for diversity
   * 3. Confidence scoring
   */
  async searchKB(clauseText: string): Promise<RAGResult> {
    if (!clauseText || clauseText.trim().length === 0) {
      logger.warn("RAGService.searchKB: empty clause text — skipping search");
      return { matches: [], confidence: 0, hasMatch: false };
    }

    const cacheKey = getStableHash(clauseText.trim().toLowerCase());
    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      logger.info("RAGService.searchKB: returning cached KB result", {
        clauseHash: cacheKey,
        matchCount: cached.matches.length,
      });
      return cached;
    }

    try {
      const rawMatches = await this.semanticSearch(clauseText, 5);

      if (rawMatches.length === 0) {
        logger.info("RAGService: no KB matches found for clause");
        const result = {
          matches: [],
          confidence: 0,
          hasMatch: false,
        } as RAGResult;
        this.searchCache.set(cacheKey, result);
        return result;
      }

      const rerankedMatches = this.applyCategoryMMR(rawMatches);
      const confidence = this.calculateConfidence(rerankedMatches);
      const result: RAGResult = {
        matches: rerankedMatches,
        confidence,
        hasMatch: confidence >= 0.6,
      };

      logger.info(
        `RAGService: ${rerankedMatches.length} matches, confidence: ${confidence}`,
      );

      this.searchCache.set(cacheKey, result);
      return result;
    } catch (error) {
      logger.error("RAGService.searchKB: Pinecone search failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { matches: [], confidence: 0, hasMatch: false };
    }
  }

  // ── Private Helpers ─────────────────────────────

  private mapHitToKBMatch(hit: {
    _id: string;
    _score?: number;
    fields?: Record<string, unknown>;
  }): KBMatch {
    const f = hit.fields ?? {};

    return {
      id: hit._id,
      score: hit._score ?? 0,
      category: String(f.category ?? ""),
      riskLevel: String(f.riskLevel ?? "medium") as KBMatch["riskLevel"],
      clausePattern: String(f.text ?? f.clausePattern ?? ""),
      explanation: {
        ar: String(f.explanation_ar ?? ""),
        en: String(f.explanation_en ?? ""),
      },
      whyRisky: {
        ar: String(f.whyRisky_ar ?? ""),
        en: String(f.whyRisky_en ?? ""),
      },
      saferAlternative: {
        ar: String(f.saferAlternative_ar ?? ""),
        en: String(f.saferAlternative_en ?? ""),
      },
      relatedLaw: f.relatedLaw ? String(f.relatedLaw) : undefined,
    };
  }
}

// ── Default Instance ──────────────────────────────

export const ragService = new RAGService();
export const RagService = RAGService; // Class alias for compatibility
