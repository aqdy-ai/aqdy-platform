export type SupportedLanguage = "ar" | "en";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

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