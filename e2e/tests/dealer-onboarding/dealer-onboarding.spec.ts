/**
 * KAYAD onboarding browser contract.
 *
 * The shipping onboarding surface is OnboardingFlow, not the retired
 * firstName/lastName/OTP registration form. These tests exercise the actual
 * three-step UI and the canonical API paths it calls.
 *
 * Live backend/provider certification remains in the opt-in release journey.
 */
import { test, expect } from '@playwright/test';

async function bootstrapCsrf(page: any) {
  await page.route('**/api/v1/auth/csrf', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Set-Cookie': 'XSRF-TOKEN=e2e-csrf-token-12345678901234567890123456789012; Path=/; SameSite=Strict' },
      body: JSON.stringify({ success: true, csrfToken: 'e2e-csrf-token-12345678901234567890123456789012' }),
    });
  });
  await page.route('**/api/v1/auth/logout', async (route: any) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'Logged out' }) });
  });
}

test.describe('KAYAD canonical onboarding', () => {
  test('buyer registration uses the canonical auth contract', async ({ page }) => {
    await bootstrapCsrf(page);
    await page.route('**/api/v1/auth/register', async (route: any) => {
      const body = route.request().postDataJSON();
      expect(body.role).toBe('user');
      expect(body.name).toBe('Jane Wanjiru');
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, user: { id: 'e2e-user', name: body.name, email: body.email, role: 'user', status: 'approved', emailVerified: false } }),
      });
    });

    await page.goto('/register');
    await page.getByRole('button', { name: 'Buyer', exact: true }).click();
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.getByLabel('Full name').fill('Jane Wanjiru');
    await page.getByLabel('Email').fill('jane@example.co.ke');
    await page.getByLabel('Phone').fill('+254712345678');
    await page.getByLabel('Password').fill('SecurePassword123!');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByText('Welcome to KAYAD')).toBeVisible();
  });

  test('dealer registration requires and sends business fields', async ({ page }) => {
    await bootstrapCsrf(page);
    await page.route('**/api/v1/auth/register', async (route: any) => {
      const body = route.request().postDataJSON();
      expect(body.role).toBe('dealer');
      expect(body.businessName).toBe('Auto Motors Ltd');
      expect(body.location).toBe('Nairobi');
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, user: { id: 'e2e-dealer', name: body.name, email: body.email, role: 'dealer', status: 'pending', emailVerified: false, businessName: body.businessName, location: body.location } }),
      });
    });

    await page.goto('/register');
    await page.getByRole('button', { name: 'Dealer', exact: true }).click();
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.getByLabel('Full name').fill('John Dealer');
    await page.getByLabel('Email').fill('dealer@example.co.ke');
    await page.getByLabel('Phone').fill('+254712345678');
    await page.getByLabel('Password').fill('SecurePassword123!');
    await page.getByLabel('Business name').fill('Auto Motors Ltd');
    await page.getByLabel('Location / city').fill('Nairobi');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByText('Dealer application submitted')).toBeVisible();
  });

  test('private seller registration uses individual_seller', async ({ page }) => {
    await bootstrapCsrf(page);
    await page.route('**/api/v1/auth/register', async (route: any) => {
      const body = route.request().postDataJSON();
      expect(body.role).toBe('individual_seller');
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, user: { id: 'e2e-seller', name: body.name, email: body.email, role: 'individual_seller', status: 'pending', emailVerified: false } }),
      });
    });

    await page.goto('/register');
    await page.getByRole('button', { name: 'Private Seller', exact: true }).click();
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.getByLabel('Full name').fill('Private Seller');
    await page.getByLabel('Email').fill('seller@example.co.ke');
    await page.getByLabel('Phone').fill('+254712345678');
    await page.getByLabel('Password').fill('SecurePassword123!');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByText('Dealer application submitted')).toBeVisible();
  });

  test('inspector application uses the dedicated application endpoint', async ({ page }) => {
    await bootstrapCsrf(page);
    await page.route('**/api/inspector-applications/apply', async (route: any) => {
      const body = route.request().postDataJSON();
      expect(body.fullName).toBe('Jane Inspector');
      expect(body.specialties).toEqual(['Engine', 'Brakes']);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Application received' }),
      });
    });

    await page.goto('/register');
    await page.getByRole('button', { name: 'Inspector', exact: true }).click();
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.getByLabel('Full name').fill('Jane Inspector');
    await page.getByLabel('Email').fill('inspector@example.co.ke');
    await page.getByLabel('Phone').fill('+254712345678');
    await page.getByLabel('ID / Passport').fill('12345678');
    await page.getByLabel('Location').fill('Nairobi');
    await page.getByLabel('Years of experience').fill('5');
    await page.getByLabel('Specialties (comma separated)').fill('Engine, Brakes');
    await page.getByRole('button', { name: 'Submit Inspector Application' }).click();
    await expect(page.getByText('Inspector application received')).toBeVisible();
  });
});

test.describe('KAYAD authentication recovery surfaces', () => {
  test('login handles the canonical cookie-backed auth response', async ({ page }) => {
    await page.route('**/api/v1/auth/me', async (route: any) => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Not authenticated' }) });
    });
    await bootstrapCsrf(page);
    await page.route('**/api/v1/auth/login', async (route: any) => {
      const body = route.request().postDataJSON();
      expect(body.email).toBe('buyer@example.co.ke');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, user: { id: 'e2e-login', name: 'Buyer', email: body.email, role: 'user', status: 'approved', emailVerified: true } }),
      });
    });

    await page.goto('/login');
    await page.locator('input[type="email"]').fill('buyer@example.co.ke');
    await page.locator('input[type="password"]').fill('SecurePassword123!');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).not.toHaveURL(/\/login$/);
  });

  test('forgot-password and reset-password surfaces use canonical endpoints', async ({ page }) => {
    await page.route('**/api/v1/auth/me', async (route: any) => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false }) });
    });
    await bootstrapCsrf(page);
    await page.route('**/api/v1/auth/forgot-password', async (route: any) => {
      expect(route.request().postDataJSON().email).toBe('buyer@example.co.ke');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'If that email is registered, a reset link has been sent.' }) });
    });
    await page.goto('/forgot-password');
    await page.locator('input[type="email"]').fill('buyer@example.co.ke');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText(/password-reset email is being sent/i)).toBeVisible();

    await page.route('**/api/v1/auth/reset-password', async (route: any) => {
      const body = route.request().postDataJSON();
      expect(body.token).toBe('e2e-reset-token');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'Password reset successfully.' }) });
    });
    await page.goto('/reset-password?token=e2e-reset-token');
    await page.locator('input[type="password"]').nth(0).fill('NewSecurePassword123!');
    await page.locator('input[type="password"]').nth(1).fill('NewSecurePassword123!');
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page.getByText(/password has been reset successfully/i)).toBeVisible();
  });

  test('email verification page calls the token endpoint and exposes resend recovery', async ({ page }) => {
    await page.route('**/api/v1/auth/verify-email/e2e-verification-token', async (route: any) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'Your email has been verified successfully.' }) });
    });
    await page.goto('/verify-email?token=e2e-verification-token');
    await expect(page.getByText('Email verified')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue to sign in' })).toBeVisible();
  });
});
