import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { WelcomePage } from '../../src/pages/WelcomePage';
import { getPage } from '../../src/hooks/hooks';

let page: Awaited<ReturnType<typeof getPage>>;
let welcomePage: WelcomePage;

Given('I am on the Revance Welcome page', async function () {
  page = await getPage();
  welcomePage = new WelcomePage(page);
  await welcomePage.goto();
});

When('I enter the phone number {string}', async function (phone: string) {
  await welcomePage.enterPhoneNumber(phone);
});

When('I click the Verify button', async function () {
  await welcomePage.clickVerify();
});

Then('the main heading should be {string}', async function (expectedHeading: string) {
  const heading = await welcomePage.getHeading();
  expect(heading?.trim()).toBe(expectedHeading);
});

Then('the Contact Us link should be visible', async function () {
  const contactLink = page.getByRole('link', { name: /contact us/i });
  await expect(contactLink).toBeVisible({ timeout: 15_000 });
});
