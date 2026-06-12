import { getDocument, type PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
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

    let doc: PDFDocumentProxy | null = null;

    try {
      // Convert Buffer to Uint8Array for pdfjs-dist
      const data = new Uint8Array(file.buffer);
      doc = await getDocument({ data, useSystemFonts: true }).promise;

      const numPages = doc.numPages;
      const textParts: string[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .filter((item): item is { str: string } => "str" in item)
          .map((item) => item.str)
          .join(" ");
        textParts.push(pageText);
      }

      const fullText = textParts.join("\n").trim();

      if (!fullText || fullText.length === 0) {
        throw new Error("Could not extract text from PDF.");
      }

      const language = this.detectLanguage(fullText);
      logger.info(
        `✅ PDF parsed: ${file.originalname} (${numPages} pages)`,
      );

      return {
        text: fullText,
        pages: numPages,
        fileSize: file.size,
        filename: file.originalname,
        language,
      };
    } catch (error) {
      logger.error("Error parsing PDF:", error);
      throw error;
    } finally {
      if (doc) {
        await doc.destroy();
      }
    }
  }
}

export const pdfService = new PdfService();
