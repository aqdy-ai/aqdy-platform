import { Pinecone } from "@pinecone-database/pinecone";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export interface KBClauseMatch {
  id: string;
  category: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  clausePattern: string;
  explanation: { ar: string; en: string };
  whyRisky: { ar: string; en: string };
  saferAlternative: { ar: string; en: string };
  relatedLaw: string;
  score: number;
}

export class RAGService {
  private index: any;

  constructor() {
    try {
      const pc = new Pinecone({ apiKey: env.PINECONE_API_KEY });
      this.index = pc.index(env.PINECONE_INDEX);
    } catch (error) {
      logger.error("RAGService: Failed to initialize Pinecone client:", error);
    }
  }

  /**
   * Search the legal knowledge base index for similar clauses.
   *
   * @param clauseText - The text of the clause to query
   * @param topK - The number of top results to return (default: 1)
   * @returns Array of matched KB records with similarity scores
   */
  async searchKB(clauseText: string, topK = 1): Promise<KBClauseMatch[]> {
    if (!this.index) {
      logger.warn("RAGService: Pinecone index not initialized, skipping KB search.");
      return [];
    }

    try {
      logger.info(`RAGService: searching KB for clause text (length: ${clauseText.length})`);
      
      const response = await this.index.searchRecords({
        query: {
          inputs: { text: clauseText },
          topK,
        },
      });

      const hits = response.result?.hits || [];
      
      return hits.map((hit: any) => {
        const fields = hit.fields || {};
        return {
          id: hit._id,
          category: fields.category || "",
          riskLevel: fields.riskLevel as "low" | "medium" | "high" | "critical",
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
          relatedLaw: fields.relatedLaw || "",
          score: typeof hit._score === "number" ? hit._score : 0,
        };
      });
    } catch (error) {
      logger.error("RAGService: error querying Pinecone index:", error);
      return [];
    }
  }
}

export const ragService = new RAGService();
