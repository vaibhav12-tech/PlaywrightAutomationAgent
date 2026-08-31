import { expect } from '@playwright/test';
import { BasePage } from '../BasePage';
import { SauceLoginFormComponent } from '../components/SauceLoginFormComponent';

/**
 * SauceDemo Login Page — https://www.saucedemo.com/
 * Form repository: SauceLoginFormComponent; flows stay on this page object.
 */
export class LoginPage extends BasePage {
  readonly url = 'https://www.saucedemo.com/';
  readonly inventoryUrl = 'https://www.saucedemo.com/inventory.html';

  readonly form: SauceLoginFormComponent;
  readonly productsTitle;

  constructor(page: ConstructorParameters<typeof BasePage>[0]) {
    super(page);
    this.form = new SauceLoginFormComponent(page);
    this.productsTitle = page.locator('[data-test="title"]');
  }

  /** Back-compat aliases used by existing specs. */
  get usernameInput() {
    return this.form.usernameInput;
  }
  get passwordInput() {
    return this.form.passwordInput;
  }
  get loginButton() {
    return this.form.loginButton;
  }
  get errorMessage() {
    return this.form.errorMessage;
  }

  async goto(): Promise<void> {
    try {
      await super.goto(this.url);
      await expect(this.loginButton).toBeVisible({ timeout: 15_000 });
    } catch (error) {
      throw new Error(
        `Failed to open SauceDemo login page at ${this.url}: ${String(error)}`
      );
    }
  }

  async login(username: string, password: string): Promise<void> {
    try {
      await this.form.submit(username, password);
    } catch (error) {
      throw new Error(`Login action failed: ${String(error)}`);
    }
  }

  async expectLoginSuccess(): Promise<void> {
    await expect(this.page).toHaveURL(/.*inventory\.html/, { timeout: 15_000 });
    await expect(this.errorMessage).toHaveCount(0);
    await expect(this.loginButton).toHaveCount(0);
    await expect(this.productsTitle).toHaveText('Products');
  }

  /**
   * Opens inventory using an existing storageState session (no login UI).
   */
  async openAsAuthenticatedUser(): Promise<void> {
    const sessionCookie = (await this.page.context().cookies(this.url)).find(
      (c) => c.name === 'session-username'
    );

    if (!sessionCookie?.value) {
      throw new Error(
        'User is not authenticated from storageState: session-username cookie is missing ' +
          'or was dropped (often expired). Re-run chrome-setup / session globalSetup.'
      );
    }

    try {
      await this.page.goto(this.inventoryUrl, { waitUntil: 'load' });
      await expect(this.productsTitle).toHaveText('Products', { timeout: 15_000 });
      await expect(this.page).toHaveURL(/.*inventory\.html/);
      await expect(this.errorMessage).toHaveCount(0);
      await expect(this.loginButton).toHaveCount(0);
      await expect(this.usernameInput).toHaveCount(0);
    } catch (error) {
      const banner = (await this.errorMessage.textContent().catch(() => null))?.trim();
      throw new Error(
        `User is not authenticated from storageState` +
          (banner ? ` (UI: ${banner})` : '') +
          `. ${String(error)}`
      );
    }
  }
}
