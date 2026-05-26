import { test, expect } from '@playwright/test'

test('Upload → Analyze → Report flow', async ({ page }) => {

  // ضمان مطابقة مسار الـ API الموحد في المشروع
  await page.route('**/api/contracts/analysis*', async route => {
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

  // Ensure clean state (Clear all persistence to force the application into the Upload state)
  await page.addInitScript('window.localStorage.clear(); window.sessionStorage.clear();')
  await page.goto('/')

  // Handle Legal Disclaimer modal: Use auto-waiting click instead of isVisible()
  // We use .catch() because if storage was cleared, the modal might not always appear.
  await page.getByRole('button', { name: /أوافق وأفهم ذلك|agree/i })
    .click({ timeout: 5000 })
    .catch(() => { /* Optional: modal didn't appear */ });

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