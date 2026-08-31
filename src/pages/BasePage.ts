import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Shared Page Object base — navigation, screenshots, and common expect helpers.
 * Screen pages extend this; reusable widgets live under `src/pages/components/`.
 */
export abstract class BasePage {
  constructor(readonly page: Page) {}

  /** Absolute or path-relative navigation with a sensible default wait. */
  async goto(
    url: string,
    options?: { waitUntil?: 'load' | 'domcontentloaded' | 'commit'; timeout?: number }
  ): Promise<void> {
    await this.page.goto(url, {
      waitUntil: options?.waitUntil ?? 'domcontentloaded',
      timeout: options?.timeout,
    });
  }

  async takeScreenshot(filePath: string, fullPage = true): Promise<void> {
    await this.page.screenshot({ path: filePath, fullPage });
  }

  async expectUrlMatches(pattern: RegExp, timeout = 15_000): Promise<void> {
    await expect(this.page).toHaveURL(pattern, { timeout });
  }

  async expectVisible(locator: Locator, timeout = 15_000): Promise<void> {
    await expect(locator).toBeVisible({ timeout });
  }

  /** Resolve app base URL from env (loyalty) with a safe default. */
  protected loyaltyBaseUrl(): string {
    return (
      process.env.BASE_URL?.replace(/\/$/, '') ||
      'https://revance-loyalty-git-dev-revances-projects.vercel.app'
    );
  }
}
