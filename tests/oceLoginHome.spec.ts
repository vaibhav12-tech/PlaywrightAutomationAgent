/**
 * OCE Experience Cloud — login → practice → location → home.
 *
 * Override via env (optional):
 *   OCE_BASE_URL / OCE_USERNAME / OCE_PASSWORD / OCE_PRACTICE / OCE_LOCATION
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

test.describe('OCE: Login → Practice → Location → Home', () => {
  test('Launch browser, login, select practice/location, verify home', async ({
    ocePortalPage,
    page,
  }) => {
    test.setTimeout(300_000);

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

    // 4. Practice → Continue
    await ocePortalPage.selectPractice(OCE_PRACTICE);

    // 5. Location dropdown: //*[@id="locationScreen"]/div[2]/div[1]/select
    await ocePortalPage.selectLocationAndContinue(OCE_LOCATION);

    // 6. Home / dashboard — verify h1#hero-title
    await expect(page).not.toHaveURL(/\/login\/?(\?|$)/i);
    await expect(page).not.toHaveURL(/LoginFlow/i);
    await expect(page.locator('h1#hero-title')).toBeVisible({ timeout: 90_000 });
  });
});
