import { type Locator, type Page, expect } from '@playwright/test';

/**
 * SauceDemo Inventory / Products Page
 */
export class InventoryPage {
  readonly page: Page;

  readonly title: Locator;
  readonly inventoryContainer: Locator;
  readonly inventoryItems: Locator;
  readonly shoppingCartLink: Locator;
  readonly shoppingCartBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test="title"]');
    this.inventoryContainer = page.locator('[data-test="inventory-container"]');
    this.inventoryItems = page.locator('[data-test="inventory-item"]');
    this.shoppingCartLink = page.locator('[data-test="shopping-cart-link"]');
    this.shoppingCartBadge = page.locator('[data-test="shopping-cart-badge"]');
  }

  async expectProductsPageLoaded(): Promise<void> {
    try {
      await expect(this.page).toHaveURL(/.*inventory\.html/);
      await expect(this.title).toHaveText('Products');
      await expect(this.inventoryContainer).toBeVisible();
      await expect(this.inventoryItems.first()).toBeVisible({ timeout: 15_000 });
    } catch (error) {
      throw new Error(`Products page verification failed: ${String(error)}`);
    }
  }

  /** Returns the name of the first available product. */
  async getFirstProductName(): Promise<string> {
    const firstItem = this.inventoryItems.first();
    await expect(firstItem).toBeVisible();
    const name = await firstItem.locator('[data-test="inventory-item-name"]').textContent();
    if (!name?.trim()) {
      throw new Error('Could not read the first product name from the inventory.');
    }
    return name.trim();
  }

  /** Selects (clicks) the first product name link and returns its name. */
  async selectFirstProduct(): Promise<string> {
    try {
      const firstItem = this.inventoryItems.first();
      const nameLocator = firstItem.locator('[data-test="inventory-item-name"]');
      const productName = (await nameLocator.textContent())?.trim();
      if (!productName) {
        throw new Error('First product name is empty.');
      }
      await nameLocator.click();
      await expect(this.page).toHaveURL(/.*inventory-item\.html/, { timeout: 15_000 });
      return productName;
    } catch (error) {
      throw new Error(`Failed to select the first product: ${String(error)}`);
    }
  }

  /** On product detail page, click Add to cart. */
  async addToCartFromDetail(): Promise<void> {
    try {
      const addButton = this.page.locator('[data-test^="add-to-cart"]');
      await expect(addButton).toBeVisible({ timeout: 10_000 });
      await addButton.click();
      await expect(this.shoppingCartBadge).toHaveText('1', { timeout: 10_000 });
    } catch (error) {
      throw new Error(`Failed to add product to cart from detail page: ${String(error)}`);
    }
  }

  async openCart(): Promise<void> {
    try {
      await this.shoppingCartLink.click();
      await expect(this.page).toHaveURL(/.*cart\.html/, { timeout: 15_000 });
    } catch (error) {
      throw new Error(`Failed to open cart: ${String(error)}`);
    }
  }

  async takeScreenshot(filePath: string): Promise<void> {
    await this.page.screenshot({ path: filePath, fullPage: true });
  }
}
