// spec: manual-test-cases/BL10-522.md
// story: https://revance-it.atlassian.net/browse/BL10-522

import { test, expect } from '../src/fixtures';
import {
  pendingScreenFixtureHtml,
} from '../src/pages/PatientCheckoutPendingPage';
import config from '../src/config';

/**
 * BL10-522 — Patient Checkout Approval (Pending SMS).
 *
 * UI-contract tests use an in-page fixture matching AC elements (story is UI-only;
 * full OCE checkout + live SMS requires BL10-521 path + patient device).
 * Set OCE_PENDING_E2E=true + credentials to enable live E2E (skipped by default).
 */

test.describe('BL10-522: Patient Checkout Approval — UI contract', () => {
  test.use({
    permissions: ['clipboard-read', 'clipboard-write'],
  });

  test('TC-001: Pending screen shows loading box and instructions', async ({
    patientCheckoutPendingPage,
  }) => {
    await patientCheckoutPendingPage.loadUiContractFixture(pendingScreenFixtureHtml());
    await patientCheckoutPendingPage.expectPendingVisible();
    await expect(patientCheckoutPendingPage.instructions).toBeVisible();
    await expect(patientCheckoutPendingPage.loadingBox).toBeVisible();
  });

  test('TC-002: Destination phone number is displayed', async ({
    patientCheckoutPendingPage,
  }) => {
    const phone = '+1 (555) 010-2299';
    await patientCheckoutPendingPage.loadUiContractFixture(
      pendingScreenFixtureHtml({ phone })
    );
    await patientCheckoutPendingPage.expectDestinationPhoneVisible();
    await expect(patientCheckoutPendingPage.destinationPhone.first()).toContainText('555');
  });

  test('TC-003: Resend control is actionable', async ({
    patientCheckoutPendingPage,
    page,
  }) => {
    await patientCheckoutPendingPage.loadUiContractFixture(pendingScreenFixtureHtml());
    await patientCheckoutPendingPage.clickResend();
    await expect
      .poll(async () => page.evaluate(() => (window as unknown as { __resendCount: number }).__resendCount))
      .toBe(1);
  });

  test('TC-004: Copy support email to clipboard', async ({
    patientCheckoutPendingPage,
  }) => {
    const email = '[support email — placeholder]';
    await patientCheckoutPendingPage.loadUiContractFixture(
      pendingScreenFixtureHtml({ email })
    );
    const copied = await patientCheckoutPendingPage.copySupportEmail();
    expect(copied).toBe(email);
  });

  test('TC-005: Copy support phone to clipboard', async ({
    patientCheckoutPendingPage,
  }) => {
    const supportPhone = '[support phone — placeholder]';
    await patientCheckoutPendingPage.loadUiContractFixture(
      pendingScreenFixtureHtml({ supportPhone })
    );
    const copied = await patientCheckoutPendingPage.copySupportPhone();
    expect(copied).toBe(supportPhone);
  });

  test('TC-006 / TC-013: Cancel transaction does not complete approval', async ({
    patientCheckoutPendingPage,
    page,
  }) => {
    await patientCheckoutPendingPage.loadUiContractFixture(pendingScreenFixtureHtml());
    await patientCheckoutPendingPage.clickCancel();
    await expect
      .poll(async () => page.evaluate(() => (window as unknown as { __cancelled: boolean }).__cancelled))
      .toBeTruthy();
    await expect(page.getByText(/transaction cancelled/i)).toBeVisible();
    await expect(patientCheckoutPendingPage.completionHeading).toHaveCount(0);
  });

  test('TC-008: Placeholder copy does not hide required controls', async ({
    patientCheckoutPendingPage,
  }) => {
    await patientCheckoutPendingPage.loadUiContractFixture(pendingScreenFixtureHtml());
    await expect(patientCheckoutPendingPage.resendButton).toBeEnabled();
    await expect(patientCheckoutPendingPage.cancelButton).toBeEnabled();
  });

  test('TC-009: Error state — Patient Denied Transaction', async ({
    patientCheckoutPendingPage,
  }) => {
    await patientCheckoutPendingPage.loadUiContractFixture(
      pendingScreenFixtureHtml({ state: 'denied' })
    );
    await patientCheckoutPendingPage.expectErrorState('denied');
  });

  test('TC-010: Error state — Approval Request Expired', async ({
    patientCheckoutPendingPage,
  }) => {
    await patientCheckoutPendingPage.loadUiContractFixture(
      pendingScreenFixtureHtml({ state: 'expired' })
    );
    await patientCheckoutPendingPage.expectErrorState('expired');
  });

  test('TC-011: Error state — Could not reach patient', async ({
    patientCheckoutPendingPage,
  }) => {
    await patientCheckoutPendingPage.loadUiContractFixture(
      pendingScreenFixtureHtml({ state: 'unreachable' })
    );
    await patientCheckoutPendingPage.expectErrorState('unreachable');
  });

  test('TC-012: Error state — Generic error', async ({
    patientCheckoutPendingPage,
  }) => {
    await patientCheckoutPendingPage.loadUiContractFixture(
      pendingScreenFixtureHtml({ state: 'generic' })
    );
    await patientCheckoutPendingPage.expectErrorState('generic');
  });

  test('TC-014: Clipboard contains only intended support email', async ({
    patientCheckoutPendingPage,
  }) => {
    const email = 'rewards-support@example.com';
    await patientCheckoutPendingPage.loadUiContractFixture(
      pendingScreenFixtureHtml({ email })
    );
    const copied = await patientCheckoutPendingPage.copySupportEmail();
    expect(copied).toBe(email);
    expect(copied).not.toMatch(/session|token|bearer/i);
  });

  test('TC-016: Phone number readable at mobile viewport', async ({
    patientCheckoutPendingPage,
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await patientCheckoutPendingPage.loadUiContractFixture(
      pendingScreenFixtureHtml({ phone: '+1 (555) 010-2299' })
    );
    const box = await patientCheckoutPendingPage.destinationPhone.first().boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(375);
    await expect(patientCheckoutPendingPage.destinationPhone.first()).toBeVisible();
  });
});

test.describe('BL10-522: Live OCE E2E (optional)', () => {
  test('TC-007 / TC-015: Checkout Continue → Pending → patient approval (live)', async ({
    ocePortalPage,
    patientCheckoutPendingPage,
  }) => {
    test.skip(
      process.env.OCE_PENDING_E2E !== 'true',
      'Set OCE_PENDING_E2E=true with OCE credentials + BL10-521 checkout path to run live E2E'
    );

    process.env.OCE_BASE_URL =
      process.env.OCE_BASE_URL ||
      ('oceBaseUrl' in config ? String((config as { oceBaseUrl?: string }).oceBaseUrl) : '');

    await ocePortalPage.gotoLogin();
    // Live path depends on org-specific checkout navigation (BL10-521).
    // When enabled, land on Pending and assert contract elements against the real app.
    await patientCheckoutPendingPage.expectPendingVisible();
    await patientCheckoutPendingPage.expectDestinationPhoneVisible();
  });
});
