import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
} from "@jest/globals";
import { Readable } from "stream";

/**
 * Upload Pipeline Integration Test
 *
 * Validates the complete pipeline:
 * File parsed → contract saved to DB → ExtractorAgent called (LLM) → clauses persisted
 */

// ── 1. Mock LLM ───────────────────────────────────────────────────────────────

// استخدام unknown بدل any لتجنب ESLint وضبط الـ Generics لـ jest.Mock
const mockInvoke = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.unstable_mockModule("@langchain/google-genai", () => ({
  ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    invoke: mockInvoke,
  })),
}));

// ── 2. Mock MongoDB models ─────────────────────────────────────────────────────

const mockContractSave = jest.fn<(...args: unknown[]) => Promise<unknown>>().mockImplementation(() => Promise.resolve({}));
const mockAnalysisSave = jest.fn<(...args: unknown[]) => Promise<unknown>>().mockImplementation(() => Promise.resolve({}));
const mockAuditSave = jest.fn<(...args: unknown[]) => Promise<unknown>>().mockImplementation(() => Promise.resolve({}));

const MOCK_CONTRACT_ID = "507f1f77bcf86cd799439011";

jest.unstable_mockModule("../../src/models/contract.model.js", () => ({
  Contract: jest.fn().mockImplementation(() => ({
    save: mockContractSave,
    _id: MOCK_CONTRACT_ID,
    userId: "user_test",
  })),
  ContractZodSchema: {
    parse: jest.fn().mockImplementation((data: unknown) => data),
  },
}));

// تعريف Structure الـ Mock بدون استخدام any
const mockSort = jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(null);
const mockFindOne = jest.fn().mockReturnValue({
  sort: mockSort,
});

const RiskAnalysisMock = jest.fn().mockImplementation(() => ({
  save: mockAnalysisSave,
  _id: "analysis_001",
}));

// ربط الـ Method بالـ Mock بشكل Type-safe
Object.defineProperty(RiskAnalysisMock, "findOne", {
  value: mockFindOne,
  writable: true,
});

jest.unstable_mockModule("../../src/models/riskAnalysis.model.js", () => ({
  RiskAnalysis: RiskAnalysisMock,
  RiskAnalysisZodSchema: {
    parse: jest.fn().mockReturnValue(true),
  },
}));

jest.unstable_mockModule("../../src/models/auditLog.model.js", () => ({
  AuditLog: jest.fn().mockImplementation(() => ({ save: mockAuditSave })),
}));

// Mock riskClassifierAgent
const mockClassify = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.unstable_mockModule("../../src/agents/riskClassifier.agent.js", () => ({
  riskClassifierAgent: { classify: mockClassify },
}));

// ── 3. Imports (after all mocks) ──────────────────────────────────────────────

const { pdfService } = await import("../../src/services/pdf.service.js");
const { docxService } = await import("../../src/services/docx.service.js");
const { contractService } = await import(
  "../../src/services/contract.service.js"
);
const { analysisService } = await import(
  "../../src/services/analysis.service.js"
);
const { orchestratorService } = await import(
  "../../src/pipeline/orchestrator.service.js"
);

// ── Shared fixtures ───────────────────────────────────────────────────────────

const ENGLISH_CONTRACT_TEXT =
  "This is a sample employment contract between Employer and Employee. " +
  "The Employee shall serve as a Senior Software Engineer. " +
  "Either party may terminate with 60 days written notice. " +
  "The Employee shall not disclose any confidential information.";

const ARABIC_CONTRACT_TEXT =
  "يلتزم الموظف بأداء المهام المنوطة به وفقاً لتوجيهات الإدارة. " +
  "يجوز لأي من الطرفين إنهاء العقد بإخطار كتابي مدته ستون يوماً. " +
  "يلتزم الموظف بعدم الإفصاح عن أي معلومات سرية.";

