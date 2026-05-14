import { AuditLog, IAuditLog, AuditAction } from '../models/auditLog.model.js';
import { logger } from '../utils/logger.js';

export class AuditLogService {
  // سجل حدث جديد
  async logEvent(data: {
    contractId: string;
    userId: string;
    action: AuditAction;
    langfuseTraceId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<IAuditLog> {
    const log = new AuditLog({
      ...data,
      metadata: data.metadata ?? {},
    });
    await log.save();
    logger.info(`📋 Audit log: ${data.action} for contract ${data.contractId}`);
    return log;
  }

  // جيب كل logs لعقد معين
  async getLogsByContract(contractId: string): Promise<IAuditLog[]> {
    return await AuditLog.find({ contractId }).sort({ timestamp: -1 });
  }

  // جيب كل logs لـ user معين
  async getLogsByUser(userId: string): Promise<IAuditLog[]> {
    return await AuditLog.find({ userId }).sort({ timestamp: -1 });
  }
}

export const auditLogService = new AuditLogService();