// spec: manual-test-cases/BL10-550.md
// story: https://revance-it.atlassian.net/browse/BL10-550

import { test, expect } from '../src/fixtures';
import { resolveOceAuthConfig } from '../src/config/oceAuth';

/**
 * BL10-550 — Live OCE Edit Staff Member flow only.
 *
 * UI-contract (fixture / about:blank) tests live in:
 *   tests/BL10-550.ui-contract.spec.ts
 *
 * Run live (headed):
 *   $env:TEST_ENV='qa'; $env:EDIT_STAFF_E2E='true'; $env:SKIP_MULTI_USER_SESSION_SETUP='true'
 *   npx playwright test tests/BL10-550.spec.ts --project=chromium --headed --workers=1
 *
 * Optional: OCE_USERNAME / OCE_PASSWORD / OCE_PRACTICE / OCE_LOCATION / OCE_STAFF_NAME / OCE_PRACTICE_ROLE_COUNT
 */

function oceLiveEnabled(): boolean {
  return process.env.EDIT_STAFF_E2E === 'true';
}

/** Staff list display name (fulldev default: "som prakash"). Override with OCE_STAFF_NAME. */
const OCE_STAFF_NAME = process.env.OCE_STAFF_NAME || 'som prakash';

test.describe('BL10-550: Live OCE login + dashboard', () => {
  test.skip(!oceLiveEnabled(), 'Set EDIT_STAFF_E2E=true to run live OCE login flow');
  test.describe.configure({ timeout: 420_000 });

  test('Login → Practice → Location → home → Staff → Edit Role → Update → verify', async ({
    ocePortalPage,
    oceLeftNavPage,
    staffMembersPage,
    editStaffMemberPage,
    page,
  }) => {
    const auth = resolveOceAuthConfig();
    process.env.OCE_BASE_URL = auth.baseUrl;
    const targetRoleCount = Number(process.env.OCE_PRACTICE_ROLE_COUNT || '2');

    await ocePortalPage.gotoLogin();
    await expect(page.locator('input[type="password"]').first()).toBeVisible({
      timeout: 60_000,
    });

    await ocePortalPage.enterEmail(auth.username);
    await ocePortalPage.enterPassword(auth.password);
    await ocePortalPage.clickLogin();
    await ocePortalPage.expectLoggedIn();

    await ocePortalPage.selectPractice(auth.practice);
    await ocePortalPage.selectLocationAndContinue(auth.location);

    await ocePortalPage.expectHomeDashboard(90_000);
    await expect(page).not.toHaveURL(/\/login\/?(\?|$)/i);

    await oceLeftNavPage.navigateToStaffMemberPage();
    await staffMembersPage.openEditRoleAndPermissionsFor(OCE_STAFF_NAME);
    await editStaffMemberPage.expectModalForMember(OCE_STAFF_NAME);
    await editStaffMemberPage.expectIdentityReadOnly();

    const selectedRoles = await editStaffMemberPage.selectPracticeRoles(targetRoleCount);
    expect(selectedRoles.length).toBeGreaterThanOrEqual(Math.min(targetRoleCount, 1));
    await editStaffMemberPage.expectPracticeRoleSummaryContains(selectedRoles);

    await editStaffMemberPage.clickUpdateStaffMember();
    await editStaffMemberPage.expectUpdateSuccess(selectedRoles);

    await staffMembersPage.openEditRoleAndPermissionsFor(OCE_STAFF_NAME);
    await editStaffMemberPage.expectModalForMember(OCE_STAFF_NAME);
    await editStaffMemberPage.expectPracticeRolesPersisted(selectedRoles);
    await editStaffMemberPage.cancelButton.filter({ visible: true }).first().click();
    await expect(page.getByRole('dialog', { name: /edit staff member/i })).toBeHidden({
      timeout: 15_000,
    });
  });
});
