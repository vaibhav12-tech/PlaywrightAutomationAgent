// Loads Allure's Cucumber runtime so `attachment()` from allure-js-commons is wired (not noop).
import 'allure-cucumberjs';
import {
  Before,
  After,
  AfterStep,
  setDefaultTimeout,
  Status,
  ITestCaseHookParameter,
} from '@cucumber/cucumber';
import { attachment, ContentType } from 'allure-js-commons';
import { chromium } from '@playwright/test';
import config from '../config';
import { PlaywrightWorld } from './world';
import { recordCucumberFailureEvidence } from '../reporting/evidence';

setDefaultTimeout(120 * 1000);

/** Headed locally by default; headless only when HEADLESS=true or in CI (unless HEADED=true). */
function shouldRunHeadless(): boolean {
  if (process.env.HEADED === 'true') return false;
  if (process.env.HEADLESS === 'true') return true;
  return !!process.env.CI;
}

Before(async function (this: PlaywrightWorld) {
  this.browser = await chromium.launch({ headless: shouldRunHeadless() });
  this.context = await this.browser.newContext({
    // Enable artifacts for unified reporting with Playwright Test runs
    recordVideo: process.env.CUCUMBER_VIDEO === 'true' ? { dir: 'test-results/cucumber-video' } : undefined,
  });
  this.page = await this.context.newPage();
  this.page.setDefaultTimeout(60_000);

  process.env.BASE_URL = config.baseUrl;
  if ('oceBaseUrl' in config && typeof config.oceBaseUrl === 'string') {
    process.env.OCE_BASE_URL = config.oceBaseUrl;
  } else if ('headlessUrl' in config && typeof config.headlessUrl === 'string') {
    process.env.OCE_BASE_URL = config.headlessUrl;
  }
});

AfterStep(async function (this: PlaywrightWorld, { result }) {
  if (result?.status === Status.FAILED && this.page) {
    const buffer = await this.page.screenshot({ fullPage: true, type: 'png' });
    await attachment('Screenshot', buffer, { contentType: ContentType.PNG });
  }
});

After(async function (this: PlaywrightWorld, hookParams: ITestCaseHookParameter) {
  const failed = hookParams.result?.status === Status.FAILED;
  if (failed && this.page) {
    await recordCucumberFailureEvidence({
      world: this,
      pickleName: hookParams.pickle.name,
      pickleUri: hookParams.pickle.uri ?? 'features/unknown.feature',
      errorMessage: hookParams.result?.message || 'Cucumber scenario failed',
    }).catch((err) => {
      console.warn('[hooks] defect evidence packaging failed:', err);
    });
  }

  await this.page?.close().catch(() => {});
  await this.context?.close().catch(() => {});
  await this.browser?.close().catch(() => {});
  this.page = undefined;
  this.context = undefined;
  this.browser = undefined;
});

/**
 * @deprecated Prefer `this.requirePage()` from PlaywrightWorld in step defs.
 * Kept for gradual migration — resolves page from the current World via AsyncLocalStorage is not used;
 * steps should use World. This helper throws to force migration.
 */
export async function getPage(): Promise<never> {
  throw new Error(
    'getPage() was removed for parallel safety. Use PlaywrightWorld: `const page = this.requirePage()` in step definitions (and type `this` as PlaywrightWorld).'
  );
}
