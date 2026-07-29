// spec: manual-test-cases/BL10-685.md
// story: https://revance-it.atlassian.net/browse/BL10-685

import { test, expect } from '../src/fixtures';
import config from '../src/config';

/**
 * Sticky ISI is not yet present on loyalty DEV (epic In Progress).
 * Footer safety copy (Prescribing Information / Boxed Warning) IS present.
 * Sticky-dependent cases are fixme until the sticky component ships.
 */
const STICKY_NOT_DEPLOYED =
  'Product gap on DEV: sticky ISI component not rendered yet (BL10-685 In Progress). Re-enable when sticky bar ships.';

test.beforeEach(async () => {
  process.env.BASE_URL = config.baseUrl;
});

test.describe('BL10-685: Consumer REVA ISI/Footer', () => {
  test('TC-001: Sticky ISI visible on page load with condensed content', async ({
    revaIsiFooterPage,
    page,
  }) => {
    test.fixme(true, STICKY_NOT_DEPLOYED);
    await revaIsiFooterPage.goto('/welcome');
    await expect(page).toHaveURL(/welcome/i);

    const sticky = await revaIsiFooterPage.expectStickyVisible();
    await expect(sticky).toBeVisible();
    await expect(sticky).toContainText(
      /important safety information|prescribing information|boxed warning|isi/i
    );
    expect(await revaIsiFooterPage.stickyIsFixedToBottom()).toBeTruthy();
  });

  test('TC-002: Sticky ISI hides when full ISI is fully in view', async ({
    revaIsiFooterPage,
  }) => {
    test.fixme(true, STICKY_NOT_DEPLOYED);
    await revaIsiFooterPage.goto('/welcome');
    await revaIsiFooterPage.expectStickyVisible();
    await revaIsiFooterPage.scrollFullIsiIntoView();
    await revaIsiFooterPage.expectStickyHidden();
  });

  test('TC-003: Sticky ISI reappears when scrolling back up', async ({
    revaIsiFooterPage,
  }) => {
    test.fixme(true, STICKY_NOT_DEPLOYED);
    await revaIsiFooterPage.goto('/welcome');
    await revaIsiFooterPage.scrollFullIsiIntoView();
    await revaIsiFooterPage.expectStickyHidden();
    await revaIsiFooterPage.scrollAwayFromFullIsi();
    await revaIsiFooterPage.expectStickyVisible();
  });

  test('TC-004: Click sticky ISI scrolls to start of full ISI', async ({
    revaIsiFooterPage,
    page,
  }) => {
    test.fixme(true, STICKY_NOT_DEPLOYED);
    await revaIsiFooterPage.goto('/welcome');
    await revaIsiFooterPage.expectStickyVisible();
    await revaIsiFooterPage.clickStickyIsi();

    const full = revaIsiFooterPage.fullIsi().first();
    await expect(full).toBeVisible();
    const top = await full.evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeLessThan(page.viewportSize()!.height);
  });

  test('TC-005: Full ISI / safety content present in page footer', async ({
    revaIsiFooterPage,
  }) => {
    await revaIsiFooterPage.goto('/welcome');

    const footer = revaIsiFooterPage.footer();
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
    await expect(footer).toContainText(
      /prescribing information|boxed warning|important safety information|medication guide/i
    );
  });

  test('TC-006: Footer safety content on multiple in-scope portal pages', async ({
    revaIsiFooterPage,
  }) => {
    const paths = ['/welcome', '/'];
    for (const path of paths) {
      await revaIsiFooterPage.goto(path);
      const footer = revaIsiFooterPage.footer();
      await footer.waitFor({ state: 'attached', timeout: 30_000 });
      await expect(footer).toContainText(
        /prescribing information|boxed warning|important safety information|medication guide|revance/i
      );
    }
  });

  test('TC-008: Sticky ISI does not obscure primary CTAs (desktop)', async ({
    revaIsiFooterPage,
    page,
  }) => {
    test.fixme(true, STICKY_NOT_DEPLOYED);
    await page.setViewportSize({ width: 1440, height: 900 });
    await revaIsiFooterPage.goto('/welcome');
    await revaIsiFooterPage.expectStickyVisible();

    const phone = page.locator('input[type="tel"]').first();
    if (await phone.isVisible().catch(() => false)) {
      await expect(phone).toBeEnabled();
      const box = await phone.boundingBox();
      const stickyBox = await revaIsiFooterPage.stickyIsi().first().boundingBox();
      if (box && stickyBox) {
        const covered =
          box.y + box.height > stickyBox.y && box.y < stickyBox.y + stickyBox.height;
        expect(covered).toBeFalsy();
      }
    }
  });

  test('TC-008b: Primary CTAs remain usable without sticky overlap (desktop baseline)', async ({
    revaIsiFooterPage,
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await revaIsiFooterPage.goto('/welcome');

    const getCode = page.getByRole('button', { name: /get code|verify/i }).first();
    await expect(getCode).toBeVisible();
    await expect(getCode).toBeEnabled();

    // Footer must not cover the primary CTA when at top of page
    const ctaBox = await getCode.boundingBox();
    const footerBox = await revaIsiFooterPage.footer().boundingBox();
    if (ctaBox && footerBox) {
      const overlaps =
        ctaBox.y + ctaBox.height > footerBox.y && ctaBox.y < footerBox.y + footerBox.height;
      expect(overlaps).toBeFalsy();
    }
  });

  test('TC-009: Footer safety content at mobile breakpoint', async ({
    revaIsiFooterPage,
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await revaIsiFooterPage.goto('/welcome');

    const footer = revaIsiFooterPage.footer();
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
    await expect(footer).toContainText(
      /prescribing information|boxed warning|important safety information|medication guide/i
    );

    // Sticky not deployed — when present, hide/show would be asserted here
    const hasSticky = await revaIsiFooterPage.hasStickyIsi();
    expect(hasSticky).toBeFalsy();
  });

  test('TC-010: Footer safety content at tablet breakpoint', async ({
    revaIsiFooterPage,
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await revaIsiFooterPage.goto('/welcome');

    const footer = revaIsiFooterPage.footer();
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toContainText(
      /prescribing information|boxed warning|important safety information|medication guide/i
    );
  });

  test('TC-011: Keyboard access to sticky ISI', async ({ revaIsiFooterPage, page }) => {
    test.fixme(true, STICKY_NOT_DEPLOYED);
    await revaIsiFooterPage.goto('/welcome');
    await revaIsiFooterPage.expectStickyVisible();

    const sticky = revaIsiFooterPage.stickyIsi().first();
    await sticky.focus();
    await expect(sticky).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(revaIsiFooterPage.fullIsi().first()).toBeVisible();
  });

  test('TC-013: Short page edge case — sticky hidden when full ISI in view on load', async ({
    revaIsiFooterPage,
    page,
  }) => {
    test.fixme(true, STICKY_NOT_DEPLOYED);
    await page.setViewportSize({ width: 1280, height: 4000 });
    await revaIsiFooterPage.goto('/welcome');
    const fullInView = await revaIsiFooterPage.isFullIsiInViewport();
    if (fullInView) {
      await revaIsiFooterPage.expectStickyHidden();
    } else {
      await revaIsiFooterPage.expectStickyVisible();
    }
  });

  test('TC-014: Rapid scroll show-hide stability', async ({ revaIsiFooterPage }) => {
    test.fixme(true, STICKY_NOT_DEPLOYED);
    await revaIsiFooterPage.goto('/welcome');
    for (let i = 0; i < 3; i++) {
      await revaIsiFooterPage.scrollFullIsiIntoView();
      await revaIsiFooterPage.scrollAwayFromFullIsi();
    }
    await revaIsiFooterPage.scrollFullIsiIntoView();
    await revaIsiFooterPage.expectStickyHidden();
    await revaIsiFooterPage.scrollAwayFromFullIsi();
    await revaIsiFooterPage.expectStickyVisible();
  });

  test('TC-015: Clicking outside sticky does not jump to ISI', async ({
    revaIsiFooterPage,
    page,
  }) => {
    await revaIsiFooterPage.goto('/welcome');
    await revaIsiFooterPage.scrollAwayFromFullIsi();
    const before = await page.evaluate(() => window.scrollY);

    const heading = page.locator('h1, h2').first();
    if (await heading.isVisible().catch(() => false)) {
      await heading.click();
    } else {
      await page.mouse.click(40, 40);
    }

    const after = await page.evaluate(() => window.scrollY);
    expect(Math.abs(after - before)).toBeLessThan(200);
  });
});
