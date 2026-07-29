import { expect } from '@playwright/test';
import { type Frame, type Locator, type Page } from 'playwright';

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Ordered by typical Salesforce / Experience Cloud + Lightning DOM. */
const USERNAME_LOCATORS = (scope: Page | Frame) => [
  // Accessible names from visible labels (“Username” / “Email”) — works when ids differ from #username
  scope.getByRole('textbox', { name: /^username$/i }),
  scope.getByRole('textbox', { name: /^email$/i }),
  scope.getByLabel(/^username$/i),
  scope.getByLabel(/^email$/i),
  scope.locator('#username'),
  scope.locator('input[name="username"]'),
  scope.locator('input[autocomplete="username"]'),
  scope.locator('input[type="email"]'),
  scope.getByPlaceholder(/username|email|user\s*name/i),
  scope.getByLabel(/username|email|user\s*name/i),
  scope.locator('lightning-input input.slds-input'),
  scope.locator('lightning-input input'),
  scope.locator('lightning-primitive-input-simple input'),
  scope.locator('input[id*="username" i]'),
];

const PASSWORD_LOCATORS = (scope: Page | Frame) => [
  // Prefer real DOM first — pierces LWC shadow; role/label names vary by org
  scope.locator('input[type="password"]'),
  scope.locator('lightning-input input[type="password"]'),
  scope.getByRole('textbox', { name: /^password$/i }),
  scope.getByLabel(/^password$/i),
  scope.locator('#password'),
  scope.locator('input[name="password"]'),
  scope.getByPlaceholder(/^password$/i),
];

/**
 * OCE / Experience Cloud portal — treatment flow.
 * Login fields may be in iframes and/or Lightning shadow DOM (not only #username in light DOM).
 */
export class OcePortalPage {
  constructor(readonly page: Page) {}

  /** Avoids injecting duplicate CSS on every poll in `resolveCredentials`. */
  private embeddedMessagingStylesApplied = false;

  /** Filled after successful credential resolution; avoids re-probing between steps. */
  private cachedCredentials: {
    scope: Page | Frame;
    username: Locator;
    password: Locator;
  } | null = null;

  /** Resolved after `expectPatientSearchVisible` for faster `enterMobileNumber`. */
  private cachedPatientSearch: Locator | null = null;

  async gotoLogin() {
    this.cachedCredentials = null;
    this.cachedPatientSearch = null;
    this.embeddedMessagingStylesApplied = false;
    const url = process.env.OCE_BASE_URL;
    if (!url) {
      throw new Error('OCE_BASE_URL is not set (configure oceBaseUrl in env config and hooks).');
    }
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    // Salesforce SPAs often never reach networkidle — do not block on it.
    await this.page.waitForLoadState('load', { timeout: 60_000 }).catch(() => {});
    await this.dismissBlockingOverlays();
  }

  private async dismissBlockingOverlays() {
    const close = this.page.getByRole('button', { name: /close|dismiss|got it|refresh/i });
    for (let i = 0; i < 4; i++) {
      if (await close.first().isVisible().catch(() => false)) {
        await close.first().click().catch(() => {});
        await this.page.waitForTimeout(400);
      } else break;
    }
    // Embedded chat (“Live chat: Agent Offline”) can sit above the form and block hit-testing
    await this.page
      .locator('[class*="chat" i], [id*="embeddedService" i], [class*="embeddedMessaging" i]')
      .locator('button[aria-label*="close" i], button[title*="minimize" i], [class*="minimize" i]')
      .first()
      .click({ timeout: 2000 })
      .catch(() => {});
    // Salesforce Embedded Messaging often has no reliable close; collapse it from layout for automation
    if (!this.embeddedMessagingStylesApplied) {
      await this.page
        .addStyleTag({
          content: `
          [id*="embeddedMessaging" i], [class*="embeddedService" i] {
            pointer-events: none !important;
            opacity: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
          }
        `,
        })
        .catch(() => {});
      this.embeddedMessagingStylesApplied = true;
    }
  }

  /**
   * RCA for prior Timeout on #username:
   * - Inputs live under lightning-input (shadow), not as top-level #username.
   * - Or inside an iframe; main-frame-only locators never see them.
   * - networkidle never fires; page looked "ready" before LWC hydrated.
   */
  private async resolveCredentials(): Promise<{
    scope: Page | Frame;
    username: Locator;
    password: Locator;
  }> {
    if (this.cachedCredentials) return this.cachedCredentials;

    const deadline = Date.now() + 60_000;
    let lastError = '';

    while (Date.now() < deadline) {
      const found = await this.tryResolveCredentialsOnce();
      if (found) {
        this.cachedCredentials = found;
        return found;
      }
      lastError = await this.snapshotLoginDebug();
      await this.page.waitForTimeout(600);
      await this.dismissBlockingOverlays();
    }

    throw new Error(
      `Login fields not found within 60s. ${lastError} ` +
        'Confirm OCE_BASE_URL, fix sandbox/CSS errors, or update USERNAME_LOCATORS / PASSWORD_LOCATORS for your org.'
    );
  }

  private async snapshotLoginDebug(): Promise<string> {
    const url = this.page.url();
    const title = await this.page.title().catch(() => '');
    const bodySnippet = await this.page
      .locator('body')
      .innerText()
      .then((t) => t.slice(0, 280).replace(/\s+/g, ' '))
      .catch(() => '');
    return `url=${url} title=${title} body~="${bodySnippet}"`;
  }

