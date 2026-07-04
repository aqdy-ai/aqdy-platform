import "dotenv/config";
import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import mongoose from "mongoose";

import { Contract } from "../../src/models/contract.model.js";
import { RiskAnalysis } from "../../src/models/riskAnalysis.model.js";
import { AuditLog } from "../../src/models/auditLog.model.js";
import { contractService } from "../../src/services/contract.service.js";
import { analysisService } from "../../src/services/analysis.service.js";
import { auditLogService } from "../../src/services/auditLog.service.js";

beforeAll(async () => {
  const mongoURI = process.env.MONGODB_URI!.replace("aqdy_db", "aqdy_test");
  await mongoose.connect(mongoURI);
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  } else {
    try {
      await mongoose.disconnect();
    } catch (e) {
      // ignore
    }
  }
});

beforeEach(async () => {
  await Contract.deleteMany({});
  await RiskAnalysis.deleteMany({});
  await AuditLog.deleteMany({});
});

describe("Integration: ContractService", () => {
  test("should save and retrieve a contract", async () => {
    const contract = await contractService.saveContract({
      filename: "test.pdf",
      language: "en",
      text: "This is a sample contract text",
      userId: "user_123",
      fileSize: 2048,
    });

    expect(contract._id).toBeDefined();

    const found = await contractService.getContractById(String(contract._id));
    expect(found?.filename).toBe("test.pdf");
    expect(found?.userId).toBe("user_123");
  });

  test("should get all contracts by user", async () => {
    await contractService.saveContract({
      filename: "a.pdf",
      language: "en",
      text: "Contract A text",
      userId: "user_123",
      fileSize: 1024,
    });

    await contractService.saveContract({
      filename: "b.pdf",
      language: "ar",
      text: "نص العقد ب",
      userId: "user_123",
      fileSize: 2048,
    });

    const contracts = await contractService.getContractsByUser("user_123");
    expect(contracts).toHaveLength(2);
  });

  test("should update a contract", async () => {
    const contract = await contractService.saveContract({
      filename: "old.pdf",
      language: "en",
      text: "Old text",
      userId: "user_123",
      fileSize: 1024,
    });

    const updated = await contractService.updateContract(String(contract._id), {
      filename: "new.pdf",
    } as any);

    expect(updated?.filename).toBe("new.pdf");
  });

  test("should delete a contract", async () => {
    const contract = await contractService.saveContract({
      filename: "delete.pdf",
      language: "en",
      text: "To be deleted",
      userId: "user_123",
      fileSize: 512,
    });

    await contractService.deleteContract(String(contract._id));
    const found = await contractService.getContractById(String(contract._id));
    expect(found).toBeNull();
  });
});

describe("Integration: AnalysisService", () => {
  test("should save and retrieve an analysis", async () => {
    const contract = await contractService.saveContract({
      filename: "contract.pdf",
      language: "en",
      text: "Contract text for analysis",
      userId: "user_123",
      fileSize: 1024,
    });

    const analysis = await analysisService.saveAnalysis({
      contractId: String(contract._id),
      userId: "user_123",
      executiveSummary: {
        overallRisk: "high",
        totalClauses: 5,
        riskyClausesCount: 2,
        summary: { ar: "خطر مرتفع", en: "High risk contract" },
      },
      clauseAnalysis: [
        {
          clauseText: "Unlimited liability clause",
          clauseType: "liability",
          riskLevel: "critical",
          confidence: 0.95,
          explanation: {
            ar: "هذا الشرط خطير جداً",
            en: "This clause is very risky",
          },
          sourceFromKB: "clause_001",
        },
      ],
      analysisDuration: 2300,
    });

    expect(analysis._id).toBeDefined();

    const found = await analysisService.getAnalysisByContractId(
      String(contract._id),
    );
    expect(found?.executiveSummary.overallRisk).toBe("high");
    expect(found?.clauseAnalysis).toHaveLength(1);
  });
});

describe("Integration: AuditLogService", () => {
  test("should log and retrieve events", async () => {
    const contract = await contractService.saveContract({
      filename: "audit.pdf",
      language: "en",
      text: "Contract for audit",
      userId: "user_123",
      fileSize: 1024,
    });

    await auditLogService.logEvent({
      contractId: String(contract._id),
      userId: "user_123",
      action: "CONTRACT_UPLOADED",
      metadata: { fileSize: 1024 },
    });

    await auditLogService.logEvent({
      contractId: String(contract._id),
      userId: "user_123",
      action: "ANALYSIS_STARTED",
    });

    const logs = await auditLogService.getLogsByContract(String(contract._id));
    expect(logs).toHaveLength(2);
    expect(logs[0].action).toBe("ANALYSIS_STARTED");
  });
});
