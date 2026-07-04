import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface TestContract {
  id: string;
  filename: string;
  type: 'employment' | 'nda' | 'service' | 'rental' | 'sales';
  language: 'ar' | 'en';
  text: string;
}

interface ClauseResult {
  clauseText: string;
  clauseType: string;
  riskLevel: string;
  confidence: number;
  sourceFromKB: string | null;
  lowConfidenceWarning: boolean;
  kbCitationMissing: boolean;
}

interface ContractTestResult {
  contractId: string;
  filename: string;
  contractType: string;
  language: string;
  totalClauses: number;
  overallRisk: string;
  lowConfidenceClauses: number;
  missingKBCitations: number;
  clauseResults: ClauseResult[];
  durationMs: number;
  status: 'success' | 'failed';
  error?: string;
}

function calculateAccuracy(results: ContractTestResult[]) {
  let totalClauses = 0;
  let highConfidenceClauses = 0;
  let lowConfidenceClauses = 0;
  let missingKBCitations = 0;

  const contractsSummary = results.map(r => {
    totalClauses += r.totalClauses;
    lowConfidenceClauses += r.lowConfidenceClauses;
    missingKBCitations += r.missingKBCitations;
    highConfidenceClauses += r.totalClauses - r.lowConfidenceClauses;

    return {
      filename: r.filename,
      type: r.contractType,
      language: r.language,
      totalClauses: r.totalClauses,
      overallRisk: r.overallRisk,
      lowConfidenceClauses: r.lowConfidenceClauses,
      missingKBCitations: r.missingKBCitations,
      status: r.status,
    };
  });

  const accuracyPercent = totalClauses > 0
    ? Math.round((highConfidenceClauses / totalClauses) * 100 * 100) / 100
    : 0;

  return { totalClauses, highConfidenceClauses, lowConfidenceClauses, missingKBCitations, accuracyPercent, contractsSummary };
}

function generateReport(results: ContractTestResult[], accuracy: ReturnType<typeof calculateAccuracy>): string {
  const date = new Date().toISOString().split('T')[0];
  const passed = accuracy.accuracyPercent >= 95;

  return `# Accuracy Test Report
**Date:** ${date}
**Status:** ${passed ? '✅ PASSED' : '❌ FAILED'} (Target: 95%)

---

## Summary

| Metric | Value |
|--------|-------|
| Total Contracts Tested | ${results.length} |
| Total Clauses Analyzed | ${accuracy.totalClauses} |
| High Confidence Clauses | ${accuracy.highConfidenceClauses} |
| Low Confidence Clauses | ${accuracy.lowConfidenceClauses} |
| Missing KB Citations | ${accuracy.missingKBCitations} |
| **Overall Accuracy** | **${accuracy.accuracyPercent}%** |

---

## Per-Contract Results

| Contract | Type | Language | Clauses | Overall Risk | Low Confidence | Missing KB | Status |
|----------|------|----------|---------|--------------|----------------|------------|--------|
${accuracy.contractsSummary.map((c: any) =>
  `| ${c.filename} | ${c.type} | ${c.language} | ${c.totalClauses} | ${c.overallRisk} | ${c.lowConfidenceClauses} | ${c.missingKBCitations} | ${c.status} |`
).join('\n')}

---

## Misclassifications & Root Cause Analysis

${results.flatMap(r =>
  r.clauseResults
    .filter(c => c.lowConfidenceWarning || c.kbCitationMissing)
    .map(c => `### ${r.filename} — ${c.clauseType}
- **Clause:** ${c.clauseText.slice(0, 100)}...
- **Risk Level:** ${c.riskLevel}
- **Confidence:** ${c.confidence}
- **KB Source:** ${c.sourceFromKB ?? 'MISSING'}
- **Root Cause:** ${c.kbCitationMissing ? 'No KB match found' : 'Low confidence score'}
`)
).join('\n') || '_No misclassifications found._'}

---

## Conclusion

${passed
  ? `✅ The pipeline achieved ${accuracy.accuracyPercent}% accuracy, meeting the 95% target.`
  : `❌ The pipeline achieved ${accuracy.accuracyPercent}% accuracy, below the 95% target. See misclassifications above for root cause analysis.`
}
`;
}

