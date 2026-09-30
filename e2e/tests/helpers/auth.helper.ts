/**
 * Authentication helpers for KAYAD's cookie-backed auth architecture.
 *
 * The backend deliberately does not return JWT access tokens in JSON. Browser
 * sessions therefore use httpOnly cookies and these helpers must never attempt
 * to put a token into localStorage.
 */
import { Page } from '@playwright/test';

export interface UserCredentials {
  email: string;
  password: string;
  role?: 'buyer' | 'dealer' | 'admin';
}

export class AuthHelper {
  static getTestUser(role: 'buyer' | 'dealer' | 'admin'): UserCredentials {
    const prefix = role === 'buyer' ? 'E2E_BUYER' : role === 'dealer' ? 'E2E_DEALER' : 'E2E_ADMIN';
    const email = process.env[`${prefix}_EMAIL`];
    const password = process.env[`${prefix}_PASSWORD`];
    if (!email || !password) throw new Error(`${prefix}_EMAIL and ${prefix}_PASSWORD are required for live E2E authentication.`);
    return { email, password, role };
  }

  static async loginWithRole(page: Page, role: 'buyer' | 'dealer' | 'admin') {
    await this.login(page, this.getTestUser(role));
  }
  static async login(page: Page, credentials: UserCredentials) {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(credentials.email);
    await page.locator('input[type="password"]').fill(credentials.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 30000 });
  }

  static async logout(page: Page) {
    await page.goto('/login');
  }

  /**
   * Live registration helper for the canonical public onboarding surface.
   * It intentionally does not attempt to handle email verification; that is a
   * separate provider-backed release concern.
   */
  static async register(page: Page, userData: {
    email: string;
    password: string;
    name: string;
    phone: string;
    role: 'buyer' | 'dealer' | 'individual_seller';
    businessName?: string;
    location?: string;
  }) {
    await page.goto('/register');
    await page.getByRole('button', { name: userData.role === 'buyer' ? 'Buyer' : userData.role === 'dealer' ? 'Dealer' : 'Private Seller', exact: true }).click();
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.getByLabel('Full name').fill(userData.name);
    await page.getByLabel('Email').fill(userData.email);
    await page.getByLabel('Phone').fill(userData.phone);
    await page.getByLabel('Password').fill(userData.password);
    if (userData.role === 'dealer') {
      await page.getByLabel('Business name').fill(userData.businessName || 'KAYAD Test Motors');
      await page.getByLabel('Location / city').fill(userData.location || 'Nairobi');
    }
    if (userData.role === 'individual_seller' && userData.businessName) {
      await page.getByLabel('Trading name (optional)').fill(userData.businessName);
    }
    await page.getByRole('button', { name: 'Create Account' }).click();
  }
}
