import { type Locator, type Page, expect } from '@playwright/test';

/**
 * Provider OCE — Patient Checkout Approval / Pending SMS screen (BL10-522).
 * Entered after Continue on checkout (BL10-521).
 */
export class PatientCheckoutPendingPage {
  constructor(readonly page: Page) {}

  readonly root: Locator = this.page
    .locator('[data-testid="checkout-pending"], [data-test="checkout-pending"], .checkout-pending')
    .or(this.page.getByRole('main').filter({ hasText: /pending|waiting|confirm|approval|sms/i }));

  readonly loadingBox: Locator = this.page
    .locator('[data-testid="pending-loading"], [data-test="pending-loading"], .pending-loading')
    .or(this.page.getByRole('status'))
    .or(this.page.locator('[class*="loading" i], [class*="spinner" i], [aria-busy="true"]'));

  readonly instructions: Locator = this.page
    .getByText(/what to do next|waiting for|confirm|approve|sms|patient/i)
    .first();

  readonly destinationPhone: Locator = this.page
    .locator('[data-testid="sms-destination"], [data-test="sms-destination"], .sms-destination')
    .or(this.page.getByText(/\+?\d[\d\s().-]{7,}\d/));

  readonly resendButton: Locator = this.page.getByRole('button', {
    name: /resend/i,
  });

  readonly supportEmail: Locator = this.page
    .locator('[data-testid="support-email"], [data-test="support-email"]')
    .or(this.page.getByText(/@|support email|placeholder/i).filter({ hasNotText: /phone/i }));

  readonly supportPhone: Locator = this.page
    .locator('[data-testid="support-phone"], [data-test="support-phone"]')
    .or(this.page.getByText(/support phone|placeholder|^\+?\d/i));

  readonly copyEmailButton: Locator = this.page.getByRole('button', {
    name: /copy.*email|email.*copy|copy/i,
  }).first();

  readonly copyPhoneButton: Locator = this.page
    .getByRole('button', { name: /copy.*phone|phone.*copy/i })
    .or(this.page.getByRole('button', { name: /^copy$/i }).nth(1));

  readonly cancelButton: Locator = this.page.getByRole('button', {
    name: /cancel transaction|cancel/i,
  });

  readonly errorDenied: Locator = this.page.getByText(/patient denied|denied transaction/i);
  readonly errorExpired: Locator = this.page.getByText(/expired|approval request expired/i);
  readonly errorUnreachable: Locator = this.page.getByText(/could not reach|unreachable/i);
  readonly errorGeneric: Locator = this.page.getByText(/something went wrong|generic error|unexpected error/i);

  readonly completionHeading: Locator = this.page.getByRole('heading', {
    name: /complete|success|confirmed|thank you/i,
  });

  /**
   * Loads a UI-contract fixture representing the Pending screen (for automatable AC without full OCE checkout).
   */
  async loadUiContractFixture(html: string): Promise<void> {
    await this.page.setContent(html, { waitUntil: 'domcontentloaded' });
  }

  async expectPendingVisible(): Promise<void> {
    await expect(this.loadingBox.or(this.instructions).first()).toBeVisible({ timeout: 15_000 });
    await expect(this.cancelButton.or(this.resendButton).first()).toBeVisible({ timeout: 15_000 });
  }

  async expectDestinationPhoneVisible(): Promise<void> {
    await expect(this.destinationPhone.first()).toBeVisible({ timeout: 15_000 });
  }

  async clickResend(): Promise<void> {
    await expect(this.resendButton).toBeVisible();
    await this.resendButton.click();
  }

  async clickCancel(): Promise<void> {
    await expect(this.cancelButton).toBeVisible();
    await this.cancelButton.click();
  }

  async copySupportEmail(): Promise<string> {
    const btn = this.page.locator('[data-testid="copy-email"], [data-test="copy-email"]').or(
      this.copyEmailButton
    );
    await expect(btn.first()).toBeVisible();
    await btn.first().click();
    return this.readClipboard();
  }

  async copySupportPhone(): Promise<string> {
    const btn = this.page.locator('[data-testid="copy-phone"], [data-test="copy-phone"]').or(
      this.copyPhoneButton
    );
    await expect(btn.first()).toBeVisible();
    await btn.first().click();
    return this.readClipboard();
  }

