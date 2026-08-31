import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { LoginPage, InventoryPage, CartPage } from '../src/pages';
import {
  loadSessionBundle,
  restoreSessionStorageAndReload,
  userSessionBundlePath,
  userStorageStatePath,
} from '../utils/sessionStore';
import { getUser, rolesForSetup, SESSION_ORIGIN } from '../src/session/users.config';
import type { UserRole } from '../src/session/types';

/**
 * Phase 2 — Multi-user session reuse (Edge project: msedge-reuse)
 *
 * For every role saved in Phase 1 / global-setup:
 *  - Create context with that user's storageState (no login UI)
 *  - Verify session-username matches users.config
 *
 * Admin (cart role): also restore session bundle and verify cart product.
 */

const SCREENSHOT_DIR = path.join('screenshots', 'saucedemo', 'phase2-edge');
const CART_ROLE: UserRole = (process.env.SAUCE_CART_ROLE as UserRole) || 'Admin';
const roles = rolesForSetup();

test.describe('Phase 2 — Edge: reuse multi-user storageState', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    for (const role of roles) {
      const { userId } = getUser(role);
      const storage = userStorageStatePath(userId);
      if (!fs.existsSync(storage)) {
        throw new Error(
          `Missing storageState for ${role}: ${storage}\n` +
            `Run Phase 1 first:\n` +
            `  npx playwright test tests/loginAndSaveSession.spec.ts --project=chrome-setup --headed`
        );
      }
    }
  });

  for (const role of roles) {
    const user = getUser(role);

    test(`reuse ${role} (${user.username}) session without re-login`, async ({ browser }) => {
      const storageState = path.resolve(userStorageStatePath(user.userId));
      const context = await browser.newContext({
        storageState,
        baseURL: SESSION_ORIGIN,
      });

      const sessionCookie = (await context.cookies(SESSION_ORIGIN)).find(
        (c) => c.name === 'session-username'
      );
      expect(
        sessionCookie?.value,
        `Edge context missing session-username after loading ${storageState}. ` +
          `Cookie may be expired — re-run chrome-setup / ExecutionSuite-chrome-setup.`
      ).toBe(user.username);

      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      const inventoryPage = new InventoryPage(page);
      const shot = (name: string) => path.join(SCREENSHOT_DIR, `${user.userId}-${name}`);

      try {
        await loginPage.openAsAuthenticatedUser();
        await loginPage.takeScreenshot(shot('01-restored.png'));

        await expect(page.locator('[data-test="error"]')).toHaveCount(0);
        await expect(page.locator('[data-test="login-button"]')).toHaveCount(0);
        await expect(page.getByPlaceholder('Username')).toHaveCount(0);
        await inventoryPage.expectProductsPageLoaded();

        const cookieUser = (await context.cookies(SESSION_ORIGIN)).find(
          (c) => c.name === 'session-username'
        )?.value;
        expect(cookieUser).toBe(user.username);

        if (role === CART_ROLE && fs.existsSync(userSessionBundlePath(user.userId))) {
          const cartPage = new CartPage(page);
          const session = loadSessionBundle(user.userId);
          expect(session.username).toBe(user.username);
          expect(session.authenticationTokens['cookie:session-username']).toBe(user.username);

          const localStorageForOrigin =
            session.localStorageByOrigin?.[session.origin] ??
            session.localStorageByOrigin?.[SESSION_ORIGIN] ??
            {};
          const sessionStorageForOrigin =
            session.sessionStorageByOrigin[session.origin] ??
            session.sessionStorageByOrigin[SESSION_ORIGIN] ??
            {};

          expect(localStorageForOrigin['cart-contents']).toBeTruthy();
          const edgeLocalCart = await page.evaluate(() => localStorage.getItem('cart-contents'));
          expect(edgeLocalCart).toBe(localStorageForOrigin['cart-contents']);

          await restoreSessionStorageAndReload(page, sessionStorageForOrigin);
          await inventoryPage.expectProductsPageLoaded();
          await expect(inventoryPage.shoppingCartBadge).toHaveText('1', { timeout: 10_000 });

          await cartPage.goto();
          await cartPage.expectProductInCart(session.productName);
          expect(await cartPage.getFirstCartProductName()).toBe(session.productName);
          await cartPage.takeScreenshot(shot('02-cart-verified.png'));
        }
      } catch (error) {
        await page.screenshot({ path: shot('error.png'), fullPage: true });
        throw error;
      } finally {
        await context.close();
      }
    });
  }
});
