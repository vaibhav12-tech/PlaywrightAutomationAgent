import { type Locator, type Page, expect } from '@playwright/test';

/**
 * Staff Members list — row actions (overflow → Edit Role and Permissions).
 *
 * Live UI (fulldev / headless):
 * - Rows are nested divs (not ARIA role=row)
 * - Actions control a11y name: "Row actions"
 * - Member name is exact visible text (e.g. "som prakash")
 * - Table is paginated — must walk Next until found or last page
 * - ISI footer can intercept clicks on lower rows
 */
export class StaffMembersPage {
  constructor(readonly page: Page) {}

  private log(message: string): void {
    console.log(`[StaffMembersPage] ${message}`);
  }

  /** Exact member-name match (case-insensitive, collapse whitespace). No typo rewriting. */
  private memberNameRegex(memberName: string): RegExp {
    const escaped = memberName
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s+');
    return new RegExp(`^\\s*${escaped}\\s*$`, 'i');
  }

  /**
   * Visible name cell only — never match hidden / off-page duplicates.
   * Do not use `.first()` on a non-visible filter; callers assert uniqueness.
   */
  memberNameCell(memberName: string): Locator {
    return this.page
      .getByText(this.memberNameRegex(memberName))
      .filter({ visible: true });
  }

  /**
   * Row that owns this member's "Row actions" button.
   * Scoped from the visible name cell upward — avoids whole-page div scans.
   */
  staffRow(memberName: string): Locator {
    return this.memberNameCell(memberName)
      .locator(
        'xpath=ancestor::*[.//button[@aria-label="Row actions" or normalize-space()="Row actions"]][1]'
      )
      .filter({ visible: true });
  }

  rowActionsButton(row: Locator): Locator {
    return row.getByRole('button', { name: /^row actions$/i }).filter({ visible: true });
  }

  readonly editRoleAndPermissionsItem: Locator = this.page
    .getByRole('menuitem', {
      name: /edit role and permissions|edit role.*permissions|role and permissions/i,
    })
    .filter({ visible: true });

  readonly nextPage: Locator = this.page
    .getByRole('button', { name: /^next page$/i })
    .filter({ visible: true });

  readonly previousPage: Locator = this.page
    .getByRole('button', { name: /^previous page$/i })
    .filter({ visible: true });

  readonly memberNameHeader: Locator = this.page.getByText(/^member name$/i).filter({
    visible: true,
  });

  /** Collapse sticky ISI so it does not intercept clicks on lower table rows. */
  async collapseIsiBanner(): Promise<void> {
    const isiToggle = this.page
      .getByRole('button', { name: /important safety information/i })
      .filter({ visible: true });
    if ((await isiToggle.count()) === 0) return;
    const expanded = await isiToggle.first().getAttribute('aria-expanded').catch(() => null);
    if (expanded === 'true') {
      this.log('Collapsing Important Safety Information banner');
      await isiToggle.first().click();
    }
  }

