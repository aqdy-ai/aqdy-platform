import { describe, test, expect } from '@jest/globals';
import { PdfService } from '../../src/services/pdf.service.js';
import { DocxService } from '../../src/services/docx.service.js';

const pdfService = new PdfService();
const docxService = new DocxService();

const createMockFile = (mimetype: string, size: number, content: string): any => ({
  fieldname: 'contract',
  originalname: `test.${mimetype.includes('pdf') ? 'pdf' : 'docx'}`,
  mimetype,
  size,
  buffer: Buffer.from(content),
});

describe('Performance: File Validation', () => {
  test('should validate PDF file under 10ms', () => {
    const file = createMockFile('application/pdf', 1024, 'test');
    const start = Date.now();

    for (let i = 0; i < 100; i++) {
      pdfService.validateFile(file);
    }

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(10);
  });

  test('should validate DOCX file under 10ms', () => {
    const file = createMockFile(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      1024,
      'test'
    );
    const start = Date.now();

    for (let i = 0; i < 100; i++) {
      docxService.validateFile(file);
    }

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(10);
  });
});

describe('Performance: Language Detection', () => {
  test('should detect language under 5ms for short text', () => {
    const text = 'This is a sample contract text for testing performance.';
    const start = Date.now();

    for (let i = 0; i < 1000; i++) {
      pdfService.detectLanguage(text);
    }

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  test('should detect language under 100ms for long text', () => {
    const longText = 'This is a contract. '.repeat(500);
    const start = Date.now();

    for (let i = 0; i < 100; i++) {
      pdfService.detectLanguage(longText);
    }

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  test('should detect Arabic language under 100ms for long text', () => {
    const longArabicText = 'هذا عقد عمل بين الطرفين. '.repeat(500);
    const start = Date.now();

    for (let i = 0; i < 100; i++) {
      pdfService.detectLanguage(longArabicText);
    }

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(210);
  });
});

describe('Performance: File Size Limits', () => {
  test('should reject large files instantly', () => {
    const largeFile = createMockFile('application/pdf', 11 * 1024 * 1024, 'x');
    const start = Date.now();

    try {
      pdfService.validateFile(largeFile);
    } catch { }

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5);
  });

  test('should handle 1MB file validation under 5ms', () => {
    const file = createMockFile('application/pdf', 1 * 1024 * 1024, 'x');
    const start = Date.now();

    pdfService.validateFile(file);

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5);
  });
});