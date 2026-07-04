import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  RiskAnalysis,
  IRiskAnalysis,
  IClauseAnalysis,
} from "../../src/models/riskAnalysis.model.js";
import { AnalysisService } from "../../src/services/analysis.service.js";
import {
  beforeAll,
  afterAll,
  afterEach,
  describe,
  test,
  expect,
  jest,
} from "@jest/globals";

jest.setTimeout(60000);

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  mongoose.set("bufferCommands", false);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (typeof mongoServer !== "undefined") {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────

const contractIdA = new mongoose.Types.ObjectId();
const contractIdB = new mongoose.Types.ObjectId();

function makeClause(
  clauseType: string,
  riskLevel: IClauseAnalysis["riskLevel"],
  overrides: Partial<IClauseAnalysis> = {},
): IClauseAnalysis {
  return {
    clauseText: `Sample text for ${clauseType}`,
    clauseType,
    riskLevel,
    confidence: 0.9,
    lowConfidenceWarning: false,
    kbCitationMissing: false,
    explanation: { ar: "شرح", en: "Explanation" },
    sourceFromKB: null,
    ...overrides,
  };
}

function makeAnalysisData(
  contractId: mongoose.Types.ObjectId,
  overrides: Record<string, unknown> = {},
) {
  return {
    contractId: contractId.toString(),
    userId: "user-123",
    executiveSummary: {
      overallRisk: "medium" as const,
      totalClauses: 3,
      riskyClausesCount: 1,
      summary: { ar: "ملخص", en: "Summary" },
    },
    clauseAnalysis: [
      makeClause("termination", "low"),
      makeClause("liability", "medium"),
      makeClause("indemnity", "high"),
    ],
    analysisDuration: 1500,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("RiskAnalysis Versioning", () => {
  // ── Model-level tests ──────────────────────────────────────────────

  describe("Model — version field", () => {
    test("saves version field with the document", async () => {
      const doc = new RiskAnalysis({
        ...makeAnalysisData(contractIdA),
        version: 1,
        diffSummary: null,
      });
      const saved = await doc.save();

      expect(saved.version).toBe(1);
    });

    test("version field defaults to 1", async () => {
      const doc = new RiskAnalysis({
        ...makeAnalysisData(contractIdA),
        diffSummary: null,
      });
      const saved = await doc.save();

      expect(saved.version).toBe(1);
    });

    test("rejects version < 1", async () => {
      const doc = new RiskAnalysis({
        ...makeAnalysisData(contractIdA),
        version: 0,
        diffSummary: null,
      });

      let err: unknown;
      try {
        await doc.validate();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    });

    test("enforces unique compound index on (contractId, version)", async () => {
      await RiskAnalysis.init();

      const data = makeAnalysisData(contractIdA);

      const doc1 = new RiskAnalysis({
        ...data,
        version: 1,
        diffSummary: null,
      });
      await doc1.save();

      const doc2 = new RiskAnalysis({
        ...data,
        version: 1,
        diffSummary: null,
      });

      let err: unknown;
      try {
        await doc2.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect((err as { code: number }).code).toBe(11000); // duplicate key error
    });
  });

  describe("Model — diffSummary field", () => {
    test("stores null diffSummary for v1 analyses", async () => {
      const doc = new RiskAnalysis({
        ...makeAnalysisData(contractIdA),
        version: 1,
        diffSummary: null,
      });
      const saved = await doc.save();

      expect(saved.diffSummary).toBeNull();
    });

    test("stores populated diffSummary for v2+ analyses", async () => {
      const diff = {
        comparedToVersion: 1,
        changedClauses: [
          {
            clauseType: "liability",
            clauseText: "Sample text for liability",
            previousRiskLevel: "medium",
            currentRiskLevel: "high",
            direction: "escalated" as const,
          },
        ],
        totalChanged: 1,
      };

      const doc = new RiskAnalysis({
        ...makeAnalysisData(contractIdA),
        version: 2,
        diffSummary: diff,
      });
      const saved = await doc.save();

      expect(saved.diffSummary).toBeDefined();
      expect(saved.diffSummary!.comparedToVersion).toBe(1);
      expect(saved.diffSummary!.changedClauses).toHaveLength(1);
      expect(saved.diffSummary!.changedClauses[0].direction).toBe("escalated");
      expect(saved.diffSummary!.totalChanged).toBe(1);
    });
  });

  // ── Service-level tests ────────────────────────────────────────────

  describe("AnalysisService.saveAnalysis — auto-versioning", () => {
    const service = new AnalysisService();

    test("first analysis for a contract gets version 1", async () => {
      const result = await service.saveAnalysis(makeAnalysisData(contractIdA));

      expect(result.version).toBe(1);
      expect(result.diffSummary).toBeNull();
    });

    test("second analysis for the same contract gets version 2 with diff", async () => {
      // v1
      await service.saveAnalysis(makeAnalysisData(contractIdA));

      // v2 with changed clauses
      const v2Data = makeAnalysisData(contractIdA, {
        clauseAnalysis: [
          makeClause("termination", "high"), // was low → escalated
          makeClause("liability", "medium"), // unchanged
          makeClause("indemnity", "low"), // was high → de-escalated
        ],
      });
      const v2 = await service.saveAnalysis(v2Data);

      expect(v2.version).toBe(2);
      expect(v2.diffSummary).toBeDefined();
      expect(v2.diffSummary!.comparedToVersion).toBe(1);
      expect(v2.diffSummary!.totalChanged).toBe(2);
    });

    test("third analysis for the same contract gets version 3", async () => {
      await service.saveAnalysis(makeAnalysisData(contractIdA));
      await service.saveAnalysis(makeAnalysisData(contractIdA));
      const v3 = await service.saveAnalysis(makeAnalysisData(contractIdA));

      expect(v3.version).toBe(3);
    });

    test("analyses for different contracts have independent versions", async () => {
      const a1 = await service.saveAnalysis(makeAnalysisData(contractIdA));
      const b1 = await service.saveAnalysis(makeAnalysisData(contractIdB));
      const a2 = await service.saveAnalysis(makeAnalysisData(contractIdA));

      expect(a1.version).toBe(1);
      expect(b1.version).toBe(1);
      expect(a2.version).toBe(2);
    });

    test("re-analyzing does NOT overwrite the previous version", async () => {
      await service.saveAnalysis(makeAnalysisData(contractIdA));
      await service.saveAnalysis(
        makeAnalysisData(contractIdA, {
          executiveSummary: {
            overallRisk: "critical",
            totalClauses: 5,
            riskyClausesCount: 4,
            summary: { ar: "ملخص جديد", en: "New summary" },
          },
        }),
      );

      const allVersions = await RiskAnalysis.find({
        contractId: contractIdA,
      }).sort({ version: 1 });

      expect(allVersions).toHaveLength(2);
      expect(allVersions[0].version).toBe(1);
      expect(allVersions[0].executiveSummary.overallRisk).toBe("medium");
      expect(allVersions[1].version).toBe(2);
      expect(allVersions[1].executiveSummary.overallRisk).toBe("critical");
    });
  });

  // ── Version listing ────────────────────────────────────────────────

  describe("AnalysisService.getAnalysisVersionsByContractId", () => {
    const service = new AnalysisService();

    test("returns all versions in descending order", async () => {
      await service.saveAnalysis(makeAnalysisData(contractIdA));
      await service.saveAnalysis(makeAnalysisData(contractIdA));
      await service.saveAnalysis(makeAnalysisData(contractIdA));

      const versions = await service.getAnalysisVersionsByContractId(
        contractIdA.toString(),
      );

      expect(versions).toHaveLength(3);
      expect(versions[0].version).toBe(3);
      expect(versions[1].version).toBe(2);
      expect(versions[2].version).toBe(1);
    });

    test("returns empty array when no analyses exist", async () => {
      const versions = await service.getAnalysisVersionsByContractId(
        new mongoose.Types.ObjectId().toString(),
      );

      expect(versions).toHaveLength(0);
    });

    test("each version includes overallRisk from executiveSummary", async () => {
      await service.saveAnalysis(makeAnalysisData(contractIdA));

      const versions = await service.getAnalysisVersionsByContractId(
        contractIdA.toString(),
      );

      expect(versions[0]).toHaveProperty("executiveSummary");
      expect((versions[0].executiveSummary as any).overallRisk).toBe("medium");
    });

    test("does not include clauseAnalysis in the list response", async () => {
      await service.saveAnalysis(makeAnalysisData(contractIdA));

      const versions = await service.getAnalysisVersionsByContractId(
        contractIdA.toString(),
      );

      expect((versions[0] as any).clauseAnalysis).toBeUndefined();
    });
  });

  // ── Version detail retrieval ───────────────────────────────────────

  describe("AnalysisService.getAnalysisById", () => {
    const service = new AnalysisService();

    test("returns the full analysis document by ID", async () => {
      const saved = await service.saveAnalysis(makeAnalysisData(contractIdA));
      const retrieved = await service.getAnalysisById(String(saved._id));

      expect(retrieved).not.toBeNull();
      expect(String(retrieved!._id)).toBe(String(saved._id));
      expect(retrieved!.version).toBe(1);
      expect(retrieved!.clauseAnalysis).toHaveLength(3);
    });

    test("returns null for a non-existent ID", async () => {
      const result = await service.getAnalysisById(
        new mongoose.Types.ObjectId().toString(),
      );

      expect(result).toBeNull();
    });

    test("includes diffSummary in v2+ detail", async () => {
      await service.saveAnalysis(makeAnalysisData(contractIdA));
      const v2 = await service.saveAnalysis(
        makeAnalysisData(contractIdA, {
          clauseAnalysis: [
            makeClause("termination", "critical"),
            makeClause("liability", "medium"),
            makeClause("indemnity", "high"),
          ],
        }),
      );

      const detail = await service.getAnalysisById(String(v2._id));

      expect(detail!.diffSummary).toBeDefined();
      expect(detail!.diffSummary!.comparedToVersion).toBe(1);
      expect(detail!.diffSummary!.changedClauses.length).toBeGreaterThan(0);
    });
  });

  // ── Diff summary generation ────────────────────────────────────────

  describe("AnalysisService.generateDiffSummary", () => {
    const service = new AnalysisService();

    test("detects escalated clauses", () => {
      const prev = [makeClause("termination", "low")];
      const curr = [makeClause("termination", "high")];

      const diff = service.generateDiffSummary(prev, curr, 1);

      expect(diff.comparedToVersion).toBe(1);
      expect(diff.totalChanged).toBe(1);
      expect(diff.changedClauses[0].direction).toBe("escalated");
      expect(diff.changedClauses[0].previousRiskLevel).toBe("low");
      expect(diff.changedClauses[0].currentRiskLevel).toBe("high");
    });

    test("detects de-escalated clauses", () => {
      const prev = [makeClause("indemnity", "critical")];
      const curr = [makeClause("indemnity", "low")];

      const diff = service.generateDiffSummary(prev, curr, 1);

      expect(diff.totalChanged).toBe(1);
      expect(diff.changedClauses[0].direction).toBe("de-escalated");
    });

    test("ignores clauses with unchanged risk level", () => {
      const prev = [
        makeClause("termination", "low"),
        makeClause("liability", "medium"),
      ];
      const curr = [
        makeClause("termination", "low"),
        makeClause("liability", "medium"),
      ];

      const diff = service.generateDiffSummary(prev, curr, 1);

      expect(diff.totalChanged).toBe(0);
      expect(diff.changedClauses).toHaveLength(0);
    });

    test("ignores new clauses not present in previous version", () => {
      const prev = [makeClause("termination", "low")];
      const curr = [
        makeClause("termination", "low"),
        makeClause("brand-new-clause", "high"),
      ];

      const diff = service.generateDiffSummary(prev, curr, 1);

      expect(diff.totalChanged).toBe(0);
    });

    test("handles empty previous clauses", () => {
      const diff = service.generateDiffSummary(
        [],
        [makeClause("termination", "high")],
        1,
      );

      expect(diff.totalChanged).toBe(0);
    });

    test("handles empty current clauses", () => {
      const diff = service.generateDiffSummary(
        [makeClause("termination", "low")],
        [],
        1,
      );

      expect(diff.totalChanged).toBe(0);
    });

    test("correctly reports multiple changed clauses", () => {
      const prev = [
        makeClause("termination", "low"),
        makeClause("liability", "medium"),
        makeClause("indemnity", "high"),
        makeClause("confidentiality", "low"),
      ];
      const curr = [
        makeClause("termination", "critical"), // escalated
        makeClause("liability", "medium"), // unchanged
        makeClause("indemnity", "low"), // de-escalated
        makeClause("confidentiality", "high"), // escalated
      ];

      const diff = service.generateDiffSummary(prev, curr, 2);

      expect(diff.comparedToVersion).toBe(2);
      expect(diff.totalChanged).toBe(3);

      const escalated = diff.changedClauses.filter(
        (c) => c.direction === "escalated",
      );
      const deEscalated = diff.changedClauses.filter(
        (c) => c.direction === "de-escalated",
      );

      expect(escalated).toHaveLength(2);
      expect(deEscalated).toHaveLength(1);
    });
  });

  // ── Index verification ─────────────────────────────────────────────

  describe("Model — indexes", () => {
    test("compound unique index exists on (contractId, version)", async () => {
      await RiskAnalysis.init();
      const indexes = await RiskAnalysis.listIndexes();

      const hasCompoundIndex = indexes.some(
        (idx) =>
          idx.key.contractId === 1 &&
          idx.key.version === -1 &&
          idx.unique === true,
      );

      expect(hasCompoundIndex).toBe(true);
    });

    test("index on (contractId, createdAt) exists", async () => {
      await RiskAnalysis.init();
      const indexes = await RiskAnalysis.listIndexes();

      const hasIndex = indexes.some(
        (idx) => idx.key.contractId === 1 && idx.key.createdAt === -1,
      );

      expect(hasIndex).toBe(true);
    });

    test("index on (userId, createdAt) exists", async () => {
      await RiskAnalysis.init();
      const indexes = await RiskAnalysis.listIndexes();

      const hasIndex = indexes.some(
        (idx) => idx.key.userId === 1 && idx.key.createdAt === -1,
      );

      expect(hasIndex).toBe(true);
    });
  });
});
