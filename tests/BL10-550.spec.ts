// spec: manual-test-cases/BL10-550.md
// story: https://revance-it.atlassian.net/browse/BL10-550

import { test, expect } from '../src/fixtures';
import {
  EditStaffMemberPage,
  editStaffMemberFixtureHtml,
} from '../src/pages/EditStaffMemberPage';
import config from '../src/config';

/**
 * BL10-550 — Edit Staff Member Modal & Permission.
 *
 * Live OCE (Salesforce Experience Cloud):
 *   set EDIT_STAFF_E2E=true
 *   OCE_USERNAME / OCE_PASSWORD / OCE_PRACTICE / OCE_LOCATION / OCE_BASE_URL
 *
 * UI-contract tests always run (fixture-based).
 * File runs serially so Live OCE login executes before UI-contract cases.
 */

function oceLiveEnabled(): boolean {
  return process.env.EDIT_STAFF_E2E === 'true';
}

function resolveOceBaseUrl(): string {
  return (
    process.env.OCE_BASE_URL ||
    ('oceBaseUrl' in config ? String((config as { oceBaseUrl?: string }).oceBaseUrl) : '') ||
    'https://revance-oce--fulldev.sandbox.my.site.com/s/login/'
  );
}

// Ensure Live OCE login runs before UI-contract tests (fullyParallel is on in config).
test.describe.configure({ mode: 'serial' });

test.describe('BL10-550: Live OCE login + dashboard', () => {
  test('Login → Practice → Location → home (optional staff edit)', async ({
    ocePortalPage,
    page,
  }) => {
    test.setTimeout(300_000);
    test.skip(!oceLiveEnabled(), 'Set EDIT_STAFF_E2E=true to run live OCE login flow');

    const username = process.env.OCE_USERNAME;
    const password = process.env.OCE_PASSWORD;
    const practice = process.env.OCE_PRACTICE || 'Pleasanton Dermatology';
    const location = process.env.OCE_LOCATION || 'Pleasanton - CA';

    test.skip(!username || !password, 'OCE_USERNAME and OCE_PASSWORD are required for live login');

    process.env.OCE_BASE_URL = resolveOceBaseUrl();

    // 1–2. Launch login URL and wait for login page
    await ocePortalPage.gotoLogin();
    await expect(page.locator('input[type="password"]').first()).toBeVisible({
      timeout: 60_000,
    });

    // 3–4. Enter credentials and login
    await ocePortalPage.enterEmail(username!);
    await ocePortalPage.enterPassword(password!);
    await ocePortalPage.clickLogin();
    await ocePortalPage.expectLoggedIn();

    // 5. Practice selection → Continue (handled inside selectPractice / login flow)
    await ocePortalPage.selectPractice(practice);

    // 6. Location selection → Continue
    await ocePortalPage.selectLocationAndContinue(location);

    // 7. Home / dashboard
    await ocePortalPage.expectHomeDashboard(90_000);
    await expect(page).not.toHaveURL(/\/login\/?(\?|$)/i);

    // Best-effort: open Staff / Contact Management and Edit Role & Permissions (BL10-548 surface)
    const staffNav = page.getByRole('link', { name: /staff|contact|people|team/i }).first();
    if (await staffNav.isVisible().catch(() => false)) {
      await staffNav.click();
    } else {
      const staffBtn = page.getByRole('button', { name: /staff|contact|people|team/i }).first();
      if (await staffBtn.isVisible().catch(() => false)) {
        await staffBtn.click();
      }
    }

    const overflow = page
      .getByRole('button', { name: /more|actions|options|overflow/i })
      .or(page.locator('[data-testid*="overflow"], button[aria-haspopup="menu"]'))
      .first();

    if (!(await overflow.isVisible().catch(() => false))) {
      test.info().annotations.push({
        type: 'note',
        description:
          'Staff list overflow not found — login/home succeeded; wire staff nav selectors for full BL10-550 edit modal.',
      });
      return;
    }

    await overflow.click();
    const editItem = page
      .getByRole('menuitem', { name: /edit role|permissions|edit staff/i })
      .first();
    if (await editItem.isVisible().catch(() => false)) {
      await editItem.click();
      const edit = new EditStaffMemberPage(page);
      await edit.expectModalVisible();
      await edit.expectIdentityReadOnly();
    }
  });
});

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