  async expandResultsPerPage(): Promise<void> {
    // Combobox sits under the table / in contentinfo — scroll before visibility checks.
    await this.collapseIsiBanner();
    await this.page
      .locator('contentinfo, footer, nav[aria-label*="pagination" i]')
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});

    const combo = this.page
      .getByRole('combobox', { name: /results per page/i })
      .or(this.page.locator('contentinfo').getByRole('combobox'))
      .or(this.page.getByLabel(/results per page/i));

    const appeared = await combo
      .first()
      .waitFor({ state: 'visible', timeout: 12_000 })
      .then(() => true)
      .catch(() => false);

    if (!appeared) {
      this.log('Results-per-page combobox not visible after scroll — will paginate');
      return;
    }

    const control = combo.first();
    await control.scrollIntoViewIfNeeded();
    const current =
      (await control.inputValue().catch(() => '')) ||
      (await control.evaluate((el) => (el as HTMLSelectElement).value).catch(() => '')) ||
      '';
    if (current === '100' || /100/.test(current)) {
      this.log('Results Per Page already 100');
      return;
    }

    this.log('Setting Results Per Page to 100 (avoid multi-page Next clicks)');
    await control.selectOption('100').catch(async () => {
      await control.selectOption({ label: '100' }).catch(async () => {
        await control.click();
        await this.page.getByRole('option', { name: /^100$/ }).click();
      });
    });

    // List reloads after page-size change — wait for table chrome.
    await expect(this.memberNameHeader.first()).toBeVisible({ timeout: 20_000 });
    await expect(this.page.getByRole('button', { name: /^row actions$/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  }

  private async canGoNextPage(): Promise<boolean> {
    const next = this.nextPage;
    if ((await next.count()) === 0) return false;
    return next.first().isEnabled().catch(() => false);
  }

  /**
   * Search current page, then Next Page until member is found or last page.
   * Fails with a clear error if the record does not exist.
   */
  async findMemberAcrossPages(memberName: string, timeoutMs = 180_000): Promise<Locator> {
    await this.collapseIsiBanner();
    await this.expandResultsPerPage();
    await expect(this.memberNameHeader.first()).toBeVisible({ timeout: 30_000 });

    // Fast path: already visible on current page (e.g. second open after Update).
    const existing = this.memberNameCell(memberName);
    if ((await existing.count()) === 1 && (await existing.isVisible().catch(() => false))) {
      this.log(`Found "${memberName}" on current staff list page (no pagination)`);
      await existing.scrollIntoViewIfNeeded();
      return existing;
    }

    const deadline = Date.now() + timeoutMs;
    let pageIndex = 1;

    while (Date.now() < deadline) {
      const nameCell = this.memberNameCell(memberName);
      const visibleCount = await nameCell.count();

      if (visibleCount > 0) {
        expect(
          visibleCount,
          `Expected exactly one visible "${memberName}" on page ${pageIndex}, found ${visibleCount}`
        ).toBe(1);
        const cell = nameCell.first();
        await expect(cell).toBeVisible({ timeout: 5_000 });
        await expect(cell).toHaveText(this.memberNameRegex(memberName));
        this.log(`Found "${memberName}" on staff list page ${pageIndex}`);
        await cell.scrollIntoViewIfNeeded();
        return cell;
      }

      if (!(await this.canGoNextPage())) {
        break;
      }

      this.log(`"${memberName}" not on page ${pageIndex} — clicking Next Page`);
      await this.nextPage.first().click();
      await expect(this.previousPage.first()).toBeVisible({ timeout: 15_000 });
      await expect(this.memberNameHeader.first()).toBeVisible({ timeout: 15_000 });
      await this.collapseIsiBanner();
      pageIndex += 1;
    }

    throw new Error(
      `Staff member "${memberName}" was not found after searching all pages ` +
        `(stopped on page ${pageIndex}). url=${this.page.url()}`
    );
  }

  /** @deprecated Use findMemberAcrossPages — kept for callers that expect the old name. */
  async ensureMemberNameVisible(memberName: string, timeoutMs = 180_000): Promise<Locator> {
    return this.findMemberAcrossPages(memberName, timeoutMs);
  }

  /**
   * Before Row Actions: assert exact visible name, visible row, single matching row.
   */
  async expectExactMemberRow(memberName: string): Promise<Locator> {
    await this.findMemberAcrossPages(memberName);

    const nameCell = this.memberNameCell(memberName);
    await expect(nameCell).toHaveCount(1);
    await expect(nameCell).toBeVisible();
    await expect(nameCell).toHaveText(this.memberNameRegex(memberName));

    const row = this.staffRow(memberName);
    await expect(row).toHaveCount(1);
    await expect(row).toBeVisible();
    // Row includes permissions/locations/email — assert name as substring, not whole-row ^$ match.
    const nameSub = memberName
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s+');
    await expect(row).toContainText(new RegExp(nameSub, 'i'));
    await expect(this.rowActionsButton(row)).toHaveCount(1);

    return row;
  }

  async openActionsForMember(memberName: string): Promise<void> {
    this.log(`Opening Row actions for "${memberName}"`);
    const row = await this.expectExactMemberRow(memberName);
    await this.collapseIsiBanner();

    const actions = this.rowActionsButton(row);
    await expect(actions).toHaveCount(1);
    await expect(actions).toBeVisible({ timeout: 15_000 });
    await actions.scrollIntoViewIfNeeded();
    await actions.click();

    await expect(this.editRoleAndPermissionsItem).toBeVisible({ timeout: 15_000 });
    this.log('Row actions menu opened');
  }

  async chooseEditRoleAndPermissions(): Promise<void> {
    this.log('Selecting "Edit Role and Permissions"');
    await expect(this.editRoleAndPermissionsItem).toBeVisible({ timeout: 20_000 });
    await this.editRoleAndPermissionsItem.click();
  }

  async openEditRoleAndPermissionsFor(memberName: string): Promise<void> {
    await this.openActionsForMember(memberName);
    await this.chooseEditRoleAndPermissions();
  }
}
