import { type Locator, type Page } from 'playwright';

/**
 * Page Object for REVA Important Safety Information (ISI) sticky bar + footer.
 * Story: BL10-685 — Consumer - REVA - ISI/Footer
 *
 * DEV note (2026-07-20): Footer safety copy is present; sticky ISI component is not
 * yet deployed on the loyalty DEV site. Locators cover both current footer copy and
 * future sticky/full ISI markup from the epic/Figma.
 */
export class RevaIsiFooterPage {
  constructor(readonly page: Page) {}

  private baseUrl(): string {
    return (
      process.env.BASE_URL ||
      'https://revance-loyalty-git-dev-revances-projects.vercel.app'
    ).replace(/\/$/, '');
  }

  async goto(path = '/welcome') {
    const url = path.startsWith('http')
      ? path
      : `${this.baseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  /**
   * Sticky condensed ISI — fixed/sticky at bottom when implemented.
   * Also matches future data-testid / role-based controls.
   */
  stickyIsi(): Locator {
    return this.page
      .locator('[data-testid="sticky-isi"], [data-component="sticky-isi"], .sticky-isi')
      .or(this.page.getByRole('button', { name: /important safety information|\bisi\b/i }))
      .or(this.page.getByRole('link', { name: /important safety information|\bisi\b/i }))
      .or(
        this.page.locator('[class*="sticky"]').filter({
          hasText: /important safety information|prescribing information|boxed warning|\bisi\b/i,
        })
      );
  }

  /** Full ISI / safety content in page footer (current + future markup) */
  fullIsi(): Locator {
    return this.page
      .locator('#isi, #full-isi, [data-testid="full-isi"], [data-component="full-isi"], .full-isi')
      .or(this.page.getByRole('region', { name: /important safety information|isi|prescribing/i }))
      .or(
        this.page.locator('footer').filter({
          hasText: /prescribing information|boxed warning|important safety information|medication guide/i,
        })
      )
      .or(
        this.page
          .locator('footer')
          .getByText(/prescribing information|boxed warning|important safety information/i)
      );
  }

  footer(): Locator {
    return this.page.locator('footer').first();
  }

  async hasStickyIsi(): Promise<boolean> {
    return this.stickyIsi().first().isVisible().catch(() => false);
  }

  async expectStickyVisible() {
    const sticky = this.stickyIsi().first();
    await sticky.waitFor({ state: 'visible', timeout: 15_000 });
    return sticky;
  }

  async expectStickyHidden() {
    const sticky = this.stickyIsi().first();
    await expectHiddenOrAbsent(this.page, sticky);
  }

  async scrollFullIsiIntoView() {
    const full = this.fullIsi().first();
    await full.waitFor({ state: 'attached', timeout: 30_000 });
    await full.scrollIntoViewIfNeeded();
  }

  async scrollAwayFromFullIsi() {
    await this.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'auto' }));
    await this.page.waitForFunction(() => window.scrollY < 50);
  }

  async clickStickyIsi() {
    await this.expectStickyVisible();
    await this.stickyIsi().first().click();
  }

  async isFullIsiInViewport(): Promise<boolean> {
    return this.page.evaluate(() => {
      const footer = document.querySelector('footer');
      const el =
        document.querySelector(
          '#isi, #full-isi, [data-testid="full-isi"], [data-component="full-isi"], .full-isi'
        ) || footer;
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + 1
      );
    });
  }

  async stickyIsFixedToBottom(): Promise<boolean> {
    const sticky = this.stickyIsi().first();
    await sticky.waitFor({ state: 'visible' });
    return sticky.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const fixedOrSticky = style.position === 'fixed' || style.position === 'sticky';
      const nearBottom = Math.abs(window.innerHeight - rect.bottom) <= 24;
      return fixedOrSticky && nearBottom;
    });
  }
}

async function expectHiddenOrAbsent(page: Page, sticky: Locator) {
  const count = await sticky.count();
  if (count === 0) return;
  await sticky
    .waitFor({ state: 'hidden', timeout: 10_000 })
    .catch(async () => {
      await page.waitForFunction(
        () => {
          const el =
            document.querySelector(
              '[data-testid="sticky-isi"], [data-component="sticky-isi"], .sticky-isi'
            ) ||
            Array.from(document.querySelectorAll('[class*="sticky"]')).find((n) =>
              /important safety information|isi|prescribing/i.test(n.textContent || '')
            );
          if (!el) return true;
          const style = window.getComputedStyle(el as Element);
          return (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0' ||
            (el as HTMLElement).offsetParent === null
          );
        },
        undefined,
        { timeout: 10_000 }
      );
    });
}
