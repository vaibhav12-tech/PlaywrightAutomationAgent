/**
 * OCE Experience Cloud — login → home → Staff → Edit Role and Permissions.
 *
 * Override via env (optional):
 *   OCE_BASE_URL / OCE_USERNAME / OCE_PASSWORD / OCE_PRACTICE / OCE_LOCATION / OCE_STAFF_NAME
 *
 * Run (headed):
 *   $env:TEST_ENV='qa'
 *   npx playwright test tests/oceLoginHome.spec.ts --project=chromium --headed --workers=1
 */

import { test, expect } from '../src/fixtures';
import config from '../src/config';

const OCE_LOGIN_URL =
  process.env.OCE_BASE_URL ||
  ('oceBaseUrlnew' in config
    ? String((config as { oceBaseUrlnew?: string }).oceBaseUrlnew)
    : '') ||
  ('oceBaseUrl' in config ? String((config as { oceBaseUrl?: string }).oceBaseUrl) : '') ||
  'https://revance-oce--fulldev.sandbox.my.site.com/s/login/';

const OCE_USERNAME = process.env.OCE_USERNAME || 'cewesif720@ezimb.com';
const OCE_PASSWORD = process.env.OCE_PASSWORD || 'Revance@123456';
const OCE_PRACTICE = process.env.OCE_PRACTICE || 'Pleasanton Dermatology';
/** Accepts "Pleasanton - CA" or "Pleasanton CA" — POM normalizes both. */
const OCE_LOCATION = process.env.OCE_LOCATION || 'Pleasanton - CA';
/** Staff list display name as shown in UI (fulldev: "som prakash"). */
const OCE_STAFF_NAME = process.env.OCE_STAFF_NAME || 'som prakash';

test.describe('OCE: Login → Staff → Edit Role and Permissions', () => {
  test('Login, open Staff, edit roles for Som Praksah, and save', async ({
    ocePortalPage,
    oceLeftNavPage,
    staffMembersPage,
    editStaffMemberPage,
    page,
  }) => {
    test.setTimeout(420_000);

    process.env.OCE_BASE_URL = OCE_LOGIN_URL;

    // 1–2. Launch URL and wait for login page
    await ocePortalPage.gotoLogin();
    await expect(page.locator('input[type="password"]').first()).toBeVisible({
      timeout: 60_000,
    });

    // 3. Enter credentials and sign in
    await ocePortalPage.enterEmail(OCE_USERNAME);
    await ocePortalPage.enterPassword(OCE_PASSWORD);
    await ocePortalPage.clickLogin();
    await ocePortalPage.expectLoggedIn();

    // 4. Practice dropdown: //*[@id="practiceScreen"]/div[3]/div[1]/select
    await ocePortalPage.selectPractice(OCE_PRACTICE);

    // 5. Location dropdown: //*[@id="locationScreen"]/div[2]/div[1]/select
    await ocePortalPage.selectLocationAndContinue(OCE_LOCATION);

    // 6. Home / dashboard — verify h1#hero-title
    await expect(page).not.toHaveURL(/\/login\/?(\?|$)/i);
    await expect(page).not.toHaveURL(/LoginFlow/i);
    await expect(page.locator('h1#hero-title')).toBeVisible({ timeout: 90_000 });

    // 7. Open left navigation (hamburger / breadcrumb menu)
    await oceLeftNavPage.openLeftNav();
    await oceLeftNavPage.expectLeftNavVisible();

    // 8. Practice Settings → Staff → Staff Member page
    await oceLeftNavPage.openPracticeSettings();
    await oceLeftNavPage.expectStaffOptionVisible();
    await oceLeftNavPage.openStaff();
    await oceLeftNavPage.expectStaffMemberPageVisible();

    // 9. Staff row → Actions (⋯) → Edit Role and Permissions
    await staffMembersPage.openEditRoleAndPermissionsFor(OCE_STAFF_NAME);
    await editStaffMemberPage.expectModalVisible();

    // 10. Practice Role custom multi-select — select four distinct roles, then Update
    const selectedRoles = await editStaffMemberPage.selectPracticeRoles(4);
    expect(selectedRoles, 'Exactly four Practice Roles should be selected').toHaveLength(4);
    await editStaffMemberPage.clickUpdateStaffMember();
    await editStaffMemberPage.expectUpdateSuccess(selectedRoles);
  });
});