const ENGLISH_CLAUSES_LLM_RESPONSE = JSON.stringify([
  {
    clauseNumber: 1,
    clauseText: "The Employee shall serve as a Senior Software Engineer.",
    clauseType: "employment-terms",
  },
  {
    clauseNumber: 2,
    clauseText: "Either party may terminate with 60 days written notice.",
    clauseType: "termination",
  },
  {
    clauseNumber: 3,
    clauseText:
      "The Employee shall not disclose any confidential information.",
    clauseType: "confidentiality",
  },
]);

const ARABIC_CLAUSES_LLM_RESPONSE = JSON.stringify([
  {
    clauseNumber: 1,
    clauseText: "يلتزم الموظف بأداء المهام المنوطة به وفقاً لتوجيهات الإدارة.",
    clauseType: "employment-terms",
  },
  {
    clauseNumber: 2,
    clauseText:
      "يجوز لأي من الطرفين إنهاء العقد بإخطار كتابي مدته ستون يوماً.",
    clauseType: "termination",
  },
]);

function makePdfFile(
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  return {
    fieldname: "contract",
    originalname: "employment-contract.pdf",
    encoding: "7bit",
    mimetype: "application/pdf",
    size: 102400,
    buffer: Buffer.from("PDF binary content"),
    stream: new Readable(), // حل مشكلة الـ parameter of type never عن طريق تمرير Stream حقيقي فاضي بدل null
    destination: "",
    filename: "",
    path: "",
    ...overrides,
  };
}

