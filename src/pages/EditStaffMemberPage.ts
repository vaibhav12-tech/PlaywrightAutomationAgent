import { type Locator, type Page, expect } from '@playwright/test';
import { StaffIdentityFieldsComponent } from './components/StaffIdentityFieldsComponent';

/**
 * Provider Contact Management — Edit Staff Member modal (BL10-550).
 * Identity fields are owned by StaffIdentityFieldsComponent (component POM).
 */
export class EditStaffMemberPage {
  readonly identity: StaffIdentityFieldsComponent;

  constructor(readonly page: Page) {
    this.identity = new StaffIdentityFieldsComponent(page);
  }

  /** Live OCE: textbox "First Name"; fixture: data-testid / name=firstName. */
  get firstName(): Locator {
    return this.identity.firstName;
  }

  /** Live OCE: textbox "Last Name"; fixture: data-testid / name=lastName. */
  get lastName(): Locator {
    return this.identity.lastName;
  }

  /** Live OCE: textbox "Email address"; fixture: data-testid / type=email. */
  get email(): Locator {
    return this.identity.email;
  }

  readonly modal: Locator = this.page
    .locator('[data-testid="edit-staff-modal"], [data-test="edit-staff-modal"], [role="dialog"]')
    .filter({ hasText: /edit staff|edit role|role and permissions|role & permissions|staff member/i })
    .or(
      this.page
        .getByRole('heading', { name: /edit role and permissions|edit staff member/i })
        .locator('xpath=ancestor::*[@role="dialog" or contains(@class,"modal") or contains(@class,"slds-modal")][1]')
    );

  /** Modal title — live Svelte (`#invite-staff-title`) or fixture (`Staff Member: …`). */
  readonly editDialogTitle: Locator = this.page
    .locator('#invite-staff-title')
    .or(this.page.getByRole('heading', { name: /^edit staff member$/i }))
    .or(this.page.getByRole('heading', { name: /^staff member:/i }))
    .or(this.page.getByRole('dialog', { name: /edit staff member/i }));

  /** Edit Staff Member modal layer (Svelte live UI or fixture dialog). */
  readonly editDialog: Locator = this.page
    .getByRole('dialog', { name: /edit staff member/i })
    .or(
      this.page.locator('div.modal-layer').filter({
        has: this.page.locator('#invite-staff-title'),
      })
    );

  /**
   * Practice Role — native `<select>` (fixture / updated UI) with live custom-trigger fallbacks.
   */
  readonly practiceRoleTrigger: Locator = this.page
    .getByRole('combobox', { name: /^practice role$/i })
    .or(this.page.getByLabel(/^practice role$/i))
    .or(this.page.locator('[data-testid="practice-role"], select[name="practiceRole"], #practiceRole'))
    .or(
      this.page
        .getByRole('dialog', { name: /edit staff member/i })
        .getByRole('button', { name: /^practice role$/i })
    )
    .or(this.page.getByRole('button', { name: /^practice role$/i }))
    .or(
      this.page
        .getByRole('dialog', { name: /edit staff member/i })
        .locator('xpath=.//form/div/div[5]/div/div')
    )
    .or(this.page.locator('xpath=/html/body/div/div[1]/div/div/div/div[2]/div/form/div/div[5]/div/div'));

  readonly practiceRole: Locator = this.practiceRoleTrigger;

  /**
   * Proof the custom multi-select list is OPEN.
   * Do NOT use role names that also appear in the closed summary
   * (e.g. "Business Owner, Injector" on the trigger).
   * Open panel shows a "Practice Roles" header + discrete option rows.
   */
  readonly practiceRoleListOpenMarker: Locator = this.page
    .getByText(/^practice roles$/i)
    .or(this.page.getByRole('listbox', { name: /practice role/i }))
    .or(
      this.page
        .locator('[role="listbox"], [role="menu"], [class*="dropdown" i], [class*="popover" i]')
        .filter({ hasText: /^front desk$/i })
    );

  readonly permissions: Locator = this.page
    .getByRole('combobox', { name: /^permissions$/i })
    .or(this.page.getByLabel(/^permissions$/i))
    .or(
      this.page.locator(
        '[data-testid="permissions"], [data-test="permissions"], select[name="permissions"], #permissions'
      )
    );

