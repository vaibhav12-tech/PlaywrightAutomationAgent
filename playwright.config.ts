import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, 'playwright', '.auth', 'user.json');

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Session flow:
 *  - chrome-setup  → Phase 1 login (channel: chrome) → saves storageState
 *  - msedge-reuse  → Phase 2 (channel: msedge) depends on chrome-setup
 *
 * Defaults: headless browser, normal speed (no slowMo), no video recording.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['./reporters/jira-defect-reporter.ts'],
  ],
  use: {
    /* Failure evidence only — no video, no slowMo */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Default projects for other specs (BL10-685, addToCart, etc.)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [/loginAndSaveSession\.spec\.ts/, /reuseSessionInEdge\.spec\.ts/],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: [/loginAndSaveSession\.spec\.ts/, /reuseSessionInEdge\.spec\.ts/],
    },

    // Phase 1: Google Chrome — login + save playwright/.auth/user.json
    {
      name: 'chrome-setup',
      testMatch: /loginAndSaveSession\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },

    // Phase 2: Microsoft Edge — reuse saved storageState (runs after chrome-setup)
    {
      name: 'msedge-reuse',
      testMatch: /reuseSessionInEdge\.spec\.ts/,
      dependencies: ['chrome-setup'],
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        storageState: AUTH_FILE,
      },
    },
  ],
});
