import { expect } from '@playwright/test';
import { type Locator, type Page } from 'playwright';

/**
 * Sign-up flow after phone verification (OTP, profile form, onboarding modals, dashboard).
 * Locators use roles/labels first; adjust if the Svelte app markup changes.
 */
export class SignupPage {
  constructor(readonly page: Page) {}

  async enterVerificationCode(code: string) {
    const otp = this.page.locator(
      'input[inputmode="numeric"], input[autocomplete="one-time-code"], input[name*="otp" i], input[aria-label*="code" i]'
    );
    const count = await otp.count();
    if (count === 1) {
      await otp.first().fill(code);
      return;
    }
    const digits = code.replace(/\D/g, '').split('');
    const singleBoxes = this.page.locator('input[maxlength="1"]');
    if ((await singleBoxes.count()) >= digits.length) {
      for (let i = 0; i < digits.length; i++) {
        await singleBoxes.nth(i).fill(digits[i]!);
      }
      return;
    }
    await this.page.getByRole('textbox').first().fill(code);
  }

  private firstNameField() {
    return this.page
      .getByLabel(/first name/i)
      .or(this.page.getByPlaceholder(/first name/i))
      .or(this.page.locator('input#firstName, input[name="firstName"], input[name*="firstName" i]').first());
  }

  /** Clicks Confirm/Continue if shown; otherwise waits for the sign-up form (OTP may auto-advance). */
  async confirmPhoneNumber() {
    if (await this.firstNameField().isVisible().catch(() => false)) return;

    const button = this.page.getByRole('button', {
      name: /^(confirm|continue|submit|verify|next)$/i,
    });
    const alt = this.page.locator('[data-button-root="true"].btn-primary, button.btn-primary').filter({
      hasText: /confirm|continue|verify|next/i,
    });
    if (await button.first().isVisible().catch(() => false)) {
      await button.first().click();
      return;
    }
    if (await alt.first().isVisible().catch(() => false)) {
      await alt.first().click();
      return;
    }
    await this.firstNameField().waitFor({ state: 'visible', timeout: 60_000 });
  }

  private lastNameField() {
    return this.page
      .getByLabel(/last name/i)
      .or(this.page.getByPlaceholder(/last name/i))
      .or(this.page.locator('input#lastName, input[name="lastName"], input[name*="lastName" i]').first());
  }

  async enterFirstName(value: string) {
    await this.firstNameField().waitFor({ state: 'visible', timeout: 60_000 });
    await this.firstNameField().fill(value);
  }

  async enterLastName(value: string) {
    await this.lastNameField().fill(value);
  }

  private dateOfBirthInput() {
    return this.page
      .getByPlaceholder(/MM\/DD\/YYYY/i)
      .or(this.page.locator('input[id^="datepicker"]'));
  }

  /** Calendar icon beside the DOB field — clicking the text input alone does not open the popup. */
  private dateOfBirthCalendarTrigger(dp: Locator) {
    return dp
      .locator('xpath=ancestor::div[contains(@class,"relative")][1]')
      .getByRole('button', { name: /open date of birth calendar/i });
  }

  private dateOfBirthCalendarPanel() {
    return this.page.getByRole('application').filter({ has: this.page.locator('[role="grid"]') });
  }

  /**
   * Revance Svelte datepicker: pick via calendar so component state and validators match the UI.
   * Setting input.value in JS does not update Svelte bindings — validation errors persist.
   */
  private async selectSvelteDatepickerCalendar(dp: Locator, yearStr: string, monthNum: number, dayNum: number) {
    const year = Number(yearStr);
    const MONTH_NAMES = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ] as const;
    const targetFull = MONTH_NAMES[monthNum - 1]!;
    const targetMonthIdx = monthNum - 1;

    const trigger = this.dateOfBirthCalendarTrigger(dp);
    await trigger.click();
    const calendar = this.dateOfBirthCalendarPanel();
    await calendar.locator('[role="gridcell"]').first().waitFor({ state: 'visible', timeout: 20_000 });
    // Accessible name may not include "April 2026" — match visible caption text instead of getByRole name.
    await calendar.locator('button').filter({ hasText: /\w+\s+\d{4}/ }).first().click();
    await calendar.getByRole('button', { name: String(year), exact: true }).click();
    await calendar.locator('[role="gridcell"]').first().waitFor({ state: 'visible', timeout: 15_000 });

    const header = calendar.locator('button').filter({ hasText: new RegExp(`\\w+\\s+${year}$`) }).first();
    const monthFromHeader = (text: string) => text.replace(/\s*\d{4}\s*$/, '').trim();

