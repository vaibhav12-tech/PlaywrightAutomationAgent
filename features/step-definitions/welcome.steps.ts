import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { WelcomePage } from '../../src/pages/WelcomePage';
import type { PlaywrightWorld } from '../../src/hooks/world';

/** Generates a fresh 10-digit test phone so signup is not skipped for an existing account. */
function resolvePhone(phone: string): string {
  if (!/^unique$/i.test(phone.trim())) return phone;
  const suffix = Date.now().toString().slice(-9);
  return `9${suffix}`;
}

Given('I am on the Revance Welcome page', async function (this: PlaywrightWorld) {
  const welcomePage = new WelcomePage(this.requirePage());
  await welcomePage.goto();
});

When('I enter the phone number {string}', async function (this: PlaywrightWorld, phone: string) {
  const resolved = resolvePhone(phone);
  this.phoneNumber = resolved;
  await new WelcomePage(this.requirePage()).enterPhoneNumber(resolved);
});

When('I click the Verify button', async function (this: PlaywrightWorld) {
  await new WelcomePage(this.requirePage()).clickVerify();
});

Then('the main heading should be {string}', async function (this: PlaywrightWorld, expectedHeading: string) {
  const heading = await new WelcomePage(this.requirePage()).getHeading();
  expect(heading?.trim()).toBe(expectedHeading);
});

Then('the Contact Us link should be visible', async function (this: PlaywrightWorld) {
  const contactLink = this.requirePage().getByRole('link', { name: /contact us/i });
  await expect(contactLink).toBeVisible({ timeout: 15_000 });
});
