import { Given, When, Then } from '@cucumber/cucumber';
import { getPage } from '../../src/hooks/hooks';
import { OcePortalPage } from '../../src/pages/OcePortalPage';

async function ocePage() {
  return new OcePortalPage(await getPage());
}

Given('I am on the Revance Ready portal', async function () {
  await (await ocePage()).gotoLogin();
});

When('I enter the email {string}', async function (email: string) {
  await (await ocePage()).enterEmail(email);
});

When('I enter the username {string}', async function (username: string) {
  await (await ocePage()).enterEmail(username);
});

When('I enter the password {string}', async function (password: string) {
  const secret = process.env.OCE_PASSWORD ?? password;
  await (await ocePage()).enterPassword(secret);
});

When('I click on login', async function () {
  await (await ocePage()).clickLogin();
});

Then('I should be logged in to the portal', async function () {
  await (await ocePage()).expectLoggedIn();
});

When(/^I select the practice "([^"]+)"(?:\s+And\s+CLick on Continue|\s+And\s+Click on Continue)?$/i, async function (practice: string) {
  await (await ocePage()).selectPractice(practice);
});

When(/^I select the location "([^"]+)"\s+And\s+Click on Continue$/i, async function (location: string) {
  await (await ocePage()).selectLocationAndContinue(location);
});

When('I select the location {string}', async function (location: string) {
  await (await ocePage()).selectLocation(location);
});

Then('the patient search box should be visible', async function () {
  await (await ocePage()).expectPatientSearchVisible();
});

When('I enter the mobile number {string}', async function (phone: string) {
  await (await ocePage()).enterMobileNumber(phone);
});

When('I click on search', async function () {
  await (await ocePage()).clickSearch();
});

When('I select the Daxxify treatment', async function () {
  await (await ocePage()).selectDaxxifyTreatment();
});

When('I select redeem', async function () {
  await (await ocePage()).selectRedeem();
});

When('I click on confirm treatment', async function () {
  await (await ocePage()).clickConfirmTreatment();
});

Then('the treatment should be created', async function () {
  await (await ocePage()).expectTreatmentCreated();
});
