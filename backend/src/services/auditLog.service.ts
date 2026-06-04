import {
  AuditLog,
  IAuditLog,
  AuditAction,
  AuditOutcome,
} from "../models/auditLog.model.js";
import { logger } from "../utils/logger.js";
import mongoose from "mongoose";
import {
  AuditRequest,
  AuditData,
  AuditFilters,
  AuditFile,
  AuditContractReference,
} from "../types/audit.js";

// --- Helpers copied from auditService.ts ---

// Helper to extract IP address
export function getIP(req?: AuditRequest): string {
  if (!req) return "unknown";

  // 1. x-forwarded-for (could be a comma-separated list)
  const xForwardedFor = req.headers?.["x-forwarded-for"];
  if (xForwardedFor) {
    const ip =
      typeof xForwardedFor === "string"
        ? xForwardedFor.split(",")[0].trim()
        : Array.isArray(xForwardedFor)
          ? xForwardedFor[0]
          : "";
    if (ip) return ip;
  }

  // 2. x-real-ip
  const xRealIp = req.headers?.["x-real-ip"];
  if (xRealIp) {
    return typeof xRealIp === "string" ? xRealIp.trim() : "";
  }

  // 3. remoteAddress
  const remoteAddress =
    req.connection?.remoteAddress || req.socket?.remoteAddress;
  if (remoteAddress) return remoteAddress;

  // 4. req.ip
  if (req.ip) return req.ip;

  return "unknown";
}

// Safely cast string/object to Mongoose ObjectId or null
function safeObjectId(
  id: string | mongoose.Types.ObjectId | null | undefined,
): mongoose.Types.ObjectId | null {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
}

// Common helper to save audit log without ever throwing
export async function writeLog(data: Partial<IAuditLog>): Promise<IAuditLog | null> {
  try {
    const log = new AuditLog({
      ...data,
      timestamp: data.timestamp || new Date(),
    });
    return await log.save();
  } catch (error) {
    logger.error("Audit logging write failed:", error);
    return null;
  }
}

// Helper to extract common request information
function extractRequestDetails(req?: AuditRequest) {
  if (!req) return {};
  const ipAddress = getIP(req);
  const userAgent = req.headers?.["user-agent"] || null;
  const requestId = req.requestId || req.headers?.["x-request-id"] || null;
  const langfuseTraceId = req.langfuseTraceId || null;

  let userId = null;
  let userEmail = null;

  if (req.user) {
    userId = safeObjectId(req.user._id);
    userEmail = req.user.email || null;
  }

  return {
    ipAddress,
    userAgent,
    requestId,
    langfuseTraceId,
    userId,
    userEmail,
  };
}

// --- Specialized Log Groups ---

export const logAuth = {
  async loginSuccess(
    req: AuditRequest,
    user?: { _id?: string; email?: string } | null,
  ) {
    const reqDetails = extractRequestDetails(req);
    const userId = safeObjectId(user?._id);
    const userEmail = user?.email || null;

    return await writeLog({
      action: "AUTH_LOGIN_SUCCESS",
      outcome: "success",
      userId,
      userEmail,
      ipAddress: reqDetails.ipAddress,
      userAgent: reqDetails.userAgent,
      requestId: reqDetails.requestId,
      langfuseTraceId: reqDetails.langfuseTraceId,
    });
  },

  async loginFailed(req: AuditRequest, email: string, failReason: string) {
    const reqDetails = extractRequestDetails(req);
    return await writeLog({
      action: "AUTH_LOGIN_FAILED",
      outcome: "failure",
      userEmail: email,
      ipAddress: reqDetails.ipAddress,
      userAgent: reqDetails.userAgent,
      requestId: reqDetails.requestId,
      langfuseTraceId: reqDetails.langfuseTraceId,
      metadata: { failReason },
    });
  },

  async logout(req: AuditRequest) {
    const reqDetails = extractRequestDetails(req);
    return await writeLog({
      action: "AUTH_LOGOUT",
      outcome: "success",
      userId: reqDetails.userId,
      userEmail: reqDetails.userEmail,
      ipAddress: reqDetails.ipAddress,
      userAgent: reqDetails.userAgent,
      requestId: reqDetails.requestId,
      langfuseTraceId: reqDetails.langfuseTraceId,
    });
  },

  async passwordReset(req: AuditRequest, email: string) {
    const reqDetails = extractRequestDetails(req);
    return await writeLog({
      action: "AUTH_PASSWORD_RESET",
      outcome: "success",
      userEmail: email,
      ipAddress: reqDetails.ipAddress,
      userAgent: reqDetails.userAgent,
      requestId: reqDetails.requestId,
      langfuseTraceId: reqDetails.langfuseTraceId,
    });
  },
};

