import { When, Then } from '@cucumber/cucumber';
import { SignupPage } from '../../src/pages/SignupPage';
import type { PlaywrightWorld } from '../../src/hooks/world';

function signupPage(world: PlaywrightWorld) {
  return new SignupPage(world.requirePage());
}

When('I enter the verification code {string}', async function (this: PlaywrightWorld, code: string) {
  const otp = process.env.SIGNUP_OTP ?? code;
  await signupPage(this).enterVerificationCode(otp);
});

When('I confirm my phone number', async function (this: PlaywrightWorld) {
  await signupPage(this).confirmPhoneNumber();
});

When('I enter my first name {string}', async function (this: PlaywrightWorld, firstName: string) {
  await signupPage(this).enterFirstName(firstName);
});

When('I enter my last name {string}', async function (this: PlaywrightWorld, lastName: string) {
  await signupPage(this).enterLastName(lastName);
});

When('I select my date of birth {string}', async function (this: PlaywrightWorld, isoDate: string) {
  await signupPage(this).selectDateOfBirth(isoDate);
});

When('I enter my email {string}', async function (this: PlaywrightWorld, email: string) {
  const finalEmail =
    this.phoneNumber && /^john\.doe@test\.com$/i.test(email)
      ? `john.doe+${String(this.phoneNumber).slice(-8)}@test.com`
      : email;
  await signupPage(this).enterEmail(finalEmail);
});

When('I enter my zip code {string}', async function (this: PlaywrightWorld, zip: string) {
  await signupPage(this).enterZipCode(zip);
});

When('I enter my referral code {string}', async function (this: PlaywrightWorld, code: string) {
  await signupPage(this).enterReferralCode(code);
});

When('I click Apply on the sign-up form', async function (this: PlaywrightWorld) {
  await signupPage(this).clickApplyOnSignUpForm();
});

When('I accept all required consent checkboxes', async function (this: PlaywrightWorld) {
  await signupPage(this).acceptAllConsentCheckboxes();
});

When('I click the Create account button', async function (this: PlaywrightWorld) {
  await signupPage(this).clickCreateAccount();
});

When('I click Next on the reward claim screen', async function (this: PlaywrightWorld) {
  await signupPage(this).clickNextRewardClaimScreen();
});

When('I click Next on the follow-up screen', async function (this: PlaywrightWorld) {
  await signupPage(this).clickNextFollowUpScreen();
});

When('I close the first dialog', async function (this: PlaywrightWorld) {
  await signupPage(this).closeFirstDialog();
});

When('I close the second dialog', async function (this: PlaywrightWorld) {
  await signupPage(this).closeSecondDialog();
});

When('I check the checkbox of all questions to complete the profile', async function (this: PlaywrightWorld) {
  await signupPage(this).checkAllProfileQuestionCheckboxes();
});

When('I claim the birthday points', async function (this: PlaywrightWorld) {
  await signupPage(this).claimBirthdayPoints();
});

Then(
  'I should see the dashboard with {string} reward points',
  async function (this: PlaywrightWorld, expectedPoints: string) {
    await signupPage(this).expectDashboardPoints(expectedPoints);
  }
);
