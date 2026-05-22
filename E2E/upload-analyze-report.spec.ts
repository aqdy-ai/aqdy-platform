import { test, expect } from '@playwright/test'

test('Upload → Analyze → Report flow', async ({ page }) => {

  await page.route('**/api/analyze', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        riskScore: 42,
        summary: 'Contract contains moderate risk',
        clauses: [
          { title: 'Payment Terms', risk: 'medium' },
          { title: 'Termination', risk: 'high' }
        ]
      })
    })
  })

  await page.goto('/')

  // Confirm the page is loaded by checking for the main heading
  await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 })

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