export const logContract = {
  async upload(
    req: AuditRequest,
    file?: AuditFile | null,
    contract?: AuditContractReference | null,
    language: string,
    outcome: AuditOutcome = "success",
    error?: Error | null,
  ) {
    const reqDetails = extractRequestDetails(req);

    let userId = reqDetails.userId;
    if (!userId && contract?.userId) {
      userId = safeObjectId(contract.userId);
    }

    const metadata: Record<string, unknown> = {
      fileName: file?.originalname || file?.filename || "",
      fileSizeBytes: file?.size || 0,
      mimeType: file?.mimetype || "",
      contractId: contract?._id ? String(contract._id) : null,
      language,
    };

    return await writeLog({
      action: "CONTRACT_UPLOAD",
      outcome,
      userId,
      userEmail: reqDetails.userEmail,
      ipAddress: reqDetails.ipAddress,
      userAgent: reqDetails.userAgent,
      requestId: reqDetails.requestId,
      langfuseTraceId: reqDetails.langfuseTraceId,
      errorMessage: error?.message || null,
      metadata,
    });
  },

  async delete(
    req: AuditRequest,
    contractId: string,
    outcome: AuditOutcome = "success",
  ) {
    const reqDetails = extractRequestDetails(req);
    return await writeLog({
      action: "CONTRACT_DELETE",
      outcome,
      userId: reqDetails.userId,
      userEmail: reqDetails.userEmail,
      ipAddress: reqDetails.ipAddress,
      userAgent: reqDetails.userAgent,
      requestId: reqDetails.requestId,
      langfuseTraceId: reqDetails.langfuseTraceId,
      metadata: { contractId },
    });
  },

  async view(req: AuditRequest, contractId: string) {
    const reqDetails = extractRequestDetails(req);
    return await writeLog({
      action: "CONTRACT_VIEW",
      outcome: "success",
      userId: reqDetails.userId,
      userEmail: reqDetails.userEmail,
      ipAddress: reqDetails.ipAddress,
      userAgent: reqDetails.userAgent,
      requestId: reqDetails.requestId,
      langfuseTraceId: reqDetails.langfuseTraceId,
      metadata: { contractId },
    });
  },
};

export const logAgent = {
  async run(req: AuditRequest, data: AuditData = {}) {
    const reqDetails = extractRequestDetails(req);

    let action: AuditAction = "AGENT_EXTRACTOR";
    if (data.agentName === "extractor") {
      action = "AGENT_EXTRACTOR";
    } else if (data.agentName === "risk_classifier") {
      action = "AGENT_RISK_CLASSIFIER";
    } else if (data.agentName === "redline") {
      action = "AGENT_REDLINE";
    }

    const outcome = (data.outcome as string) || "success";
    const errorMessage =
      (data.error as { message?: string } | undefined)?.message || null;
    const langfuseTraceId =
      (data.langfuseTraceId as string | undefined) ||
      reqDetails.langfuseTraceId;

    return await writeLog({
      action,
      outcome,
      userId: reqDetails.userId,
      userEmail: reqDetails.userEmail,
      ipAddress: reqDetails.ipAddress,
      userAgent: reqDetails.userAgent,
      requestId: reqDetails.requestId,
      langfuseTraceId,
      errorMessage,
      metadata: {
        durationMs: data.durationMs,
        tokensUsed: data.tokensUsed,
        model: data.model,
        clauseCount: data.clauseCount,
        contractId: data.contractId ? String(data.contractId) : null,
      },
    });
  },

  async pipeline(req: AuditRequest, data: AuditData = {}) {
    const reqDetails = extractRequestDetails(req);
    const outcome = (data.outcome as string) || "success";
    const errorMessage =
      (data.error as { message?: string } | undefined)?.message || null;
    const langfuseTraceId =
      (data.langfuseTraceId as string | undefined) ||
      reqDetails.langfuseTraceId;

    return await writeLog({
      action: "AGENT_PIPELINE",
      outcome,
      userId: reqDetails.userId,
      userEmail: reqDetails.userEmail,
      ipAddress: reqDetails.ipAddress,
      userAgent: reqDetails.userAgent,
      requestId: reqDetails.requestId,
      langfuseTraceId,
      errorMessage,
      metadata: {
        contractId: data.contractId ? String(data.contractId) : null,
        totalDurationMs: data.totalDurationMs,
        totalTokens: data.totalTokens,
        agentsRun: data.agentsRun,
        clausesAnalyzed: data.clausesAnalyzed,
      },
    });
  },
};

