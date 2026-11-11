import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * Второй сервер — копия того же билда с включённой защитой staging (этап 4В).
 * Пароль здесь локальный, тестовый: он не совпадает с паролем настоящего
 * staging и в env Timeweb не попадает.
 */
const STAGING_PORT = 3100;
const STAGING_BASIC_AUTH = "staging:staging-local-password";
const stagingURL = `http://127.0.0.1:${STAGING_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  outputDir: "test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run start",
      url: `${baseURL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npm run start -- --port ${STAGING_PORT}`,
      url: `${stagingURL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        STAGING_BASIC_AUTH,
      },
    },
  ],
});
