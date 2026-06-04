import pdf from "pdf-parse";
import { logger } from "../utils/logger.js";

export interface ParsedDocument {
  text: string;
  pages: number;
  fileSize: number;
  filename: string;
  language: "ar" | "en";
}

export interface MulterFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_PDF_TYPES = ["application/pdf"];

export class PdfService {
  validateFile(file: MulterFile): void {
    if (!ALLOWED_PDF_TYPES.includes(file.mimetype)) {
      throw new Error("Invalid file type. Only PDF files are allowed.");
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("File size exceeds 10MB limit.");
    }
  }

  detectLanguage(text: string): "ar" | "en" {
    if (!text) return "en";

    // Sample the first 5000 characters for high performance on long contracts
    const sample = text.slice(0, 5000);
    let arabicChars = 0;
    let totalChars = 0;

    for (let i = 0; i < sample.length; i++) {
      const code = sample.charCodeAt(i);
      if (code <= 32) continue; // Skip whitespace and control characters
      totalChars++;
      if (code >= 0x0600 && code <= 0x06ff) arabicChars++;
    }

    if (totalChars === 0) return "en";
    return arabicChars / totalChars > 0.3 ? "ar" : "en";
  }

  async parsePdf(file: MulterFile): Promise<ParsedDocument> {
    this.validateFile(file);

    try {
      const data = await pdf(file.buffer);

      if (!data.text || data.text.trim().length === 0) {
        throw new Error("Could not extract text from PDF.");
      }

      const language = this.detectLanguage(data.text);
      logger.info(
        `✅ PDF parsed: ${file.originalname} (${data.numpages} pages)`,
      );

      return {
        text: data.text.trim(),
        pages: data.numpages || 1,
        fileSize: file.size,
        filename: file.originalname,
        language,
      };
    } catch (error) {
      logger.error("Error parsing PDF:", error);
      throw error;
    }
  }
}

export const pdfService = new PdfService();