  /** Location(s) — native multi-select / listbox (updated UI) with legacy fallbacks. */
  readonly locations: Locator = this.page
    .getByRole('listbox', { name: /location/i })
    .or(this.page.getByLabel(/^location\(s\)$/i))
    .or(this.page.getByLabel(/^locations?$/i))
    .or(
      this.page.locator(
        '[data-testid="locations"], [data-test="locations"], select[name="locations"], #locations'
      )
    );
  readonly locationsHelper: Locator = this.page.getByText(
    /all locations are accessible to admin/i
  );

  readonly updateButton: Locator = this.page.getByRole('button', {
    name: /update staff member/i,
  });
  readonly cancelButton: Locator = this.page.getByRole('button', { name: /^cancel$/i });

  readonly successToast: Locator = this.page
    .getByRole('status')
    .or(this.page.getByRole('alert'))
    .or(this.page.locator('[class*="toast" i], [class*="slds-notify" i], [class*="success" i]'))
    .filter({ hasText: /success|updated|saved|staff member.*updated/i });

  readonly errorState: Locator = this.page.locator(
    '[data-testid="edit-staff-error"], [data-test="edit-staff-error"], [role="alert"]'
  );
  readonly locationsEmptyError: Locator = this.page.locator(
    '[data-testid="locations-empty-error"], [data-test="locations-empty-error"]'
  ).or(this.page.getByText(/at least one location must be selected/i));

  readonly practiceRoleOptions = [
    'Business Owner',
    'Front Desk',
    'Injector',
    'Marketing',
    'Patient Coordinator',
    'Practice Manager',
  ] as const;

  async loadUiContractFixture(html: string): Promise<void> {
    // page.setContent is the correct Playwright API for offline HTML fixtures.
    // In headed runs the address bar shows 'about:blank' — that is expected
    // behaviour (no real server needed). We call waitUntil:'domcontentloaded'
    // so locators are immediately available after this call.
    await this.page.setContent(html, { waitUntil: 'domcontentloaded' });
  }

  /** Live subtitle: "Staff Member: som prakash". */
  staffMemberSubtitle(memberName: string): Locator {
    const escaped = memberName
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s+');
    return this.page
      .getByText(new RegExp(`staff\\s*member\\s*:\\s*${escaped}`, 'i'))
      .filter({ visible: true });
  }

  /** Closed Practice Role trigger summary inside the Edit dialog. */
  practiceRoleClosedSummary(): Locator {
    const dialog = this.page.getByRole('dialog', { name: /edit staff member/i });
    return dialog
      .getByRole('button', { name: /^practice role$/i })
      .or(dialog.getByRole('combobox', { name: /^practice role$/i }))
      .or(dialog.locator('[data-testid="practice-role"], select[name="practiceRole"]'))
      .filter({ visible: true })
      .first();
  }

  async expectModalVisible(): Promise<void> {
    const dialog = this.page.getByRole('dialog', { name: /edit staff member/i });
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await expect(this.editDialogTitle.first()).toBeVisible({ timeout: 30_000 });
    await expect(
      dialog
        .getByRole('combobox', { name: /^practice role$/i })
        .or(dialog.getByLabel(/^practice role$/i))
        .or(dialog.getByText(/^practice role$/i))
        .first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      dialog
        .getByRole('listbox', { name: /location/i })
        .or(dialog.getByLabel(/^location\(s\)$/i))
        .or(dialog.getByText(/^location\(s\)$/i))
        .or(dialog.getByText(/admins? have access to all locations/i))
        .first()
    ).toBeVisible({ timeout: 20_000 });
  }

