import { RiskAnalysis } from "../models/riskAnalysis.model.js";
import { Contract } from "../models/contract.model.js";
import { logger } from "../utils/logger.js";

// ── Types ─────────────────────────────────────────

export interface ExportRow {
  filename: string;
  uploadDate: string;
  analysisDate: string;
  overallRisk: string;
  criticalClauses: number;
  highClauses: number;
  mediumClauses: number;
  lowClauses: number;
  analysisId: string;
}

export interface ExportResult {
  data: string;
  filename: string;
  contentType: string;
}

// ── ContractExportService ─────────────────────────

export class ContractExportService {
  // جيب كل الـ contracts والـ analyses للـ user
  async getExportData(userId: string): Promise<ExportRow[]> {
    const contracts = await Contract.find({
      userId,
      deletedAt: null,
    }).lean();

    const contractIds = contracts.map((c) => String(c._id));

    const analyses = await RiskAnalysis.find({
      contractId: { $in: contractIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Map analysis to contract
    const analysisMap = new Map<string, (typeof analyses)[0]>();
    analyses.forEach((a) => {
      const cId = String(a.contractId);
      if (!analysisMap.has(cId)) {
        analysisMap.set(cId, a);
      }
    });

    return contracts.map((contract) => {
      const analysis = analysisMap.get(String(contract._id));
      const clauses = analysis?.clauseAnalysis ?? [];

      return {
        filename: contract.filename,
        uploadDate: contract.uploadedAt.toISOString(),
        analysisDate: analysis
          ? ((analysis as Record<string, unknown>).createdAt?.toISOString() ??
            "")
          : "",
        overallRisk: analysis?.executiveSummary?.overallRisk ?? "pending",
        criticalClauses: clauses.filter((c) => c.riskLevel === "critical")
          .length,
        highClauses: clauses.filter((c) => c.riskLevel === "high").length,
        mediumClauses: clauses.filter((c) => c.riskLevel === "medium").length,
        lowClauses: clauses.filter((c) => c.riskLevel === "low").length,
        analysisId: analysis ? String(analysis._id) : "",
      };
    });
  }

  // عمل CSV export
  generateCSV(rows: ExportRow[]): ExportResult {
    const headers = [
      "Filename",
      "Upload Date",
      "Analysis Date",
      "Overall Risk",
      "Critical Clauses",
      "High Clauses",
      "Medium Clauses",
      "Low Clauses",
      "Analysis ID",
    ];

    const csvRows = rows.map((row) =>
      [
        `"${row.filename.replace(/"/g, '""')}"`,
        `"${row.uploadDate}"`,
        `"${row.analysisDate}"`,
        `"${row.overallRisk}"`,
        row.criticalClauses,
        row.highClauses,
        row.mediumClauses,
        row.lowClauses,
        `"${row.analysisId}"`,
      ].join(","),
    );

    const csv = [headers.join(","), ...csvRows].join("\n");

    logger.info(`✅ CSV export generated: ${rows.length} contracts`);

    return {
      data: csv,
      filename: `contract-history-${Date.now()}.csv`,
      contentType: "text/csv",
    };
  }

  // عمل JSON export
  async generateJSON(userId: string): Promise<ExportResult> {
    const contracts = await Contract.find({
      userId,
      deletedAt: null,
    }).lean();

    const contractIds = contracts.map((c) => String(c._id));

    const analyses = await RiskAnalysis.find({
      contractId: { $in: contractIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    const analysisMap = new Map<string, (typeof analyses)[0]>();
    analyses.forEach((a) => {
      const cId = String(a.contractId);
      if (!analysisMap.has(cId)) {
        analysisMap.set(cId, a);
      }
    });

    const exportData = contracts.map((contract) => ({
      contractId: String(contract._id),
      filename: contract.filename,
      language: contract.language,
      fileSize: contract.fileSize,
      uploadDate: contract.uploadedAt,
      analysis: analysisMap.get(String(contract._id)) ?? null,
    }));

    logger.info(`✅ JSON export generated: ${contracts.length} contracts`);

    return {
      data: JSON.stringify(
        { exportedAt: new Date(), contracts: exportData },
        null,
        2,
      ),
      filename: `contract-history-${Date.now()}.json`,
      contentType: "application/json",
    };
  }
}

export const contractExportService = new ContractExportService();