export const logKB = {
  async search(req: AuditRequest, data: AuditData = {}) {
    const reqDetails = extractRequestDetails(req);
    const langfuseTraceId =
      (data.langfuseTraceId as string | undefined) ||
      reqDetails.langfuseTraceId;
    const results = Array.isArray(data.results) ? data.results : [];

    const topResultIds = results.slice(0, 3).map((r: unknown) => {
      if (r && typeof r === "object") {
        const record = r as { _id?: string; id?: string | number };
        return record._id || record.id
          ? String(record._id ?? record.id)
          : String(r);
      }
      return String(r);
    });

    const topScores = results.slice(0, 3).map((r: unknown) => {
      if (r && typeof r === "object") {
        const record = r as {
          score?: number;
          confidence?: number;
        };
        return record.score !== undefined
          ? record.score
          : record.confidence !== undefined
            ? record.confidence
            : 0;
      }
      return 0;
    });

    return await writeLog({
      action: "KB_SEARCH",
      outcome: "success",
      userId: reqDetails.userId,
      userEmail: reqDetails.userEmail,
      ipAddress: reqDetails.ipAddress,
      userAgent: reqDetails.userAgent,
      requestId: reqDetails.requestId,
      langfuseTraceId,
      metadata: {
        query: data.query as string | undefined,
        language: data.language as string | undefined,
        resultCount: results.length,
        topResultIds,
        topScores,
        durationMs: data.durationMs as number | undefined,
      },
    });
  },
};

export const logAdmin = {
  async viewLogs(
    req: AuditRequest,
    filters: AuditFilters,
    resultsReturned: number,
  ) {
    const reqDetails = extractRequestDetails(req);
    return await writeLog({
      action: "ADMIN_VIEW_LOGS",
      outcome: "success",
      userId: reqDetails.userId,
      userEmail: reqDetails.userEmail,
      ipAddress: reqDetails.ipAddress,
      userAgent: reqDetails.userAgent,
      requestId: reqDetails.requestId,
      langfuseTraceId: reqDetails.langfuseTraceId,
      metadata: { filters, resultsReturned },
    });
  },
};

// --- Existing AuditLogService ---

export class AuditLogService {
  async logEvent(data: {
    contractId: string;
    userId: string;
    action: AuditAction;
    outcome?: AuditOutcome;
    userEmail?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    requestId?: string | null;
    errorMessage?: string | null;
    errorCode?: string | null;
    langfuseTraceId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<IAuditLog> {
    const isUserIdValid = mongoose.Types.ObjectId.isValid(data.userId);

    const log = new AuditLog({
      action: data.action,
      outcome: data.outcome || "success",
      userId: isUserIdValid ? new mongoose.Types.ObjectId(data.userId) : null,
      userEmail: data.userEmail || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      requestId: data.requestId || null,
      errorMessage: data.errorMessage || null,
      errorCode: data.errorCode || null,
      langfuseTraceId: data.langfuseTraceId,
      metadata: {
        ...data.metadata,
        originalUserId: !isUserIdValid ? data.userId : undefined,
        contractId: data.contractId,
      },
    });

    await log.save();
    logger.info(`📋 Audit log: ${data.action} for contract ${data.contractId}`);
    return log;
  }

  async getLogsByContract(contractId: string): Promise<IAuditLog[]> {
    const query = mongoose.Types.ObjectId.isValid(contractId)
      ? {
          $or: [
            { contractId: new mongoose.Types.ObjectId(contractId) },
            { "metadata.contractId": contractId },
          ],
        }
      : { "metadata.contractId": contractId };
    return await AuditLog.find(query).sort({ timestamp: -1 });
  }

  async getLogsByUser(userId: string): Promise<IAuditLog[]> {
    const query = mongoose.Types.ObjectId.isValid(userId)
      ? {
          $or: [
            { userId: new mongoose.Types.ObjectId(userId) },
            { "metadata.originalUserId": userId },
          ],
        }
      : { "metadata.originalUserId": userId };
    return await AuditLog.find(query).sort({ timestamp: -1 });
  }
}

export const auditLogService = new AuditLogService();

// Default export containing all loggers for backward compatibility
const audit = {
  logAuth,
  logContract,
  logAgent,
  logKB,
  logAdmin,
  getIP,
  writeLog,
};

export default audit;
