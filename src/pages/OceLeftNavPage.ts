import { type Locator, type Page, expect } from '@playwright/test';

/**
 * OCE / Experience Cloud — left navigation (hamburger) → Practice Settings → Staff.
 */
export class OceLeftNavPage {
  constructor(readonly page: Page) {}

  /** Top-left hamburger — live a11y name: "Toggle navigation menu". */
  readonly menuToggle: Locator = this.page
    .getByRole('button', { name: /toggle navigation menu/i })
    .or(this.page.getByRole('button', { name: /^(menu|navigation|main menu|open menu|show menu)$/i }))
    .or(this.page.locator('button[aria-label*="menu" i], button[title*="menu" i], a[aria-label*="menu" i]'))
    .or(this.page.locator('[data-testid*="hamburger" i], [class*="hamburger" i], [class*="menu-toggle" i]'));

  readonly leftNavPanel: Locator = this.page
    .getByRole('navigation', { name: /main|primary|practice|menu/i })
    .or(this.page.getByRole('navigation'))
    .or(this.page.locator('[class*="slds-nav-vertical" i], [class*="sidebar" i], [class*="left-nav" i], aside'))
    .or(this.page.locator('[role="dialog"][aria-label*="menu" i], [class*="drawer" i]'));

  readonly practiceSettingsItem: Locator = this.page
    .getByRole('link', { name: /^practice settings$/i })
    .or(this.page.getByRole('button', { name: /^practice settings$/i }))
    .or(this.page.getByRole('menuitem', { name: /^practice settings$/i }))
    .or(this.page.getByText(/^practice settings$/i));

  readonly staffItem: Locator = this.page
    .getByRole('link', { name: /^staff$/i })
    .or(this.page.getByRole('button', { name: /^staff$/i }))
    .or(this.page.getByRole('menuitem', { name: /^staff$/i }))
    .or(this.page.getByText(/^staff$/i));

  readonly staffMemberPageMarker: Locator = this.page
    .getByRole('heading', { name: /staff member|staff members|^staff$/i })
    .or(this.page.getByText(/staff members|manage staff|edit staff|staff member/i))
    .or(this.page.locator('[data-testid*="staff" i], [class*="staff" i]').filter({ hasText: /staff/i }));

  async openLeftNav(): Promise<void> {
    // If nav/panel already shows Practice Settings, skip toggle.
    if (await this.practiceSettingsItem.first().isVisible().catch(() => false)) {
      return;
    }

    const toggle = this.menuToggle.first();
    await expect(toggle).toBeVisible({ timeout: 30_000 });
    await toggle.click();
  }

  async expectLeftNavVisible(): Promise<void> {
    // Panel chrome OR a known menu item is enough to prove the left nav opened.
    const panelVisible = await this.leftNavPanel.first().isVisible().catch(() => false);
    if (panelVisible) {
      await expect(this.leftNavPanel.first()).toBeVisible({ timeout: 15_000 });
    }
    await expect(this.practiceSettingsItem.first()).toBeVisible({ timeout: 30_000 });
  }

  async openPracticeSettings(): Promise<void> {
    const item = this.practiceSettingsItem.first();
    await expect(item).toBeVisible({ timeout: 30_000 });
    await item.click();
  }

  async expectStaffOptionVisible(): Promise<void> {
    await expect(this.staffItem.first()).toBeVisible({ timeout: 30_000 });
  }

  async openStaff(): Promise<void> {
    const item = this.staffItem.first();
    await expect(item).toBeVisible({ timeout: 30_000 });
    await item.click();
  }

  async expectStaffMemberPageVisible(): Promise<void> {
    // Prefer UI marker — URL slug varies by org; staff in URL is a bonus signal only.
    await expect(this.staffMemberPageMarker.first()).toBeVisible({ timeout: 60_000 });
  }

  /** Full path: hamburger → Practice Settings → Staff → Staff Member page. */
  async navigateToStaffMemberPage(): Promise<void> {
    await this.openLeftNav();
    await this.expectLeftNavVisible();
    await this.openPracticeSettings();
    await this.expectStaffOptionVisible();
    await this.openStaff();
    await this.expectStaffMemberPageVisible();
  }
}
