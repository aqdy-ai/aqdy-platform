import { test, expect } from '@playwright/test';

test.describe('Contract Analysis Flow', () => {
  test('should complete the full upload to report flow', async ({ page }) => {
    // 1. Visit application
    await page.goto('/');

    // 2. Upload file
    const fileInput = page.locator('#contract-file');
    await fileInput.setInputFiles({
      name: 'test-contract.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('mock pdf content'),
    });

    // 3. Verify file is recognized
    await expect(page.getByText('test-contract.pdf')).toBeVisible();

    // 4. Trigger Analysis
    const analyzeBtn = page.getByRole('button', { name: /analyze/i });
    await expect(analyzeBtn).toBeEnabled();
    await analyzeBtn.click();

    // 5. Verify transition to Report
    await expect(page.getByText(/risk score/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Risk Score: 75%/i)).toBeVisible();
  });
});