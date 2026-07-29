// Loads Allure's Cucumber runtime so `attachment()` from allure-js-commons is wired (not noop).
import 'allure-cucumberjs';
import { Before, After, BeforeStep, AfterStep, setDefaultTimeout, Status } from '@cucumber/cucumber';
import { attachment, ContentType } from 'allure-js-commons';
import { type Browser, type BrowserContext, type Page, chromium } from 'playwright';
import config from '../config';

let browser: Browser;
let context: BrowserContext;
let page: Page;

setDefaultTimeout(120 * 1000);

/** Headed locally by default; headless only when HEADLESS=true or in CI (unless HEADED=true). */
function shouldRunHeadless(): boolean {
  if (process.env.HEADED === 'true') return false;
  if (process.env.HEADLESS === 'true') return true;
  return !!process.env.CI;
}

Before(async function () {
  browser = await chromium.launch({ headless: shouldRunHeadless() });
  context = await browser.newContext();
  page = await context.newPage();
  page.setDefaultTimeout(60_000);
  // Set base URLs for use in page objects (loyalty vs OCE / other modules)
  process.env.BASE_URL = config.baseUrl;
  if ('oceBaseUrl' in config && typeof config.oceBaseUrl === 'string') {
    process.env.OCE_BASE_URL = config.oceBaseUrl;
  } else if ('headlessUrl' in config && typeof config.headlessUrl === 'string') {
    process.env.OCE_BASE_URL = config.headlessUrl;
  }
});

After(async function () {
  await page?.close();
  await context?.close();
  await browser?.close();
});

BeforeStep(async function () {
  // Add logic for actions before each step if needed (e.g., logging)
});

AfterStep(async function ({ result }) {
  if (result?.status === Status.FAILED && page) {
    const buffer = await page.screenshot({ fullPage: true, type: 'png' });
    await attachment('Screenshot', buffer, { contentType: ContentType.PNG });
  }
});

export const getPage = async () => page;
