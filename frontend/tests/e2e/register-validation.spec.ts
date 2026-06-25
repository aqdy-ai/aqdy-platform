import { test, expect } from '@playwright/test'

test.describe('Registration Password Validation', () => {
  test('should show real-time feedback and enable submit when password becomes valid', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('disclaimerAccepted', 'true')
    })

    await page.goto('/register')

    const passwordInput = page.locator('input[name="password"]')
    const submitButton = page.getByTestId('register-submit')

    await expect(submitButton).toBeDisabled()

    await passwordInput.fill('weak')

    await expect(page.getByTestId('password-rule-minLength')).toBeVisible()

    await expect(page.getByTestId('password-rule-uppercase')).toBeVisible()

    await expect(page.getByTestId('password-rule-number')).toBeVisible()

    await expect(submitButton).toBeDisabled()

    await page.locator('input[name="name"]').fill('John Doe')
    await page.locator('input[name="email"]').fill('john@example.com')

    await passwordInput.fill('StrongP@ss123')

    await page.locator('input[name="confirmPassword"]').fill('StrongP@ss123')

    await expect(submitButton).toBeEnabled()
  })
})
