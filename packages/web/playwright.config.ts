import { defineConfig, devices } from "@playwright/test";

// The server is now managed by the fixture in tests/fixtures.ts — one
// arc42 serve process per worker, started fresh for each run.
// No global webServer needed.

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    headless: true,
  },
  projects: [
    {
      // Default project: all functional tests, headless
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testMatch: ["**/serve-ui.spec.ts"],
    },
    {
      // Demo project: screen-recording walkthrough, headed, with video capture.
      // Run explicitly with: pnpm demo
      name: "demo",
      use: {
        ...devices["Desktop Chrome"],
        headless: false,
        video: "on",
        viewport: { width: 1280, height: 800 },
        launchOptions: {
          slowMo: 0,
        },
      },
      testMatch: ["**/demo.spec.ts"],
      timeout: 120000,
    },
  ],
});
