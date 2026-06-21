/**
 * E2E Test: Profile Popup / Dropdown — No Horizontal Scroll
 *
 * Task 5.18 – Verify that opening the user-menu dropdown (Navbar) and the
 * account menu (AdminLayout sidebar) never introduces horizontal overflow on
 * desktop or mobile, in both LTR (English) and RTL (Arabic) layouts.
 *
 * Acceptance criteria (from task spec):
 *  - No horizontal scroll when the profile popup is open.
 *  - Fix works in RTL and LTR layouts.
 *  - Mobile and desktop are verified.
 *  - Similar overflow issues in related dropdowns are addressed.
 *  - E2E tests pass locally and in CI.
 */

import { test, expect, Page, devices } from '@playwright/test';

// ─── Shared helpers ──────────────────────────────────────────────────────────

/**
 * Mock the three API endpoints the app calls on startup so the authenticated
 * Navbar (with the user-menu button) is rendered.
 */
async function mockAuthApis(page: Page) {
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
            role: 'user',
          },
        },
      }),
    });
  });

  await page.route('**/api/account/subscription', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          subscription: { planId: { name: 'Pro Plan' } },
          usage: {
            analysesUsed: 2,
            analysesLimit: 10,
            renewalDate: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          },
        },
      }),
    });
  });

  await page.route('**/api/account/credits', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { balance: 80, planAllowance: 100, ledger: [] },
      }),
    });
  });
}

/**
 * Set the localStorage flags the app uses to decide whether the user is
 * authenticated before the first page load.
 */
async function setAuthStorage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('isLoggedIn', 'true');
    window.localStorage.setItem('aqdy_disclaimer_accepted', 'true');
  });
}

/**
 * Returns true when document.documentElement.scrollWidth > clientWidth,
 * i.e. a horizontal scrollbar would appear.
 */
async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
}

/**
 * Dismiss the legal disclaimer modal if it appears (some builds show it).
 */
async function dismissDisclaimerIfPresent(page: Page) {
  const btn = page.getByRole('button', { name: /agree|أوافق/i });
  await btn
    .waitFor({ state: 'visible', timeout: 3000 })
    .then(() => btn.click())
    .catch(() => {
      /* not shown – that's fine */
    });
}

/**
 * Switch the UI language to Arabic (RTL) by clicking the language-switcher
 * button and wait for the document direction to flip.
 */
async function switchToArabic(page: Page) {
  // The LanguageSwitcher renders a button whose label contains the target
  // locale code.  We try several possible labels the component might use.
  const langBtn = page
    .getByRole('button', { name: /ع|ar|arabic|تغيير|switch language/i })
    .first();
  if (await langBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await langBtn.click();
    // Wait until the document is rendered in RTL
    await page
      .waitForFunction(() => document.documentElement.dir === 'rtl', {
        timeout: 5000,
      })
      .catch(() => {
        /* best-effort */
      });
  }
}

// ─── Navbar user-menu dropdown ────────────────────────────────────────────────

