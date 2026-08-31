import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { LoginPage, InventoryPage, CartPage } from '../src/pages';
import {
  captureLocalStorage,
  captureSessionStorage,
  saveFullSession,
  userSessionBundlePath,
  userStorageStatePath,
} from '../utils/sessionStore';
import { SessionManager } from '../src/session/SessionManager';
import { getUser, rolesForSetup, SESSION_ORIGIN } from '../src/session/users.config';
import type { UserRole } from '../src/session/types';

/**
 * Phase 1 — Multi-user session save (Chrome)
 *
 * For every configured role (users.config / env):
 *  1. Login with role credentials (no hardcoded CREDENTIALS)
 *  2. Save per-user storageState → playwright/.auth/users/{userId}.storage.json
 *
 * Admin also:
 *  3. Add product to cart
 *  4. Save session bundle (local/session storage + product) for Edge reuse
 */

const SCREENSHOT_DIR = path.join('screenshots', 'saucedemo', 'phase1-chrome');
/** Role used for cart + rich session bundle (stable SauceDemo user). */
const CART_ROLE: UserRole = (process.env.SAUCE_CART_ROLE as UserRole) || 'Admin';

test.use({
  channel: 'chrome',
});

test.describe('Phase 1 — Chrome: multi-user login + save storageState', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test('Save sessions for all roles; Admin also saves cart session bundle', async ({
    browser,
  }) => {
    const manager = new SessionManager(browser);
    const roles = rolesForSetup();

    for (const role of roles) {
      const user = getUser(role);
      const context = await browser.newContext({ baseURL: SESSION_ORIGIN });
      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      const inventoryPage = new InventoryPage(page);
      const cartPage = new CartPage(page);
      const shot = (name: string) => path.join(SCREENSHOT_DIR, `${user.userId}-${name}`);

      try {
        await loginPage.goto();
        await loginPage.login(user.username, user.password);
        await loginPage.expectLoginSuccess();
        await inventoryPage.expectProductsPageLoaded();
        await loginPage.takeScreenshot(shot('01-logged-in.png'));

        if (role === CART_ROLE) {
          const productName = await inventoryPage.selectFirstProduct();
          expect(productName.length).toBeGreaterThan(0);
          await inventoryPage.addToCartFromDetail();
          await inventoryPage.openCart();
          await cartPage.expectProductInCart(productName);
          await cartPage.takeScreenshot(shot('02-cart.png'));

          const localStorageData = await captureLocalStorage(page);
          expect(localStorageData['cart-contents']).toBeTruthy();
          await captureSessionStorage(page);

          const bundle = await saveFullSession({
            context,
            page,
            productName,
            userId: user.userId,
            username: user.username,
            role,
            origin: SESSION_ORIGIN,
            mirrorLegacy: true,
          });

          // Also refresh meta via SessionManager (TTL / validity).
          await manager.persistAuthenticatedContext(role, context, page);

          expect(fs.existsSync(userStorageStatePath(user.userId))).toBeTruthy();
          expect(fs.existsSync(userSessionBundlePath(user.userId))).toBeTruthy();
          expect(bundle.authenticationTokens['cookie:session-username']).toBe(user.username);
          expect(bundle.productName).toBe(productName);
        } else {
          await manager.persistAuthenticatedContext(role, context, page);
          expect(fs.existsSync(userStorageStatePath(user.userId))).toBeTruthy();
        }

        const cookieUser = (await context.cookies(SESSION_ORIGIN)).find(
          (c) => c.name === 'session-username'
        )?.value;
        expect(cookieUser).toBe(user.username);
      } catch (error) {
        await page.screenshot({ path: shot('error.png'), fullPage: true });
        throw error;
      } finally {
        await context.close();
      }
    }
  });
});
