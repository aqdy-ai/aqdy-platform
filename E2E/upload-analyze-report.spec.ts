import { test, expect } from '@playwright/test'

test('Upload → Analyze → Report flow', async ({ page }) => {

  // 1. Mock the initial Analyze request (Backend returns 202 Accepted)
  await page.route('**/api/analysis/analyze', async route => {
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { contractId: 'test-123', status: 'processing' },
        message: 'Analysis started'
      })
    })
  })

  // 2. Mock the Polling request (Backend returns 200 with results)
  // This simulates the frontend fetching the results after the 202
  await page.route('**/api/analysis/test-123', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          executiveSummary: {
            overallRisk: 'high',
            totalClauses: 2,
            riskyClausesCount: 2,
            summary: { en: 'Contract contains moderate risk', ar: 'مخاطرة متوسطة' }
          },
          clauseAnalysis: [
            { clauseType: 'Payment Terms', riskLevel: 'medium', clauseText: '...' },
            { clauseType: 'Termination', riskLevel: 'high', clauseText: '...' }
          ]
        }
      })
    })
  })

  // Ensure clean state (Clear all persistence including cookies to force the Upload state)
  await page.context().clearCookies();
  await page.addInitScript('window.localStorage.clear(); window.sessionStorage.clear();');
  await page.goto('/')

  // Handle Legal Disclaimer modal: Use a more resilient approach
  const disclaimer = page.getByRole('button', { name: /أوافق وأفهم ذلك|agree/i });
  await disclaimer.waitFor({ state: 'visible', timeout: 5000 }).then(() => disclaimer.click()).catch(() => {});

  // Confirm we are on the Upload page (this prevents testing logic on the wrong view)
  await expect(page.getByRole('heading', { name: /ارفع|upload/i })).toBeVisible({ timeout: 10000 })

  // Using a resilient selector: locate the input by its functional type
  const fileInput = page.locator('input[type="file"]').first()
  await expect(fileInput).toBeAttached({ timeout: 15000 })

  await fileInput.setInputFiles({
    name: 'sample-contract.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('mock contract for testing')
  })

  const analyzeBtn = page.getByRole('button', { name: /analyze/i })
  await analyzeBtn.click()

  await expect(page.getByText(/risk score/i)).toBeVisible({ timeout: 15000 })

  await expect(page.getByText('42')).toBeVisible()
  await expect(page.getByText('Payment Terms')).toBeVisible()
  await expect(page.getByText('Termination')).toBeVisible()

})