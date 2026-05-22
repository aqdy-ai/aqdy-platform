import { describe, test, expect, jest } from '@jest/globals';
import { RAGService } from '../../src/services/rag.service.js';

describe('RAGService - MMR Reranking', () => {
  const ragService = new RAGService();

  const mockMatches = [
    {
      id: 'clause_001',
      score: 0.95,
      category: 'liability',
      riskLevel: 'critical' as const,
      clausePattern: 'Unlimited liability clause',
      explanation: { ar: 'شرط مسؤولية غير محدودة', en: 'Unlimited liability' },
      whyRisky: { ar: 'خطير جداً', en: 'Very risky' },
      saferAlternative: { ar: 'حدد المسؤولية', en: 'Cap the liability' },
      relatedLaw: 'Article 123',
    },
    {
      id: 'clause_002',
      score: 0.85,
      category: 'liability',
      riskLevel: 'high' as const,
      clausePattern: 'Broad liability clause',
      explanation: { ar: 'شرط مسؤولية واسع', en: 'Broad liability' },
      whyRisky: { ar: 'خطير', en: 'Risky' },
      saferAlternative: { ar: 'ضيّق النطاق', en: 'Narrow the scope' },
      relatedLaw: 'Article 124',
    },
    {
      id: 'clause_003',
      score: 0.75,
      category: 'confidentiality',
      riskLevel: 'medium' as const,
      clausePattern: 'Confidentiality clause',
      explanation: { ar: 'شرط سرية', en: 'Confidentiality' },
      whyRisky: { ar: 'متوسط الخطورة', en: 'Medium risk' },
      saferAlternative: { ar: 'أضف استثناءات', en: 'Add exceptions' },
      relatedLaw: 'Article 125',
    },
  ];

  test('should return single match without MMR', () => {
    const result = ragService.applyMMR([mockMatches[0]]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('clause_001');
  });

  test('should apply MMR and return diverse results', () => {
    const result = ragService.applyMMR(mockMatches);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result[0].id).toBe('clause_001');
  });

  test('should prefer diverse categories over similar ones', () => {
    const result = ragService.applyMMR(mockMatches);
    const categories = result.map(m => m.category);
    const uniqueCategories = new Set(categories);
    expect(uniqueCategories.size).toBeGreaterThan(1);
  });

  test('should return empty array for empty input', () => {
    const result = ragService.applyMMR([]);
    expect(result).toHaveLength(0);
  });
});

describe('RAGService - Confidence Scoring', () => {
  const ragService = new RAGService();

  const createMatch = (score: number) => ({
    id: 'test',
    score,
    category: 'liability',
    riskLevel: 'high' as const,
    clausePattern: 'test',
    explanation: { ar: 'test', en: 'test' },
    whyRisky: { ar: 'test', en: 'test' },
    saferAlternative: { ar: 'test', en: 'test' },
  });

  test('should return 0 for empty matches', () => {
    expect(ragService.calculateConfidence([])).toBe(0);
  });

  test('should return 0.95 for score >= 0.9', () => {
    expect(ragService.calculateConfidence([createMatch(0.95)])).toBe(0.95);
  });

  test('should return 0.85 for score >= 0.8', () => {
    expect(ragService.calculateConfidence([createMatch(0.82)])).toBe(0.85);
  });

  test('should return 0.75 for score >= 0.7', () => {
    expect(ragService.calculateConfidence([createMatch(0.72)])).toBe(0.75);
  });

  test('should return 0.60 for score >= 0.6', () => {
    expect(ragService.calculateConfidence([createMatch(0.62)])).toBe(0.60);
  });

  test('should return 0.40 for score < 0.6', () => {
    expect(ragService.calculateConfidence([createMatch(0.55)])).toBe(0.40);
  });
});

describe('RAGService - searchKB (mocked)', () => {
  test('should return no match when semantic search returns empty', async () => {
    const ragService = new RAGService();
    jest.spyOn(ragService, 'semanticSearch').mockResolvedValue([]);

    const result = await ragService.searchKB('some clause text');

    expect(result.hasMatch).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.matches).toHaveLength(0);
  });

  test('should return match with high confidence for good results', async () => {
    const ragService = new RAGService();
    jest.spyOn(ragService, 'semanticSearch').mockResolvedValue([
      {
        id: 'clause_001',
        score: 0.95,
        category: 'liability',
        riskLevel: 'critical',
        clausePattern: 'Unlimited liability',
        explanation: { ar: 'خطير', en: 'Risky' },
        whyRisky: { ar: 'خطير جداً', en: 'Very risky' },
        saferAlternative: { ar: 'حدد', en: 'Cap it' },
      },
    ]);

    const result = await ragService.searchKB('unlimited liability clause');

    expect(result.hasMatch).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    expect(result.matches.length).toBeGreaterThan(0);
  });
});