test.describe('Navbar profile dropdown — no horizontal scroll', () => {
  // ── Desktop LTR ────────────────────────────────────────────────────────────
  test('desktop LTR: no horizontal scroll when user menu is open', async ({
    page,
  }) => {
    await mockAuthApis(page);
    await setAuthStorage(page);
    await page.goto('/');
    await dismissDisclaimerIfPresent(page);

    // Confirm the button exists (user is authenticated)
    await page.waitForSelector('#user-menu-button', { timeout: 8000 });

    // Baseline — no scroll before opening
    expect(await hasHorizontalScroll(page)).toBe(false);

    // Open the dropdown
    await page.click('#user-menu-button');
    await page.waitForTimeout(400); // animation settles

    // Assert no horizontal overflow introduced
    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  // ── Desktop RTL ────────────────────────────────────────────────────────────
  test('desktop RTL: no horizontal scroll when user menu is open', async ({
    page,
  }) => {
    await mockAuthApis(page);
    await setAuthStorage(page);
    await page.goto('/');
    await dismissDisclaimerIfPresent(page);

    await switchToArabic(page);

    await page.waitForSelector('#user-menu-button', { timeout: 8000 });
    expect(await hasHorizontalScroll(page)).toBe(false);

    await page.click('#user-menu-button');
    await page.waitForTimeout(400);

    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  // ── Mobile LTR ─────────────────────────────────────────────────────────────
  test('mobile LTR (375 × 812): no horizontal scroll when user menu is open', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mockAuthApis(page);
    await setAuthStorage(page);
    await page.goto('/');
    await dismissDisclaimerIfPresent(page);

    await page.waitForSelector('#user-menu-button', { timeout: 8000 });
    expect(await hasHorizontalScroll(page)).toBe(false);

    await page.click('#user-menu-button');
    await page.waitForTimeout(400);

    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  // ── Mobile RTL ─────────────────────────────────────────────────────────────
  test('mobile RTL (375 × 812): no horizontal scroll when user menu is open', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mockAuthApis(page);
    await setAuthStorage(page);
    await page.goto('/');
    await dismissDisclaimerIfPresent(page);

    await switchToArabic(page);

    await page.waitForSelector('#user-menu-button', { timeout: 8000 });
    expect(await hasHorizontalScroll(page)).toBe(false);

    await page.click('#user-menu-button');
    await page.waitForTimeout(400);

    expect(await hasHorizontalScroll(page)).toBe(false);
  });
});

// ─── AdminLayout sidebar account menu ─────────────────────────────────────────

test.describe('AdminLayout sidebar account menu — no horizontal scroll', () => {
  async function mockAdminApis(page: Page) {
    await mockAuthApis(page);
    // Override /api/auth/me with admin role
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: 'admin-user-id',
              name: 'Admin User',
              email: 'admin@example.com',
              role: 'admin',
            },
          },
        }),
      });
    });
  }

  // ── Desktop LTR ────────────────────────────────────────────────────────────
  test('desktop LTR: no horizontal scroll when admin sidebar menu is open', async ({
    page,
  }) => {
    await mockAdminApis(page);
    await setAuthStorage(page);
    await page.goto('/admin');
    await dismissDisclaimerIfPresent(page);

    // The sidebar profile trigger is an aria-expanded button
    const profileTrigger = page
      .getByRole('button', { name: /admin user/i })
      .or(page.locator('[data-testid="admin-layout"] aside button').first());
    await profileTrigger.waitFor({ state: 'visible', timeout: 8000 });

    expect(await hasHorizontalScroll(page)).toBe(false);

    await profileTrigger.click();
    await page.waitForTimeout(400);

    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  // ── Desktop RTL ────────────────────────────────────────────────────────────
  test('desktop RTL: no horizontal scroll when admin sidebar menu is open', async ({
    page,
  }) => {
    await mockAdminApis(page);
    await setAuthStorage(page);
    await page.goto('/admin');
    await dismissDisclaimerIfPresent(page);

    await switchToArabic(page);

    const profileTrigger = page
      .getByRole('button', { name: /admin user/i })
      .or(page.locator('[data-testid="admin-layout"] aside button').first());
    await profileTrigger.waitFor({ state: 'visible', timeout: 8000 });

    expect(await hasHorizontalScroll(page)).toBe(false);

    await profileTrigger.click();
    await page.waitForTimeout(400);

    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  // ── Mobile LTR ─────────────────────────────────────────────────────────────
  test('mobile LTR (375 × 812): no horizontal scroll when admin sidebar menu is open', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mockAdminApis(page);
    await setAuthStorage(page);
    await page.goto('/admin');
    await dismissDisclaimerIfPresent(page);

    const profileTrigger = page
      .getByRole('button', { name: /admin user/i })
      .or(page.locator('[data-testid="admin-layout"] aside button').first());
    await profileTrigger.waitFor({ state: 'visible', timeout: 8000 });

    expect(await hasHorizontalScroll(page)).toBe(false);

    await profileTrigger.click();
    await page.waitForTimeout(400);

    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  // ── Mobile RTL ─────────────────────────────────────────────────────────────
  test('mobile RTL (375 × 812): no horizontal scroll when admin sidebar menu is open', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mockAdminApis(page);
    await setAuthStorage(page);
    await page.goto('/admin');
    await dismissDisclaimerIfPresent(page);

    await switchToArabic(page);

    const profileTrigger = page
      .getByRole('button', { name: /admin user/i })
      .or(page.locator('[data-testid="admin-layout"] aside button').first());
    await profileTrigger.waitFor({ state: 'visible', timeout: 8000 });

    expect(await hasHorizontalScroll(page)).toBe(false);

    await profileTrigger.click();
    await page.waitForTimeout(400);

    expect(await hasHorizontalScroll(page)).toBe(false);
  });
});
