// spec: manual-test-cases/BL10-550.md
// story: https://revance-it.atlassian.net/browse/BL10-550

import { test, expect } from '../src/fixtures';
import {
  EditStaffMemberPage,
  editStaffMemberFixtureHtml,
} from '../src/pages/EditStaffMemberPage';

/**
 * BL10-550 — Edit Staff Member Modal UI contract (offline HTML fixture).
 *
 * Intentionally separate from the live OCE spec so headed runs of
 * `tests/BL10-550.spec.ts` do not wipe the real portal with `page.setContent`
 * (which navigates to about:blank and shows "Pam Gleason" fixture markup).
 *
 * Run:
 *   npx playwright test tests/BL10-550.ui-contract.spec.ts --project=chromium
 */
test.describe('BL10-550: Edit Staff Member Modal — UI contract', () => {
  test('TC-001: Modal shows view-only identity and editable role/perm/locations', async ({
    page,
  }) => {
    const edit = new EditStaffMemberPage(page);
    await edit.loadUiContractFixture(editStaffMemberFixtureHtml());
    await edit.expectModalVisible();
    await edit.expectIdentityReadOnly();
    await expect(edit.practiceRole).toBeEnabled();
    await expect(edit.permissions).toBeEnabled();
  });

  test('TC-002 / TC-014: Practice Role has exactly six allowed values', async ({ page }) => {
    const edit = new EditStaffMemberPage(page);
    await edit.loadUiContractFixture(editStaffMemberFixtureHtml());
    const options = (await edit.getPracticeRoleOptions()).map((t) => t.trim());
    expect(options).toEqual([...edit.practiceRoleOptions]);
  });

  test('TC-003: Permission Admin locks Locations with helper text', async ({ page }) => {
    const edit = new EditStaffMemberPage(page);
    await edit.loadUiContractFixture(editStaffMemberFixtureHtml());
    await edit.selectPermission('Admin');
    await edit.expectAdminLocationsLocked();
  });

  test('TC-004 / TC-012: Team Member requires at least one location', async ({ page }) => {
    const edit = new EditStaffMemberPage(page);
    await edit.loadUiContractFixture(editStaffMemberFixtureHtml({ dirty: true }));
    await edit.selectPermission('Team Member');
    await edit.clearLocations();
    await edit.clickUpdate();
    await expect(edit.locationsEmptyError).toBeVisible();
    await edit.selectFirstLocation();
    await edit.clickUpdate();
    await expect(page.locator('[data-testid="list-role"]')).toBeVisible();
  });

  test('TC-007: Update disabled until an editable value changes', async ({ page }) => {
    const edit = new EditStaffMemberPage(page);
    await edit.loadUiContractFixture(editStaffMemberFixtureHtml({ dirty: false }));
    await expect(edit.updateButton).toBeDisabled();
    await edit.selectPracticeRole('Injector');
    await expect(edit.updateButton).toBeEnabled();
  });

  test('TC-008: Failed update shows error and does not apply change', async ({ page }) => {
    const edit = new EditStaffMemberPage(page);
    await edit.loadUiContractFixture(
      editStaffMemberFixtureHtml({ dirty: true, updateError: true })
    );
    await edit.selectFirstLocation();
    await edit.clickUpdate();
    await expect(edit.errorState).toBeVisible();
    await expect(page.locator('[data-testid="list-role"]')).toBeHidden();
  });

  test('TC-009: Ship To load error surfaces alert', async ({ page }) => {
    const edit = new EditStaffMemberPage(page);
    await edit.loadUiContractFixture(
      editStaffMemberFixtureHtml({ permission: 'Team Member', shipToError: true })
    );
    await expect(page.getByText(/unable to load ship tos/i)).toBeVisible();
  });

  test('TC-011: Identity fields remain disabled', async ({ page }) => {
    const edit = new EditStaffMemberPage(page);
    await edit.loadUiContractFixture(editStaffMemberFixtureHtml());
    await edit.expectIdentityReadOnly();
    await expect(edit.firstName).toHaveAttribute('disabled', '');
  });

  test('TC-012: Cancel discards unsaved changes', async ({ page }) => {
    const edit = new EditStaffMemberPage(page);
    await edit.loadUiContractFixture(editStaffMemberFixtureHtml({ role: 'Front Desk' }));
    await edit.selectPracticeRole('Injector');
    await edit.clickCancel();
    await expect(page.locator('[data-testid="cancelled"]')).toBeVisible();
    await expect(edit.practiceRole).toHaveValue('Front Desk');
  });

  test('TC-013: Switching Admin → Team Member re-enables Locations', async ({ page }) => {
    const edit = new EditStaffMemberPage(page);
    await edit.loadUiContractFixture(editStaffMemberFixtureHtml({ permission: 'Admin' }));
    await edit.expectAdminLocationsLocked();
    await edit.selectPermission('Team Member');
    await edit.expectTeamMemberLocationsEditable();
  });

  test('TC-002b: Practice Role change enables Update (independent of Permission)', async ({
    page,
  }) => {
    const edit = new EditStaffMemberPage(page);
    await edit.loadUiContractFixture(
      editStaffMemberFixtureHtml({ permission: 'Team Member', role: 'Front Desk' })
    );
    await edit.selectPracticeRole('Marketing');
    await expect(edit.permissions).toHaveValue('Team Member');
    await expect(edit.updateButton).toBeEnabled();
  });
});
