import { AuditLog, IAuditLog, AuditAction } from "../models/auditLog.model.js";
import { logger } from "../utils/logger.js";
import mongoose from "mongoose";

export class AuditLogService {
  // Sijil event (backward compatibility)
  async logEvent(data: {
    contractId: string;
    userId: string;
    action: AuditAction;
    langfuseTraceId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<IAuditLog> {
    const isUserIdValid = mongoose.Types.ObjectId.isValid(data.userId);

    const log = new AuditLog({
      action: data.action,
      outcome: "success",
      userId: isUserIdValid ? new mongoose.Types.ObjectId(data.userId) : null,
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

  // Get logs by contract (backward compatibility)
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

  // Get logs by user (backward compatibility)
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
