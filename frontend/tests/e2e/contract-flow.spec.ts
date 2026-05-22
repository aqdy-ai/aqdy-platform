import { test, expect } from '@playwright/test'

test.describe('Contract Upload UI', () => {
  test('should display all upload UI elements correctly', async ({ page }) => {
    await page.goto('/')

    // 1. Wait for a heading to appear. This confirms the component has mounted.
    // We check for any heading role since the actual text is localized (i18n).
    const heading = page.getByRole('heading')
    await expect(heading.first()).toBeVisible({ timeout: 15000 })

    // 2. Locate the file input.
    // If it's a hidden native input (common in custom UI), use .first()
    const fileInput = page.locator('input[type="file"]').first()
    await expect(fileInput).toBeAttached({ timeout: 15000 })

    // Check for the presence of file format info more flexibly
    await expect(page.getByText(/PDF/i)).toBeVisible()
    await expect(page.getByText(/DOCX/i)).toBeVisible()

    // Perform a UI interaction (upload)
    await fileInput.setInputFiles({
      name: 'test-contract.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('ui test content'),
    })

    // Verify the UI updates to show the filename
    await expect(page.getByText('test-contract.pdf')).toBeVisible()
    await expect(page.getByRole('button', { name: /analyze/i })).toBeEnabled()
  })
})
