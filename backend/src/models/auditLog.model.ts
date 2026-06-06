import mongoose, { Document, Schema } from "mongoose";

export const ACTION_TYPES = [
  "AUTH_LOGIN_SUCCESS",
  "AUTH_LOGIN_FAILED",
  "AUTH_LOGOUT",
  "AUTH_PASSWORD_RESET",
  "CONTRACT_UPLOAD",
  "CONTRACT_DELETE",
  "CONTRACT_VIEW",
  "CONTRACT_DOWNLOAD",
  "AGENT_EXTRACTOR",
  "AGENT_RISK_CLASSIFIER",
  "AGENT_REDLINE",
  "AGENT_PIPELINE",
  "KB_SEARCH",
  "ADMIN_VIEW_LOGS",
  "ADMIN_VIEW_USER",
  // Legacy actions for backward compatibility
  "STRIPE_WEBHOOK",
  "CONTRACT_UPLOADED",
  "ANALYSIS_STARTED",
  "ANALYSIS_COMPLETED",
  "ANALYSIS_FAILED",
  "REPORT_EXPORTED",
] as const;

export type AuditAction = (typeof ACTION_TYPES)[number];

export const OUTCOMES = ["success", "failure", "partial", "blocked"] as const;
export type AuditOutcome = (typeof OUTCOMES)[number];

export interface IAuditLog extends Document {
  action: AuditAction;
  outcome: AuditOutcome;
  timestamp: Date;
  userId?: mongoose.Types.ObjectId | null;
  userEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
  errorMessage?: string | null;
  errorCode?: string | null;
  langfuseTraceId?: string | null;
  requestId?: string | null;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      enum: ACTION_TYPES,
    },
    outcome: {
      type: String,
      required: true,
      enum: OUTCOMES,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    userEmail: {
      type: String,
      default: null,
      index: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    errorMessage: {
      type: String,
      default: null,
    },
    errorCode: {
      type: String,
      default: null,
    },
    langfuseTraceId: {
      type: String,
      default: null,
      index: true,
    },
    requestId: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    collection: "AuditLog",
  },
);

// Compounds
AuditLogSchema.index({ userId: 1, action: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

// TTL index on timestamp expireAfterSeconds: 63072000 (2 years)
AuditLogSchema.index({ timestamp: -1 }, { expireAfterSeconds: 63072000 });

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
