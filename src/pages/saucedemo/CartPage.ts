import { type Locator, type Page, expect } from '@playwright/test';

/**
 * SauceDemo Cart Page
 */
export class CartPage {
  readonly page: Page;

  readonly title: Locator;
  readonly cartItems: Locator;
  readonly cartItemNames: Locator;
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test="title"]');
    this.cartItems = page.locator('.cart_item');
    this.cartItemNames = page.locator('.cart_item [data-test="inventory-item-name"]');
    this.checkoutButton = page.locator('[data-test="checkout"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('https://www.saucedemo.com/cart.html', {
      waitUntil: 'domcontentloaded',
    });
    await expect(this.page).toHaveURL(/.*cart\.html/, { timeout: 15_000 });
  }

  async expectCartPageLoaded(): Promise<void> {
    try {
      await expect(this.page).toHaveURL(/.*cart\.html/);
      await expect(this.title).toHaveText('Your Cart');
      await expect(this.cartItems.first()).toBeVisible({ timeout: 15_000 });
    } catch (error) {
      throw new Error(`Cart page verification failed: ${String(error)}`);
    }
  }

  async getFirstCartProductName(): Promise<string> {
    const name = await this.cartItemNames.first().textContent();
    if (!name?.trim()) {
      throw new Error('Could not read product name from the cart.');
    }
    return name.trim();
  }

  async expectProductInCart(expectedProductName: string): Promise<void> {
    try {
      await this.expectCartPageLoaded();
      const actualName = await this.getFirstCartProductName();
      expect(actualName, 'Cart product name should match the selected product').toBe(
        expectedProductName
      );
    } catch (error) {
      throw new Error(
        `Cart product verification failed. Expected "${expectedProductName}". Details: ${String(error)}`
      );
    }
  }

  async takeScreenshot(filePath: string): Promise<void> {
    await this.page.screenshot({ path: filePath, fullPage: true });
  }
}
