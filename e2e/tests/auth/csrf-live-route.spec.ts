import { test, expect } from '@playwright/test';

/**
 * Real-route regression for the production CSRF contract.
 *
 * This intentionally does NOT mock /api/v1/auth/csrf. It is enabled only when
 * E2E_WITH_BACKEND=1 so the canonical onboarding suite can remain deterministic
 * without pretending that a mocked route proves deployment correctness.
 */
test.describe('KAYAD live CSRF route contract', () => {
  test.skip(!process.env.E2E_WITH_BACKEND, 'requires a live backend');

  test('GET /api/v1/auth/csrf resolves through the browser transport', async ({ page, request }) => {
    const apiResponse = await request.get('/api/v1/auth/csrf');
    expect(apiResponse.status(), await apiResponse.text()).toBe(200);
    expect(apiResponse.headers()['x-kayad-canonical-route']).toBe('/api/v1/auth/csrf');
    const body = await apiResponse.json();
    expect(body.success).toBe(true);
    expect(typeof body.csrfToken).toBe('string');
    expect(body.csrfToken.length).toBeGreaterThanOrEqual(32);

    const browserResult = await page.evaluate(async () => {
      const response = await fetch('/api/v1/auth/csrf', { credentials: 'include' });
      return {
        status: response.status,
        route: response.headers.get('x-kayad-canonical-route'),
        body: await response.json(),
      };
    });

    expect(browserResult.status).toBe(200);
    expect(browserResult.route).toBe('/api/v1/auth/csrf');
    expect(browserResult.body.success).toBe(true);
    expect(browserResult.body.csrfToken).toEqual(expect.any(String));
  });
});