  /**
   * Walk all `input` elements in DOM order (Playwright pierces open shadow — LWC inputs count).
   * Pairs the closest eligible field before each `type=password` (skips hidden/checkbox/etc.).
   * Supplements `tryLoginFormPair`, which misses shadow-hosted inputs inside `lightning-input`.
   */
  private async tryPairInputsByDomOrder(scope: Page | Frame): Promise<{
    scope: Page | Frame;
    username: Locator;
    password: Locator;
  } | null> {
    const inputs = scope.locator('input');
    const total = await inputs.count();
    const skipBeforePwd = new Set(['hidden', 'submit', 'button', 'checkbox', 'radio', 'password']);

    for (let pIdx = 0; pIdx < total; pIdx++) {
      const pwdEl = inputs.nth(pIdx);
      const pType = (await pwdEl.getAttribute('type'))?.toLowerCase() ?? 'text';
      if (pType !== 'password') continue;

      const okP = await pwdEl.isVisible({ timeout: 2_000 }).catch(() => false);
      if (!okP) continue;

      for (let uIdx = pIdx - 1; uIdx >= 0; uIdx--) {
        const userEl = inputs.nth(uIdx);
        const uType = (await userEl.getAttribute('type'))?.toLowerCase() ?? 'text';
        if (skipBeforePwd.has(uType)) continue;

        const okU = await userEl.isVisible({ timeout: 2_000 }).catch(() => false);
        if (okU) {
          return { scope, username: userEl, password: pwdEl };
        }
      }
    }
    return null;
  }

