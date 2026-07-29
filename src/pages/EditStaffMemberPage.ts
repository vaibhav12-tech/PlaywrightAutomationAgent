import { type Locator, type Page, expect } from '@playwright/test';

/**
 * Provider Contact Management — Edit Staff Member modal (BL10-550).
 */
export class EditStaffMemberPage {
  constructor(readonly page: Page) {}

  readonly modal: Locator = this.page
    .locator('[data-testid="edit-staff-modal"], [data-test="edit-staff-modal"], [role="dialog"]')
    .filter({ hasText: /edit staff|role & permissions|staff member/i });

  readonly firstName: Locator = this.page.locator(
    '[data-testid="staff-first-name"], [data-test="staff-first-name"], #firstName, input[name="firstName"]'
  );
  readonly lastName: Locator = this.page.locator(
    '[data-testid="staff-last-name"], [data-test="staff-last-name"], #lastName, input[name="lastName"]'
  );
  readonly email: Locator = this.page.locator(
    '[data-testid="staff-email"], [data-test="staff-email"], input[type="email"], input[name="email"]'
  );

  readonly practiceRole: Locator = this.page.locator(
    '[data-testid="practice-role"], [data-test="practice-role"], select[name="practiceRole"], #practiceRole'
  );
  readonly permissions: Locator = this.page.locator(
    '[data-testid="permissions"], [data-test="permissions"], select[name="permissions"], #permissions'
  );
  readonly locations: Locator = this.page.locator(
    '[data-testid="locations"], [data-test="locations"], select[name="locations"], #locations'
  );
  readonly locationsHelper: Locator = this.page.getByText(
    /all locations are accessible to admin/i
  );

  readonly updateButton: Locator = this.page.getByRole('button', {
    name: /update staff member/i,
  });
  readonly cancelButton: Locator = this.page.getByRole('button', { name: /^cancel$/i });

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
    await this.page.setContent(html, { waitUntil: 'domcontentloaded' });
  }

  async expectModalVisible(): Promise<void> {
    await expect(this.modal.first()).toBeVisible({ timeout: 15_000 });
  }

  async expectIdentityReadOnly(): Promise<void> {
    await expect(this.firstName).toBeDisabled();
    await expect(this.lastName).toBeDisabled();
    await expect(this.email).toBeDisabled();
  }

  async getPracticeRoleOptions(): Promise<string[]> {
    return this.practiceRole.locator('option').allTextContents();
  }

  async selectPracticeRole(role: string): Promise<void> {
    await this.practiceRole.selectOption({ label: role });
  }

  async selectPermission(value: 'Team Member' | 'Admin'): Promise<void> {
    await this.permissions.selectOption({ label: value });
  }

  async expectAdminLocationsLocked(): Promise<void> {
    await expect(this.locations).toBeDisabled();
    await expect(this.locationsHelper).toBeVisible();
  }

  async expectTeamMemberLocationsEditable(): Promise<void> {
    await expect(this.locations).toBeEnabled();
  }

  async clearLocations(): Promise<void> {
    await this.page.evaluate(() => {
      const el = document.querySelector(
        '[data-testid="locations"], select[name="locations"]'
      ) as HTMLSelectElement | null;
      if (!el) return;
      for (const opt of Array.from(el.options)) opt.selected = false;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  async selectFirstLocation(): Promise<void> {
    await this.locations.selectOption({ index: 0 });
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
