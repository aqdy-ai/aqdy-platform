import mongoose from "mongoose";
import { Contract, IContract } from "../models/contract.model.js";
import { RiskAnalysis } from "../models/riskAnalysis.model.js";
import { logger } from "../utils/logger.js";

// ── Types ─────────────────────────────────────────

export interface ContractListFilters {
  uploadedAfter?: Date;
  uploadedBefore?: Date;
  status?: "analyzed" | "pending" | "failed";
  filename?: string;
  riskLevel?: string;
}

export interface ContractListSort {
  field: "uploadedAt" | "analyzedAt" | "riskLevel";
  order: "asc" | "desc";
}

export interface ContractListOptions {
  filters?: ContractListFilters;
  sort?: ContractListSort;
  page?: number;
  limit?: number;
}

export interface ContractListItem {
  contractId: string;
  filename: string;
  uploadDate: Date;
  language: string;
  fileSize: number;
  status: "analyzed" | "pending" | "failed";
  riskLevel: string | null;
  analysisId: string | null;
  riskSummary?: { ar: string; en: string } | null;
  totalClauses?: number | null;
  riskyClausesCount?: number | null;
  version?: number;
}

export interface ContractListResult {
  contracts: ContractListItem[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

// ── Risk Level Weight ──────────────────────────────
const RISK_WEIGHTS: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0,
};

// ── ContractHistoryService ────────────────────────

export class ContractHistoryService {
  // جيب قائمة العقود مع فلترة وترتيب
  async getContractList(
    userId: string,
    options: ContractListOptions = {},
  ): Promise<ContractListResult> {
    const {
      filters = {},
      sort = { field: "uploadedAt", order: "desc" },
      page = 1,
      limit = 10,
    } = options;

    // بناء الـ query
    const query: Record<string, unknown> = {
      userId,
      deletedAt: null,
    };

    // فلترة بالتاريخ
    if (filters.uploadedAfter || filters.uploadedBefore) {
      const dateFilter: Record<string, Date> = {};
      if (filters.uploadedAfter) dateFilter.$gte = filters.uploadedAfter;
      if (filters.uploadedBefore) dateFilter.$lte = filters.uploadedBefore;
      query.uploadedAt = dateFilter;
    }

    // فلترة بالاسم
    if (filters.filename) {
      query.filename = { $regex: filters.filename, $options: "i" };
    }

    // جيب الـ contracts
    const skip = (page - 1) * limit;

    // DB sort: uploadedAt فقط يتعامل معاه على مستوى DB
    const dbSortField =
      sort.field === "uploadedAt" ? "uploadedAt" : "uploadedAt";
    const dbSortOrder =
      sort.field === "uploadedAt" && sort.order === "asc" ? 1 : -1;

    const total = await Contract.countDocuments(query);

    const contracts = await Contract.find(query)
      .sort({ [dbSortField]: dbSortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    // جيب الـ analyses لكل contract
    const contractIds = contracts.map((c) => String(c._id));
    const analyses = await RiskAnalysis.find({
      contractId: { $in: contractIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Map analyses to contracts
    const analysisMap = new Map<string, (typeof analyses)[0]>();
    analyses.forEach((a) => {
      const cId = String(a.contractId);
      if (!analysisMap.has(cId)) {
        analysisMap.set(cId, a);
      }
    });

    // Build contract list items
    let contractItems: ContractListItem[] = contracts.map((contract) => {
      const analysis = analysisMap.get(String(contract._id));
      const status = this.determineStatus(String(contract._id), analysisMap);

      return {
        contractId: String(contract._id),
        filename: contract.filename,
        uploadDate: contract.uploadedAt,
        language: contract.language,
        fileSize: contract.fileSize,
        status,
        riskLevel: analysis?.executiveSummary?.overallRisk ?? null,
        analysisId: analysis ? String(analysis._id) : null,
        riskSummary: analysis?.executiveSummary?.summary ?? null,
        totalClauses: analysis?.executiveSummary?.totalClauses ?? 0,
        riskyClausesCount: analysis?.executiveSummary?.riskyClausesCount ?? 0,
        version: analysis?.version ?? 0,
      };
    });

    // فلترة بالـ status
    if (filters.status) {
      contractItems = contractItems.filter((c) => c.status === filters.status);
    }

    // فلترة بالـ riskLevel
    if (filters.riskLevel) {
      contractItems = contractItems.filter(
        (c) => c.riskLevel?.toLowerCase() === filters.riskLevel?.toLowerCase(),
      );
    }

    // ترتيب بالـ riskLevel
    if (sort.field === "riskLevel") {
      contractItems.sort((a, b) => {
        const weightA = RISK_WEIGHTS[a.riskLevel ?? "unknown"] ?? 0;
        const weightB = RISK_WEIGHTS[b.riskLevel ?? "unknown"] ?? 0;
        return sort.order === "desc" ? weightB - weightA : weightA - weightB;
      });
    }

    // ترتيب بالـ analyzedAt (post-query sort using analysis createdAt)
    if (sort.field === "analyzedAt") {
      contractItems.sort((a, b) => {
        const analysisA = analysisMap.get(a.contractId);
        const analysisB = analysisMap.get(b.contractId);
        const dateA = analysisA?.createdAt
          ? new Date(analysisA.createdAt).getTime()
          : 0;
        const dateB = analysisB?.createdAt
          ? new Date(analysisB.createdAt).getTime()
          : 0;
        return sort.order === "desc" ? dateB - dateA : dateA - dateB;
      });
    }

    // حساب total صح مع فلتر الـ status أو riskLevel
    const effectiveTotal =
      filters.status || filters.riskLevel ? contractItems.length : total;

    return {
      contracts: contractItems,
      total: effectiveTotal,
      page,
      totalPages: Math.ceil(effectiveTotal / limit),
      limit,
    };
  }

  // تحديد الـ status
  private determineStatus(
    contractId: string,
    analysisMap: Map<string, any>,
  ): "analyzed" | "pending" | "failed" {
    const analysis = analysisMap.get(contractId);
    if (!analysis) return "pending";
    if (analysis.executiveSummary?.overallRisk) return "analyzed";
    return "failed";
  }

  // جيب تفاصيل عقد واحد
  async getContractDetail(
    contractId: string,
    userId: string,
  ): Promise<{ contract: IContract; analysis: any | null } | null> {
    const contract = await Contract.findOne({
      _id: contractId,
      userId,
      deletedAt: null,
    });

    if (!contract) return null;

    const analysis = await RiskAnalysis.findOne({ contractId }).sort({
      createdAt: -1,
    });

    return { contract, analysis };
  }

  // Soft delete عقد
  async softDeleteContract(
    contractId: string,
    userId: string,
  ): Promise<boolean> {
    const result = await Contract.findOneAndUpdate(
      { _id: contractId, userId, deletedAt: null },
      { deletedAt: new Date() },
      { new: true },
    );

    if (!result) return false;

    logger.info(`✅ Contract soft deleted: ${contractId} by user: ${userId}`);
    return true;
  }
}

export const contractHistoryService = new ContractHistoryService();
