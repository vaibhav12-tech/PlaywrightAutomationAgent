import { type Locator, type Page, expect } from '@playwright/test';

/**
 * OCE / Experience Cloud — left navigation (hamburger) → Practice Settings → Staff.
 *
 * Root cause (Practice Settings "hidden"):
 * The drawer keeps nav markup in the DOM while collapsed. Labels live in
 * `<span class="nav-text">Practice Settings</span>` which Playwright reports as hidden.
 * Locators that use getByText(...).or(...).first() resolve to that span and fail toBeVisible.
 *
 * Fix pattern:
 * - Expand hamburger until aria-expanded / visible nav link is true
 * - Target only role=link inside Main navigation
 * - filter({ visible: true }) so hidden duplicates are ignored
 * - Never use getByText for nav labels
 */
export class OceLeftNavPage {
  constructor(readonly page: Page) {}

  /** Top-left hamburger — live a11y name: "Toggle navigation menu". */
  readonly menuToggle: Locator = this.page.getByRole('button', {
    name: /toggle navigation menu/i,
  });

  /** Live a11y name: "Main navigation". */
  readonly leftNavPanel: Locator = this.page.getByRole('navigation', {
    name: /main navigation/i,
  });

  /**
   * Visible Practice Settings control only.
   * Scoped to Main navigation + role=link + visible filter —
   * avoids the collapsed span.nav-text duplicate.
   */
  readonly practiceSettingsItem: Locator = this.leftNavPanel
    .getByRole('link', { name: /^practice settings$/i })
    .filter({ visible: true });

  /**
   * Practice Settings hub card: button named "Staff" (not the Staff Members list page).
   */
  readonly staffHubCard: Locator = this.page
    .getByRole('button', { name: /^staff$/i })
    .filter({ visible: true });

  /** True Staff Members list markers — not the hub "Staff" card heading. */
  readonly staffMemberPageMarker: Locator = this.page
    .getByRole('heading', { name: /^staff members$/i })
    .or(this.page.getByRole('button', { name: /^invite staff member$/i }))
    .or(this.page.getByText(/^member name$/i))
    .filter({ visible: true });

  private async isMenuExpanded(): Promise<boolean> {
    const toggle = this.menuToggle.first();
    const expanded = await toggle.getAttribute('aria-expanded').catch(() => null);
    if (expanded === 'true') return true;
    if (await this.practiceSettingsItem.count().then((n) => n > 0).catch(() => false)) {
      return true;
    }
    if (await this.leftNavPanel.isVisible().catch(() => false)) return true;
    return false;
  }

  /** Expand the left drawer; required before any nav-item visibility assert. */
  async openLeftNav(): Promise<void> {
    if (await this.isMenuExpanded()) {
      return;
    }

    const toggle = this.menuToggle.first();
    await expect(toggle, 'Hamburger "Toggle navigation menu" should be visible').toBeVisible({
      timeout: 30_000,
    });

    for (let attempt = 1; attempt <= 3; attempt++) {
      await toggle.click();
      try {
        await expect
          .poll(async () => this.isMenuExpanded(), {
            timeout: 8_000,
            intervals: [200, 400, 800],
          })
          .toBeTruthy();
        return;
      } catch {
        // Overlay / animation — retry toggle
      }
    }

    throw new Error(
      `Left nav did not expand after toggling hamburger (aria-expanded still false). url=${this.page.url()}`
    );
  }

  async expectLeftNavVisible(): Promise<void> {
    await this.openLeftNav();
    await expect(this.leftNavPanel).toBeVisible({ timeout: 15_000 });
    await expect(
      this.practiceSettingsItem,
      'Practice Settings link must be visible inside expanded Main navigation'
    ).toBeVisible({ timeout: 30_000 });
  }

  async openPracticeSettings(): Promise<void> {
    const hubHeading = this.page.getByRole('heading', { name: /^practice settings$/i });
    if (await hubHeading.isVisible().catch(() => false)) {
      return;
    }

    await this.expectLeftNavVisible();
    await this.practiceSettingsItem.click();
    await expect(hubHeading).toBeVisible({ timeout: 60_000 });
  }

  async expectStaffOptionVisible(): Promise<void> {
    if (await this.staffMemberPageMarker.first().isVisible().catch(() => false)) {
      return;
    }
    await expect(this.staffHubCard.first()).toBeVisible({ timeout: 30_000 });
  }

  async openStaff(): Promise<void> {
    if (await this.staffMemberPageMarker.first().isVisible().catch(() => false)) {
      return;
    }

    await expect(this.staffHubCard.first()).toBeVisible({ timeout: 30_000 });
    await this.staffHubCard.first().click();
  }

  async expectStaffMemberPageVisible(): Promise<void> {
    await expect(this.staffMemberPageMarker.first()).toBeVisible({ timeout: 60_000 });
  }

  /** Fallback when drawer interaction is blocked (overlay / timing). */
  async gotoStaffViaUrl(): Promise<void> {
    const origin = new URL(this.page.url()).origin;
    const candidates = [
      `${origin}/practice-settings`,
      `${origin}/s/practice-settings`,
      `${origin}/practice-settings/staff`,
      `${origin}/s/practice-settings/staff`,
    ];

    for (const url of candidates) {
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });

      if (await this.staffMemberPageMarker.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        return;
      }

      const staffBtn = this.staffHubCard.first();
      if (await staffBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await staffBtn.click();
        if (
          await this.staffMemberPageMarker.first().isVisible({ timeout: 20_000 }).catch(() => false)
        ) {
          return;
        }
      }
    }

    throw new Error(`Could not reach Staff Members via URL fallback. url=${this.page.url()}`);
  }

  /** Full path: hamburger → Practice Settings → Staff card → Staff Members list. */
  async navigateToStaffMemberPage(): Promise<void> {
    try {
      await this.openLeftNav();
      await this.expectLeftNavVisible();
      await this.openPracticeSettings();
      await this.expectStaffOptionVisible();
      await this.openStaff();
      await this.expectStaffMemberPageVisible();
    } catch (navError) {
      console.warn(
        `[OceLeftNavPage] Drawer nav failed (${String(navError)}). Falling back to URL.`
      );
      await this.gotoStaffViaUrl();
      await this.expectStaffMemberPageVisible();
    }
  }
}
