import { type Locator, type Page } from '@playwright/test';

/**
 * Reusable loyalty phone + Get Code / OTP entry widget (Welcome → OTP).
 * Keeps dynamic locator fallbacks out of the page orchestration layer.
 */
export class PhoneOtpFormComponent {
  constructor(private readonly page: Page) {}

  phoneInput(): Locator {
    return this.page
      .getByLabel(/phone number/i)
      .or(this.page.getByPlaceholder(/phone number/i))
      .or(this.page.locator('input#reva-phone, input[type="tel"]'))
      .first();
  }

  /** Primary phone CTA — current "Get Code", legacy "Verify". */
  getCodeButton(): Locator {
    return this.page.getByRole('button', { name: /^(get code|verify)$/i });
  }

  otpInput(): Locator {
    return this.page
      .locator('#reva-otp, input[autocomplete="one-time-code"], input[inputmode="numeric"]')
      .first();
  }

  async enterPhoneNumber(phone: string): Promise<void> {
    const input = this.phoneInput();
    const digits = phone.replace(/\D/g, '');
    await input.click();
    await input.fill('');
    await input.pressSequentially(digits, { delay: 30 });
  }

  async clickGetCodeAndWaitForOtp(timeout = 60_000): Promise<void> {
    const button = this.getCodeButton();
    await button.waitFor({ state: 'visible' });
    await button.click();
    await this.otpInput().waitFor({ state: 'visible', timeout });
  }
}
