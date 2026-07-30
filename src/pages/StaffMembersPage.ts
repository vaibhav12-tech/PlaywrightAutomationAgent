import { type Locator, type Page, expect } from '@playwright/test';

/**
 * Staff Members list — row actions (overflow → Edit Role and Permissions).
 *
 * Live UI (fulldev):
 * - Rows are nested divs (not ARIA role=row)
 * - Actions control a11y name: "Row actions"
 * - Member text e.g. "som prakash" (case/spelling may vary)
 * - ISI footer can intercept clicks on lower rows
 */
export class StaffMembersPage {
  constructor(readonly page: Page) {}

  private log(message: string): void {
    console.log(`[StaffMembersPage] ${message}`);
  }

  /** Normalize common typos / spacing for member name matching. */
  private memberNameRegex(memberName: string): RegExp {
    const escaped = memberName
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s+')
      .replace(/praksah/gi, 'prakash');
    // Allow surrounding whitespace; do not require whole-page exclusivity.
    return new RegExp(`^\\s*${escaped}\\s*$`, 'i');
  }

  private memberNameCell(memberName: string): Locator {
    return this.page.getByText(this.memberNameRegex(memberName)).first();
  }

  /**
   * Tight row scope: ancestor of the member-name cell that owns a "Row actions" button.
   * Avoids `locator('div, ...')` over the whole page (thousands of nodes → timeouts).
   */
  staffRow(memberName: string): Locator {
    return this.memberNameCell(memberName).locator(
      'xpath=ancestor::*[.//button[@aria-label="Row actions" or normalize-space()="Row actions"]][1]'
    );
  }

  rowActionsButton(row: Locator): Locator {
    return row.getByRole('button', { name: /^row actions$/i });
  }

  readonly editRoleAndPermissionsItem: Locator = this.page
    .getByRole('menuitem', { name: /edit role and permissions|edit role.*permissions|role and permissions/i })
    .or(this.page.getByRole('option', { name: /edit role and permissions/i }))
    .or(this.page.getByText(/^edit role and permissions$/i));

  readonly resultsPerPage: Locator = this.page.getByRole('combobox', {
    name: /results per page/i,
  });

  readonly nextPage: Locator = this.page.getByRole('button', { name: /^next page$/i });

  /** Collapse sticky ISI so it does not intercept clicks on lower table rows. */
  async collapseIsiBanner(): Promise<void> {
    const isiToggle = this.page
      .getByRole('button', { name: /important safety information/i })
      .first();
    if (!(await isiToggle.isVisible().catch(() => false))) return;
    const expanded = await isiToggle.getAttribute('aria-expanded').catch(() => null);
    if (expanded === 'true') {
      this.log('Collapsing Important Safety Information banner');
      await isiToggle.click().catch(() => {});
    }
  }

  async expandResultsPerPage(): Promise<void> {
    const combo = this.page
      .getByRole('combobox', { name: /results per page/i })
      .or(this.page.locator('contentinfo').getByRole('combobox'))
      .first();

    await combo.scrollIntoViewIfNeeded().catch(() => {});
    if (!(await combo.isVisible({ timeout: 15_000 }).catch(() => false))) {
      this.log('Results-per-page combobox not visible — skipping');
      return;
    }

    const current = (await combo.inputValue().catch(() => '')) || '';
    if (current === '100') {
      this.log('Results Per Page already 100');
      return;
    }

    this.log('Setting Results Per Page to 100');
    await combo.selectOption('100').catch(async () => {
      await combo.selectOption({ label: '100' }).catch(async () => {
        await combo.click();
        await this.page.getByRole('option', { name: /^100$/ }).click();
      });
    });
    // Wait for list to refresh after page-size change.
    await this.page
      .getByRole('button', { name: /^row actions$/i })
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 })
      .catch(() => {});
  }

  /**
   * Wait until the member name is visible (current page or after pagination).
   */
  async ensureMemberNameVisible(memberName: string, timeoutMs = 120_000): Promise<Locator> {
    await this.collapseIsiBanner();
    await this.expandResultsPerPage();

    const nameCell = this.memberNameCell(memberName);
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (await nameCell.isVisible().catch(() => false)) {
        this.log(`Found member name cell for "${memberName}"`);
        await nameCell.scrollIntoViewIfNeeded();
        return nameCell;
      }

      const next = this.nextPage.first();
      const canNext =
        (await next.isVisible().catch(() => false)) &&
        (await next.isEnabled().catch(() => false));
      if (!canNext) {
        break;
      }

      this.log(`Member "${memberName}" not on this page — clicking Next`);
      await next.click();
      await this.page
        .getByRole('button', { name: /^previous page$/i })
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 })
        .catch(() => {});
      // Allow the staff list to re-render after page change.
      await this.page.locator('text=Member Name').first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
      await this.collapseIsiBanner();
    }

    throw new Error(
      `Staff member "${memberName}" not found after pagination. ` +
        `url=${this.page.url()}`
    );
  }

  async openActionsForMember(memberName: string): Promise<void> {
    this.log(`Opening Row actions for "${memberName}"`);

    const nameCell = await this.ensureMemberNameVisible(memberName);
    await expect(nameCell).toBeVisible({ timeout: 15_000 });
    await nameCell.scrollIntoViewIfNeeded();

    // Re-collapse ISI after scroll (sticky footer may reappear).
    await this.collapseIsiBanner();

    const row = this.staffRow(memberName);
    await expect(row).toBeVisible({ timeout: 15_000 });

    const actions = this.rowActionsButton(row);
    await expect(actions).toBeVisible({ timeout: 15_000 });
    await expect(actions).toHaveCount(1);

    this.log('Scrolling Row actions into view and clicking');
    await actions.scrollIntoViewIfNeeded();
    await actions.click({ trial: true }).catch(() => {});
    await actions.click({ force: true });

    // Menu should open — Edit Role item or any menu.
    await expect(
      this.editRoleAndPermissionsItem
        .or(this.page.getByRole('menu'))
        .or(this.page.getByRole('menuitem'))
        .first()
    ).toBeVisible({ timeout: 15_000 });
    this.log('Row actions menu opened');
  }

  async chooseEditRoleAndPermissions(): Promise<void> {
    this.log('Selecting "Edit Role and Permissions"');
    const item = this.editRoleAndPermissionsItem.first();
    await expect(item).toBeVisible({ timeout: 20_000 });
    await item.click();
  }

  async openEditRoleAndPermissionsFor(memberName: string): Promise<void> {
    await this.openActionsForMember(memberName);
    await this.chooseEditRoleAndPermissions();
  }
}
