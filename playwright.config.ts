import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const shouldStartWebServer = !process.env.BASE_URL;
const configuredWorkers = Number.parseInt(
  process.env.PLAYWRIGHT_WORKERS ?? process.env.E2E_WORKERS ?? "1",
  10,
);
const workers = Number.isFinite(configuredWorkers) && configuredWorkers > 0
  ? configuredWorkers
  : 1;

export default defineConfig({
  testDir: ".",
  testMatch: ["**/*.e2e.spec.ts"],
  testIgnore: ["**/node_modules/**", "**/.next/**", "**/coverage/**"],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  outputDir: ".playwright-artifacts",
  workers,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: shouldStartWebServer
    ? {
        command: "pnpm exec next dev --hostname 127.0.0.1 --port 3000",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
});
