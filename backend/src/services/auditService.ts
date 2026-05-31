import { AuditLog, IAuditLog, AuditAction, AuditOutcome } from "../models/auditLog.model.js";
import mongoose from "mongoose";

// Helper to extract IP address
export function getIP(req: any): string {
  if (!req) return "unknown";
  
  // 1. x-forwarded-for (could be a comma-separated list)
  const xForwardedFor = req.headers?.["x-forwarded-for"];
  if (xForwardedFor) {
    const ip = typeof xForwardedFor === "string" 
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
  const remoteAddress = req.connection?.remoteAddress || req.socket?.remoteAddress;
  if (remoteAddress) return remoteAddress;
  
  // 4. req.ip
  if (req.ip) return req.ip;
  
  return "unknown";
}

// Safely cast string/object to Mongoose ObjectId or null
function safeObjectId(id: any): mongoose.Types.ObjectId | null {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
}

// Common helper to save audit log without ever throwing
async function writeLog(data: Partial<IAuditLog>): Promise<IAuditLog | null> {
  try {
    const log = new AuditLog({
      ...data,
      timestamp: data.timestamp || new Date(),
    });
    return await log.save();
  } catch (error) {
    console.error("Audit logging write failed:", error);
    return null;
  }
}

// Helper to extract common request information
function extractRequestDetails(req: any) {
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
  
  return { ipAddress, userAgent, requestId, langfuseTraceId, userId, userEmail };
}

// --- LOG AUTHENTICATION GROUP ---
export const logAuth = {
  async loginSuccess(req: any, user: any) {
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

  async loginFailed(req: any, email: string, failReason: string) {
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

  async logout(req: any) {
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

  async passwordReset(req: any, email: string) {
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

// --- LOG CONTRACT GROUP ---
export const logContract = {
  async upload(
    req: any,
    file: any,
    contract: any,
    language: string,
    outcome: AuditOutcome = "success",
    error?: any
  ) {
    const reqDetails = extractRequestDetails(req);
    
    // Attempt to get userId from req or contract
    let userId = reqDetails.userId;
    if (!userId && contract?.userId) {
      userId = safeObjectId(contract.userId);
    }
    
    const metadata: Record<string, any> = {
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

  async delete(req: any, contractId: string, outcome: AuditOutcome = "success") {
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

  async view(req: any, contractId: string) {
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

// --- LOG AGENT GROUP ---
export const logAgent = {
  async run(req: any, data: any) {
    const reqDetails = extractRequestDetails(req);
    
    let action: AuditAction = "AGENT_EXTRACTOR";
    if (data.agentName === "extractor") {
      action = "AGENT_EXTRACTOR";
    } else if (data.agentName === "risk_classifier") {
      action = "AGENT_RISK_CLASSIFIER";
    } else if (data.agentName === "redline") {
      action = "AGENT_REDLINE";
    }

    const outcome = data.outcome || "success";
    const errorMessage = data.error?.message || null;
    const langfuseTraceId = data.langfuseTraceId || reqDetails.langfuseTraceId;

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

  async pipeline(req: any, data: any) {
    const reqDetails = extractRequestDetails(req);
    const outcome = data.outcome || "success";
    const errorMessage = data.error?.message || null;
    const langfuseTraceId = data.langfuseTraceId || reqDetails.langfuseTraceId;

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

// --- LOG KB GROUP ---
export const logKB = {
  async search(req: any, data: any) {
    const reqDetails = extractRequestDetails(req);
    const langfuseTraceId = data.langfuseTraceId || reqDetails.langfuseTraceId;
    const results = data.results || [];
    
    const topResultIds = results.slice(0, 3).map((r: any) => {
      if (r && typeof r === "object") {
        return r._id || r.id || String(r);
      }
      return String(r);
    });
    
    const topScores = results.slice(0, 3).map((r: any) => {
      if (r && typeof r === "object") {
        return r.score !== undefined ? r.score : (r.confidence !== undefined ? r.confidence : 0);
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
        query: data.query,
        language: data.language,
        resultCount: results.length,
        topResultIds,
        topScores,
        durationMs: data.durationMs,
      },
    });
  },
};

// --- LOG ADMIN GROUP ---
export const logAdmin = {
  async viewLogs(req: any, filters: any, resultsReturned: number) {
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

// Default export containing all loggers
const audit = {
  logAuth,
  logContract,
  logAgent,
  logKB,
  logAdmin,
  getIP,
  writeLog, // internal helper exposed for edge case testing/flexibility
};

export default audit;
