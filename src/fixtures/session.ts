import path from 'path';
import {
  test as base,
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { LoginPage } from '../pages/saucedemo/LoginPage';
import { SessionManager } from '../session/SessionManager';
import { SESSION_ORIGIN } from '../session/users.config';
import type { UserRole } from '../session/types';

type RoleFixtures = {
  adminPage: Page;
  managerPage: Page;
  agentPage: Page;
  readOnlyPage: Page;
  asRole: (role: UserRole) => Promise<Page>;
};

type WorkerFixtures = {
  sessionManager: SessionManager;
};

async function openAuthenticatedContext(
  browser: Browser,
  manager: SessionManager,
  role: UserRole
): Promise<{ context: BrowserContext; page: Page }> {
  const ensured = await manager.ensureSession(role);
  const context = await browser.newContext({
    storageState: path.resolve(ensured.storageStatePath),
    baseURL: SESSION_ORIGIN,
  });
  const page = await context.newPage();
  const loginPage = new LoginPage(page);
  await loginPage.openAsAuthenticatedUser();
  return { context, page };
}

/**
 * Multi-user SauceDemo session fixtures (canonical location under src/fixtures/).
 *
 * Prefer:
 *   import { test, expect } from '../src/fixtures/session';
 *
 * Do not mix with OCE fixtures from `src/fixtures` (index) in the same spec.
 */
export const test = base.extend<RoleFixtures, WorkerFixtures>({
  sessionManager: [
    async ({ browser }, use) => {
      await use(new SessionManager(browser));
    },
    { scope: 'worker' },
  ],

  adminPage: async ({ browser, sessionManager }, use) => {
    const { context, page } = await openAuthenticatedContext(browser, sessionManager, 'Admin');
    await use(page);
    await context.close();
  },

  managerPage: async ({ browser, sessionManager }, use) => {
    const { context, page } = await openAuthenticatedContext(browser, sessionManager, 'Manager');
    await use(page);
    await context.close();
  },

  agentPage: async ({ browser, sessionManager }, use) => {
    const { context, page } = await openAuthenticatedContext(browser, sessionManager, 'Agent');
    await use(page);
    await context.close();
  },

  readOnlyPage: async ({ browser, sessionManager }, use) => {
    const { context, page } = await openAuthenticatedContext(
      browser,
      sessionManager,
      'ReadOnlyUser'
    );
    await use(page);
    await context.close();
  },

  asRole: async ({ browser, sessionManager }, use) => {
    const opened: BrowserContext[] = [];
    const factory = async (role: UserRole) => {
      const { context, page } = await openAuthenticatedContext(browser, sessionManager, role);
      opened.push(context);
      return page;
    };
    await use(factory);
    await Promise.all(opened.map((ctx) => ctx.close()));
  },
});

export { expect };
export type { UserRole };
