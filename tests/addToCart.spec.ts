import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';

const CREDENTIALS = {
  username: 'standard_user',
  password: 'secret_sauce',
} as const;

const SCREENSHOT_DIR = path.join('screenshots', 'saucedemo');

test.describe('SauceDemo — Add product to cart', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test('Login, select first product, add to cart, and verify cart item', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);

    let selectedProductName = '';

    try {
      // 1. Login successfully
      await loginPage.goto();
      await loginPage.takeScreenshot(path.join(SCREENSHOT_DIR, '01-login-page.png'));
      await loginPage.login(CREDENTIALS.username, CREDENTIALS.password);
      await loginPage.expectLoginSuccess();
      await loginPage.takeScreenshot(path.join(SCREENSHOT_DIR, '02-after-login.png'));

      // 2. Verify Products page
      await inventoryPage.expectProductsPageLoaded();
      await inventoryPage.takeScreenshot(path.join(SCREENSHOT_DIR, '03-products-page.png'));

      // 3. Select the first available product
      selectedProductName = await inventoryPage.selectFirstProduct();
      expect(selectedProductName.length).toBeGreaterThan(0);
      await inventoryPage.takeScreenshot(
        path.join(SCREENSHOT_DIR, '04-product-detail.png')
      );

      // 4. Add the product to cart
      await inventoryPage.addToCartFromDetail();
      await inventoryPage.takeScreenshot(
        path.join(SCREENSHOT_DIR, '05-added-to-cart.png')
      );

      // 5. Open cart
      await inventoryPage.openCart();
      await cartPage.takeScreenshot(path.join(SCREENSHOT_DIR, '06-cart-page.png'));

      // 6. Verify the product name in cart matches the selected product
      await cartPage.expectProductInCart(selectedProductName);
      await cartPage.takeScreenshot(
        path.join(SCREENSHOT_DIR, '07-cart-verified.png')
      );
    } catch (error) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'error-failure.png'),
        fullPage: true,
      });
      throw error;
    }
  });
});