  async readClipboard(): Promise<string> {
    // Prefer in-page stub (setContent fixtures are not a secure clipboard context)
    const stub = await this.page.evaluate(() => {
      const w = window as unknown as { __lastClipboard?: string };
      return w.__lastClipboard ?? '';
    });
    if (stub) return stub;
    return this.page.evaluate(async () => {
      if (!navigator.clipboard?.readText) return '';
      return navigator.clipboard.readText();
    });
  }

  async expectErrorState(
    kind: 'denied' | 'expired' | 'unreachable' | 'generic'
  ): Promise<void> {
    const map = {
      denied: this.errorDenied,
      expired: this.errorExpired,
      unreachable: this.errorUnreachable,
      generic: this.errorGeneric,
    } as const;
    await expect(map[kind].first()).toBeVisible({ timeout: 15_000 });
  }
}

/** Minimal HTML fixture matching BL10-522 Pending + troubleshooting controls (placeholder copy). */
export function pendingScreenFixtureHtml(options?: {
  phone?: string;
  email?: string;
  supportPhone?: string;
  state?: 'pending' | 'denied' | 'expired' | 'unreachable' | 'generic' | 'cancelled' | 'complete';
}): string {
  const phone = options?.phone ?? '+1 (555) 010-2299';
  const email = options?.email ?? '[support email — placeholder]';
  const supportPhone = options?.supportPhone ?? '[support phone — placeholder]';
  const state = options?.state ?? 'pending';

  const errorBlock =
    state === 'denied'
      ? '<p data-testid="error-denied">Patient Denied Transaction</p>'
      : state === 'expired'
        ? '<p data-testid="error-expired">Approval Request Expired</p>'
        : state === 'unreachable'
          ? '<p data-testid="error-unreachable">Could not reach patient</p>'
          : state === 'generic'
            ? '<p data-testid="error-generic">Something went wrong (generic error)</p>'
            : '';

  const completeBlock =
    state === 'complete'
      ? '<h1>Transaction Complete</h1><p>Thank you — patient confirmed.</p>'
      : '';

  const pendingBlock =
    state === 'pending' || state === 'cancelled'
      ? `
      <div data-testid="pending-loading" role="status" aria-busy="true" class="pending-loading">
        <div class="sq"></div><div class="sq"></div><div class="sq"></div><div class="sq"></div>
        <p>Waiting for patient to confirm via SMS — what to do next</p>
      </div>
      <p data-testid="sms-destination" class="sms-destination">${phone}</p>
      <button type="button" data-testid="resend">Resend</button>
      <section>
        <p data-testid="support-email">${email}</p>
        <button type="button" data-testid="copy-email">Copy email</button>
        <p data-testid="support-phone">${supportPhone}</p>
        <button type="button" data-testid="copy-phone">Copy phone</button>
      </section>
      <button type="button" data-testid="cancel">Cancel transaction</button>
      `
      : '';

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>Checkout Pending</title>
<script>
  window.__resendCount = 0;
  window.__cancelled = false;
</script>
</head>
<body>
<main data-testid="checkout-pending" class="checkout-pending">
  ${completeBlock}
  ${errorBlock}
  ${pendingBlock}
</main>
<script>
  const email = ${JSON.stringify(email)};
  const supportPhone = ${JSON.stringify(supportPhone)};
  window.__lastClipboard = '';
  async function copyText(value) {
    window.__lastClipboard = value;
    try { await navigator.clipboard.writeText(value); } catch (_) { /* about:blank has no clipboard */ }
  }
  document.querySelector('[data-testid="copy-email"]')?.addEventListener('click', () => copyText(email));
  document.querySelector('[data-testid="copy-phone"]')?.addEventListener('click', () => copyText(supportPhone));
  document.querySelector('[data-testid="resend"]')?.addEventListener('click', () => { window.__resendCount++; });
  document.querySelector('[data-testid="cancel"]')?.addEventListener('click', () => {
    window.__cancelled = true;
    document.querySelector('[data-testid="pending-loading"]')?.remove();
    const p = document.createElement('p');
    p.textContent = 'Transaction cancelled';
    document.querySelector('main')?.appendChild(p);
  });
</script>
</body></html>`;
}
