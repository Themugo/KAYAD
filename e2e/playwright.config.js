import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: "html",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node server.js",
      cwd: "backend",
      port: 3000,
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: "npm run dev -- --port 5173",
      cwd: ".",
      port: 5173,
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
