import { defineConfig, devices, type Project } from '@playwright/test';

/**
 * Unified multi-user session model:
 *  - Credentials: src/session/users.config.ts (env-first)
 *  - storageState: playwright/.auth/users/{userId}.storage.json
 *  - globalSetup prepares sessions; fixtures / Edge reuse consume them
 *
 * Chrome → Edge demo:
 *  - chrome-setup  → loginAndSaveSession.spec.ts (all roles + Admin cart bundle)
 *  - msedge-reuse  → reuseSessionInEdge.spec.ts (per-role storageState)
 *
 * ExecutionSuite (BL10-550 + multi-user + session store):
 *  - ExecutionSuite-chromium      → BL10-550 + tests/multi-user
 *  - ExecutionSuite-chrome-setup  → loginAndSaveSession.spec.ts
 *  - ExecutionSuite-msedge-reuse  → reuseSessionInEdge.spec.ts
 *
 * Why projects + testMatch (not grep/tags alone):
 *  These specs require different browser channels (Chromium vs Chrome vs Edge) and a
 *  project dependency (Edge reuse after Chrome save). A single --grep tag cannot
 *  assign the correct browser per file. testMatch projects keep test logic untouched.
 */

/** Specs included in ExecutionSuite — shared so npm scripts stay in sync with config. */
export const EXECUTION_SUITE = {
  /** OCE live + multi-user role fixtures (Desktop Chrome / Chromium). */
  chromiumMatch: [/BL10-550\.spec\.ts$/, /multi-user[/\\].*\.spec\.ts$/],
  /** Phase 1 — persist SauceDemo storageState in Google Chrome. */
  chromeSetupMatch: [/loginAndSaveSession\.spec\.ts$/],
  /** Phase 2 — restore storageState in Microsoft Edge. */
  edgeReuseMatch: [/reuseSessionInEdge\.spec\.ts$/],
} as const;

const executionSuiteProjects: Project[] = [
  {
    name: 'ExecutionSuite-chromium',
    testMatch: [...EXECUTION_SUITE.chromiumMatch],
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'ExecutionSuite-chrome-setup',
    testMatch: [...EXECUTION_SUITE.chromeSetupMatch],
    use: {
      ...devices['Desktop Chrome'],
      channel: 'chrome',
    },
  },
  {
    name: 'ExecutionSuite-msedge-reuse',
    testMatch: [...EXECUTION_SUITE.edgeReuseMatch],
    dependencies: ['ExecutionSuite-chrome-setup'],
    use: {
      ...devices['Desktop Edge'],
      channel: 'msedge',
    },
  },
];

/** Only register suite projects when opted in — avoids duplicating chrome-setup on `npm run test:pw`. */
const includeExecutionSuite = process.env.EXECUTION_SUITE === 'true';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 90_000,
  expect: { timeout: 15_000 },

  globalSetup: require.resolve('./src/session/global-setup.ts'),

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['./reporters/jira-defect-reporter.ts'],
  ],

  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // APIRequestContext-only suites (no browser UI)
    {
      name: 'api',
      testMatch: /api[/\\].*\.spec\.ts/,
    },

    // Fixtures load per-user storageState (Chromium / Firefox / WebKit / Edge)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [
        /loginAndSaveSession\.spec\.ts/,
        /reuseSessionInEdge\.spec\.ts/,
        /api[/\\].*\.spec\.ts/,
      ],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: [
        /loginAndSaveSession\.spec\.ts/,
        /reuseSessionInEdge\.spec\.ts/,
        /api[/\\].*\.spec\.ts/,
      ],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: [
        /loginAndSaveSession\.spec\.ts/,
        /reuseSessionInEdge\.spec\.ts/,
        /api[/\\].*\.spec\.ts/,
      ],
    },
    {
      name: 'msedge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
      },
      testIgnore: [
        /loginAndSaveSession\.spec\.ts/,
        /reuseSessionInEdge\.spec\.ts/,
        /api[/\\].*\.spec\.ts/,
      ],
    },

    // Phase 1: save multi-user sessions (+ Admin cart bundle) in Chrome
    {
      name: 'chrome-setup',
      testMatch: /loginAndSaveSession\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },

    // Phase 2: reuse each role's storageState in Edge (set per describe in the spec)
    {
      name: 'msedge-reuse',
      testMatch: /reuseSessionInEdge\.spec\.ts/,
      dependencies: ['chrome-setup'],
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
      },
    },

    // ExecutionSuite — enabled only when EXECUTION_SUITE=true (see npm run test:execution-suite)
    ...(includeExecutionSuite ? executionSuiteProjects : []),
  ],
});