function makeDocxFile(
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  return {
    fieldname: "contract",
    originalname: "service-agreement.docx",
    encoding: "7bit",
    mimetype:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 51200,
    buffer: Buffer.from("DOCX binary content"),
    stream: new Readable(), // حل مشكلة الـ parameter of type never
    destination: "",
    filename: "",
    path: "",
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Upload → Extract → Store Pipeline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // عمل Type Casting آمن للـ Caches والـ Queues لتجنب الـ Explicit any للـ Linter
    const orchestrator = orchestratorService as unknown as { extractionCache: Map<string, unknown> };
    orchestrator.extractionCache.clear();
    
    const analysis = analysisService as unknown as { executionQueue: { retryDelayMs: number } };
    analysis.executionQueue.retryDelayMs = 1;

    mockClassify.mockResolvedValue({
      riskLevel: "low",
      confidence: 0.95,
      explanation: {
        ar: "تصنيف البند",
        en: "Clause classification",
      },
      sourceFromKB: null,
    });
  });

  // ── Parsing step (unit) ───────────────────────────────────────────────────

  describe("Step 1 — File parsing (language detection & validation)", () => {
    test("pdfService detects English text correctly", () => {
      expect(pdfService.detectLanguage(ENGLISH_CONTRACT_TEXT)).toBe("en");
    });

    test("pdfService detects Arabic text correctly", () => {
      expect(pdfService.detectLanguage(ARABIC_CONTRACT_TEXT)).toBe("ar");
    });

    test("docxService detects English text correctly", () => {
      expect(docxService.detectLanguage(ENGLISH_CONTRACT_TEXT)).toBe("en");
    });

    test("docxService detects Arabic text correctly", () => {
      expect(docxService.detectLanguage(ARABIC_CONTRACT_TEXT)).toBe("ar");
    });

    test("pdfService rejects non-PDF files", () => {
      const file = makePdfFile({ mimetype: "image/jpeg" });
      expect(() => pdfService.validateFile(file)).toThrow("Invalid file type");
    });

    test("pdfService rejects files over 10MB", () => {
      const file = makePdfFile({ size: 11 * 1024 * 1024 });
      expect(() => pdfService.validateFile(file)).toThrow(
        "File size exceeds 10MB",
      );
    });

    test("docxService rejects non-DOCX files", () => {
      const file = makeDocxFile({ mimetype: "application/pdf" });
      expect(() => docxService.validateFile(file)).toThrow("Invalid file type");
    });
  });

  // ── Contract persistence (unit) ───────────────────────────────────────────

  describe("Step 2 — Contract text saved to DB", () => {
    test("contractService.saveContract() saves a parsed English contract", async () => {
      const contract = await contractService.saveContract({
        filename: "employment-contract.pdf",
        language: "en",
        text: ENGLISH_CONTRACT_TEXT,
        userId: "user_test",
        fileSize: 102400,
      });

      expect(mockContractSave).toHaveBeenCalledTimes(1);
      expect(String(contract._id)).toBe(MOCK_CONTRACT_ID);
    });

    test("contractService.saveContract() saves a parsed Arabic contract", async () => {
      const contract = await contractService.saveContract({
        filename: "contract-ar.pdf",
        language: "ar",
        text: ARABIC_CONTRACT_TEXT,
        userId: "user_ar",
        fileSize: 80000,
      });

      expect(mockContractSave).toHaveBeenCalledTimes(1);
      expect(String(contract._id)).toBe(MOCK_CONTRACT_ID);
    });
  });

  // ── Extraction + persistence (unit) ──────────────────────────────────────

  describe("Step 3 & 4 — ExtractorAgent called and clauses stored", () => {
    test("triggerAnalysis() invokes the LLM with the correct text", async () => {
      mockInvoke.mockResolvedValue({
        content: ENGLISH_CLAUSES_LLM_RESPONSE,
      });

      await analysisService.triggerAnalysis(
        MOCK_CONTRACT_ID,
        "user_test",
        ENGLISH_CONTRACT_TEXT,
        "en",
      );

      expect(mockInvoke).toHaveBeenCalledTimes(1);
      const calledMessages = mockInvoke.mock.calls[0][0] as unknown[];
      const lastMsg = calledMessages[calledMessages.length - 1];
      expect(JSON.stringify(lastMsg)).toContain("employment contract");
    });

    test("triggerAnalysis() persists all extracted clauses to RiskAnalysis", async () => {
      mockInvoke.mockResolvedValue({
        content: ENGLISH_CLAUSES_LLM_RESPONSE,
      });

      await analysisService.triggerAnalysis(
        MOCK_CONTRACT_ID,
        "user_test",
        ENGLISH_CONTRACT_TEXT,
        "en",
      );

      expect(mockAnalysisSave).toHaveBeenCalledTimes(1);
    });

    test("triggerAnalysis() writes ANALYSIS_COMPLETED audit log on success", async () => {
      mockInvoke.mockResolvedValue({
        content: ENGLISH_CLAUSES_LLM_RESPONSE,
      });

      await analysisService.triggerAnalysis(
        MOCK_CONTRACT_ID,
        "user_test",
        ENGLISH_CONTRACT_TEXT,
        "en",
      );

      expect(mockAuditSave).toHaveBeenCalled();
    });

    test("triggerAnalysis() passes Arabic language to the extractor correctly", async () => {
      mockInvoke.mockResolvedValue({
        content: ARABIC_CLAUSES_LLM_RESPONSE,
      });

      await analysisService.triggerAnalysis(
        MOCK_CONTRACT_ID,
        "user_ar",
        ARABIC_CONTRACT_TEXT,
        "ar",
      );

      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(mockAnalysisSave).toHaveBeenCalledTimes(1);
    });
  });

  // ── Full pipeline (spy-based) ─────────────────────────────────────────────

  describe("Full pipeline — spying on parsePdf / parseDocx", () => {
    test("PDF pipeline: parse → save contract → extract → persist analysis", async () => {
      const parseSpy = jest
        .spyOn(pdfService, "parsePdf")
        .mockResolvedValue({
          text: ENGLISH_CONTRACT_TEXT,
          pages: 2,
          fileSize: 102400,
          filename: "employment-contract.pdf",
          language: "en",
        });

      mockInvoke.mockResolvedValue({ content: ENGLISH_CLAUSES_LLM_RESPONSE });

      const file = makePdfFile();
      const parsed = await pdfService.parsePdf(file);
      expect(parsed.text).toBe(ENGLISH_CONTRACT_TEXT);
      expect(parsed.language).toBe("en");

      const contract = await contractService.saveContract({
        filename: parsed.filename,
        language: parsed.language,
        text: parsed.text,
        userId: "user_test",
        fileSize: parsed.fileSize,
      });
      expect(mockContractSave).toHaveBeenCalledTimes(1);

      await analysisService.triggerAnalysis(
        String(contract._id),
        "user_test",
        parsed.text,
        parsed.language,
      );
      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(mockAnalysisSave).toHaveBeenCalledTimes(1);
      expect(mockAuditSave).toHaveBeenCalled();

      parseSpy.mockRestore();
    });

    test("DOCX pipeline: parse → save contract → extract → persist analysis", async () => {
      const parseSpy = jest
        .spyOn(docxService, "parseDocx")
        .mockResolvedValue({
          text: ENGLISH_CONTRACT_TEXT,
          pages: 1,
          fileSize: 51200,
          filename: "service-agreement.docx",
          language: "en",
        });

      mockInvoke.mockResolvedValue({ content: ENGLISH_CLAUSES_LLM_RESPONSE });

      const file = makeDocxFile();
      const parsed = await docxService.parseDocx(file);
      expect(parsed.text).toBe(ENGLISH_CONTRACT_TEXT);

      const contract = await contractService.saveContract({
        filename: parsed.filename,
        language: parsed.language,
        text: parsed.text,
        userId: "user_test",
        fileSize: parsed.fileSize,
      });

      await analysisService.triggerAnalysis(
        String(contract._id),
        "user_test",
        parsed.text,
        parsed.language,
      );

      expect(mockContractSave).toHaveBeenCalledTimes(1);
      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(mockAnalysisSave).toHaveBeenCalledTimes(1);

      parseSpy.mockRestore();
    });

    test("Arabic PDF pipeline: parse (Arabic text) → save → extract → persist", async () => {
      const parseSpy = jest
        .spyOn(pdfService, "parsePdf")
        .mockResolvedValue({
          text: ARABIC_CONTRACT_TEXT,
          pages: 3,
          fileSize: 80000,
          filename: "contract-ar.pdf",
          language: "ar",
        });

      mockInvoke.mockResolvedValue({ content: ARABIC_CLAUSES_LLM_RESPONSE });

      const file = makePdfFile({ originalname: "contract-ar.pdf" });
      const parsed = await pdfService.parsePdf(file);
      expect(parsed.language).toBe("ar");

      const contract = await contractService.saveContract({
        filename: parsed.filename,
        language: parsed.language,
        text: parsed.text,
        userId: "user_ar",
        fileSize: parsed.fileSize,
      });

      await analysisService.triggerAnalysis(
        String(contract._id),
        "user_ar",
        parsed.text,
        parsed.language,
      );

      expect(mockContractSave).toHaveBeenCalledTimes(1);
      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(mockAnalysisSave).toHaveBeenCalledTimes(1);

      parseSpy.mockRestore();
    });
  });

  // ── Error handling ────────────────────────────────────────────────────────

  describe("Error handling", () => {
    test("LLM failure — triggerAnalysis() does not throw, does not persist analysis", async () => {
      mockInvoke.mockRejectedValue(new Error("LLM service unavailable"));

      await expect(
        analysisService.triggerAnalysis(
          MOCK_CONTRACT_ID,
          "user_test",
          "FAILING_CONTRACT_TEXT_TO_BYPASS_CACHE",
          "en",
        ),
      ).resolves.toBeUndefined();

      expect(mockAnalysisSave).not.toHaveBeenCalled();
      expect(mockAuditSave).toHaveBeenCalled(); // ANALYSIS_FAILED audit log
    }, 20000);

    test("LLM failure — contract save is independent and unaffected", async () => {
      const contract = await contractService.saveContract({
        filename: "contract.pdf",
        language: "en",
        text: ENGLISH_CONTRACT_TEXT,
        userId: "user_test",
        fileSize: 50000,
      });

      expect(mockContractSave).toHaveBeenCalledTimes(1);
      expect(String(contract._id)).toBe(MOCK_CONTRACT_ID);
    });
  });
});