import { test as base, expect } from '@playwright/test';
import { SignupPage } from '../pages/SignupPage';
import { WelcomePage } from '../pages/WelcomePage';
import { OcePortalPage } from '../pages/OcePortalPage';
import { ExamplePage } from '../pages/ExamplePage';
import { RevaIsiFooterPage } from '../pages/RevaIsiFooterPage';
import { PatientCheckoutPendingPage } from '../pages/PatientCheckoutPendingPage';
import { EditStaffMemberPage } from '../pages/EditStaffMemberPage';
import { OceLeftNavPage } from '../pages/OceLeftNavPage';
import { StaffMembersPage } from '../pages/StaffMembersPage';

/**
 * Shared Playwright fixtures for Jira-to-Playwright Agent generated specs.
 * Extend this file with new page objects instead of instantiating ad hoc in every spec.
 */
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
});

export { expect };
