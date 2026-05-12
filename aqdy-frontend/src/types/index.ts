// ─────────────────────────────────────────────
//  Global Application Types & Interfaces
// ─────────────────────────────────────────────

// ── i18n ─────────────────────────────────────

/** Supported UI languages */
export type SupportedLocale = "en" | "ar"

/** Direction derived from locale */
export type TextDirection = "ltr" | "rtl"

/** Structure of every translation namespace (add more as needed) */
export interface I18nNamespaces {
  translation: Record<string, string>
}

/** i18n initialisation options used in src/lib/i18n.ts */
export interface I18nConfig {
  /** Default language loaded on first visit */
  defaultLocale: SupportedLocale
  /** Fallback locale when a key is missing */
  fallbackLocale: SupportedLocale
  /** Available language codes */
  supportedLocales: SupportedLocale[]
  /** Namespace(s) to load */
  ns: (keyof I18nNamespaces)[]
  /** Active default namespace */
  defaultNS: keyof I18nNamespaces
}

// ── ContractUpload ────────────────────────────

/** Accepted MIME types for contract uploads */
export type ContractMimeType = "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

/** Maximum allowed upload size in bytes (10 MB) */
export const MAX_CONTRACT_SIZE_BYTES = 10 * 1024 * 1024

/** Props for the ContractUpload component (currently none — all handled internally) */
export type ContractUploadProps = Record<string, never>

/** Shape of a validated contract file ready for submission */
export interface ContractFile {
  /** Raw browser File object */
  raw: File
  /** File name without extension */
  baseName: string
  /** File extension ("pdf" | "docx") */
  extension: string
  /** File size in bytes */
  sizeBytes: number
}

// ── API / Query ───────────────────────────────

/** Generic API response wrapper */
export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

/** Contract analysis result returned from the backend */
export interface ContractAnalysisResult {
  id: string
  summary: string
  riskLevel: "low" | "medium" | "high"
  clauses: ContractClause[]
  createdAt: string
}

/** Single clause extracted from the contract */
export interface ContractClause {
  id: string
  title: string
  content: string
  isRisky: boolean
  riskExplanation?: string
}
