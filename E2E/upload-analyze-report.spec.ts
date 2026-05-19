import { test, expect } from '@playwright/test'
import path from 'path'

test('Upload → Analyze → Report flow', async ({ page }) => {

  await page.route('**/api/analyze', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        riskScore: 42,
        clauses: [
          { title: 'Payment Terms', risk: 'medium' },
          { title: 'Termination', risk: 'high' }
        ]
      })
    })
  })

  await page.goto('/')

  // 👇 stable check
  await expect(page.locator('body')).toBeVisible()

  // Verify the file input is present using the ID from the component
  const fileInput = page.locator('#contract-file');
  await expect(fileInput).toBeVisible();

  // Fix ENOENT by using a Buffer instead of a physical file path
  await fileInput.setInputFiles({
    name: 'sample-contract.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('this is mock contract content for E2E testing'),
  })

  // The developer used the translation key 'analyze_now'
  // Playwright matches the visible text or the name property
  const analyzeBtn = page.getByRole('button', { name: /analyze/i });
  await analyzeBtn.click();

  // These assertions will fail/timeout until the developers implement 
  // the results UI in ContractUpload.tsx
  await expect(page.getByText(/risk score/i)).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(/clauses/i)).toBeVisible({ timeout: 5000 });
})