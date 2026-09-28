/**
 * PHASE 5 — LIVE BUYER / DEALER RELEASE JOURNEY
 *
 * This suite is deliberately opt-in. It is the production/staging browser
 * gate and never runs against an unconfigured local shell by accident.
 *
 * Required when E2E_RELEASE=1:
 *   E2E_BUYER_EMAIL
 *   E2E_BUYER_PASSWORD
 *   E2E_DEALER_EMAIL
 *   E2E_DEALER_PASSWORD
 *   E2E_RELEASE_CAR_ID
 *
 * Optional:
 *   E2E_RELEASE_ESCROW_ID
 *   E2E_RELEASE_AUCTION_ID
 *
 * Payment callbacks and escrow custody verification are not faked here.
 * Phase 4 owns the deterministic financial lifecycle; the live release gate
 * verifies that the real browser reaches the same canonical surfaces and
 * that the authenticated roles can see the seeded transaction records.
 */
import { test, expect } from '@playwright/test';

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required Phase 5 variable: ${name}`);
  return value;
};

const buyer = () => ({ email: required('E2E_BUYER_EMAIL'), password: required('E2E_BUYER_PASSWORD') });
const dealer = () => ({ email: required('E2E_DEALER_EMAIL'), password: required('E2E_DEALER_PASSWORD') });
const carId = () => required('E2E_RELEASE_CAR_ID');
const escrowId = () => process.env.E2E_RELEASE_ESCROW_ID;
const auctionId = () => process.env.E2E_RELEASE_AUCTION_ID;

async function login(page: any, credentials: { email: string; password: string }) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 20000 });
}

async function assertNoPageErrors(page: any, errors: string[]) {
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
}

test.describe('KAYAD Phase 5 — release buyer/dealer browser journey', () => {
  test.skip(process.env.E2E_RELEASE !== '1', 'Set E2E_RELEASE=1 for the live staging/production release gate.');
  test.describe.configure({ mode: 'serial' });

  test('buyer can authenticate, browse the canonical vehicle, auction and escrow surfaces', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await login(page, buyer());
    await expect(page).toHaveURL(/\/(?:home|dashboard|car\/|auctions|escrow|$)/, { timeout: 20000 });

    await page.goto(`/car/${encodeURIComponent(carId())}`);
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('text=KAYAD').first()).toBeVisible();

    await page.goto('/auctions');
    await expect(page.locator('body')).not.toBeEmpty();

    await page.goto('/escrow');
    await expect(page.locator('body')).not.toBeEmpty();
    if (escrowId()) {
      await expect(page.locator('body')).toContainText(/Escrow|Secure Transactions|Funds Held|Awaiting/i);
    }

    if (auctionId()) {
      await page.goto(`/auction/${encodeURIComponent(auctionId()!)}`);
      await expect(page.locator('body')).not.toBeEmpty();
    }

    await assertNoPageErrors(page, errors);
  });

  test('dealer can authenticate and reach the canonical dealer operating surfaces', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await login(page, dealer());
    await page.goto('/dealer');
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('text=KAYAD').first()).toBeVisible();

    await page.goto('/dealer/inventory');
    await expect(page.locator('body')).not.toBeEmpty();

    await page.goto('/dealer/add-car');
    await expect(page.locator('body')).not.toBeEmpty();

    await assertNoPageErrors(page, errors);
  });

  test('seeded transaction identity is visible to the authenticated buyer without fabricating state', async ({ page, request }) => {
    await login(page, buyer());

    const carResponse = await request.get(`/api/v1/cars/${encodeURIComponent(carId())}`);
    expect(carResponse.ok()).toBeTruthy();

    if (escrowId()) {
      const escrowResponse = await request.get(`/api/v1/escrow/${encodeURIComponent(escrowId()!)}`);
      expect(escrowResponse.ok()).toBeTruthy();
    }
  });
});
