import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import {
  STORAGE_STATE_FILE,
  SESSION_BUNDLE_FILE,
  loadSessionBundle,
  restoreSessionStorageAndReload,
} from '../utils/sessionStore';

/**
 * Phase 2 (Edge)
 * 8. Launch Microsoft Edge
 * 9. Navigate to the same application
 * 10. Inject/restore session from Chrome (cookies/localStorage via storageState,
 *     sessionStorage via session.json)
 * 11. Refresh / reload
 * 12. Verify already logged in (no credentials)
 * 13. Navigate to cart
 * 14–15. Verify product from Chrome still exists and name matches
 */

const SCREENSHOT_DIR = path.join('screenshots', 'saucedemo', 'phase2-edge');

test.use({
  channel: 'msedge',
  // Cookies + localStorage restored from Chrome Phase 1
  storageState: STORAGE_STATE_FILE,
});

test.describe('Phase 2 — Edge: restore Chrome session and verify cart', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(STORAGE_STATE_FILE) || !fs.existsSync(SESSION_BUNDLE_FILE)) {
      throw new Error(
        `Missing Chrome session artifacts.\n` +
          `Expected:\n  - ${STORAGE_STATE_FILE}\n  - ${SESSION_BUNDLE_FILE}\n` +
          `Run Phase 1 first:\n` +
          `  npx playwright test tests/loginAndSaveSession.spec.ts --project=chrome-setup --headed`
      );
    }
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test('Restore session in Edge and verify cart product from Chrome', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);
    const session = loadSessionBundle();

    expect(session.productName.length, 'Chrome product name must be present').toBeGreaterThan(
      0
    );

    try {
      // 8–9. Edge launches with storageState; navigate to inventory
      await loginPage.openAsAuthenticatedUser();
      await loginPage.takeScreenshot(
        path.join(SCREENSHOT_DIR, '01-edge-after-storageState.png')
      );

      // 10. Confirm localStorage cart from Chrome was restored via storageState,
      //     and re-inject sessionStorage (if any) for a complete session restore.
      const localStorageForOrigin =
        session.localStorageByOrigin?.[session.origin] ??
        session.localStorageByOrigin?.['https://www.saucedemo.com'] ??
        {};
      const sessionStorageForOrigin =
        session.sessionStorageByOrigin[session.origin] ??
        session.sessionStorageByOrigin['https://www.saucedemo.com'] ??
        {};

      expect(
        localStorageForOrigin['cart-contents'],
        'Chrome localStorage cart-contents must be present in session bundle'
      ).toBeTruthy();

      const edgeLocalCart = await page.evaluate(() => localStorage.getItem('cart-contents'));
      expect(edgeLocalCart, 'Edge should already have cart-contents from storageState').toBe(
        localStorageForOrigin['cart-contents']
      );

      // 11. Restore sessionStorage (may be empty on SauceDemo) and reload application
      await restoreSessionStorageAndReload(page, sessionStorageForOrigin);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '02-edge-after-session-restore.png'),
        fullPage: true,
      });

      // 12. Verify user is already logged in — no credentials entered
      await expect(page.locator('[data-test="login-button"]')).toHaveCount(0);
      await expect(page.getByPlaceholder('Username')).toHaveCount(0);
      await expect(page).toHaveURL(/.*inventory\.html/);
      await inventoryPage.expectProductsPageLoaded();

      // Auth token captured in Chrome must match expected user
      expect(session.authenticationTokens['cookie:session-username']).toBe('standard_user');

      await inventoryPage.takeScreenshot(
        path.join(SCREENSHOT_DIR, '03-edge-logged-in-products.png')
      );

      // Cart badge should reflect Chrome cart after sessionStorage restore
      await expect(inventoryPage.shoppingCartBadge).toHaveText('1', { timeout: 10_000 });

      // 13. Navigate to cart page
      await cartPage.goto();
      await cartPage.takeScreenshot(path.join(SCREENSHOT_DIR, '04-edge-cart.png'));

      // 14–15. Verify previously selected product exists and name matches Chrome
      await cartPage.expectProductInCart(session.productName);
      const edgeCartProduct = await cartPage.getFirstCartProductName();
      expect(edgeCartProduct, 'Edge cart product must match Chrome product').toBe(
        session.productName
      );

      await cartPage.takeScreenshot(
        path.join(SCREENSHOT_DIR, '05-edge-cart-verified.png')
      );
    } catch (error) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'error-phase2.png'),
        fullPage: true,
      });
      throw error;
    }
  });
});
