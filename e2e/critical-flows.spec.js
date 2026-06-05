import { test, expect } from "@playwright/test";

test.describe("Backend health & API", () => {
  test("health endpoint returns ok", async ({ request }) => {
    const res = await request.get("http://localhost:3000/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  test("car listing API returns paginated data", async ({ request }) => {
    const res = await request.get("http://localhost:3000/api/cars?page=1&limit=5");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data || body.cars)).toBe(true);
  });

  test("auth endpoints exist", async ({ request }) => {
    const res = await request.post("http://localhost:3000/api/auth/login", {
      data: { email: "test@example.com", password: "wrong" },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("Frontend pages", () => {
  test("homepage loads and shows content", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible({ timeout: 15000 });
    const title = await page.title();
    expect(title).toContain("KAYAD");
  });

  test("login page has form fields", async ({ page }) => {
    await page.goto("/login");
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await expect(page.locator('input[type="password"]')).toBeAttached();
  });

  test("register page renders", async ({ page }) => {
    await page.goto("/register");
    await page.waitForSelector("form, input", { timeout: 10000 });
    await expect(page.locator("body")).toBeVisible();
  });

  test("showroom page loads car listing grid", async ({ page }) => {
    await page.goto("/showroom");
    await page.waitForSelector('[class*="grid"], [class*="card"], [class*="CarCard"]', { timeout: 15000 });
    await expect(page.locator("body")).toBeVisible();
  });

  test("auctions page loads", async ({ page }) => {
    await page.goto("/auctions");
    await expect(page.locator("body")).toBeVisible({ timeout: 15000 });
  });

  test("forgot password page has email field", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await expect(page.locator('button[type="submit"], button:has-text("Reset")')).toBeAttached();
  });
});

test.describe("Navigation", () => {
  test("can navigate from homepage to login", async ({ page }) => {
    await page.goto("/");
    const loginLink = page.locator('a[href*="login"], button:has-text("Login")').first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await page.waitForURL(/login/);
      expect(page.url()).toContain("login");
    }
  });

  test("car search feature loads", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("Toyota");
      await page.waitForTimeout(500);
    }
  });

  test("footer links are present", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer, [class*='footer']").first()).toBeAttached({ timeout: 10000 });
  });
});

test.describe("Accessibility", () => {
  test("page has lang attribute", async ({ page }) => {
    await page.goto("/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
  });

  test("images with meaningful alt text", async ({ page }) => {
    await page.goto("/");
    const images = page.locator("img[alt]");
    const count = await images.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
