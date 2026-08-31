import { chromium, type FullConfig } from '@playwright/test';
import { SessionManager } from './SessionManager';
import { rolesForSetup } from './users.config';

/**
 * Playwright globalSetup — prepares SauceDemo multi-user storageState files.
 *
 * When it runs
 * ------------
 * Runs when ANY of:
 *   - MULTI_USER_SESSION_SETUP=true (explicit opt-in)
 *   - CLI/projects include chrome-setup or msedge-reuse
 *   - Default: yes (backward compatible for `npm run test:pw` / multi-user)
 *
 * When it skips
 * -------------
 *   - SKIP_MULTI_USER_SESSION_SETUP=true  (explicit opt-out)
 *   - EDIT_STAFF_E2E=true when no session/ExecutionSuite projects are selected
 *     and MULTI_USER_SESSION_SETUP is not true
 *
 * Examples
 * --------
 *   OCE live:       EDIT_STAFF_E2E=true npx playwright test tests/BL10-550.spec.ts
 *   Session demo:   npm run test:session-chrome-edge
 *   Force setup:    MULTI_USER_SESSION_SETUP=true npx playwright test tests/multi-user
 *   ExecutionSuite: npm run test:execution-suite:headed
 */
function shouldRunSessionSetup(config: FullConfig): { run: boolean; reason: string } {
  if (process.env.SKIP_MULTI_USER_SESSION_SETUP === 'true') {
    return { run: false, reason: 'SKIP_MULTI_USER_SESSION_SETUP=true' };
  }

  if (process.env.MULTI_USER_SESSION_SETUP === 'true') {
    return { run: true, reason: 'MULTI_USER_SESSION_SETUP=true' };
  }

  const projectNames = config.projects.map((p) => p.name);
  const needsSessions = projectNames.some(
    (name) =>
      name === 'chrome-setup' ||
      name === 'msedge-reuse' ||
      name.startsWith('ExecutionSuite')
  );
  if (needsSessions) {
    return { run: true, reason: `session projects: ${projectNames.join(',')}` };
  }

  // OCE-only live suites should not pay SauceDemo login cost
  if (process.env.EDIT_STAFF_E2E === 'true') {
    return { run: false, reason: 'EDIT_STAFF_E2E=true (OCE-only; set MULTI_USER_SESSION_SETUP=true to override)' };
  }

  // Default: still prepare sessions so multi-user fixtures work out of the box
  return { run: true, reason: 'default (multi-user fixtures may need storageState)' };
}

async function globalSetup(config: FullConfig): Promise<void> {
  const decision = shouldRunSessionSetup(config);
  if (!decision.run) {
    // eslint-disable-next-line no-console
    console.log(`[session:global-setup] skipped (${decision.reason})`);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`[session:global-setup] running (${decision.reason})`);

  const roles = rolesForSetup();
  const headless = process.env.HEADED === 'true' ? false : true;

  const browser = await chromium.launch({ headless });
  const manager = new SessionManager(browser);

  try {
    const results = await manager.ensureSessions(roles);
    for (const result of results) {
      const action = result.reused ? 'REUSED' : 'CREATED';
      // eslint-disable-next-line no-console
      console.log(
        `[session:global-setup] ${action} ${result.role} → ${result.storageStatePath} (user=${result.meta.username})`
      );
    }
  } finally {
    await browser.close();
  }
}

export default globalSetup;
