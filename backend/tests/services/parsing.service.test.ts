import { describe, test, expect } from '@jest/globals';
import { PdfService } from '../../src/services/pdf.service.js';
import { DocxService } from '../../src/services/docx.service.js';

const pdfService = new PdfService();
const docxService = new DocxService();

// Helper: عمل mock file
const createMockFile = (mimetype: string, size: number): any => ({
  fieldname: 'contract',
  originalname: `test.${mimetype.includes('pdf') ? 'pdf' : 'docx'}`,
  mimetype,
  size,
  buffer: Buffer.from('test content'),
});

describe('PdfService - File Validation', () => {
  test('should reject non-PDF files', () => {
    const file = createMockFile('image/png', 1024);
    expect(() => pdfService.validateFile(file)).toThrow(
      'Invalid file type. Only PDF files are allowed.'
    );
  });

  test('should reject files over 10MB', () => {
    const file = createMockFile('application/pdf', 11 * 1024 * 1024);
    expect(() => pdfService.validateFile(file)).toThrow(
      'File size exceeds 10MB limit.'
    );
  });

  test('should accept valid PDF file', () => {
    const file = createMockFile('application/pdf', 1024);
    expect(() => pdfService.validateFile(file)).not.toThrow();
  });
});

describe('PdfService - Language Detection', () => {
  test('should detect Arabic text', () => {
    const text = 'هذا عقد عمل بين الطرفين';
    expect(pdfService.detectLanguage(text)).toBe('ar');
  });

  test('should detect English text', () => {
    const text = 'This is an employment contract between two parties';
    expect(pdfService.detectLanguage(text)).toBe('en');
  });

  test('should return en for empty text', () => {
    expect(pdfService.detectLanguage('')).toBe('en');
  });

  test('should detect mixed text as Arabic if >30% Arabic', () => {
    const text = 'هذا عقد this is a contract بين الطرفين';
    expect(pdfService.detectLanguage(text)).toBe('ar');
  });
});

describe('DocxService - File Validation', () => {
  test('should reject non-DOCX files', () => {
    const file = createMockFile('image/png', 1024);
    expect(() => docxService.validateFile(file)).toThrow(
      'Invalid file type. Only DOCX/DOC files are allowed.'
    );
  });

  test('should reject files over 10MB', () => {
    const file = createMockFile(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      11 * 1024 * 1024
    );
    expect(() => docxService.validateFile(file)).toThrow(
      'File size exceeds 10MB limit.'
    );
  });

  test('should accept valid DOCX file', () => {
    const file = createMockFile(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      1024
    );
    expect(() => docxService.validateFile(file)).not.toThrow();
  });
});

describe('DocxService - Language Detection', () => {
  test('should detect Arabic text', () => {
    const text = 'هذا عقد عمل بين الطرفين';
    expect(docxService.detectLanguage(text)).toBe('ar');
  });

  test('should detect English text', () => {
    const text = 'This is an employment contract';
    expect(docxService.detectLanguage(text)).toBe('en');
  });
});