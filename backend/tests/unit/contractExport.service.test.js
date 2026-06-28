import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import mongoose from "mongoose";
const validUserId = new mongoose.Types.ObjectId().toString();
const validContractId = new mongoose.Types.ObjectId().toString();
const validAnalysisId = new mongoose.Types.ObjectId().toString();
const mockContractFind = jest.fn();
const mockAnalysisFind = jest.fn();
jest.unstable_mockModule("../../src/models/contract.model.js", () => ({
    Contract: { find: mockContractFind },
}));
jest.unstable_mockModule("../../src/models/riskAnalysis.model.js", () => ({
    RiskAnalysis: { find: mockAnalysisFind },
}));
const { ContractExportService } = await import("../../src/services/contractExport.service.js");
const mockContracts = [
    {
        _id: validContractId,
        filename: "employment_contract.pdf",
        uploadedAt: new Date("2026-01-15"),
        language: "en",
        fileSize: 2048,
        userId: validUserId,
    },
];
const mockAnalyses = [
    {
        _id: validAnalysisId,
        contractId: validContractId,
        createdAt: new Date("2026-01-16"),
        executiveSummary: {
            overallRisk: "high",
            totalClauses: 10,
            riskyClausesCount: 4,
        },
        clauseAnalysis: [
            { riskLevel: "critical", clauseText: "Unlimited liability" },
            { riskLevel: "high", clauseText: "Non-compete 5 years" },
            { riskLevel: "high", clauseText: "Broad IP assignment" },
            { riskLevel: "medium", clauseText: "Auto-renewal clause" },
            { riskLevel: "low", clauseText: "Standard payment terms" },
        ],
    },
];
describe("ContractExportService - getExportData", () => {
    let service;
    beforeEach(() => {
        service = new ContractExportService();
        jest.clearAllMocks();
        mockContractFind.mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockContracts),
        });
        mockAnalysisFind.mockReturnValue({
            sort: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockAnalyses),
            }),
        });
    });
    test("should return export rows for user contracts", async () => {
        const rows = await service.getExportData(validUserId);
        expect(rows).toHaveLength(1);
        expect(rows[0].filename).toBe("employment_contract.pdf");
        expect(rows[0].overallRisk).toBe("high");
    });
    test("should count clauses by risk level correctly", async () => {
        const rows = await service.getExportData(validUserId);
        expect(rows[0].criticalClauses).toBe(1);
        expect(rows[0].highClauses).toBe(2);
        expect(rows[0].mediumClauses).toBe(1);
        expect(rows[0].lowClauses).toBe(1);
    });
    test("should return pending status for contracts without analysis", async () => {
        mockAnalysisFind.mockReturnValue({
            sort: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([]),
            }),
        });
        const rows = await service.getExportData(validUserId);
        expect(rows[0].overallRisk).toBe("pending");
        expect(rows[0].analysisId).toBe("");
    });
    test("should only include non-deleted contracts", async () => {
        await service.getExportData(validUserId);
        expect(mockContractFind).toHaveBeenCalledWith(expect.objectContaining({ userId: validUserId, deletedAt: null }));
    });
});
describe("ContractExportService - generateCSV", () => {
    let service;
    beforeEach(() => {
        service = new ContractExportService();
    });
    test("should generate valid CSV with headers", () => {
        const rows = [
            {
                filename: "test.pdf",
                uploadDate: "2026-01-15T00:00:00.000Z",
                analysisDate: "2026-01-16T00:00:00.000Z",
                overallRisk: "high",
                criticalClauses: 1,
                highClauses: 2,
                mediumClauses: 1,
                lowClauses: 1,
                analysisId: validAnalysisId,
            },
        ];
        const result = service.generateCSV(rows);
        expect(result.contentType).toBe("text/csv");
        expect(result.filename).toContain(".csv");
        expect(result.data).toContain("Filename");
        expect(result.data).toContain("Overall Risk");
        expect(result.data).toContain("test.pdf");
        expect(result.data).toContain("high");
    });
    test("should include all required columns", () => {
        const rows = [
            {
                filename: "contract.pdf",
                uploadDate: "2026-01-15T00:00:00.000Z",
                analysisDate: "2026-01-16T00:00:00.000Z",
                overallRisk: "medium",
                criticalClauses: 0,
                highClauses: 1,
                mediumClauses: 2,
                lowClauses: 3,
                analysisId: validAnalysisId,
            },
        ];
        const result = service.generateCSV(rows);
        const headers = result.data.split("\n")[0];
        expect(headers).toContain("Filename");
        expect(headers).toContain("Upload Date");
        expect(headers).toContain("Analysis Date");
        expect(headers).toContain("Overall Risk");
        expect(headers).toContain("Critical Clauses");
        expect(headers).toContain("High Clauses");
        expect(headers).toContain("Medium Clauses");
        expect(headers).toContain("Low Clauses");
        expect(headers).toContain("Analysis ID");
    });
    test("should handle filename with special characters", () => {
        const rows = [
            {
                filename: 'contract "special".pdf',
                uploadDate: "2026-01-15T00:00:00.000Z",
                analysisDate: "",
                overallRisk: "low",
                criticalClauses: 0,
                highClauses: 0,
                mediumClauses: 0,
                lowClauses: 1,
                analysisId: "",
            },
        ];
        const result = service.generateCSV(rows);
        expect(result.data).toContain('""special""');
    });
    test("should return empty CSV with only headers for no contracts", () => {
        const result = service.generateCSV([]);
        const lines = result.data.split("\n");
        expect(lines).toHaveLength(1);
        expect(lines[0]).toContain("Filename");
    });
});
describe("ContractExportService - generateJSON", () => {
    let service;
    beforeEach(() => {
        service = new ContractExportService();
        jest.clearAllMocks();
        mockContractFind.mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockContracts),
        });
        mockAnalysisFind.mockReturnValue({
            sort: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockAnalyses),
            }),
        });
    });
    test("should generate valid JSON export", async () => {
        const result = await service.generateJSON(validUserId);
        expect(result.contentType).toBe("application/json");
        expect(result.filename).toContain(".json");
        const parsed = JSON.parse(result.data);
        expect(parsed).toHaveProperty("exportedAt");
        expect(parsed).toHaveProperty("contracts");
        expect(Array.isArray(parsed.contracts)).toBe(true);
    });
    test("should include full clause-level data in JSON", async () => {
        const result = await service.generateJSON(validUserId);
        const parsed = JSON.parse(result.data);
        const contract = parsed.contracts[0];
        expect(contract).toHaveProperty("filename");
        expect(contract).toHaveProperty("analysis");
        expect(contract.analysis).toHaveProperty("clauseAnalysis");
        expect(contract.analysis.clauseAnalysis).toHaveLength(5);
    });
    test("should include exportedAt timestamp", async () => {
        const result = await service.generateJSON(validUserId);
        const parsed = JSON.parse(result.data);
        expect(parsed.exportedAt).toBeDefined();
        expect(new Date(parsed.exportedAt)).toBeInstanceOf(Date);
    });
    test("should return null analysis for contracts without analysis", async () => {
        mockAnalysisFind.mockReturnValue({
            sort: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([]),
            }),
        });
        const result = await service.generateJSON(validUserId);
        const parsed = JSON.parse(result.data);
        expect(parsed.contracts[0].analysis).toBeNull();
    });
});
//# sourceMappingURL=contractExport.service.test.js.map