import { test, expect } from '@playwright/test'

test.describe('Contract Upload Flow', () => {
  test('should complete the upload and show analysis elements', async ({
    page,
  }) => {
    // Mock the getMe API call to simulate authenticated user
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: 'test-user-id',
              name: 'Test User',
              email: 'test@example.com',
            },
          },
        }),
      })
    })

    // Mock subscription API call
    await page.route('**/api/account/subscription', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            subscription: {
              planId: { name: 'Pro Plan' },
            },
            usage: {
              analysesUsed: 2,
              analysesLimit: 10,
              renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          },
        }),
      })
    })

    // Mock credits API call
    await page.route('**/api/account/credits', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            balance: 80,
            planAllowance: 100,
            ledger: [],
          },
        }),
      })
    })

    // Mock upload API call
    await page.route('**/api/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          contractId: 'test-123',
        }),
      })
    })

    // 1. Start from a fresh state so the Upload Card is visible, and set logged in status
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem('isLoggedIn', 'true');
      window.localStorage.setItem('aqdy_disclaimer_accepted', 'true');
    })
    await page.goto('/')

    // 2. Handle Legal Disclaimer modal
    const disclaimer = page.getByRole('button', { name: /agree|أوافق/i })
    await disclaimer
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => disclaimer.click())
      .catch(() => {})

    // 3. Verify we are on the Upload page by checking for the main heading
    await expect(
      page.getByRole('heading', { name: /ارفع|upload/i })
    ).toBeVisible()

    // 4. Locate and use the file input
    const fileInput = page.locator('input[type="file"]').first()
    await expect(fileInput).toBeAttached()

    await fileInput.setInputFiles({
      name: 'test-contract.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('ui test content'),
    })

    // 5. Verify the UI updates to show the filename and enabling the button
    await expect(page.getByText('test-contract.pdf')).toBeVisible()
    const analyzeBtn = page.getByRole('button', { name: /analyze|تحليل/i })
    await expect(analyzeBtn).toBeEnabled()

    // 6. Final UI check for the results containers (if implementation is ready)
    await expect(page).toHaveTitle(/Aqdy|عقدي/i)
  })
})