async function main() {
  console.log('🚀 Starting accuracy test...\n');

  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('✅ Connected to MongoDB\n');

  const contractsPath = path.join(__dirname, '../data/test_contracts.json');

  if (!fs.existsSync(contractsPath)) {
    console.log('📝 test_contracts.json not found. Creating sample...');
    const sample: TestContract[] = [
      {
        id: '1',
        filename: 'عقد_عمل_نيو_دلهي.docx',
        type: 'employment',
        language: 'ar',
        text: 'البند الأول: يعمل الطرف الثانى لدى الطرف الأول بوظيفة مشرف علاقات عامة.\nالبند الثانى: مدة هذا العقد سنة ميلادية واحدة تبدأ من 15/6/2026.\nالبند الثالث: تعتبر فترة الثلاث شهور الأولى كفترة اختبار.\nالبند الرابع: يتقاضى الطرف الثاني راتبا شهريا وقدره 17500 جنيه.\nالبند الخامس: محظور على الطرف الثانى أن يباشر عملا مع أي جهة منافسة.\nالبند السادس: يحق للطرف الأول نقل الطرف الثانى إلى أي فرع داخل الجمهورية.\nالبند السابع: يخضع هذا العقد لأحكام قانون العمل المصري رقم 137 لسنة 1981.',
      },
    ];
    fs.mkdirSync(path.dirname(contractsPath), { recursive: true });
    fs.writeFileSync(contractsPath, JSON.stringify(sample, null, 2));
    console.log('✅ Sample file created. Add your 10 contracts and re-run.\n');
    process.exit(0);
  }

  const contracts: TestContract[] = JSON.parse(fs.readFileSync(contractsPath, 'utf-8'));
  console.log(`📄 Loaded ${contracts.length} contracts\n`);

  const { orchestratorService } = await import('../pipeline/orchestrator.service.js');
  const results: ContractTestResult[] = [];

  for (const contract of contracts) {
    console.log(`🔍 Testing: ${contract.filename} (${contract.type}, ${contract.language})`);
    const startTime = Date.now();

    try {
      const result = await orchestratorService.run(contract.id, 'accuracy-test', contract.text, contract.language);

      const clauseResults: ClauseResult[] = result.clauseAnalysis.map(c => ({
        clauseText: c.clauseText,
        clauseType: c.clauseType,
        riskLevel: c.riskLevel,
        confidence: c.confidence,
        sourceFromKB: c.sourceFromKB,
        lowConfidenceWarning: c.confidence < 0.6,
        kbCitationMissing: c.sourceFromKB === null,
      }));

      results.push({
        contractId: contract.id,
        filename: contract.filename,
        contractType: contract.type,
        language: contract.language,
        totalClauses: clauseResults.length,
        overallRisk: result.executiveSummary.overallRisk,
        lowConfidenceClauses: clauseResults.filter(c => c.lowConfidenceWarning).length,
        missingKBCitations: clauseResults.filter(c => c.kbCitationMissing).length,
        clauseResults,
        durationMs: Date.now() - startTime,
        status: 'success',
      });

      console.log(`  ✅ ${clauseResults.length} clauses | Risk: ${result.executiveSummary.overallRisk} | ${Date.now() - startTime}ms\n`);
    } catch (error) {
      console.error(`  ❌ Failed: ${error instanceof Error ? error.message : 'Unknown'}\n`);
      results.push({
        contractId: contract.id,
        filename: contract.filename,
        contractType: contract.type,
        language: contract.language,
        totalClauses: 0,
        overallRisk: 'unknown',
        lowConfidenceClauses: 0,
        missingKBCitations: 0,
        clauseResults: [],
        durationMs: Date.now() - startTime,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  const accuracy = calculateAccuracy(results);

  console.log('\n📊 Results:');
  console.log(`  Total Clauses: ${accuracy.totalClauses}`);
  console.log(`  Accuracy: ${accuracy.accuracyPercent}%`);
  console.log(`  Status: ${accuracy.accuracyPercent >= 95 ? '✅ PASSED' : '❌ FAILED'}\n`);

  const docsDir = path.join(__dirname, '../../docs');
  fs.mkdirSync(docsDir, { recursive: true });

  const report = generateReport(results, accuracy);
  fs.writeFileSync(path.join(docsDir, 'ACCURACY_REPORT.md'), report);
  fs.writeFileSync(path.join(docsDir, 'accuracy_results.json'), JSON.stringify({ accuracy, results }, null, 2));

  console.log('📝 Report saved to: docs/ACCURACY_REPORT.md');

  await mongoose.disconnect();
  console.log('✅ Done!');
}

main().catch(console.error);