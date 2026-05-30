import { PDFParse } from "pdf-parse";
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
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const totalChars = text.replace(/\s/g, "").length;
    if (totalChars === 0) return "en";
    return arabicChars / totalChars > 0.3 ? "ar" : "en";
  }

  async parsePdf(file: MulterFile): Promise<ParsedDocument> {
    this.validateFile(file);

    const parser = new PDFParse({ data: file.buffer });
    try {
      const data = await parser.getText();

      if (!data.text || data.text.trim().length === 0) {
        throw new Error("Could not extract text from PDF.");
      }

      const language = this.detectLanguage(data.text);
      logger.info(`✅ PDF parsed: ${file.originalname} (${data.total} pages)`);

      return {
        text: data.text.trim(),
        pages: data.total || 1,
        fileSize: file.size,
        filename: file.originalname,
        language,
      };
    } finally {
      await parser.destroy();
    }
  }
}

export const pdfService = new PdfService();
