import mongoose, { Document, Schema } from 'mongoose';

export type AuditAction =
  | 'CONTRACT_UPLOADED'
  | 'ANALYSIS_STARTED'
  | 'ANALYSIS_COMPLETED'
  | 'ANALYSIS_FAILED'
  | 'REPORT_EXPORTED';

export interface IAuditLog extends Document {
  contractId: mongoose.Types.ObjectId;
  userId: string;
  action: AuditAction;
  timestamp: Date;
  langfuseTraceId?: string;
  metadata: Record<string, unknown>;
}

const AuditLogSchema = new Schema<IAuditLog>({
  contractId: {
    type: Schema.Types.ObjectId,
    ref: 'Contract',
    required: true,
    index: true,
  },
  userId: { type: String, required: true, index: true },
  action: {
    type: String,
    enum: [
      'CONTRACT_UPLOADED',
      'ANALYSIS_STARTED',
      'ANALYSIS_COMPLETED',
      'ANALYSIS_FAILED',
      'REPORT_EXPORTED',
    ],
    required: true,
  },
  timestamp: { type: Date, default: Date.now, index: true },
  langfuseTraceId: { type: String },
  metadata: { type: Schema.Types.Mixed, default: {} },
});

AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);