import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * REVA loyalty Home / dashboard after enrollment or login.
 */
export class HomePage extends BasePage {
  async goto() {
    await super.goto(new URL('/dashboard', this.loyaltyBaseUrl() + '/').toString());
  }

  /** Dismiss welcome-onboarding overlays that can cover the Home greeting. */
  async dismissOnboardingIfPresent() {
    const overlay = this.page.locator(
      '.reva-welcome-onboarding-overlay, [role="dialog"][aria-labelledby="welcome-rewards-title"]'
    );
    for (let i = 0; i < 8; i++) {
      if (!(await overlay.first().isVisible({ timeout: 2_000 }).catch(() => false))) return;
      const primary = overlay
        .first()
        .getByRole('button', { name: /^(next|continue|done|finish|get started|start earning)$/i })
        .or(overlay.first().locator('button.reva-welcome-onboarding-btn-primary'))
        .first();
      if (await primary.isVisible().catch(() => false)) {
        await primary.click();
        continue;
      }
      const close = overlay.first().getByRole('button', { name: /close|dismiss/i }).first();
      if (await close.isVisible().catch(() => false)) {
        await close.click();
      }
      return;
    }
  }

  /**
   * Home greeting is "Welcome, {firstName}" (sometimes split across lines).
   * Confirms it matches the enrolled name from the enrollment API response.
   */
  async expectEnrolledUserName(expectedName: string) {
    await this.dismissOnboardingIfPresent();
    const name = expectedName.trim();
    const heading = this.page
      .getByRole('heading', { name: new RegExp(`Welcome,?\\s*${escapeRegExp(name)}`, 'i') })
      .or(this.page.locator('h1').filter({ hasText: new RegExp(escapeRegExp(name), 'i') }));
    await expect(heading.first()).toBeVisible({ timeout: 60_000 });
    await expect(this.page.getByText(name, { exact: true }).first()).toBeVisible();
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
