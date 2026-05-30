/* backend/src/middlewares/validate.ts */
import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import validator from "validator";
import { ApiResponse } from "../types/index.js";

// تعريف نوع مخصص لعملية الـ Sanitization التكرارية بشكل آمن
type SanitizedType =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [key: string]: SanitizedType }
  | SanitizedType[];

/**
 * دالة لتطهير النصوص تكرارياً ومنع ثغرات الـ XSS وحذف المسافات الزائدة
 */
export const sanitizeInput = (data: unknown): SanitizedType => {
  if (typeof data === "string") {
    let sanitized = data.trim();
    sanitized = validator.escape(sanitized);
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeInput(item)) as SanitizedType[];
  }

  if (typeof data === "object" && data !== null) {
    const cleanedObj: { [key: string]: SanitizedType } = {};
    const obj = data as { [key: string]: unknown };

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cleanedObj[key] = sanitizeInput(obj[key]);
      }
    }
    return cleanedObj;
  }

  return data as SanitizedType;
};

/**
 * Generic Zod validation middleware factory.
 * يقوم بفحص البيانات (Body, Query, Params) وتطهيرها تلقائياً قبل الـ Controller
 */
export const validate = (
  schema: ZodSchema,
  source: "body" | "query" | "params" = "body",
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const issues = result.error.issues;
      const fieldErrors = issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      const response: ApiResponse<null> = {
        success: false,
        error: "Validation failed",
        message: fieldErrors.map((e) => `${e.field}: ${e.message}`).join("; "),
      };

      res.status(400).json(response);
      return;
    }

    // 🌟 خطوة إضافية: تطهير الداتا الناجحة (Sanitization) قبل إرفاقها بالـ Request
    req[source] = sanitizeInput(result.data) as Record<string, unknown>;
    next();
  };
};

/**
 * Middleware مخصص لفحص الملفات المرفوعة (PDF & DOCX فقط) وحجمها (بحد أقصى 10MB)
 * متناسق تماماً مع نظام الـ ApiResponse الخاص بـ "عقدي"
 */
export const validateFileUpload = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const isRtl = req.headers["accept-language"] === "ar";

  if (!req.file) {
    const response: ApiResponse<null> = {
      success: false,
      error: "Missing file",
      message: isRtl ? "لم يتم تحميل أي ملف." : "No file uploaded.",
    };
    res.status(400).json(response);
    return;
  }

  const ALLOWED_MIMETYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  ];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 ميجابايت لحماية الـ AI Pipeline

  // 1. فحص الامتداد والصيغة
  if (!ALLOWED_MIMETYPES.includes(req.file.mimetype)) {
    const response: ApiResponse<null> = {
      success: false,
      error: "Invalid file type",
      message: isRtl
        ? "صيغة الملف غير مدعومة! مسموح فقط بملفات PDF و DOCX."
        : "Invalid file type! Only PDF and DOCX files are allowed.",
    };
    res.status(400).json(response);
    return;
  }

  // 2. فحص الحجم
  if (req.file.size > MAX_FILE_SIZE) {
    const response: ApiResponse<null> = {
      success: false,
      error: "File too oversized",
      message: isRtl
        ? "حجم الملف كبير جداً! الحد الأقصى المسموح به هو 10 ميجابايت."
        : "File is too oversized! Maximum allowed limit is 10MB.",
    };
    res.status(400).json(response);
    return;
  }

  next();
};