    for (let step = 0; step < 12; step++) {
      const headerText = ((await header.textContent()) ?? '').trim();
      if (monthFromHeader(headerText).toLowerCase() === targetFull.toLowerCase()) break;

      const currentIdx = MONTH_NAMES.findIndex(
        (m) => m.toLowerCase() === monthFromHeader(headerText).toLowerCase()
      );
      if (currentIdx < 0) {
        throw new Error(`Date of birth calendar: unrecognized month header "${headerText}"`);
      }

      const diff = targetMonthIdx - currentIdx;
      const nav = diff > 0
        ? calendar.getByRole('button', { name: /^next$/i })
        : calendar.getByRole('button', { name: /^previous$/i });
      await nav.click();
    }

    await calendar
      .locator('[role="gridcell"]')
      .filter({ hasText: new RegExp(`^${dayNum}$`) })
      .first()
      .click();
  }

  /** ISO date YYYY-MM-DD (examples). Also supports native date input and MM/DD/YYYY text datepickers. */
  async selectDateOfBirth(isoDate: string) {
    const raw = isoDate.trim();
    const [y, m, d] = raw.split('-');
    if (!y || !m || !d) throw new Error(`Invalid date (expected YYYY-MM-DD): ${isoDate}`);
    const monthNum = Number(m);
    const dayNum = Number(d);
    if (!monthNum || !dayNum) throw new Error(`Invalid date parts in: ${isoDate}`);

    const dateInput = this.page.locator('input[type="date"]');
    if (await dateInput.first().isVisible().catch(() => false)) {
      await dateInput.first().fill(raw);
      return;
    }

    // Revance app: readonly Svelte datepicker — DOM-only value updates do not sync component state, so
    // validation still shows "Date of birth" errors. Must pick via the real calendar UI.
    const dp = this.dateOfBirthInput().first();
    if (await dp.isVisible().catch(() => false)) {
      await this.selectSvelteDatepickerCalendar(dp, y, monthNum, dayNum);
      return;
    }

    const monthSel = this.page
      .getByLabel(/^month$/i)
      .or(this.page.getByRole('combobox', { name: /month/i }))
      .or(this.page.locator('select[aria-label*="month" i]'))
      .first();
    const daySel = this.page
      .getByLabel(/^day$/i)
      .or(this.page.getByRole('combobox', { name: /^day$/i }))
      .or(this.page.locator('select[aria-label*="day" i]'))
      .first();
    const yearSel = this.page
      .getByLabel(/^year$/i)
      .or(this.page.getByRole('combobox', { name: /year/i }))
      .or(this.page.locator('select[aria-label*="year" i]'))
      .first();

    const MONTH_NAMES = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ] as const;
    const monthLabel = MONTH_NAMES[monthNum - 1];

    const selectWithFallbacks = async (locator: Locator, valueAttempts: { value?: string; label?: string }[]) => {
      let lastErr: unknown;
      for (const opt of valueAttempts) {
        try {
          await locator.selectOption(opt, { timeout: 3000 });
          return;
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr;
    };

    if (await monthSel.isVisible().catch(() => false)) {
      await selectWithFallbacks(monthSel, [
        { value: m.padStart(2, '0') },
        { value: String(monthNum) },
        { label: monthLabel },
        { label: monthLabel.slice(0, 3) },
      ]);
      await selectWithFallbacks(daySel, [
        { value: d.padStart(2, '0') },
        { value: String(dayNum) },
      ]);
      await yearSel.selectOption({ value: y });
      return;
    }
    throw new Error(
      'Date of birth: no input[type="date"], MM/DD/YYYY text field, or Month/Day/Year selects found.'
    );
  }

  async enterEmail(value: string) {
    await this.page.getByRole('textbox', { name: /^email$/i }).fill(value);
  }

  async enterZipCode(value: string) {
    const zip = this.page.getByLabel(/zip|postal/i);
    if (await zip.count()) {
      await zip.first().fill(value);
      return;
    }
    await this.page.locator('input[name*="zip" i], input[placeholder*="zip" i]').first().fill(value);
  }

  async enterReferralCode(value: string) {
    const byRole = this.page.getByRole('textbox', { name: /referral|provider code/i });
    if (await byRole.isVisible().catch(() => false)) {
      await byRole.fill(value);
      return;
    }
    await this.page.getByPlaceholder(/^enter code$/i).fill(value);
  }

  async clickApplyOnSignUpForm() {
    await this.page.getByRole('button', { name: /^apply$/i }).click();
  }

  /**
   * Legal consent + treatment attestation. The first checkboxes on the form are treatment
   * options; the last three are Terms/Privacy/communications — do not use a numeric limit.
   */
  async acceptAllConsentCheckboxes() {
    const checkVisible = async (box: Locator) => {
      if (!(await box.isVisible().catch(() => false)) || (await box.isChecked().catch(() => true))) return;
      await box.check({ force: true });
    };

    await checkVisible(
      this.page.getByRole('checkbox', { name: /have not received any of these treatments/i })
    );

    for (const pattern of [
      /sign up for the program/i,
      /consent to receive/i,
      /privacy notice|health data policy|financial incentive|terms/i,
    ]) {
      const matches = this.page.getByRole('checkbox', { name: pattern });
      for (let i = 0; i < (await matches.count()); i++) {
        await checkVisible(matches.nth(i));
      }
    }
  }

  async clickCreateAccount() {
    await this.page.getByRole('button', { name: /create account/i }).click();
    try {
      await this.page.waitForURL((url) => !/\/signup\/?$/i.test(url.pathname), { timeout: 60_000 });
    } catch {
      const validation = await this.page
        .getByText(/must accept|terms|required|invalid/i)
        .first()
        .textContent()
        .catch(() => null);
      throw new Error(
        `Create account did not leave the signup page.${validation ? ` ${validation.trim()}` : ''}`
      );
    }
  }

  async clickNextRewardClaimScreen() {
    const next = this.page.getByRole('button', { name: /^next$/i });
    await next.waitFor({ state: 'visible', timeout: 60_000 });
    await next.click();
  }

  async clickNextFollowUpScreen() {
    const next = this.page.getByRole('button', { name: /^next$/i });
    await next.waitFor({ state: 'visible', timeout: 60_000 });
    await next.click();
  }

  private dismissButtonsIn(scope: Locator) {
    return scope
      .getByRole('button', { name: /close|dismiss|got it|done|skip/i })
      .or(scope.locator('button[aria-label*="close" i], button[aria-label*="dismiss" i]'));
  }

  /** Dismiss the current onboarding/promo overlay (Close icon or labeled button). */
  async closeFirstDialog() {
    const dialog = this.page.getByRole('dialog').last();
    const target = (await dialog.isVisible({ timeout: 5000 }).catch(() => false))
      ? this.dismissButtonsIn(dialog)
      : this.dismissButtonsIn(this.page.locator('body'));
    await target.first().waitFor({ state: 'visible', timeout: 60_000 });
    await target.first().click();
    await target.first().waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
  }

  /**
   * Some builds show a second promo modal; others finish after the first Close.
   * Skip gracefully when no overlay remains instead of waiting for a missing button.
   */
  async closeSecondDialog() {
    const dialog = this.page.getByRole('dialog').last();
    if (!(await dialog.isVisible({ timeout: 5000 }).catch(() => false))) return;

    const target = this.dismissButtonsIn(dialog);
    if (!(await target.first().isVisible().catch(() => false))) return;

    await target.first().click();
    await target.first().waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
  }

  /**
   * Profile questionnaire: check every visible unchecked checkbox (e.g. health/beauty questions).
   */
  async checkAllProfileQuestionCheckboxes() {
    const boxes = this.page.getByRole('checkbox');
    const n = await boxes.count();
    const limit = Math.min(n, 40);
    for (let i = 0; i < limit; i++) {
      const box = boxes.nth(i);
      if ((await box.isVisible().catch(() => false)) && !(await box.isChecked().catch(() => true))) {
        await box.check({ force: true });
      }
    }
  }

  /** Claim flow after profile questions (e.g. birthday bonus). */
  async claimBirthdayPoints() {
    const byName = this.page.getByRole('button', {
      name: /claim.*(birthday|points)|birthday|claim\s+(your\s+)?(birthday\s+)?points/i,
    });
    if (await byName.first().isVisible({ timeout: 15_000 }).catch(() => false)) {
      await byName.first().click();
      return;
    }
    const genericClaim = this.page.getByRole('button', { name: /^claim$/i }).first();
    if (await genericClaim.isVisible({ timeout: 5000 }).catch(() => false)) {
      await genericClaim.click();
      return;
    }
    await this.page.getByRole('link', { name: /claim/i }).first().click();
  }

  async expectDashboardPoints(expectedPoints: string) {
    const points = this.page.getByText(new RegExp(`${expectedPoints}\\s*(pts|points)?`, 'i'));
    await expect(points.first()).toBeVisible({ timeout: 60_000 });
  }
}
