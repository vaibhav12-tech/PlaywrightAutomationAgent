/**
 * OCE business flow — Staff → Edit Role and Permissions.
 * Login / practice / location / home are provided by the `authenticatedPage` fixture.
 *
 * Run (headed):
 *   $env:TEST_ENV='qa'
 *   npx playwright test tests/oceLoginHome.spec.ts --project=chromium --headed --workers=1
 *
 * Optional overrides: OCE_BASE_URL, OCE_USERNAME, OCE_PASSWORD, OCE_PRACTICE, OCE_LOCATION, OCE_STAFF_NAME
 */

import { test, expect } from '../src/fixtures';

/** Staff list display name as shown in UI (fulldev: "som prakash"). */
const OCE_STAFF_NAME = process.env.OCE_STAFF_NAME || 'som prakash';

test.describe('OCE: Staff → Edit Role and Permissions', () => {
  // Must be set at describe level so authenticatedPage fixture setup is covered.
  test.describe.configure({ timeout: 420_000 });

  test('Open Staff, edit roles for Som Praksah, and save', async ({
    authenticatedPage,
    oceLeftNavPage,
    staffMembersPage,
    editStaffMemberPage,
  }) => {
    // authenticatedPage fixture already landed on Home (h1#hero-title).
    await expect(authenticatedPage.locator('h1#hero-title')).toBeVisible();

    await oceLeftNavPage.openLeftNav();
    await oceLeftNavPage.expectLeftNavVisible();

    await oceLeftNavPage.openPracticeSettings();
    await oceLeftNavPage.expectStaffOptionVisible();
    await oceLeftNavPage.openStaff();
    await oceLeftNavPage.expectStaffMemberPageVisible();

    await staffMembersPage.openEditRoleAndPermissionsFor(OCE_STAFF_NAME);
    await editStaffMemberPage.expectModalForMember(OCE_STAFF_NAME);

    const selectedRoles = await editStaffMemberPage.selectPracticeRoles(4);
    expect(selectedRoles, 'Exactly four Practice Roles should be selected').toHaveLength(4);
    await editStaffMemberPage.expectPracticeRoleSummaryContains(selectedRoles);
    await editStaffMemberPage.clickUpdateStaffMember();
    await editStaffMemberPage.expectUpdateSuccess(selectedRoles);

    await staffMembersPage.openEditRoleAndPermissionsFor(OCE_STAFF_NAME);
    await editStaffMemberPage.expectModalForMember(OCE_STAFF_NAME);
    await editStaffMemberPage.expectPracticeRolesPersisted(selectedRoles);
  });
});