  /**
   * Fail if the open modal is for a different employee
   * (e.g. "Staff Member: Surya tstuser" when expecting "som prakash").
   */
  async expectModalForMember(memberName: string): Promise<void> {
    await this.expectModalVisible();

    const parts = memberName.trim().split(/\s+/);
    const first = parts[0] ?? '';
    const last = parts.slice(1).join(' ');

    await expect(
      this.staffMemberSubtitle(memberName),
      `Edit modal must show "Staff Member: ${memberName}" — wrong employee was opened`
    ).toBeVisible({ timeout: 20_000 });

    const dialog = this.page.getByRole('dialog', { name: /edit staff member/i });
    if (first) {
      await expect(dialog.getByRole('textbox', { name: /^first name$/i })).toHaveValue(
        new RegExp(`^\\s*${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i')
      );
    }
    if (last) {
      await expect(dialog.getByRole('textbox', { name: /^last name$/i })).toHaveValue(
        new RegExp(`^\\s*${last.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i')
      );
    }
  }

  async expectIdentityReadOnly(): Promise<void> {
    const dialog = this.page
      .getByRole('dialog', { name: /edit staff member/i })
      .or(this.editDialog)
      .first();

    // Live OCE uses accessible names; fixture uses data-testid / name attrs.
    const first = dialog
      .getByRole('textbox', { name: /^first name$/i })
      .or(dialog.getByLabel(/^first name$/i))
      .or(dialog.locator('[data-testid="staff-first-name"], #firstName, input[name="firstName"]'))
      .first();
    const last = dialog
      .getByRole('textbox', { name: /^last name$/i })
      .or(dialog.getByLabel(/^last name$/i))
      .or(dialog.locator('[data-testid="staff-last-name"], #lastName, input[name="lastName"]'))
      .first();
    const mail = dialog
      .getByRole('textbox', { name: /^email address$/i })
      .or(dialog.getByLabel(/^email( address)?$/i))
      .or(dialog.locator('[data-testid="staff-email"], input[type="email"], input[name="email"]'))
      .first();

    await expect(first).toBeVisible({ timeout: 20_000 });
    await expect(last).toBeVisible({ timeout: 20_000 });
    await expect(mail).toBeVisible({ timeout: 20_000 });

    // Prefer disabled; some builds use readonly without the disabled attribute.
    for (const field of [first, last, mail]) {
      const disabled = await field.isDisabled().catch(() => false);
      if (disabled) {
        await expect(field).toBeDisabled();
        continue;
      }
      const readonly = await field.getAttribute('readonly');
      expect(
        readonly !== null,
        'Identity field should be disabled or readonly'
      ).toBeTruthy();
    }
  }

  private log(message: string): void {
    console.log(`[EditStaffMemberPage] ${message}`);
  }

  async getPracticeRoleOptions(): Promise<string[]> {
    return [...this.practiceRoleOptions];
  }

  /**
   * Clickable row for a role inside the OPEN custom multi-select list.
   * Prefer list/menu item containers — never the closed trigger's comma-separated summary.
   */
  practiceRoleListItem(role: string): Locator {
    const roleRe = new RegExp(`^\\s*${role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
    // Prefer options inside an open list/popover — never the closed trigger summary.
    const openPanel = this.page
      .locator('[role="listbox"], [role="menu"], [class*="dropdown" i], [class*="popover" i], [class*="menu" i]')
      .filter({ has: this.page.getByText(/^practice roles$/i) })
      .or(
        this.page
          .locator('[role="listbox"], [role="menu"]')
          .filter({ hasText: roleRe })
      );

    return openPanel
      .getByRole('option', { name: roleRe })
      .or(openPanel.getByRole('menuitemcheckbox', { name: roleRe }))
      .or(openPanel.locator('li, label, [role="option"], [role="menuitemcheckbox"]').filter({ hasText: roleRe }))
      .or(this.page.getByRole('menuitemcheckbox', { name: roleRe }))
      .or(this.page.getByRole('option', { name: roleRe }))
      .filter({ visible: true });
  }

  private async isPracticeRoleItemSelected(item: Locator): Promise<boolean> {
    // Prefer explicit a11y state on THIS row only (no ancestor walks — those false-positive).
    const ariaSelected = await item.getAttribute('aria-selected').catch(() => null);
    if (ariaSelected === 'true') return true;
    if (ariaSelected === 'false') return false;
    const ariaChecked = await item.getAttribute('aria-checked').catch(() => null);
    if (ariaChecked === 'true') return true;
    if (ariaChecked === 'false') return false;
    const dataState = await item.getAttribute('data-state').catch(() => null);
    if (dataState === 'checked' || dataState === 'selected') return true;

    // Live UI: selected rows show a checkmark SVG on the right of the option.
    const hasCheck = await item
      .evaluate((el) => {
        const svgs = Array.from(el.querySelectorAll('svg'));
        // Chevron-only rows usually have 0; selected rows have a small check glyph.
        return svgs.some((svg) => {
          const box = svg.getBoundingClientRect();
          return box.width > 0 && box.height > 0 && box.width <= 28 && box.height <= 28;
        });
      })
      .catch(() => false);
    return Boolean(hasCheck);
  }

  /** Roles currently shown on the closed Practice Role trigger (comma-separated summary). */
  async getPracticeRolesFromClosedSummary(): Promise<string[]> {
    const summary = this.practiceRoleClosedSummary();
    await expect(summary).toBeVisible({ timeout: 15_000 });
    const text = ((await summary.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    return this.practiceRoleOptions.filter((role) =>
      new RegExp(role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text)
    );
  }

  private async isPracticeRoleListOpen(): Promise<boolean> {
    // Closed trigger already contains Marketing / Patient Coordinator / Practice Manager text.
    // Open list uniquely surfaces Business Owner / Front Desk / Injector as discrete items.
    return this.practiceRoleListOpenMarker.first().isVisible().catch(() => false);
  }

  private async clickPracticeRoleTrigger(): Promise<void> {
    // Avoid strict-mode: assert the unique modal title, not title ⊕ modal-layer together.
    await expect(this.editDialogTitle.first()).toBeVisible({ timeout: 20_000 });

    const dialog = this.page.getByRole('dialog', { name: /edit staff member/i });

    // 1) QA absolute XPath (when DOM matches the captured host tree)
    const absolute = this.page.locator(
      'xpath=/html/body/div/div[1]/div/div/div/div[2]/div/form/div/div[5]/div/div'
    );
    if (await absolute.first().isVisible().catch(() => false)) {
      this.log('Clicking Practice Role via absolute XPath form/div/div[5]/div/div');
      await absolute.first().scrollIntoViewIfNeeded().catch(() => {});
      await absolute.first().click();
      return;
    }

    // 2) Same relative path scoped to the open dialog form (portable)
    const relative = dialog.locator('xpath=.//form/div/div[5]/div/div').first();
    if (await relative.isVisible().catch(() => false)) {
      this.log('Clicking Practice Role via dialog-scoped XPath .//form/div/div[5]/div/div');
      await relative.scrollIntoViewIfNeeded().catch(() => {});
      await relative.click();
      return;
    }

    // 3) Live a11y name on this UI: button "Practice Role"
    const button = dialog.getByRole('button', { name: /^practice role$/i }).first();
    await expect(button).toBeVisible({ timeout: 20_000 });
    this.log('Clicking Practice Role via getByRole(button, Practice Role)');
    await button.scrollIntoViewIfNeeded().catch(() => {});
    await button.click();
  }

  private async openPracticeRoleDropdown(): Promise<void> {
    if (await this.isPracticeRoleListOpen()) {
      this.log('Practice Role list already open');
      return;
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      this.log(`Opening Practice Role dropdown (attempt ${attempt})`);
      await this.clickPracticeRoleTrigger();
      const opened = await this.practiceRoleListOpenMarker
        .first()
        .waitFor({ state: 'visible', timeout: 8_000 })
        .then(() => true)
        .catch(() => false);
      if (opened) {
        this.log('Practice Role dropdown fully expanded (Business Owner/Front Desk/Injector visible)');
        return;
      }
    }

    throw new Error(
      'Practice Role custom multi-select list did not expand. ' +
        'Expected list items such as Business Owner / Front Desk / Injector to become visible.'
    );
  }

  /**
   * Open list → click role → assert checked in list → close → assert role text in trigger.
   */
  async selectPracticeRole(role: string): Promise<void> {
    const control = this.practiceRoleClosedSummary();
    await expect(control).toBeVisible({ timeout: 15_000 });
    const tag = await control.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
    if (tag === 'select') {
      await control.selectOption({ label: role });
      await expect(control).toHaveValue(role);
      return;
    }

    await this.openPracticeRoleDropdown();
    const item = this.practiceRoleListItem(role).filter({ visible: true }).first();
    await expect(item).toBeVisible({ timeout: 10_000 });
    if (!(await this.isPracticeRoleItemSelected(item))) {
      await item.click();
    }
    await expect
      .poll(async () => this.isPracticeRoleItemSelected(item), {
        timeout: 8_000,
        message: `Practice Role "${role}" was clicked but not marked selected/checked in the list`,
      })
      .toBeTruthy();

    await this.page.keyboard.press('Escape');
    await expect(this.practiceRoleListOpenMarker.first()).toBeHidden({ timeout: 5_000 }).catch(
      () => {}
    );
    await this.expectPracticeRoleSummaryContains([role]);
  }

  /** Assert closed Practice Role field shows each selected role name. */
  async expectPracticeRoleSummaryContains(roles: string[]): Promise<void> {
    const summary = this.practiceRoleClosedSummary();
    await expect(summary).toBeVisible({ timeout: 10_000 });
    for (const role of roles) {
      await expect(
        summary,
        `Practice Role field must show "${role}" after selection`
      ).toContainText(new RegExp(role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    }
  }

  /**
   * Select exactly `count` Practice Roles (custom multi-select).
   * Source of truth for "already selected" = closed trigger summary text,
   * then verify checkmarks in the open list (no ancestor-class false positives).
   */
  async selectPracticeRoles(count = 4): Promise<string[]> {
    const beforeSummary = await this.getPracticeRolesFromClosedSummary();
    this.log(`Closed summary before edit → [${beforeSummary.join(', ')}]`);

    await this.openPracticeRoleDropdown();
    await expect(this.practiceRoleListOpenMarker.first()).toBeVisible({ timeout: 10_000 });

    const available: string[] = [];
    for (const role of this.practiceRoleOptions) {
      const item = this.practiceRoleListItem(role).filter({ visible: true });
      if ((await item.count()) > 0) available.push(role);
    }
    this.log(`Available Practice Roles: ${available.length} → [${available.join(', ')}]`);
    expect(available.length, 'Expected visible Practice Role list items').toBeGreaterThan(0);

    // Align list checkmarks with closed summary (summary is authoritative).
    let selected = [...beforeSummary.filter((r) => available.includes(r))];

    // Ensure we can dirty the form: target a concrete set of `count` roles.
    let finalTarget = available.slice(0, Math.min(count, available.length));
    const sameAsBefore =
      finalTarget.length === beforeSummary.length &&
      finalTarget.every((r) => beforeSummary.includes(r)) &&
      beforeSummary.every((r) => finalTarget.includes(r));

    if (sameAsBefore) {
      if (available.length > count) {
        finalTarget = available.slice(1, 1 + count);
      } else {
        const extra = available.find((r) => !beforeSummary.includes(r));
        const drop = beforeSummary[0];
        finalTarget = beforeSummary.filter((r) => r !== drop);
        if (extra) finalTarget.push(extra);
        finalTarget = finalTarget.slice(0, count);
      }
    }

    this.log(`Target Practice Roles → [${finalTarget.join(', ')}]`);

    // Deselect extras
    for (const role of [...selected]) {
      if (finalTarget.includes(role)) continue;
      if (!(await this.isPracticeRoleListOpen())) await this.openPracticeRoleDropdown();
      const item = this.practiceRoleListItem(role).filter({ visible: true }).first();
      await expect(item).toBeVisible({ timeout: 10_000 });
      this.log(`Deselecting Practice Role: "${role}"`);
      await item.click();
      await expect
        .poll(async () => !(await this.isPracticeRoleItemSelected(item)), {
          timeout: 8_000,
          message: `Failed to deselect "${role}"`,
        })
        .toBeTruthy();
      selected = selected.filter((r) => r !== role);
    }

    // Select missing
    for (const role of finalTarget) {
      if (selected.includes(role)) continue;
      if (!(await this.isPracticeRoleListOpen())) await this.openPracticeRoleDropdown();
      const item = this.practiceRoleListItem(role).filter({ visible: true }).first();
      await expect(item).toBeVisible({ timeout: 10_000 });
      await item.scrollIntoViewIfNeeded();
      this.log(`Selecting Practice Role: "${role}"`);
      await item.click();
      await expect
        .poll(async () => this.isPracticeRoleItemSelected(item), {
          timeout: 8_000,
          message: `Practice Role "${role}" click did not produce a checked state`,
        })
        .toBeTruthy();
      selected.push(role);
    }

    await this.page.keyboard.press('Escape').catch(() => {});
    await expect(this.practiceRoleListOpenMarker.first())
      .toBeHidden({ timeout: 5_000 })
      .catch(() => {});

    await this.expectPracticeRoleSummaryContains(finalTarget);

    // Update must be enabled after a real change
    const updateBtn = this.updateButton.filter({ visible: true }).first();
    await expect(updateBtn).toBeEnabled({ timeout: 10_000 });

    this.log(`Final Practice Roles → [${finalTarget.join(', ')}]`);
    return finalTarget;
  }

  async clickUpdateStaffMember(): Promise<void> {
    const btn = this.updateButton.filter({ visible: true }).first();
    await expect(btn).toBeVisible({ timeout: 15_000 });
    await expect(btn).toBeEnabled({ timeout: 15_000 });
    await btn.click();
  }

  async expectUpdateSuccess(_selectedRoles: string[] = []): Promise<void> {
    const toast = this.successToast.filter({ visible: true });
    const toastVisible = (await toast.count().catch(() => 0)) > 0;
    if (toastVisible) {
      await expect(toast.first()).toBeVisible({ timeout: 10_000 });
      this.log('Update success toast visible');
      return;
    }

    const title = this.editDialogTitle.filter({ visible: true }).first();
    const modalGone = await this.page
      .getByRole('dialog', { name: /edit staff member/i })
      .waitFor({ state: 'hidden', timeout: 25_000 })
      .then(() => true)
      .catch(() => false);

    if (modalGone) {
      this.log('Edit Staff Member modal closed after Update — treating as success');
      await expect(this.page.getByRole('heading', { name: /^staff members$/i })).toBeVisible({
        timeout: 20_000,
      });
      return;
    }

    await expect(
      this.page
        .getByText(/successfully updated|staff member updated|changes saved|update successful/i)
        .filter({ visible: true })
        .first()
    ).toBeVisible({ timeout: 20_000 });
    void title;
  }

  /**
   * After save: reopen modal and assert Practice Role summary still contains roles.
   */
  async expectPracticeRolesPersisted(roles: string[]): Promise<void> {
    await this.expectModalVisible();
    await this.expectPracticeRoleSummaryContains(roles);
  }

  async selectPermission(value: 'Team Member' | 'Admin'): Promise<void> {
    const control = this.permissions.first();
    await expect(control).toBeVisible({ timeout: 15_000 });
    await control.selectOption({ label: value });
  }

  async expectAdminLocationsLocked(): Promise<void> {
    await expect(this.locations.first()).toBeDisabled();
    await expect(this.locationsHelper).toBeVisible();
  }

  async expectTeamMemberLocationsEditable(): Promise<void> {
    await expect(this.locations.first()).toBeEnabled();
  }

  async clearLocations(): Promise<void> {
    await this.page.evaluate(() => {
      const el = document.querySelector(
        '[data-testid="locations"], select[name="locations"], select[aria-label*="Location" i]'
      ) as HTMLSelectElement | null;
      if (!el) return;
      for (const opt of Array.from(el.options)) opt.selected = false;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  async selectFirstLocation(): Promise<void> {
    await this.locations.first().selectOption({ index: 0 });
  }

  async clickUpdate(): Promise<void> {
    await this.updateButton.click();
  }

  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }
}

export function editStaffMemberFixtureHtml(options?: {
  permission?: 'Team Member' | 'Admin';
  role?: string;
  dirty?: boolean;
  updateError?: boolean;
  shipToError?: boolean;
}): string {
  const permission = options?.permission ?? 'Team Member';
  const role = options?.role ?? 'Front Desk';
  const dirty = options?.dirty ?? false;
  const updateError = options?.updateError ?? false;
  const shipToError = options?.shipToError ?? false;

  const roles = [
    'Business Owner',
    'Front Desk',
    'Injector',
    'Marketing',
    'Patient Coordinator',
    'Practice Manager',
  ];
  const roleOptions = roles
    .map((r) => `<option value="${r}" ${r === role ? 'selected' : ''}>${r}</option>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>Edit Staff Member</title></head>
<body>
<div role="dialog" data-testid="edit-staff-modal" aria-label="Edit Staff Member">
  <h2>Staff Member: Pam Gleason</h2>
  <label>First Name <input data-testid="staff-first-name" name="firstName" value="Pam" disabled /></label>
  <label>Last Name <input data-testid="staff-last-name" name="lastName" value="Gleason" disabled /></label>
  <label>Email <input data-testid="staff-email" name="email" type="email" value="pam@example.com" disabled /></label>

  <label>Practice Role
    <select data-testid="practice-role" name="practiceRole">${roleOptions}</select>
  </label>

  <label>Permissions
    <select data-testid="permissions" name="permissions">
      <option value="Team Member" ${permission === 'Team Member' ? 'selected' : ''}>Team Member</option>
      <option value="Admin" ${permission === 'Admin' ? 'selected' : ''}>Admin</option>
    </select>
  </label>

  <label>Location(s)
    <select data-testid="locations" name="locations" multiple ${permission === 'Admin' ? 'disabled' : ''}>
      ${
        shipToError
          ? ''
          : `<option value="st1">Ship To — Downtown</option>
             <option value="st2">Ship To — Uptown</option>`
      }
    </select>
  </label>
  <p data-testid="locations-helper" style="display:${permission === 'Admin' ? 'block' : 'none'}">
    All locations are accessible to admin.
  </p>
  <p data-testid="locations-empty-error" style="display:none">At least one location must be selected.</p>
  ${shipToError ? '<p role="alert" data-testid="shipto-error">Unable to load Ship Tos.</p>' : ''}
  <p role="alert" data-testid="edit-staff-error" style="display:${updateError ? 'block' : 'none'}">
    Update failed. No changes were applied.
  </p>

  <button type="button" data-testid="update" ${dirty ? '' : 'disabled'}>Update Staff Member</button>
  <button type="button" data-testid="cancel">Cancel</button>
  <p data-testid="list-role" style="display:none"></p>
  <p data-testid="cancelled" style="display:none">cancelled</p>
</div>
<script>
  const roleEl = document.querySelector('[data-testid="practice-role"]');
  const permEl = document.querySelector('[data-testid="permissions"]');
  const locEl = document.querySelector('[data-testid="locations"]');
  const helper = document.querySelector('[data-testid="locations-helper"]');
  const updateBtn = document.querySelector('[data-testid="update"]');
  const emptyErr = document.querySelector('[data-testid="locations-empty-error"]');
  const initial = { role: roleEl.value, perm: permEl.value, locs: [...locEl.selectedOptions].map(o => o.value).join(',') };
  let forceUpdateError = ${updateError ? 'true' : 'false'};

  function syncPermission() {
    const isAdmin = permEl.value === 'Admin';
    locEl.disabled = isAdmin;
    helper.style.display = isAdmin ? 'block' : 'none';
    if (isAdmin) {
      for (const opt of locEl.options) opt.selected = true;
    }
    markDirty();
  }
  function markDirty() {
    const locs = [...locEl.selectedOptions].map(o => o.value).join(',');
    const dirty = roleEl.value !== initial.role || permEl.value !== initial.perm || locs !== initial.locs;
    updateBtn.disabled = !dirty;
  }
  roleEl.addEventListener('change', markDirty);
  permEl.addEventListener('change', syncPermission);
  locEl.addEventListener('change', markDirty);
  syncPermission();
  if (${dirty ? 'true' : 'false'}) { roleEl.value = 'Injector'; markDirty(); }

  updateBtn.addEventListener('click', () => {
    if (permEl.value === 'Team Member' && locEl.selectedOptions.length < 1) {
      emptyErr.style.display = 'block';
      return;
    }
    emptyErr.style.display = 'none';
    if (forceUpdateError) {
      document.querySelector('[data-testid="edit-staff-error"]').style.display = 'block';
      return;
    }
    document.querySelector('[data-testid="list-role"]').style.display = 'block';
    document.querySelector('[data-testid="list-role"]').textContent = roleEl.value;
  });
  document.querySelector('[data-testid="cancel"]').addEventListener('click', () => {
    document.querySelector('[data-testid="cancelled"]').style.display = 'block';
    roleEl.value = initial.role;
    permEl.value = initial.perm;
    syncPermission();
    markDirty();
  });
</script>
</body></html>`;
}
