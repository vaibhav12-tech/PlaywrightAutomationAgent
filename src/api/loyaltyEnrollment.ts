import { type Page } from 'playwright';

export type LoyaltyEnrollmentInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  zip: string;
  verificationCode?: string;
};

export type LoyaltyEnrollmentApiResponse = {
  customerId: string;
  success: boolean;
  /** Display name used by Home ("Welcome, {name}") — from enrollment payload. */
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type LoyaltyEnrollmentResult = {
  success: boolean;
  customerId: string;
  firstName: string;
  lastName: string;
  /** Name from the enrollment API response used for Home verification. */
  enrolledName: string;
  phone: string;
  email: string;
  rawSignupResponse: LoyaltyEnrollmentApiResponse;
};

type BrowserFetchResult = {
  status: number;
  body: string;
  contentType: string;
};

function loyaltyBaseUrl(): string {
  const base =
    process.env.BASE_URL ||
    'https://revance-loyalty-git-dev-revances-projects.vercel.app';
  return base.replace(/\/$/, '');
}

/** UNIQUE → fresh 10-digit test phone; otherwise normalize to E.164 (+1…). */
export function resolveEnrollmentPhone(phone: string): string {
  const raw = phone.trim();
  const local = /^unique$/i.test(raw) ? `9${Date.now().toString().slice(-9)}` : raw;
  const digits = local.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return local.startsWith('+') ? local : `+${digits}`;
}

function uniquifyEmail(email: string, phoneE164: string): string {
  if (!/^john\.doe@test\.com$/i.test(email)) return email;
  return `john.doe+${phoneE164.replace(/\D/g, '').slice(-8)}@test.com`;
}

function isVercelCheckpoint(status: number, body: string): boolean {
  return (
    status === 429 ||
    /vercel security checkpoint/i.test(body) ||
    /cdn\.vercel-insights|challenge/i.test(body)
  );
}

function assertBrowserOk(result: BrowserFetchResult, label: string): void {
  if (result.status >= 200 && result.status < 300) return;
  if (isVercelCheckpoint(result.status, result.body)) {
    throw new Error(
      `${label} blocked by Vercel Security Checkpoint (${result.status}). ` +
        `Open the loyalty URL in a normal browser once, or re-run shortly. ` +
        `Body: ${result.body.slice(0, 180)}`
    );
  }
  throw new Error(`${label} failed (${result.status}): ${result.body.slice(0, 300)}`);
}

/**
 * Same-origin fetch from the real browser page (cookies + TLS fingerprint).
 * Playwright APIRequestContext is often challenged by Vercel bot protection.
 */
async function browserPostJson(
  page: Page,
  path: string,
  data: unknown
): Promise<BrowserFetchResult> {
  return page.evaluate(
    async ({ path: apiPath, payload }) => {
      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      return {
        status: res.status,
        body: await res.text(),
        contentType: res.headers.get('content-type') || '',
      };
    },
    { path, payload: data }
  );
}

async function postJsonWithRetry(
  page: Page,
  path: string,
  data: unknown,
  label: string,
  attempts = 4
): Promise<BrowserFetchResult> {
  let last: BrowserFetchResult | undefined;
  for (let i = 1; i <= attempts; i++) {
    last = await browserPostJson(page, path, data);
    if (last.status >= 200 && last.status < 300) return last;

    if (isVercelCheckpoint(last.status, last.body) && i < attempts) {
      const delayMs = 1500 * i;
      console.warn(
        `[loyaltyEnrollment] ${label} hit Vercel checkpoint (${last.status}); retry ${i}/${attempts} in ${delayMs}ms`
      );
      // Soft wait — bot challenges often clear after a short pause + page reload
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page
        .waitForLoadState('networkidle', { timeout: 15_000 })
        .catch(() => {});
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }
    break;
  }
  assertBrowserOk(last!, label);
  return last!;
}

/** Ensure we are on the app origin and not stuck on Vercel's checkpoint HTML. */
async function openLoyaltyApp(page: Page, base: string): Promise<void> {
  await page.goto(`${base}/welcome`, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  // If Vercel served a challenge page, wait for the real welcome UI (or retry once).
  const checkpoint = page.getByText(/vercel security checkpoint/i);
  if (await checkpoint.isVisible().catch(() => false)) {
    console.warn('[loyaltyEnrollment] Vercel checkpoint on /welcome — waiting for pass-through');
    await checkpoint.waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => {});
    await page.goto(`${base}/welcome`, { waitUntil: 'domcontentloaded' });
  }

  await page
    .getByRole('textbox', { name: /phone|mobile/i })
    .or(page.locator('input[type="tel"], input[name*="phone" i]'))
    .first()
    .waitFor({ state: 'visible', timeout: 30_000 })
    .catch(() => {});
}

/**
 * Enroll a loyalty profile through APIs only (enrollment/signup form is never opened).
 * After signup, lands on Home via profile-building handoff while the session is logged in.
 */
export async function enrollLoyaltyProfileViaApi(
  page: Page,
  input: LoyaltyEnrollmentInput
): Promise<LoyaltyEnrollmentResult> {
  const base = loyaltyBaseUrl();
  const phone = resolveEnrollmentPhone(input.phone);
  const email = uniquifyEmail(input.email, phone);
  const code = process.env.SIGNUP_OTP?.trim() || input.verificationCode || '112233';

  // Prevent the enrollment form document from opening if the app tries to soft-navigate there.
  const blockSignupForm = async (route: import('playwright').Route) => {
    const req = route.request();
    if (req.resourceType() === 'document' && /\/signup\/?(\?|$)/i.test(req.url())) {
      await route.abort();
      return;
    }
    await route.continue();
  };
  await page.route('**/*', blockSignupForm);

  try {
    await openLoyaltyApp(page, base);

    await postJsonWithRetry(page, '/api/phone/check-voip', { phone }, 'check-voip');

    await postJsonWithRetry(
      page,
      '/api/auth/phone-number/send-otp',
      { phoneNumber: phone },
      'send-otp'
    );

    const submitPhone = await page.evaluate(async (phoneNumber) => {
      const res = await fetch('/welcome?/submitPhone', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ phone: phoneNumber }),
        credentials: 'include',
      });
      return { status: res.status, body: await res.text() };
    }, phone);
    if (submitPhone.status >= 400) {
      throw new Error(`submitPhone failed (${submitPhone.status}): ${submitPhone.body}`);
    }

    // Needed only to mint the signed phone_verified cookie — not the enrollment form.
    await page.goto(`${base}/otp-confirmation`, { waitUntil: 'domcontentloaded' });

    await postJsonWithRetry(
      page,
      '/api/auth/phone-number/verify',
      { phoneNumber: phone, code },
      'verify-otp'
    );

    const verifyPhone = await page.evaluate(async () => {
      const res = await fetch('/otp-confirmation?/verifyPhone', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: '',
        credentials: 'include',
      });
      return { status: res.status, body: await res.text() };
    });
    if (verifyPhone.status >= 400) {
      throw new Error(`verifyPhone failed (${verifyPhone.status}): ${verifyPhone.body}`);
    }

    const signupPayload = {
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      phone,
      dob: input.dateOfBirth,
      zipCode: input.zip,
      smsOptIn: false,
      emailOptIn: true,
      consentProgramCommunications: true,
      consentMarketingSms: false,
      consentLegalTerms: true,
      receivedDaxxifyTreatment: false,
      receivedRhaTreatment: false,
      receivedSkinPenTreatment: false,
    };

    // Signup API is typically called from /signup origin referer — stay same-origin via browser fetch.
    const signup = await postJsonWithRetry(
      page,
      '/api/customers/signup',
      signupPayload,
      'customers/signup'
    );

    let signupBody: { customerId?: string; success?: boolean; message?: string };
    try {
      signupBody = JSON.parse(signup.body) as {
        customerId?: string;
        success?: boolean;
        message?: string;
      };
    } catch {
      throw new Error(`customers/signup returned non-JSON: ${signup.body.slice(0, 300)}`);
    }

    if (!signupBody.success || !signupBody.customerId) {
      throw new Error(`Enrollment API did not return success: ${JSON.stringify(signupBody)}`);
    }

    const enrolledName = input.firstName.trim();
    const rawSignupResponse: LoyaltyEnrollmentApiResponse = {
      customerId: signupBody.customerId,
      success: true,
      name: enrolledName,
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      phone,
    };

    // Post-enroll handoff (not the enrollment form). App auto-redirects to Home/dashboard.
    await page.goto(`${base}/profile-building?destination=dashboard`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForURL(/\/dashboard\/?$/i, { timeout: 60_000 });

    if (/\/signup\/?/i.test(page.url())) {
      throw new Error(
        `Expected Home after API enrollment, but enrollment form is still open: ${page.url()}`
      );
    }

    return {
      success: true,
      customerId: rawSignupResponse.customerId,
      firstName: input.firstName,
      lastName: input.lastName,
      enrolledName,
      phone,
      email,
      rawSignupResponse,
    };
  } finally {
    await page.unroute('**/*', blockSignupForm).catch(() => {});
  }
}
