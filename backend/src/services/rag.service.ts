import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export interface KBMatch {
  id: string;
  score: number;
  category: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  clausePattern: string;
  explanation: { ar: string; en: string };
  whyRisky: { ar: string; en: string };
  saferAlternative: { ar: string; en: string };
  relatedLaw?: string;
}

export interface RAGResult {
  matches: KBMatch[];
  confidence: number;
  hasMatch: boolean;
}

export class RAGService {
  private pinecone: Pinecone;
  private embeddings: OpenAIEmbeddings;
  private indexName: string;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: env.PINECONE_API_KEY,
    });

    this.embeddings = new OpenAIEmbeddings({
      apiKey: env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
    });

    this.indexName = env.PINECONE_INDEX;
  }

  // عمل embedding للنص
  async embedText(text: string): Promise<number[]> {
    const embedding = await this.embeddings.embedQuery(text);
    return embedding;
  }

  // Semantic search في الـ KB
  async semanticSearch(query: string, topK: number = 5): Promise<KBMatch[]> {
    const queryEmbedding = await this.embedText(query);
    const index = this.pinecone.index(this.indexName);

    const results = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

    return results.matches
      .filter(match => match.score && match.score > 0.5)
      .map(match => ({
        id: match.id,
        score: match.score ?? 0,
        category: String(match.metadata?.category ?? ''),
        riskLevel: (match.metadata?.riskLevel as KBMatch['riskLevel']) ?? 'low',
        clausePattern: String(match.metadata?.clausePattern ?? ''),
        explanation: {
          ar: String(match.metadata?.explanation_ar ?? ''),
          en: String(match.metadata?.explanation_en ?? ''),
        },
        whyRisky: {
          ar: String(match.metadata?.whyRisky_ar ?? ''),
          en: String(match.metadata?.whyRisky_en ?? ''),
        },
        saferAlternative: {
          ar: String(match.metadata?.saferAlternative_ar ?? ''),
          en: String(match.metadata?.saferAlternative_en ?? ''),
        },
        relatedLaw: String(match.metadata?.relatedLaw ?? ''),
      }));
  }

  // MMR - Maximal Marginal Relevance
  applyMMR(matches: KBMatch[], lambda: number = 0.7): KBMatch[] {
    if (matches.length <= 1) return matches;

    const selected: KBMatch[] = [matches[0]];
    const remaining = matches.slice(1);

    while (selected.length < Math.min(3, matches.length) && remaining.length > 0) {
      let bestScore = -Infinity;
      let bestIdx = 0;

      remaining.forEach((candidate, idx) => {
        const relevanceScore = candidate.score;

        // تحقق من التشابه مع الـ selected
        const maxSimilarity = Math.max(
          ...selected.map(s =>
            s.category === candidate.category ? 0.8 : 0.2
          )
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

  // Confidence scoring
  calculateConfidence(matches: KBMatch[]): number {
    if (matches.length === 0) return 0;

    const topScore = matches[0].score;

    if (topScore >= 0.9) return 0.95;
    if (topScore >= 0.8) return 0.85;
    if (topScore >= 0.7) return 0.75;
    if (topScore >= 0.6) return 0.60;
    return 0.40;
  }

  // Main search function
  async searchKB(clauseText: string): Promise<RAGResult> {
    try {
      // Step 1: Semantic search
      const rawMatches = await this.semanticSearch(clauseText, 5);

      if (rawMatches.length === 0) {
        logger.info('⚠️ No KB matches found for clause');
        return { matches: [], confidence: 0, hasMatch: false };
      }

      // Step 2: MMR reranking
      const rerankedMatches = this.applyMMR(rawMatches);

      // Step 3: Confidence scoring
      const confidence = this.calculateConfidence(rerankedMatches);

      logger.info(`✅ KB search: ${rerankedMatches.length} matches, confidence: ${confidence}`);

      return {
        matches: rerankedMatches,
        confidence,
        hasMatch: confidence >= 0.6,
      };
    } catch (error: any) {
      logger.error('❌ KB search failed:', error);
      return { matches: [], confidence: 0, hasMatch: false };
    }
  }
}

export const ragService = new RAGService();