/**
 * RAGService — Pinecone knowledge base semantic search.
 *
 * Queries the Pinecone "legal-kb" index using the integrated
 * multilingual-e5-large embedding model to find the most similar
 * known risky clauses for a given clause text.
 *
 * Uses Pinecone's integrated inference API (searchRecords) —
 * no separate embedding provider (OpenAI, etc.) is needed.
 * The embedding model is configured on the Pinecone index itself
 * during the embedKB.ts ingestion step.
 *
 * Features:
 * - Semantic search via Pinecone integrated inference
 * - MMR (Maximal Marginal Relevance) reranking for diversity
 * - Confidence scoring based on semantic similarity
 * - Graceful degradation — returns empty results on failure
 */

import { Pinecone } from "@pinecone-database/pinecone";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

// ── Types ─────────────────────────────────────────

/**
 * A single knowledge base match returned from Pinecone.
 * Fields map to the metadata stored during embedKB.ts ingestion.
 */
export interface KBMatch {
  /** Clause ID — e.g. "clause_001_unlimited_liability" */
  id: string;
  /** Semantic similarity score from Pinecone (0.0 – 1.0) */
  score: number;
  /** Legal category — e.g. "liability", "termination" */
  category: string;
  /** Pre-classified risk level from the curated KB */
  riskLevel: "low" | "medium" | "high" | "critical";
  /** The original risky clause pattern text */
  clausePattern: string;
  /** Bilingual explanation of what the clause means */
  explanation: { ar: string; en: string };
  /** Bilingual rationale for why the clause is risky */
  whyRisky: { ar: string; en: string };
  /** Bilingual safer alternative wording */
  saferAlternative: { ar: string; en: string };
  /** Egyptian law citation, or empty string if none */
  relatedLaw?: string;
}

/**
 * Full RAG search result including matches, confidence, and match status.
 */
export interface RAGResult {
  /** Top KB matches after MMR reranking */
  matches: KBMatch[];
  /** Aggregated confidence score (0.0 – 1.0) */
  confidence: number;
  /** True if confidence >= 0.6 (meaningful KB match found) */
  hasMatch: boolean;
}

// ── RAGService ────────────────────────────────────

export class RAGService {
  private readonly pinecone: Pinecone;
  private readonly indexName: string;

  /**
   * @param indexName - Pinecone index name. Defaults to PINECONE_INDEX env var.
   */
  constructor(indexName?: string) {
    this.pinecone = new Pinecone({ apiKey: env.PINECONE_API_KEY });
    this.indexName = indexName ?? env.PINECONE_INDEX;
  }

  // ── Semantic Search (Integrated Inference) ──────

  /**
   * Searches the KB using Pinecone's integrated inference API.
   *
   * This uses the multilingual-e5-large model configured on the index —
   * no separate embedding call to OpenAI or any other provider is needed.
   *
   * @param query - Raw clause text to search against
   * @param topK  - Maximum number of matches (default: 5)
   * @returns Array of KB matches sorted by similarity (highest first)
   */
  async semanticSearch(query: string, topK = 5): Promise<KBMatch[]> {
    const index = this.pinecone.index(this.indexName);

    // Pinecone integrated inference — the index embeds the query automatically
    // using the same multilingual-e5-large model used during upsertRecords
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

  // ── MMR Reranking ───────────────────────────────

  /**
   * Applies Maximal Marginal Relevance to diversify results.
   * Balances relevance (similarity to query) with diversity
   * (avoiding duplicate categories).
   *
   * @param matches - Raw KB matches from semantic search
   * @param lambda  - Relevance vs. diversity trade-off (0–1, default: 0.7)
   * @returns Top 3 diversified matches
   */
  applyMMR(matches: KBMatch[], lambda = 0.7): KBMatch[] {
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

  // ── Confidence Scoring ──────────────────────────

  /**
   * Calculates confidence score based on the top match's similarity.
   *
   * @param matches - KB matches (assumed sorted by score descending)
   * @returns Confidence score (0.0 – 1.0)
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
   *
   * Degrades gracefully — returns empty results on any failure
   * so the classifier can still proceed without KB context.
   *
   * @param clauseText - Raw clause text to search against
   * @returns RAGResult with matches, confidence, and match status
   */
  async searchKB(clauseText: string): Promise<RAGResult> {
    if (!clauseText || clauseText.trim().length === 0) {
      logger.warn("RAGService.searchKB: empty clause text — skipping search");
      return { matches: [], confidence: 0, hasMatch: false };
    }

    try {
      // Step 1: Semantic search via Pinecone integrated inference
      const rawMatches = await this.semanticSearch(clauseText, 5);

      if (rawMatches.length === 0) {
        logger.info("RAGService: no KB matches found for clause");
        return { matches: [], confidence: 0, hasMatch: false };
      }

      // Step 2: MMR reranking for diversity
      const rerankedMatches = this.applyMMR(rawMatches);

      // Step 3: Confidence scoring
      const confidence = this.calculateConfidence(rerankedMatches);

      logger.info(
        `RAGService: ${rerankedMatches.length} matches, confidence: ${confidence}`,
      );

      return {
        matches: rerankedMatches,
        confidence,
        hasMatch: confidence >= 0.6,
      };
    } catch (error) {
      // Degrade gracefully — classifier continues without KB context
      logger.error("RAGService.searchKB: Pinecone search failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { matches: [], confidence: 0, hasMatch: false };
    }
  }

  // ── Private Helpers ─────────────────────────────

  /**
   * Maps a raw Pinecone hit to a typed KBMatch object.
   * Uses the metadata field names stored during embedKB.ts ingestion.
   */
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
      clausePattern: String(f.text ?? ""),
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
