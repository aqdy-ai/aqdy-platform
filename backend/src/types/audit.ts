import { Request } from "express";
import mongoose from "mongoose";

export interface RequestWithId extends Request {
  requestId?: string;
}

export interface AuditRequest extends Request {
  requestId?: string;
  langfuseTraceId?: string;
  user?: {
    _id?: string;
    email?: string;
  };
}

export type AuditData = Record<string, unknown>;
export type AuditFilters = Record<string, unknown>;

export interface AuditFile {
  originalname?: string;
  filename?: string;
  size?: number;
  mimetype?: string;
}

export interface AuditContractReference {
  userId?: string | mongoose.Types.ObjectId;
  _id?: string;
}
