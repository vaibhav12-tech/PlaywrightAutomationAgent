/**
 * Canonical Page Object Model barrel.
 *
 * Layout:
 *   src/pages/*.ts              — OCE / loyalty / shared app screens
 *   src/pages/components/       — Reusable UI components (forms, identity fields)
 *   src/pages/saucedemo/        — SauceDemo demo app (session / multi-user)
 *
 * New screens: add under the matching module folder, then export here.
 */
export { BasePage } from './BasePage';
export { PhoneOtpFormComponent } from './components/PhoneOtpFormComponent';
export { StaffIdentityFieldsComponent } from './components/StaffIdentityFieldsComponent';
export { SauceLoginFormComponent } from './components/SauceLoginFormComponent';

export { SignupPage } from './SignupPage';
export { WelcomePage } from './WelcomePage';
export { HomePage } from './HomePage';
export { OcePortalPage } from './OcePortalPage';
export { OceLeftNavPage } from './OceLeftNavPage';
export { StaffMembersPage } from './StaffMembersPage';
export { EditStaffMemberPage, editStaffMemberFixtureHtml } from './EditStaffMemberPage';
export { PatientCheckoutPendingPage } from './PatientCheckoutPendingPage';
export { RevaIsiFooterPage } from './RevaIsiFooterPage';
export { ExamplePage } from './ExamplePage';
export { FileUploadPage } from './FileUploadPage';
export { FileDownloadPage } from './FileDownloadPage';

export { LoginPage } from './saucedemo/LoginPage';
export { InventoryPage } from './saucedemo/InventoryPage';
export { CartPage } from './saucedemo/CartPage';
