/**
 * Shared Playwright fixtures — OCE / loyalty / Jira-generated specs.
 *
 *   import { test, expect } from '../src/fixtures';
 *
 * Multi-user SauceDemo role fixtures live separately:
 *   import { test, expect } from '../src/fixtures/session';
 *
 * Page objects: always from `src/pages` (canonical POM).
 */
import { test as base, expect, type Page } from '@playwright/test';
import {
  SignupPage,
  WelcomePage,
  OcePortalPage,
  ExamplePage,
  RevaIsiFooterPage,
  PatientCheckoutPendingPage,
  EditStaffMemberPage,
  OceLeftNavPage,
  StaffMembersPage,
  FileUploadPage,
  FileDownloadPage,
} from '../pages';
import { resolveOceAuthConfig } from '../config/oceAuth';

type Pages = {
  signupPage: SignupPage;
  welcomePage: WelcomePage;
  ocePortalPage: OcePortalPage;
  examplePage: ExamplePage;
  revaIsiFooterPage: RevaIsiFooterPage;
  patientCheckoutPendingPage: PatientCheckoutPendingPage;
  editStaffMemberPage: EditStaffMemberPage;
  oceLeftNavPage: OceLeftNavPage;
  staffMembersPage: StaffMembersPage;
  fileUploadPage: FileUploadPage;
  fileDownloadPage: FileDownloadPage;
  /**
   * Logged-in OCE session on Home (practice + location selected).
   * Runs once per test that requests this fixture — keep login out of business specs.
   */
  authenticatedPage: Page;
};

export const test = base.extend<Pages>({
  signupPage: async ({ page }, use) => {
    await use(new SignupPage(page));
  },
  welcomePage: async ({ page }, use) => {
    await use(new WelcomePage(page));
  },
  ocePortalPage: async ({ page }, use) => {
    await use(new OcePortalPage(page));
  },
  examplePage: async ({ page }, use) => {
    await use(new ExamplePage(page));
  },
  revaIsiFooterPage: async ({ page }, use) => {
    await use(new RevaIsiFooterPage(page));
  },
  patientCheckoutPendingPage: async ({ page }, use) => {
    await use(new PatientCheckoutPendingPage(page));
  },
  editStaffMemberPage: async ({ page }, use) => {
    await use(new EditStaffMemberPage(page));
  },
  oceLeftNavPage: async ({ page }, use) => {
    await use(new OceLeftNavPage(page));
  },
  staffMembersPage: async ({ page }, use) => {
    await use(new StaffMembersPage(page));
  },
  fileUploadPage: async ({ page }, use) => {
    await use(new FileUploadPage(page));
  },
  fileDownloadPage: async ({ page }, use) => {
    await use(new FileDownloadPage(page));
  },

  authenticatedPage: async ({ page }, use, testInfo) => {
    testInfo.setTimeout(Math.max(testInfo.timeout, 420_000));

    const auth = resolveOceAuthConfig();
    process.env.OCE_BASE_URL = auth.baseUrl;

    const oce = new OcePortalPage(page);

    await oce.gotoLogin();
    await expect(page.locator('input[type="password"]').first()).toBeVisible({
      timeout: 60_000,
    });

    await oce.enterEmail(auth.username);
    await oce.enterPassword(auth.password);
    await oce.clickLogin();
    await oce.expectLoggedIn();

    await oce.selectPractice(auth.practice);
    await oce.selectLocationAndContinue(auth.location);

    await expect(page).not.toHaveURL(/\/login\/?(\?|$)/i);
    await expect(page).not.toHaveURL(/LoginFlow/i);
    await expect(page.locator('h1#hero-title')).toBeVisible({ timeout: 90_000 });

    await use(page);
  },
});

export { expect };

/** Re-export session fixtures entry for discoverability (prefer direct import). */
export { test as sessionTest, expect as sessionExpect } from './session';
