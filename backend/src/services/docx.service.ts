import mammoth from 'mammoth';
import { logger } from '../utils/logger.js';
import { ParsedDocument, MulterFile } from './pdf.service.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_DOCX_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

export class DocxService {
  validateFile(file: MulterFile): void {
    if (!ALLOWED_DOCX_TYPES.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only DOCX/DOC files are allowed.');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 10MB limit.');
    }
  }

  detectLanguage(text: string): 'ar' | 'en' {
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    if (totalChars === 0) return 'en';
    return arabicChars / totalChars > 0.3 ? 'ar' : 'en';
  }

  async parseDocx(file: MulterFile): Promise<ParsedDocument> {
    this.validateFile(file);

    const result = await mammoth.extractRawText({ buffer: file.buffer });

    if (!result.value || result.value.trim().length === 0) {
      throw new Error('Could not extract text from DOCX.');
    }

    if (result.messages.length > 0) {
      logger.info(`⚠️ DOCX warnings: ${result.messages.map(m => m.message).join(', ')}`);
    }

    const language = this.detectLanguage(result.value);
    logger.info(`✅ DOCX parsed: ${file.originalname}`);

    return {
      text: result.value.trim(),
      pages: 1,
      fileSize: file.size,
      filename: file.originalname,
      language,
    };
  }
}

export const docxService = new DocxService();