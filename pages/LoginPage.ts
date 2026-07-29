import { type Locator, type Page, expect } from '@playwright/test';

/**
 * SauceDemo Login Page — https://www.saucedemo.com/
 */
export class LoginPage {
  readonly page: Page;
  readonly url = 'https://www.saucedemo.com/';
  readonly inventoryUrl = 'https://www.saucedemo.com/inventory.html';

  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByPlaceholder('Username');
    this.passwordInput = page.getByPlaceholder('Password');
    this.loginButton = page.locator('[data-test="login-button"]');
    this.errorMessage = page.locator('[data-test="error"]');
  }

  async goto(): Promise<void> {
    try {
      await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
      await expect(this.loginButton).toBeVisible({ timeout: 15_000 });
    } catch (error) {
      throw new Error(
        `Failed to open SauceDemo login page at ${this.url}: ${String(error)}`
      );
    }
  }

  async login(username: string, password: string): Promise<void> {
    try {
      await this.usernameInput.fill(username);
      await this.passwordInput.fill(password);
      await this.loginButton.click();
    } catch (error) {
      throw new Error(`Login action failed: ${String(error)}`);
    }
  }

  /** Asserts redirect to inventory and no login error banner. */
  async expectLoginSuccess(): Promise<void> {
    await expect(this.page).toHaveURL(/.*inventory\.html/, { timeout: 15_000 });
    await expect(this.errorMessage).toBeHidden();
    await expect(this.loginButton).toHaveCount(0);
  }

  /**
   * Opens inventory with an existing storageState session.
   * Fails if the login form is shown (session not reused).
   */
  async openAsAuthenticatedUser(): Promise<void> {
    try {
      await this.page.goto(this.inventoryUrl, { waitUntil: 'domcontentloaded' });
      await expect(this.page).toHaveURL(/.*inventory\.html/, { timeout: 15_000 });
      await expect(this.loginButton).toHaveCount(0);
      await expect(this.usernameInput).toHaveCount(0);
    } catch (error) {
      throw new Error(
        `User is not authenticated from storageState. Login form may be visible. ${String(error)}`
      );
    }
  }

  async takeScreenshot(filePath: string): Promise<void> {
    await this.page.screenshot({ path: filePath, fullPage: true });
  }
}
