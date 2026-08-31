import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import {
  enrollLoyaltyProfileViaApi,
  type LoyaltyEnrollmentResult,
} from '../../src/api/loyaltyEnrollment';
import { HomePage } from '../../src/pages/HomePage';
import type { PlaywrightWorld } from '../../src/hooks/world';

function rowMap(table: DataTable): Record<string, string> {
  return table.rowsHash();
}

Given(
  'I enroll a loyalty profile via API with:',
  async function (this: PlaywrightWorld, table: DataTable) {
    const data = rowMap(table);
    const page = this.requirePage();
    const result: LoyaltyEnrollmentResult = await enrollLoyaltyProfileViaApi(page, {
      phone: data.phone ?? 'UNIQUE',
      verificationCode: data.verification_code,
      firstName: data.first_name ?? '',
      lastName: data.last_name ?? '',
      dateOfBirth: data.date_of_birth ?? '',
      email: data.email ?? 'john.doe@test.com',
      zip: data.zip ?? '',
    });

    this.enrollment = result;
    this.enrolledName = result.rawSignupResponse.name;
    this.phoneNumber = result.phone;

    expect(page.url(), 'Enrollment form must not be shown after API enrollment').not.toMatch(
      /\/signup\/?/i
    );
    expect(page.url(), 'User should be on Home after API enrollment').toMatch(/\/dashboard\/?/i);
  }
);

Then('the profile enrollment should be successful', async function (this: PlaywrightWorld) {
  const enrollment = this.enrollment;
  expect(enrollment, 'Enrollment result missing from World').toBeTruthy();
  expect(enrollment!.success).toBe(true);
  expect(enrollment!.rawSignupResponse.success).toBe(true);
  expect(enrollment!.customerId).toMatch(/^CL/i);
  expect(enrollment!.rawSignupResponse.name.trim().length).toBeGreaterThan(0);
});

When('I navigate to the Home page while logged in', async function (this: PlaywrightWorld) {
  const page = this.requirePage();
  const home = new HomePage(page);
  await home.goto();
  expect(page.url()).toMatch(/\/dashboard\/?/i);
  expect(page.url()).not.toMatch(/\/signup\/?/i);
  this.homePage = home;
});

Then('the Home page should display the enrolled user name', async function (this: PlaywrightWorld) {
  const enrolledName = String(this.enrollment?.rawSignupResponse.name ?? this.enrolledName ?? '');
  expect(enrolledName, 'Expected name from enrollment API response').toBeTruthy();

  const home = this.homePage ?? new HomePage(this.requirePage());
  await home.expectEnrolledUserName(enrolledName);
});
