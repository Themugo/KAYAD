import { test, expect } from "@playwright/test";

test.describe("Critical user flows", () => {
  test("health endpoint returns ok", async ({ request }) => {
    const res = await request.get("http://localhost:3000/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  test("homepage loads and shows cars", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    const title = await page.title();
    expect(title).toContain("KAYAD");
  });

  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeAttached();
    await expect(page.locator('input[type="password"]')).toBeAttached();
  });

  test("car listing API returns data", async ({ request }) => {
    const res = await request.get("http://localhost:3000/api/cars");
    expect(res.ok()).toBeTruthy();
  });
});
