import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://localhost:4173/", trace: "on-first-retry" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: { command: "npm run build && npm run preview -- --port 4173", url: "http://localhost:4173/", reuseExistingServer: !process.env.CI },
});
