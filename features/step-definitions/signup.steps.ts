import { When, Then } from '@cucumber/cucumber';
import { getPage } from '../../src/hooks/hooks';
import { SignupPage } from '../../src/pages/SignupPage';

async function signupPage() {
  return new SignupPage(await getPage());
}

When('I enter the verification code {string}', async function (code: string) {
  const otp = process.env.SIGNUP_OTP ?? code;
  await (await signupPage()).enterVerificationCode(otp);
});

When('I confirm my phone number', async function () {
  await (await signupPage()).confirmPhoneNumber();
});

When('I enter my first name {string}', async function (firstName: string) {
  await (await signupPage()).enterFirstName(firstName);
});

When('I enter my last name {string}', async function (lastName: string) {
  await (await signupPage()).enterLastName(lastName);
});

When('I select my date of birth {string}', async function (isoDate: string) {
  await (await signupPage()).selectDateOfBirth(isoDate);
});

When('I enter my email {string}', async function (email: string) {
  await (await signupPage()).enterEmail(email);
});

When('I enter my zip code {string}', async function (zip: string) {
  await (await signupPage()).enterZipCode(zip);
});

When('I enter my referral code {string}', async function (code: string) {
  await (await signupPage()).enterReferralCode(code);
});

When('I click Apply on the sign-up form', async function () {
  await (await signupPage()).clickApplyOnSignUpForm();
});

When('I accept all required consent checkboxes', async function () {
  await (await signupPage()).acceptAllConsentCheckboxes();
});

When('I click the Create account button', async function () {
  await (await signupPage()).clickCreateAccount();
});

When('I click Next on the reward claim screen', async function () {
  await (await signupPage()).clickNextRewardClaimScreen();
});

When('I click Next on the follow-up screen', async function () {
  await (await signupPage()).clickNextFollowUpScreen();
});

When('I close the first dialog', async function () {
  await (await signupPage()).closeFirstDialog();
});

When('I close the second dialog', async function () {
  await (await signupPage()).closeSecondDialog();
});

When('I check the checkbox of all questions to complete the profile', async function () {
  await (await signupPage()).checkAllProfileQuestionCheckboxes();
});

When('I claim the birthday points', async function () {
  await (await signupPage()).claimBirthdayPoints();
});

Then('I should see the dashboard with {string} reward points', async function (expectedPoints: string) {
  await (await signupPage()).expectDashboardPoints(expectedPoints);
});
