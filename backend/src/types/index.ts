/**
 * ─────────────────────────────────────────────
 *  Backend Type Definitions
 * ─────────────────────────────────────────────
 *
 * Centralized type definitions for the Aqdy backend.
 * Organized by feature domain for easy navigation and maintenance.
 */

// ── Re-export Domain-Specific Types ──────────

// Authentication & Request types
export type { AuthenticatedRequest } from "./auth.js";

// Audit & Request ID types
export type {
  RequestWithId,
  AuditRequest,
  AuditData,
  AuditFilters,
  AuditFile,
  AuditContractReference,
} from "./audit.js";

// ── Core Type Definitions ────────────────────

export type SupportedLanguage = "ar" | "en";

export type RiskLevel = "low" | "medium" | "high" | "critical";

// ── API Response Types ───────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ── Contract Analysis Types ──────────────────

export interface ClauseAnalysis {
  clauseText: string;
  riskLevel: RiskLevel;
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
  sourceFromKB: boolean;
  confidence: number;
  relatedLaw?: string;
}

export interface ContractAnalysisResult {
  contractId: string;
  language: SupportedLanguage;
  executiveSummary: {
    ar: string;
    en: string;
    overallRisk: RiskLevel;
    totalClauses: number;
    riskyClausesCount: number;
  };
  clauseAnalysis: ClauseAnalysis[];
  analysisDuration: number;
  createdAt: Date;
}
