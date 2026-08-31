import { BasePage } from './BasePage';
import { PhoneOtpFormComponent } from './components/PhoneOtpFormComponent';

/**
 * Page Object Model for the Revance Rewards Welcome Page
 * URL: /welcome
 *
 * UI CTA is labeled "Get Code" (legacy label was "Verify").
 * Form locators live in PhoneOtpFormComponent.
 */
export class WelcomePage extends BasePage {
  readonly url: string = '/welcome';
  readonly phoneOtp: PhoneOtpFormComponent;

  constructor(page: ConstructorParameters<typeof BasePage>[0]) {
    super(page);
    this.phoneOtp = new PhoneOtpFormComponent(page);
  }

  async goto() {
    await super.goto(new URL(this.url, this.loyaltyBaseUrl() + '/').toString());
    await this.phoneOtp.phoneInput().waitFor({ state: 'visible' });
  }

  async enterPhoneNumber(phone: string) {
    await this.phoneOtp.enterPhoneNumber(phone);
  }

  async clickVerify() {
    await this.phoneOtp.clickGetCodeAndWaitForOtp();
  }

  async clickContactUs() {
    await this.page.getByRole('link', { name: /contact us/i }).click();
  }

  async clickTermsOfUse() {
    await this.page.getByRole('link', { name: /terms of use/i }).click();
  }

  async clickPrivacyPolicy() {
    await this.page.getByRole('link', { name: /privacy policy/i }).click();
  }

  async getHeading(): Promise<string> {
    const heading = await this.page.textContent('h1');
    return heading ?? '';
  }
}
