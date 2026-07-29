import { type Page } from 'playwright';

/**
 * Page Object Model for the Revance Rewards Welcome Page
 * URL: /welcome
 *
 * This class encapsulates interactions with the welcome page, including:
 * - Entering a phone number
 * - Clicking the Verify button
 * - Accessing additional links (Contact Us, Terms, Privacy, etc.)
 */
export class WelcomePage {
  readonly page: Page;
  readonly url: string = '/welcome';

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the welcome page
   */
  async goto() {
    await this.page.goto(`${process.env.BASE_URL || 'https://revance-loyalty-git-dev-revances-projects.vercel.app'}${this.url}`);
  }

  /**
   * Enter phone number in the input field
   */
  async enterPhoneNumber(phone: string) {
    await this.page.fill('input[type="tel"]', phone);
  }

  /**
   * Click the Verify button
   */
  async clickVerify() {
    await this.page.getByRole('button', { name: /verify/i }).click();
  }

  /**
   * Click the Contact Us link
   */
  async clickContactUs() {
    await this.page.getByRole('link', { name: /contact us/i }).click();
  }

  /**
   * Click the Terms of Use link
   */
  async clickTermsOfUse() {
    await this.page.getByRole('link', { name: /terms of use/i }).click();
  }

  /**
   * Click the Privacy Policy link
   */
  async clickPrivacyPolicy() {
    await this.page.getByRole('link', { name: /privacy policy/i }).click();
  }

  /**
   * Get the main heading text
   */
  async getHeading(): Promise<string> {
    const heading = await this.page.textContent('h1');
    return heading ?? '';
  }
}
