import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import type { LoyaltyEnrollmentResult } from '../api/loyaltyEnrollment';
import type { HomePage } from '../pages/HomePage';

/**
 * Per-scenario Cucumber World — parallel-safe browser isolation.
 * Never store browser/page on module-level variables.
 */
export class PlaywrightWorld extends World {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  /** Shared scenario data (e.g. unique phone from welcome steps). */
  phoneNumber?: string;
  enrollment?: LoyaltyEnrollmentResult;
  enrolledName?: string;
  homePage?: HomePage;

  constructor(options: IWorldOptions) {
    super(options);
  }

  /** Active page for this scenario — throws if hooks did not start a browser. */
  requirePage(): Page {
    if (!this.page) {
      throw new Error(
        'Playwright page is not initialized on World. Ensure Before hooks ran successfully.'
      );
    }
    return this.page;
  }
}

setWorldConstructor(PlaywrightWorld);
