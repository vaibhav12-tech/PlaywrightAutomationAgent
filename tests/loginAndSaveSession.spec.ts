import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import {
  AUTH_DIR,
  STORAGE_STATE_FILE,
  SESSION_BUNDLE_FILE,
  saveFullSession,
  captureLocalStorage,
  captureSessionStorage,
} from '../utils/sessionStore';

/**
 * Phase 1 (Chrome)
 * 1. Launch Chrome
 * 2. Navigate to SauceDemo
 * 3. Login
 * 4. Select product + add to cart
 * 5. Capture product name
 * 6. Extract cookies, localStorage, sessionStorage, auth tokens
 * 7. Close Chrome (Playwright fixture teardown)
 */

const SCREENSHOT_DIR = path.join('screenshots', 'saucedemo', 'phase1-chrome');

const CREDENTIALS = {
  username: 'standard_user',
  password: 'secret_sauce',
} as const;

test.use({
  channel: 'chrome',
});

test.describe('Phase 1 — Chrome: login, add to cart, save full session', () => {
  test.beforeAll(() => {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test('Login, add product to cart, and save session for Edge', async ({
    page,
    context,
  }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);

    try {
      // 1–2. Chrome launches via channel; navigate to e-commerce app
      await loginPage.goto();
      await loginPage.takeScreenshot(path.join(SCREENSHOT_DIR, '01-login-page.png'));

      // 3. Login with valid credentials
      await loginPage.login(CREDENTIALS.username, CREDENTIALS.password);
      await loginPage.expectLoginSuccess();
      await inventoryPage.expectProductsPageLoaded();
      await inventoryPage.takeScreenshot(
        path.join(SCREENSHOT_DIR, '02-products-after-login.png')
      );

      // 4–5. Select first product, add to cart, capture product name
      const productName = await inventoryPage.selectFirstProduct();
      expect(productName.length, 'Product name must be captured').toBeGreaterThan(0);
      await inventoryPage.takeScreenshot(
        path.join(SCREENSHOT_DIR, '03-product-selected.png')
      );

      await inventoryPage.addToCartFromDetail();
      await inventoryPage.takeScreenshot(
        path.join(SCREENSHOT_DIR, '04-added-to-cart.png')
      );

      // Confirm cart shows the selected product before saving session
      await inventoryPage.openCart();
      await cartPage.expectProductInCart(productName);
      await cartPage.takeScreenshot(path.join(SCREENSHOT_DIR, '05-cart-in-chrome.png'));

      // 6. Extract cookies, localStorage, sessionStorage, authentication tokens
      const cookies = await context.cookies('https://www.saucedemo.com');
      expect(cookies.length, 'Expected cookies after login').toBeGreaterThan(0);

      const localStorageData = await captureLocalStorage(page);
      const sessionStorageData = await captureSessionStorage(page);

      // SauceDemo cart is stored in localStorage (cart-contents) — also saved via storageState
      expect(
        localStorageData['cart-contents'],
        'cart-contents should exist in localStorage after add-to-cart'
      ).toBeTruthy();

      const bundle = await saveFullSession({
        context,
        page,
        productName,
        origin: 'https://www.saucedemo.com',
      });

      expect(fs.existsSync(STORAGE_STATE_FILE)).toBeTruthy();
      expect(fs.existsSync(SESSION_BUNDLE_FILE)).toBeTruthy();
      expect(bundle.productName).toBe(productName);
      expect(bundle.authenticationTokens['cookie:session-username']).toBe(
        CREDENTIALS.username
      );
      // Persist localStorage snapshot inside session bundle for Edge verification/docs
      expect(Object.keys(localStorageData).length).toBeGreaterThan(0);
      // sessionStorage may be empty on SauceDemo; still captured for completeness
      expect(sessionStorageData).toBeDefined();

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '06-session-saved.png'),
        fullPage: true,
      });

      // 7. Chrome closes automatically when this test ends (fixture teardown)
    } catch (error) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'error-phase1.png'),
        fullPage: true,
      });
      throw error;
    }
  });
});
