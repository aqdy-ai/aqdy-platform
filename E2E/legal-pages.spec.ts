/**
 * E2E Tests: Legal Pages & Documentation Navigation
 *
 * Covers:
 *  - /privacy and /terms public accessibility (no redirect for unauthenticated users)
 *  - Correct heading content on legal pages
 *  - Legal links on Login page (target="_blank", rel="noopener noreferrer")
 *  - Legal links on Register page (target="_blank", rel="noopener noreferrer")
 *  - Navbar "How it works" link (correct docs URL, target="_blank", rel="noopener noreferrer")
 */

import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DOCS_URL =
  'https://github.com/aqdy-ai/aqdy-platform/blob/main/docs/README.md'

// ---------------------------------------------------------------------------
// Group 1: /privacy page — public access
// ---------------------------------------------------------------------------
test.describe('/privacy page', () => {
  test('is accessible without authentication', async ({ page }) => {
    const response = await page.goto('/privacy')
    // Should not redirect to login (not a 3xx pointing to /login)
    expect(response?.status()).not.toBe(401)
    expect(response?.status()).not.toBe(403)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('does not redirect unauthenticated users to /login', async ({ page }) => {
    await page.goto('/privacy')
    // Give any client-side redirect a moment to fire
    await page.waitForTimeout(500)
    await expect(page).toHaveURL(/\/privacy/)
  })

  test('renders the Privacy Policy heading', async ({ page }) => {
    await page.goto('/privacy')
    // h1 with id="privacy-policy-heading" should be visible
    const heading = page.locator('#privacy-policy-heading')
    await expect(heading).toBeVisible()
    // Should contain "Privacy" regardless of language
    const text = await heading.textContent()
    expect(text?.toLowerCase()).toMatch(/privacy|خصوصية/)
  })

  test('has correct page title', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page).toHaveTitle(/Privacy|خصوصية/)
  })
})

// ---------------------------------------------------------------------------
// Group 2: /terms page — public access
// ---------------------------------------------------------------------------
test.describe('/terms page', () => {
  test('is accessible without authentication', async ({ page }) => {
    const response = await page.goto('/terms')
    expect(response?.status()).not.toBe(401)
    expect(response?.status()).not.toBe(403)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('does not redirect unauthenticated users to /login', async ({ page }) => {
    await page.goto('/terms')
    await page.waitForTimeout(500)
    await expect(page).toHaveURL(/\/terms/)
  })

  test('renders the Terms of Service heading', async ({ page }) => {
    await page.goto('/terms')
    const heading = page.locator('#terms-heading')
    await expect(heading).toBeVisible()
    const text = await heading.textContent()
    expect(text?.toLowerCase()).toMatch(/terms|شروط/)
  })

  test('has correct page title', async ({ page }) => {
    await page.goto('/terms')
    await expect(page).toHaveTitle(/Terms|شروط/)
  })
})

// ---------------------------------------------------------------------------
// Group 3: Login page — legal links
// ---------------------------------------------------------------------------
test.describe('Login page — legal links', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('has a Terms of Service link', async ({ page }) => {
    const link = page.locator('#login-terms-link')
    await expect(link).toBeVisible()
  })

  test('Terms of Service link has correct href (/terms)', async ({ page }) => {
    const link = page.locator('#login-terms-link')
    await expect(link).toHaveAttribute('href', '/terms')
  })

  test('Terms of Service link opens in a new tab (target="_blank")', async ({ page }) => {
    const link = page.locator('#login-terms-link')
    await expect(link).toHaveAttribute('target', '_blank')
  })

  test('Terms of Service link has rel="noopener noreferrer"', async ({ page }) => {
    const link = page.locator('#login-terms-link')
    const rel = await link.getAttribute('rel')
    expect(rel).toContain('noopener')
    expect(rel).toContain('noreferrer')
  })

  test('has a Privacy Policy link', async ({ page }) => {
    const link = page.locator('#login-privacy-link')
    await expect(link).toBeVisible()
  })

  test('Privacy Policy link has correct href (/privacy)', async ({ page }) => {
    const link = page.locator('#login-privacy-link')
    await expect(link).toHaveAttribute('href', '/privacy')
  })

  test('Privacy Policy link opens in a new tab (target="_blank")', async ({ page }) => {
    const link = page.locator('#login-privacy-link')
    await expect(link).toHaveAttribute('target', '_blank')
  })

  test('Privacy Policy link has rel="noopener noreferrer"', async ({ page }) => {
    const link = page.locator('#login-privacy-link')
    const rel = await link.getAttribute('rel')
    expect(rel).toContain('noopener')
    expect(rel).toContain('noreferrer')
  })
})

// ---------------------------------------------------------------------------
// Group 4: Register page — legal links
// ---------------------------------------------------------------------------
test.describe('Register page — legal links', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('has a Terms of Service link', async ({ page }) => {
    const link = page.locator('#register-terms-link')
    await expect(link).toBeVisible()
  })

  test('Terms of Service link has correct href (/terms)', async ({ page }) => {
    const link = page.locator('#register-terms-link')
    await expect(link).toHaveAttribute('href', '/terms')
  })

  test('Terms of Service link opens in a new tab (target="_blank")', async ({ page }) => {
    const link = page.locator('#register-terms-link')
    await expect(link).toHaveAttribute('target', '_blank')
  })

  test('Terms of Service link has rel="noopener noreferrer"', async ({ page }) => {
    const link = page.locator('#register-terms-link')
    const rel = await link.getAttribute('rel')
    expect(rel).toContain('noopener')
    expect(rel).toContain('noreferrer')
  })

  test('has a Privacy Policy link', async ({ page }) => {
    const link = page.locator('#register-privacy-link')
    await expect(link).toBeVisible()
  })

  test('Privacy Policy link has correct href (/privacy)', async ({ page }) => {
    const link = page.locator('#register-privacy-link')
    await expect(link).toHaveAttribute('href', '/privacy')
  })

  test('Privacy Policy link opens in a new tab (target="_blank")', async ({ page }) => {
    const link = page.locator('#register-privacy-link')
    await expect(link).toHaveAttribute('target', '_blank')
  })

  test('Privacy Policy link has rel="noopener noreferrer"', async ({ page }) => {
    const link = page.locator('#register-privacy-link')
    const rel = await link.getAttribute('rel')
    expect(rel).toContain('noopener')
    expect(rel).toContain('noreferrer')
  })
})

// ---------------------------------------------------------------------------
// Group 5: Navbar — "How it works" docs link
// ---------------------------------------------------------------------------
test.describe('Navbar — "How it works" documentation link', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('link is visible in the navbar', async ({ page }) => {
    const link = page.locator('#nav-how-it-works-link')
    await expect(link).toBeVisible()
  })

  test('link points to the correct docs URL', async ({ page }) => {
    const link = page.locator('#nav-how-it-works-link')
    await expect(link).toHaveAttribute('href', DOCS_URL)
  })

  test('link opens in a new tab (target="_blank")', async ({ page }) => {
    const link = page.locator('#nav-how-it-works-link')
    await expect(link).toHaveAttribute('target', '_blank')
  })

  test('link has rel="noopener noreferrer"', async ({ page }) => {
    const link = page.locator('#nav-how-it-works-link')
    const rel = await link.getAttribute('rel')
    expect(rel).toContain('noopener')
    expect(rel).toContain('noreferrer')
  })
})