  private async tryLoginFormPair(scope: Page | Frame): Promise<{
    scope: Page | Frame;
    username: Locator;
    password: Locator;
  } | null> {
    const form = scope.locator('form:has(input[type="password"])').first();
    if ((await form.count()) === 0) return null;

    type Idx = { u: number; p: number } | null;
    const indices = await form.evaluate((formEl): Idx => {
      const inputs = Array.from(formEl.querySelectorAll('input')).filter(
        (node): node is HTMLInputElement => node instanceof HTMLInputElement
      );
      const pIdx = inputs.findIndex((i) => i.type === 'password');
      if (pIdx < 0) return null;
      const skip = new Set(['hidden', 'submit', 'button', 'checkbox', 'radio', 'password']);
      for (let j = pIdx - 1; j >= 0; j--) {
        const t = inputs[j].type || 'text';
        if (skip.has(t)) continue;
        return { u: j, p: pIdx };
      }
      return null;
    });

    if (!indices) return null;

    const all = form.locator('input');
    const user = all.nth(indices.u);
    const pwd = all.nth(indices.p);

    const ok =
      (await user.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false)) &&
      (await pwd.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false));
    if (!ok) return null;

    return { scope, username: user, password: pwd };
  }

  private async tryResolveCredentialsOnce(): Promise<{
    scope: Page | Frame;
    username: Locator;
    password: Locator;
  } | null> {
    const scopes: (Page | Frame)[] = [
      this.page,
      ...this.page.frames().filter((f) => f !== this.page.mainFrame()),
    ];

    for (const scope of scopes) {
      const byOrder = await this.tryPairInputsByDomOrder(scope);
      if (byOrder) return byOrder;

      const formPair = await this.tryLoginFormPair(scope);
      if (formPair) return formPair;

      for (const userLoc of USERNAME_LOCATORS(scope)) {
        const visible = await userLoc.isVisible({ timeout: 2_000 }).catch(() => false);
        if (!visible) continue;
        for (const passLoc of PASSWORD_LOCATORS(scope)) {
          if (await passLoc.isVisible({ timeout: 2_000 }).catch(() => false)) {
            return { scope, username: userLoc, password: passLoc };
          }
        }
      }
    }
    return null;
  }

  async enterEmail(email: string) {
    const { username } = await this.resolveCredentials();
    await username.fill(email);
  }

  async enterPassword(password: string) {
    const { password: pass } = await this.resolveCredentials();
    await pass.fill(password);
  }

  async clickLogin() {
    const { scope } = await this.resolveCredentials();
    // Experience Cloud sites often label the CTA "Sign in"; classic SF uses "Log In".
    const btn = scope
      .getByRole('button', { name: /^(sign\s*in|log\s*in)$/i })
      .or(scope.getByRole('link', { name: /^(sign\s*in|log\s*in)$/i }))
      .or(scope.locator('input[type="submit"][name="Login"], input#Login, input.loginButton, #login_button'))
      .or(scope.getByTitle(/^(sign\s*in|login)$/i))
      .or(scope.locator('button:has-text("Sign in"), button:has-text("Log In")'));
    await btn.first().click({ timeout: 30_000 });
    this.cachedCredentials = null;
    this.cachedPatientSearch = null;
    await this.page.waitForLoadState('load', { timeout: 90_000 }).catch(() => {});
    await this.ensurePastSalesforceLoginFlow();
  }

  /** Asserts the session left the public login page (URL or login form no longer shown). */
  async expectLoggedIn() {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const url = this.page.url();
      const onLoginPath = /\/login\/?(\?|$)/i.test(url);
      const passwordVisible = await this.page
        .locator('input[type="password"]')
        .first()
        .isVisible()
        .catch(() => false);
      if (!onLoginPath || !passwordVisible) return;
      await this.page.waitForTimeout(500);
    }
    throw new Error(`Login did not complete within 60s. url=${this.page.url()}`);
  }

  private allScopes(): (Page | Frame)[] {
    return [this.page, ...this.page.frames().filter((f) => f !== this.page.mainFrame())];
  }

  private isDetachedOrClosedError(e: unknown): boolean {
    const msg = e instanceof Error ? e.message : String(e);
    return /detached|Target closed|Execution context was destroyed/i.test(msg);
  }

  /** `locator.count()` throws if the underlying frame navigated away or was removed mid-scan. */
  private async safeLocatorCount(locator: Locator): Promise<number> {
    try {
      return await locator.count();
    } catch (e) {
      if (this.isDetachedOrClosedError(e)) return 0;
      throw e;
    }
  }

  /** SSO redirect — no UI. VF Login Flow — must click through before OCE home renders. */
  private needsLoginFlowNavigation(url: string): boolean {
    if (url.includes('/secur/frontdoor.jsp')) return true;
    if (/\/apex\/LoginFlow/i.test(url)) return true;
    if (/LoginFlowMVN/i.test(url)) return true;
    return false;
  }

  /**
   * After password login, Salesforce may send users through `frontdoor.jsp` and/or a Login Flow
   * (`apex/LoginFlow*`). Until that finishes, practice/location steps no-op and patient search
   * does not exist — this advances those screens when possible.
   */
  private async ensurePastSalesforceLoginFlow(): Promise<void> {
    for (let attempt = 0; attempt < 28; attempt++) {
      await this.page.waitForLoadState('load', { timeout: 20_000 }).catch(() => {});
      const url = this.page.url();
      if (!this.needsLoginFlowNavigation(url)) {
        return;
      }

      if (url.includes('/secur/frontdoor.jsp')) {
        await this.page
          .waitForURL((u) => !u.href.includes('/secur/frontdoor.jsp'), { timeout: 90_000 })
          .catch(() => {});
        continue;
      }

      const nextActions = [
        this.page.getByRole('button', {
          name: /^(next|continue|finish|done|save|proceed|submit|ok|get started|start)\b/i,
        }),
        this.page.getByRole('link', { name: /^(next|continue|finish|skip)\b/i }),
        this.page.locator('input.btn[type="submit"]'),
        this.page.locator('input[type="submit"][value*="Next" i]'),
        this.page.locator('input[type="submit"][value*="Continue" i]'),
        this.page.locator('input[type="submit"][value*="Finish" i]'),
      ];

      let clicked = false;
      for (const loc of nextActions) {
        const el = loc.first();
        if (await el.isVisible({ timeout: 1_500 }).catch(() => false)) {
          await el.click({ timeout: 15_000 }).catch(() => {});
          clicked = true;
          break;
        }
      }
      if (!clicked) {
        await this.page.waitForTimeout(900);
      }
    }
  }

  /** OCE / Lightning: placeholders and labels vary; search may be role=searchbox or combobox. */
  private patientSearchLocatorChain(scope: Page | Frame): Locator {
    const byText = /search|find|lookup|mobile|phone|patient|member|mrn|account/i;
    return scope
      .getByRole('searchbox')
      .or(scope.getByPlaceholder(byText))
      .or(scope.getByLabel(byText))
      .or(scope.getByRole('textbox', { name: byText }))
      .or(scope.getByRole('combobox', { name: byText }))
      .or(scope.locator('input[aria-label*="search" i], input[aria-label*="patient" i], input[aria-label*="mobile" i]'))
      .or(scope.locator('input[type="search"], input[type="tel"]'))
      .or(scope.locator('lightning-input input.slds-input, lightning-primitive-input-simple input'));
  }

  private async hasPatientSearchFieldVisible(probeTimeoutMs = 1_500): Promise<boolean> {
    const end = Date.now() + probeTimeoutMs;
    while (Date.now() < end) {
      for (const scope of this.allScopes()) {
        try {
          const chain = this.patientSearchLocatorChain(scope);
          const n = await this.safeLocatorCount(chain);
          for (let i = 0; i < Math.min(n, 25); i++) {
            const visible = await chain
              .nth(i)
              .isVisible({ timeout: 300 })
              .catch(() => false);
            if (visible) return true;
          }
        } catch (e) {
          if (this.isDetachedOrClosedError(e)) continue;
          throw e;
        }
      }
      await this.page.waitForTimeout(250);
    }
    return false;
  }

  private async waitForPatientSearchField(timeoutMs: number): Promise<Locator> {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      if (this.page.isClosed()) {
        throw new Error('Browser closed while waiting for patient search field');
      }
      await this.ensurePastSalesforceLoginFlow();

      for (const scope of this.allScopes()) {
        try {
          const chain = this.patientSearchLocatorChain(scope);
          const n = await this.safeLocatorCount(chain);
          for (let i = 0; i < Math.min(n, 40); i++) {
            const field = chain.nth(i);
            const visible = await field.isVisible({ timeout: 400 }).catch(() => false);
            if (visible) {
              return field;
            }
          }
        } catch (e) {
          if (this.isDetachedOrClosedError(e)) continue;
          throw e;
        }
      }
      await this.tryNavigateToPatientSearchContext();
      if (!this.page.isClosed()) await this.page.waitForTimeout(450);
    }
    const url = this.page.url();
    const title = await this.page.title().catch(() => '');
    throw new Error(
      `Patient search input not found within ${timeoutMs / 1000}s. ` +
        `Still on Login Flow or unexpected UI? url=${url} title=${title}`
    );
  }

  private async tryNavigateToPatientSearchContext(): Promise<boolean> {
    if (this.needsLoginFlowNavigation(this.page.url())) return false;
    const navTargets = [
      this.page.getByRole('link', { name: /^my account$/i }),
      this.page.getByRole('button', { name: /^my account$/i }),
      this.page.getByRole('link', { name: /^view account$/i }),
      this.page.getByRole('button', { name: /^view account$/i }),
      this.page.getByText(/^view account$/i),
    ];

    for (const target of navTargets) {
      const el = target.first();
      const visible = await el.isVisible({ timeout: 400 }).catch(() => false);
      if (!visible) continue;
      const beforeUrl = this.page.url();
      await el.click({ timeout: 10_000 }).catch(() => {});
      if (this.page.isClosed()) return false;
      await this.page
        .waitForURL((u) => u.href !== beforeUrl, { timeout: 12_000 })
        .catch(async () => {
          if (!this.page.isClosed()) await this.page.waitForTimeout(500);
        });
      return !this.page.isClosed();
    }
    return false;
  }

  private async pickDropdownOption(trigger: Locator, optionLabel: string) {
    const label = optionLabel.trim();
    await trigger.click();
    const byRole = this.page.getByRole('option', { name: new RegExp(escapeRegExp(label), 'i') });
    if (await byRole.first().isVisible().catch(() => false)) {
      await byRole.first().click();
      return;
    }
    await this.page.getByText(label, { exact: true }).first().click();
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2010-\u2015]/g, '-')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private async selectNativeOptionByLabel(selectEl: Locator, label: string): Promise<boolean> {
    type OptionData = { value: string; label: string };
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      const options = await selectEl.evaluate((el): OptionData[] => {
        if (!(el instanceof HTMLSelectElement)) return [];
        return Array.from(el.options).map((opt) => ({
          value: opt.value,
          label: (opt.textContent ?? '').trim(),
        }));
      }).catch((): OptionData[] => []);
      if (!options.length) {
        await this.page.waitForTimeout(300);
        continue;
      }

      const wanted = this.normalizeText(label);
      const wantedTokens = wanted.split(/[^a-z0-9]+/).filter((t) => t.length > 2);
      const exact = options.find((opt) => this.normalizeText(opt.label) === wanted);
      const contains = options.find((opt) => {
        const norm = this.normalizeText(opt.label);
        return norm.includes(wanted) || wanted.includes(norm);
      });
      const byTokens = options.find((opt) => {
        const norm = this.normalizeText(opt.label);
        return wantedTokens.length > 0 && wantedTokens.every((token) => norm.includes(token));
      });
      const match = exact ?? contains ?? byTokens;
      const hasOnlyPlaceholder = options.every((opt) => /--\s*select\s*--/i.test(opt.label) || !opt.value);
      if (!match && hasOnlyPlaceholder) {
        await this.page.waitForTimeout(400);
        continue;
      }
      if (match) {
        // Prefer label — VF option values are often Salesforce Ids; empty values also occur.
        const byLabel = await selectEl
          .selectOption({ label: match.label })
          .then(() => true)
          .catch(() => false);
        if (!byLabel && match.value) {
          await selectEl.selectOption({ value: match.value }).catch(() => {});
        }
        if (!byLabel && !match.value) {
          const idx = options.findIndex((opt) => opt.label === match.label);
          if (idx >= 0) await selectEl.selectOption({ index: idx }).catch(() => {});
        }
        // Salesforce VF LoginFlow often ignores Playwright selectOption unless the native
        // selectedIndex + change/input handlers fire with a normalized label match.
        const stuck = await selectEl
          .evaluate((el, wantedRaw) => {
            if (!(el instanceof HTMLSelectElement)) return '';
            const normalize = (value: string) =>
              value
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[\u2010-\u2015]/g, '-')
                .replace(/[^a-zA-Z0-9]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .toLowerCase();
            const wanted = normalize(wantedRaw);
            const wantedTokens = wanted.split(' ').filter((t) => t.length > 1);
            const opts = Array.from(el.options);
            const opt =
              opts.find((o) => normalize(o.textContent ?? '') === wanted) ||
              opts.find((o) => {
                const n = normalize(o.textContent ?? '');
                return n.includes(wanted) || wanted.includes(n);
              }) ||
              opts.find((o) => {
                const n = normalize(o.textContent ?? '');
                return wantedTokens.length > 0 && wantedTokens.every((t) => n.includes(t));
              });
            if (!opt) return '';
            el.value = opt.value;
            el.selectedIndex = opt.index;
            opt.selected = true;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            // Visualforce often wires onchange attribute handlers.
            const attrHandler = el.getAttribute('onchange');
            if (attrHandler) {
              try {
                // eslint-disable-next-line no-new-func
                new Function(attrHandler).call(el);
              } catch {
                /* ignore */
              }
            }
            if (typeof el.onchange === 'function') {
              el.onchange(new Event('change'));
            }
            el.dispatchEvent(new Event('blur', { bubbles: true }));
            return (el.selectedOptions?.[0]?.textContent ?? '').trim();
          }, match.label)
          .catch(() => '');
        await selectEl.press('Tab').catch(() => {});
        const selectedText =
          stuck ||
          (await selectEl.evaluate((el) => {
            if (!(el instanceof HTMLSelectElement)) return '';
            return (el.selectedOptions?.[0]?.textContent ?? '').trim();
          }));
        if (selectedText && !/--\s*select\s*--/i.test(selectedText)) {
          return true;
        }
      }
      await this.page.waitForTimeout(300);
    }
    return false;
  }

  private async isNativeSelect(field: Locator): Promise<boolean> {
    return field
      .evaluate((el) => el instanceof HTMLSelectElement)
      .catch(() => false);
  }

  private async isLoginFlowFieldVisible(fieldName: 'practice' | 'location', probeTimeoutMs = 1_200): Promise<boolean> {
    const end = Date.now() + probeTimeoutMs;
    while (Date.now() < end) {
      if (!this.needsLoginFlowNavigation(this.page.url())) return false;
      for (const scope of this.allScopes()) {
        const fields = this.fieldSelectLocator(scope, fieldName);
        const n = await this.safeLocatorCount(fields);
        for (let i = 0; i < Math.min(n, 12); i++) {
          const visible = await fields
            .nth(i)
            .isVisible({ timeout: 250 })
            .catch(() => false);
          if (visible) return true;
        }
      }
      await this.page.waitForTimeout(200);
    }
    return false;
  }

  private continueLocatorChain(scope: Page | Frame): Locator {
    return scope
      .getByRole('button', { name: /continue/i })
      .or(scope.getByRole('button', { name: /^(next|finish|done|save|proceed|submit|ok|get started|start)\b/i }))
      .or(scope.getByRole('link', { name: /^(next|continue|finish|skip)\b/i }))
      .or(scope.locator('button:has-text("Continue"), a:has-text("Continue")'))
      .or(scope.locator('input.btn[type="submit"], button[type="submit"]'))
      .or(scope.locator('input[type="submit"][value*="Next" i]'))
      .or(scope.locator('input[type="submit"][value*="Continue" i]'))
      .or(scope.locator('input[type="submit"][value*="Finish" i]'));
  }

  private async clickVisibleContinueInScope(
    scope: Page | Frame,
    opts: { allowDisabled?: boolean } = {}
  ): Promise<boolean> {
    const chain = this.continueLocatorChain(scope);
    const n = await this.safeLocatorCount(chain);
    for (let i = 0; i < Math.min(n, 10); i++) {
      const cta = chain.nth(i);
      const visible = await cta.isVisible({ timeout: 500 }).catch(() => false);
      if (!visible) continue;
      const enabled = await cta.isEnabled().catch(() => true);
      if (!enabled && !opts.allowDisabled) continue;

      const beforeUrl = this.page.url();
      await cta.scrollIntoViewIfNeeded().catch(() => {});
      const clicked = await cta
        .click({ timeout: 10_000, force: !enabled })
        .then(() => true)
        .catch(async () => {
          return cta
            .evaluate((el) => {
              if (el instanceof HTMLElement) {
                el.removeAttribute('disabled');
                (el as HTMLButtonElement).disabled = false;
                el.click();
                return true;
              }
              return false;
            })
            .catch(() => false);
        });
      if (!clicked) continue;

      await this.page
        .waitForURL((u) => u.href !== beforeUrl, { timeout: 8_000 })
        .catch(async () => {
          if (!this.page.isClosed()) await this.page.waitForTimeout(600);
        });
      return true;
    }
    return false;
  }

  private async clickLoginFlowContinueIfVisible(
    preferredScope?: Page | Frame,
    opts: { allowDisabled?: boolean } = {}
  ): Promise<boolean> {
    if (preferredScope && (await this.clickVisibleContinueInScope(preferredScope, opts))) {
      return true;
    }
    for (const scope of this.allScopes()) {
      if (preferredScope === scope) continue;
      if (await this.clickVisibleContinueInScope(scope, opts)) return true;
    }
    return false;
  }

  private async advancePastLoginFlowAfterSelection(fieldName: 'practice' | 'location', fieldScope: Page | Frame): Promise<void> {
    for (let attempt = 0; attempt < 5; attempt++) {
      if (fieldName === 'practice' && (await this.isLocationStageVisible())) return;
      if (!this.needsLoginFlowNavigation(this.page.url())) return;
      if (await this.hasPatientSearchFieldVisible(1_000)) return;

      const clicked = await this.clickLoginFlowContinueIfVisible(fieldScope);
      if (!clicked) {
        await this.page.waitForTimeout(500);
      }
      if (!this.needsLoginFlowNavigation(this.page.url())) return;
      if (fieldName === 'practice' && (await this.isLocationStageVisible())) return;
    }
  }

  private fieldSelectLocator(scope: Page | Frame, fieldName: string): Locator {
    const byName = new RegExp(fieldName, 'i');
    const lower = fieldName.toLowerCase();
    // LoginFlowMVN labels ("Practice name" / "Location name") are often sibling text.
    // Do NOT fall back to any combobox/select here — that incorrectly matches Practice
    // while looking for Location (and vice versa).
    return scope
      .getByRole('combobox', { name: byName })
      .or(scope.getByLabel(byName))
      .or(scope.getByLabel(new RegExp(`${fieldName}\\s*name`, 'i')))
      .or(scope.locator(`select[name*="${fieldName}" i], select[id*="${fieldName}" i], select[aria-label*="${fieldName}" i]`))
      .or(scope.locator(`label:has-text("${fieldName}") + select`))
      .or(
        scope.locator(
          `xpath=//*[self::label or self::span or self::div or self::p or self::h1 or self::h2][contains(translate(normalize-space(.),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"${lower}")]/following::select[1]`
        )
      );
  }

  private async isLocationStageVisible(): Promise<boolean> {
    const marker = this.page
      .getByRole('heading', { name: /select your location/i })
      .or(this.page.getByText(/select your location/i))
      .or(this.page.getByText(/^location name$/i))
      .first();
    return marker.isVisible({ timeout: 800 }).catch(() => false);
  }

  private async isPracticeStageVisible(): Promise<boolean> {
    const marker = this.page
      .getByRole('heading', { name: /select your practice/i })
      .or(this.page.getByText(/select your practice/i))
      .or(this.page.getByText(/^practice name$/i))
      .first();
    return marker.isVisible({ timeout: 800 }).catch(() => false);
  }

  /** Wait until location stage is shown and the dropdown has real options (not only -- SELECT --). */
  private async waitForLocationDropdownReady(timeoutMs = 60_000): Promise<{
    scope: Page | Frame;
    field: Locator;
  }> {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      if (this.page.isClosed()) {
        throw new Error('Browser closed while waiting for location dropdown');
      }
      await this.ensurePastSalesforceLoginFlow();

      // Still on practice — click Continue again if practice is already chosen.
      if (await this.isPracticeStageVisible()) {
        await this.clickLoginFlowContinueIfVisible();
        await this.page.waitForTimeout(500);
        continue;
      }

      if (!(await this.isLocationStageVisible())) {
        if (!this.needsLoginFlowNavigation(this.page.url())) {
          if (await this.hasPatientSearchFieldVisible(2_000)) {
            throw new Error('HOME_ALREADY_REACHED');
          }
          throw new Error(
            `Left login flow before location dropdown appeared. url=${this.page.url()}`
          );
        }
        await this.page.waitForTimeout(400);
        continue;
      }

      for (const scope of this.allScopes()) {
        const candidates = [
          this.fieldSelectLocator(scope, 'location'),
          // Location stage confirmed — safe to use the visible native select.
          scope.getByRole('combobox'),
          scope.locator('select'),
        ];
        for (const fields of candidates) {
          const n = await this.safeLocatorCount(fields);
          for (let i = 0; i < Math.min(n, 8); i++) {
            const field = fields.nth(i);
            const visible = await field.isVisible({ timeout: 400 }).catch(() => false);
            if (!visible) continue;

            const optionCount = await field
              .evaluate((el) => {
                if (!(el instanceof HTMLSelectElement)) return 0;
                // VF options may use empty value with a display label — accept any non-placeholder.
                return Array.from(el.options).filter((o) => {
                  const text = (o.textContent ?? '').trim();
                  return text.length > 0 && !/--\s*select\s*--/i.test(text);
                }).length;
              })
              .catch(() => 0);

            // Options often load async after practice Continue — wait until populated.
            if (optionCount < 1) continue;
            return { scope, field };
          }
        }
      }
      await this.page.waitForTimeout(400);
    }
    throw new Error(
      `Location dropdown did not become ready within ${timeoutMs / 1000}s. ` +
        `url=${this.page.url()}`
    );
  }

  private async selectLoginFlowField(fieldName: 'practice' | 'location', value: string): Promise<void> {
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      await this.ensurePastSalesforceLoginFlow();
      if (!this.needsLoginFlowNavigation(this.page.url())) {
        if (await this.hasPatientSearchFieldVisible(1_000)) return;
        // Some orgs require only practice in Login Flow; location is not shown.
        if (fieldName === 'location') return;
        await this.page.waitForTimeout(600);
        continue;
      }
      if (fieldName === 'location' && (await this.isLoginFlowFieldVisible('practice', 800))) {
        await this.clickLoginFlowContinueIfVisible();
        await this.page.waitForTimeout(350);
      }
      const allowGenericSelectFallback =
        fieldName === 'practice' || (fieldName === 'location' && (await this.isLocationStageVisible()));

      for (const scope of this.allScopes()) {
        const candidateLocators = [this.fieldSelectLocator(scope, fieldName)];
        if (allowGenericSelectFallback) {
          candidateLocators.push(scope.locator('select'));
        }

        for (const fields of candidateLocators) {
          const n = await this.safeLocatorCount(fields);
          for (let i = 0; i < Math.min(n, 12); i++) {
            const field = fields.nth(i);
            const visible = await field.isVisible({ timeout: 800 }).catch(() => false);
            if (!visible) continue;

            const nativeSelect = await this.isNativeSelect(field);
            let selected = await this.selectNativeOptionByLabel(field, value).catch(() => false);
            if (!selected && !nativeSelect) {
              await this.pickDropdownOption(field, value).then(() => {
                selected = true;
              }).catch(() => {});
            }
            if (!selected) continue;

            await this.advancePastLoginFlowAfterSelection(fieldName, scope);
            await this.page.waitForTimeout(300);
            if (fieldName === 'practice') {
              // Require the location stage (not a generic combobox match on Practice).
              if (await this.isLocationStageVisible()) return;
              if (!this.needsLoginFlowNavigation(this.page.url())) {
                await this.page.waitForTimeout(1_200);
                if (!this.needsLoginFlowNavigation(this.page.url())) return;
              }
              if (await this.hasPatientSearchFieldVisible(1_000)) return;
              continue;
            }
            if (!(await this.needsLoginFlowNavigation(this.page.url()))) return;
            if (await this.hasPatientSearchFieldVisible(1_000)) return;
          }
        }
      }
      await this.page.waitForTimeout(700);
    }

    const debug = await this.snapshotLoginDebug();
    throw new Error(`Unable to select ${fieldName} "${value}" on login flow within 90s. ${debug}`);
  }

  async selectPractice(practice: string) {
    await this.selectLoginFlowField('practice', practice);
  }

  async selectLocation(location: string) {
    await this.selectLoginFlowField('location', location);
  }

  private async findVisibleLoginFlowField(
    fieldName: 'practice' | 'location',
    timeoutMs: number
  ): Promise<{ scope: Page | Frame; field: Locator } | null> {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      await this.ensurePastSalesforceLoginFlow();
      if (!this.needsLoginFlowNavigation(this.page.url())) return null;

      const allowGenericSelectFallback =
        fieldName === 'practice' || (fieldName === 'location' && (await this.isLocationStageVisible()));
      for (const scope of this.allScopes()) {
        const candidateLocators = [this.fieldSelectLocator(scope, fieldName)];
        if (allowGenericSelectFallback) {
          candidateLocators.push(scope.locator('select'));
        }
        for (const fields of candidateLocators) {
          const n = await this.safeLocatorCount(fields);
          for (let i = 0; i < Math.min(n, 12); i++) {
            const field = fields.nth(i);
            const visible = await field.isVisible({ timeout: 500 }).catch(() => false);
            if (visible) return { scope, field };
          }
        }
      }
      await this.page.waitForTimeout(350);
    }
    return null;
  }

  private async selectValueInField(field: Locator, value: string): Promise<boolean> {
    const nativeSelect = await this.isNativeSelect(field);
    const byNative = await this.selectNativeOptionByLabel(field, value).catch(() => false);
    if (byNative) return true;
    if (!nativeSelect) {
      const byCustom = await this.pickDropdownOption(field, value).then(() => true).catch(() => false);
      if (byCustom) return true;
    }
    return false;
  }

  private async clickContinueAndVerifyAdvance(preferredScope: Page | Frame, timeoutMs = 25_000): Promise<boolean> {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      if (!this.needsLoginFlowNavigation(this.page.url())) return true;
      if (await this.hasPatientSearchFieldVisible(1_000)) return true;
      // Only treat leaving the location stage as success when login-flow URL is gone too,
      // or home markers are present — never succeed while still on LoginFlowMVN.
      if (!(await this.isLocationStageVisible()) && !this.needsLoginFlowNavigation(this.page.url())) {
        return true;
      }

      const clicked = await this.clickLoginFlowContinueIfVisible(preferredScope);
      if (!clicked) {
        // Continue may stay disabled until change events settle — re-fire on location select.
        await this.page.waitForTimeout(400);
        continue;
      }
      await this.page.waitForTimeout(700);
    }
    return !this.needsLoginFlowNavigation(this.page.url()) || (await this.hasPatientSearchFieldVisible(1_000));
  }

  private async forceClickContinueAfterLocation(): Promise<void> {
    for (let attempt = 0; attempt < 8; attempt++) {
      if (!this.needsLoginFlowNavigation(this.page.url())) return;
      if (await this.hasPatientSearchFieldVisible(1_000)) return;

      const clicked = await this.clickLoginFlowContinueIfVisible();
      if (!clicked) {
        await this.page.waitForTimeout(500);
        continue;
      }
      await this.page.waitForTimeout(400);
    }
  }

  private async readSelectOptionLabels(field: Locator): Promise<string[]> {
    return field
      .evaluate((el) => {
        if (!(el instanceof HTMLSelectElement)) return [] as string[];
        return Array.from(el.options).map((o) => (o.textContent ?? '').trim());
      })
      .catch(() => [] as string[]);
  }

  private async getSelectedOptionText(field: Locator): Promise<string> {
    return field
      .evaluate((el) => {
        if (!(el instanceof HTMLSelectElement)) return '';
        return (el.selectedOptions?.[0]?.textContent ?? '').trim();
      })
      .catch(() => '');
  }

  private locationMatchesSelection(selected: string, wanted: string): boolean {
    if (!selected || /--\s*select\s*--/i.test(selected)) return false;
    const a = this.normalizeText(selected);
    const b = this.normalizeText(wanted);
    if (a === b || a.includes(b) || b.includes(a)) return true;
    const tokens = b.split(' ').filter((t) => t.length > 1);
    return tokens.length > 0 && tokens.every((t) => a.includes(t));
  }

  /** Provided DOM path for location dropdown on LoginFlow location screen. */
  private locationScreenSelect(): Locator {
    return this.page
      .locator('xpath=//*[@id="locationScreen"]/div[2]/div[1]/select')
      .or(this.page.locator('#locationScreen select'))
      .first();
  }

  /** My Account card on /s/ — LOCATION row with CHANGE when unset. */
  private homeLocationChangeControl(): Locator {
    // Snapshot: LOCATION → "—" → CHANGE (clickable) on the same card.
    return this.page
      .locator(
        'xpath=//*[normalize-space()="LOCATION"]/following::*[contains(normalize-space(.),"CHANGE")][1]'
      )
      .or(this.page.getByText(/^CHANGE$/i))
      .first();
  }

  /** Wait for #locationScreen select; open via CHANGE if home shows LOCATION —. */
  private async waitForLocationScreenSelect(timeoutMs = 60_000): Promise<Locator> {
    const end = Date.now() + timeoutMs;
    const select = this.locationScreenSelect();
    while (Date.now() < end) {
      if (await select.isVisible({ timeout: 500 }).catch(() => false)) {
        // Wait until real options exist (not only -- SELECT --).
        const optionCount = await select
          .evaluate((el) => {
            if (!(el instanceof HTMLSelectElement)) return 0;
            return Array.from(el.options).filter((o) => {
              const t = (o.textContent ?? '').trim();
              return t.length > 0 && !/--\s*select\s*--/i.test(t);
            }).length;
          })
          .catch(() => 0);
        if (optionCount > 0) return select;
      }

      // Still on practice stage — advance if needed
      if (await this.isPracticeStageVisible()) {
        await this.clickLoginFlowContinueIfVisible(undefined, { allowDisabled: true });
      }

      // On /s/ home with LOCATION — → open CHANGE to reveal #locationScreen
      if (await this.homeLocationChangeControl().isVisible().catch(() => false)) {
        await this.homeLocationChangeControl().click().catch(() => {});
      }

      await this.page.waitForTimeout(400);
    }
    throw new Error(
      `Location dropdown not found: //*[@id="locationScreen"]/div[2]/div[1]/select within ${timeoutMs / 1000}s. ` +
        `url=${this.page.url()}`
    );
  }

  private async isHomeLocationUnset(): Promise<boolean> {
    const locationLabel = this.page.getByText(/^LOCATION$/i).first();
    if (!(await locationLabel.isVisible({ timeout: 2_000 }).catch(() => false))) return false;
    const rowText = await locationLabel
      .locator('xpath=ancestor::*[contains(.,"CHANGE") or contains(.,"—")][1]')
      .innerText()
      .catch(() => '');
    if (/CHANGE/i.test(rowText) && (/[—-]/.test(rowText) || !/pleasanton/i.test(rowText))) {
      return true;
    }
    return this.homeLocationChangeControl().isVisible({ timeout: 800 }).catch(() => false);
  }

  private async expectHomeLocationSelected(location: string, timeoutMs = 30_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const body = await this.page.locator('body').innerText().catch(() => '');
      if (this.locationMatchesSelection(body, location) && !/LOCATION\s*[—\-]\s*CHANGE/i.test(body)) {
        // Prefer the MY ACCOUNT card text near LOCATION
        const card = this.page.getByText(/MY ACCOUNT/i).first();
        const cardText = (await card.locator('xpath=ancestor::*[1]').innerText().catch(() => '')) || body;
        if (this.locationMatchesSelection(cardText, location)) return;
      }
      // Also accept LOCATION value node containing the location name
      const locValue = this.page
        .locator('text=/^LOCATION$/i')
        .locator('xpath=following::*[1]');
      const valueText = ((await locValue.innerText().catch(() => '')) || '').trim();
      if (this.locationMatchesSelection(valueText, location)) return;
      await this.page.waitForTimeout(400);
    }
    throw new Error(
      `Home LOCATION was not set to "${location}" within ${timeoutMs / 1000}s. url=${this.page.url()}`
    );
  }

  /**
   * fulldev flow: after Practice Continue the app lands on /s/ with LOCATION = "—"
   * and a CHANGE control (not LoginFlowMVN location dropdown).
   */
  private async selectLocationViaHomeChange(location: string): Promise<void> {
    const change = this.homeLocationChangeControl();
    await expect(change).toBeVisible({ timeout: 30_000 });
    await change.click();

    // After CHANGE: LoginFlow location page, modal, or inline select/list.
    const deadline = Date.now() + 60_000;
    let selected = false;

    while (Date.now() < deadline && !selected) {
      if (await this.isLocationStageVisible()) {
        const found = await this.waitForLocationDropdownReady(30_000).catch(() => null);
        if (found) {
          selected = await this.selectValueInField(found.field, location);
          if (selected) {
            await this.clickLoginFlowContinueIfVisible(found.scope, { allowDisabled: true });
            await this.forceClickContinueAfterLocation();
            break;
          }
        }
      }

      // Native / role combobox on home overlay
      for (const scope of this.allScopes()) {
        const selects = [
          this.fieldSelectLocator(scope, 'location'),
          scope.getByRole('combobox'),
          scope.locator('select'),
        ];
        for (const chain of selects) {
          const n = await this.safeLocatorCount(chain);
          for (let i = 0; i < Math.min(n, 6); i++) {
            const field = chain.nth(i);
            if (!(await field.isVisible({ timeout: 300 }).catch(() => false))) continue;
            if (await this.selectValueInField(field, location)) {
              selected = true;
              await this.clickLoginFlowContinueIfVisible(scope, { allowDisabled: true });
              // Save / Apply / Update buttons on account overlays
              const save = scope
                .getByRole('button', { name: /^(save|apply|update|done|ok|continue)\b/i })
                .first();
              if (await save.isVisible().catch(() => false)) {
                await save.click({ force: true }).catch(() => {});
              }
              break;
            }
          }
          if (selected) break;
        }
        if (selected) break;
      }

      // List / menu option (non-select UI)
      if (!selected) {
        const option = this.page
          .getByRole('option', { name: new RegExp(escapeRegExp(location), 'i') })
          .or(this.page.getByRole('menuitem', { name: new RegExp(escapeRegExp(location), 'i') }))
          .or(this.page.getByText(new RegExp(escapeRegExp(location), 'i')))
          .first();
        if (await option.isVisible({ timeout: 800 }).catch(() => false)) {
          await option.click();
          selected = true;
          await this.clickLoginFlowContinueIfVisible(undefined, { allowDisabled: true });
          const save = this.page.getByRole('button', { name: /^(save|apply|update|done|ok|continue)\b/i }).first();
          if (await save.isVisible().catch(() => false)) {
            await save.click({ force: true }).catch(() => {});
          }
        }
      }

      if (!selected) await this.page.waitForTimeout(500);
    }

    if (!selected) {
      const debug = await this.snapshotLoginDebug();
      throw new Error(
        `Clicked LOCATION CHANGE but could not select "${location}". ${debug}`
      );
    }

    await this.expectHomeLocationSelected(location, 45_000);
  }

  /** True only when #locationScreen select has a real value (not placeholder / empty). */
  private async isLocationDropdownValueSelected(
    field: Locator,
    expectedLocation?: string
  ): Promise<boolean> {
    const selectedText = await this.getSelectedOptionText(field);
    if (!selectedText || /--\s*select\s*--/i.test(selectedText) || selectedText === '—') {
      return false;
    }
    if (expectedLocation) {
      return this.locationMatchesSelection(selectedText, expectedLocation);
    }
    return true;
  }

  async selectLocationAndContinue(location: string) {
    // Primary path: exact locationScreen select provided by QA
    //   //*[@id="locationScreen"]/div[2]/div[1]/select
    const field = await this.waitForLocationScreenSelect(90_000);

    let selectedText = '';
    for (let attempt = 0; attempt < 8; attempt++) {
      const ok = await this.selectValueInField(field, location);
      selectedText = await this.getSelectedOptionText(field);
      if (ok && this.locationMatchesSelection(selectedText, location)) break;

      // Direct selectOption by label on the #locationScreen xpath node
      await field.selectOption({ label: location }).catch(async () => {
        const labels = await this.readSelectOptionLabels(field);
        const match = labels.find((l) => this.locationMatchesSelection(l, location));
        if (match) await field.selectOption({ label: match }).catch(() => {});
      });
      selectedText = await this.getSelectedOptionText(field);
      if (this.locationMatchesSelection(selectedText, location)) break;
      await this.page.waitForTimeout(400);
    }

    // Hard gate: never click Continue unless dropdown has a real selected value.
    selectedText = await this.getSelectedOptionText(field);
    if (!(await this.isLocationDropdownValueSelected(field, location))) {
      const options = await this.readSelectOptionLabels(field);
      const debug = await this.snapshotLoginDebug();
      throw new Error(
        `Continue was NOT clicked because location dropdown has no valid selection. ` +
          `wanted="${location}" selected="${selectedText}" options=${JSON.stringify(options)}. ${debug}`
      );
    }

    // Re-check immediately before Continue (guards against VF reset to -- SELECT --).
    if (!(await this.isLocationDropdownValueSelected(field, location))) {
      throw new Error(
        `Continue skipped: location dropdown reset before click. selected="${await this.getSelectedOptionText(field)}"`
      );
    }

    await this.clickLoginFlowContinueIfVisible(this.page, { allowDisabled: false });

    // Only retry Continue if location is still selected on the screen.
    if (await this.locationScreenSelect().isVisible().catch(() => false)) {
      if (await this.isLocationDropdownValueSelected(this.locationScreenSelect(), location)) {
        await this.clickLoginFlowContinueIfVisible(this.page, { allowDisabled: false });
      } else {
        throw new Error(
          `Continue retry skipped: location dropdown is not selected after first Continue attempt.`
        );
      }
    }
  }

  async expectPatientSearchVisible() {
    const field = await this.waitForPatientSearchField(60_000);
    this.cachedPatientSearch = field;
    await expect(field).toBeVisible({ timeout: 10_000 });
  }

  /**
   * Post login-flow home signal for Experience Cloud portals where patient search
   * may not be the landing widget (or may load after nav).
   */
  async expectHomeDashboard(timeoutMs = 90_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (this.page.isClosed()) {
        throw new Error('Browser closed while waiting for home/dashboard');
      }
      await this.ensurePastSalesforceLoginFlow();
      const url = this.page.url();
      if (/\/login\/?(\?|$)/i.test(url) || this.needsLoginFlowNavigation(url)) {
        await this.page.waitForTimeout(500);
        continue;
      }

      if (await this.hasPatientSearchFieldVisible(1_500)) return;

      const homeSignals = [
        this.page.locator('h1#hero-title'),
        this.page.getByText(/^MY ACCOUNT$/i),
        this.page.getByRole('heading', { name: /welcome|dashboard|home|my account/i }),
        this.page.getByText(/welcome to revance ready|practice dashboard|patient search|find a patient/i),
        this.page.getByRole('link', { name: /home|my account|contact us/i }),
        this.page.getByRole('button', { name: /view account/i }),
        this.page.locator('input[type="search"], input[placeholder*="search" i]'),
      ];
      for (const signal of homeSignals) {
        if (await signal.first().isVisible({ timeout: 800 }).catch(() => false)) return;
      }

      await this.tryNavigateToPatientSearchContext();
      await this.page.waitForTimeout(500);
    }
    throw new Error(
      `Home/dashboard did not load within ${timeoutMs / 1000}s. url=${this.page.url()}`
    );
  }

  async enterMobileNumber(phone: string) {
    const field = this.cachedPatientSearch ?? (await this.waitForPatientSearchField(60_000));
    this.cachedPatientSearch = field;
    await field.fill(phone);
  }

  async clickSearch() {
    await this.page.getByRole('button', { name: /search/i }).first().click();
  }

  async selectDaxxifyTreatment() {
    const row = this.page.getByText(/daxxify|daxify/i).first();
    await row.click();
  }

  async selectRedeem() {
    await this.page.getByRole('button', { name: /redeem/i }).or(this.page.getByText(/^redeem$/i)).first().click();
  }

  async clickConfirmTreatment() {
    await this.page.getByRole('button', { name: /confirm/i }).first().click();
  }

  async expectTreatmentCreated() {
    const success = this.page.getByText(/success|created|confirmed|submitted/i).first();
    const toast = this.page.locator('[class*="toast"], [class*="slds-notify"]').first();
    await expect(success.or(toast)).toBeVisible({ timeout: 60_000 });
  }
}
