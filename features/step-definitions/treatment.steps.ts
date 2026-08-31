import { Given, When, Then } from '@cucumber/cucumber';
import { OcePortalPage } from '../../src/pages/OcePortalPage';
import type { PlaywrightWorld } from '../../src/hooks/world';

function ocePage(world: PlaywrightWorld) {
  return new OcePortalPage(world.requirePage());
}

Given('I am on the Revance Ready portal', async function (this: PlaywrightWorld) {
  await ocePage(this).gotoLogin();
});

When('I enter the email {string}', async function (this: PlaywrightWorld, email: string) {
  await ocePage(this).enterEmail(email);
});

When('I enter the username {string}', async function (this: PlaywrightWorld, username: string) {
  await ocePage(this).enterEmail(username);
});

When('I enter the password {string}', async function (this: PlaywrightWorld, password: string) {
  const secret = process.env.OCE_PASSWORD ?? password;
  await ocePage(this).enterPassword(secret);
});

When('I click on login', async function (this: PlaywrightWorld) {
  await ocePage(this).clickLogin();
});

Then('I should be logged in to the portal', async function (this: PlaywrightWorld) {
  await ocePage(this).expectLoggedIn();
});

When(
  /^I select the practice "([^"]+)"(?:\s+And\s+CLick on Continue|\s+And\s+Click on Continue)?$/i,
  async function (this: PlaywrightWorld, practice: string) {
    await ocePage(this).selectPractice(practice);
  }
);

When(
  /^I select the location "([^"]+)"\s+And\s+Click on Continue$/i,
  async function (this: PlaywrightWorld, location: string) {
    await ocePage(this).selectLocationAndContinue(location);
  }
);

When('I select the location {string}', async function (this: PlaywrightWorld, location: string) {
  await ocePage(this).selectLocation(location);
});

Then('the patient search box should be visible', async function (this: PlaywrightWorld) {
  await ocePage(this).expectPatientSearchVisible();
});

When('I enter the mobile number {string}', async function (this: PlaywrightWorld, phone: string) {
  await ocePage(this).enterMobileNumber(phone);
});

When('I click on search', async function (this: PlaywrightWorld) {
  await ocePage(this).clickSearch();
});

When('I select the Daxxify treatment', async function (this: PlaywrightWorld) {
  await ocePage(this).selectDaxxifyTreatment();
});

When('I select redeem', async function (this: PlaywrightWorld) {
  await ocePage(this).selectRedeem();
});

When('I click on confirm treatment', async function (this: PlaywrightWorld) {
  await ocePage(this).clickConfirmTreatment();
});

Then('the treatment should be created', async function (this: PlaywrightWorld) {
  await ocePage(this).expectTreatmentCreated();
});
