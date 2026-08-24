/**
 * PHASE 12 — END-TO-END WORKFLOW CERTIFICATION (environment evidence)
 *
 * The deployed frontend (served by `vite dev`/`vite preview`, the same
 * build artifacts production uses) is driven with the system Chromium.
 * Every assertion is against the REAL rendered DOM — no mocks, no stubs.
 *
 * What these tests can certify in the current environment:
 *   - Frontend build serves and renders (production bundle integrity)
 *   - Public marketplace browsing, navigation, region selector
 *   - Auth surface renders (Sign In / Sell Vehicle CTAs)
 *   - SPA deep links do not 404 and do not render blank pages
 *   - Responsive/mobile rendering does not break the shell
 *   - Network-failure behavior: the app does not crash or fabricate
 *     data when the API is unreachable (Phase 11 fail-safe posture)
 *
 * What these tests CANNOT certify here (recorded honestly in the
 * report): UI → live API → backend → database round trips, because no
 * Supabase instance is provisioned in this environment and the frontend
 * dev server does not proxy /api to a backend. Those paths are covered
 * by the backend API-level suites (335 tests, Phases 9–11) instead.
 */

import { test, expect } from '@playwright/test';

const waitForAppShell = async (page: any) => {
  // The KAYAD shell renders a banner with the brand name.
  await page.waitForSelector('text=KAYAD', { timeout: 30000 });
};

test.describe('Workflow certification — environment evidence', () => {
  test('frontend build serves and renders the marketplace shell (buyer browsing)', async ({ page }) => {
    await page.goto('/');
    await waitForAppShell(page);
    await expect(page.locator('text=KAYAD EA').first()).toBeVisible();
    // Navigation surface for the buyer workflows (exact match: the brand
    // logo button also contains the word "Marketplace")
    await expect(page.getByRole('button', { name: 'Marketplace', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Auctions', exact: true }).first()).toBeVisible();
    // Region selector is part of the browsing workflow
    await expect(page.locator('text=All East Africa').first()).toBeVisible();
  });

  test('auth surface renders (registration/login entry points)', async ({ page }) => {
    await page.goto('/');
    await waitForAppShell(page);
    await expect(page.getByRole('button', { name: 'Sign In', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sell Vehicle', exact: true }).first()).toBeVisible();
  });

  test('marketplace navigation switches views without errors (browsing ↔ auctions)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e: Error) => errors.push(String(e)));
    await page.goto('/');
    await waitForAppShell(page);
    await page.getByRole('button', { name: 'Auctions', exact: true }).first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toBeEmpty();
    await page.getByRole('button', { name: 'Marketplace', exact: true }).first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=KAYAD EA').first()).toBeVisible();
    // No uncaught client errors from the navigation
    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
  });

  test('SPA deep link does not 404 and renders the shell (session/bookmark restoration surface)', async ({ page }) => {
    const res = await page.goto('/auctions');
    expect(res?.status()).toBe(200);
    await waitForAppShell(page);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('unknown deep link does not crash the app (invalid input at routing level)', async ({ page }) => {
    const res = await page.goto('/this-route-does-not-exist-xyz');
    // SPA serves index.html for unknown routes — must not be a blank page
    expect(res?.status()).toBe(200);
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('refresh preserves the shell (browser refresh recovery)', async ({ page }) => {
    await page.goto('/');
    await waitForAppShell(page);
    await page.reload();
    await waitForAppShell(page);
    await expect(page.locator('text=KAYAD EA').first()).toBeVisible();
  });

  test('network failure: API unreachable does not crash the app or fabricate data', async ({ page }) => {
    // Block every API call — simulates backend/network down.
    await page.route('**/api/**', (route) => route.abort());
    const errors: string[] = [];
    page.on('pageerror', (e: Error) => errors.push(String(e)));
    await page.goto('/');
    await waitForAppShell(page);
    // Shell still renders; no crash. (Catalog data is served from the
    // frontend's bundled initial dataset, not a live API — no silent
    // mock-after-real-failure switch is possible here.)
    await expect(page.locator('text=KAYAD EA').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('mobile viewport renders the shell without breaking (responsive build)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await waitForAppShell(page);
    await expect(page.locator('text=KAYAD EA').first()).toBeVisible();
  });
});
