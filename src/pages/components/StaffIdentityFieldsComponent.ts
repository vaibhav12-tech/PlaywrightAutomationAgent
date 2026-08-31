import { type Locator, type Page } from '@playwright/test';

/**
 * Edit Staff Member — identity fields (First / Last / Email).
 * Scoped locator repository for reuse in live OCE + HTML fixture contracts.
 */
export class StaffIdentityFieldsComponent {
  constructor(private readonly page: Page) {}

  get firstName(): Locator {
    return this.page
      .getByRole('textbox', { name: /^first name$/i })
      .or(this.page.getByLabel(/^first name$/i))
      .or(
        this.page.locator(
          '[data-testid="staff-first-name"], [data-test="staff-first-name"], #firstName, input[name="firstName"]'
        )
      );
  }

  get lastName(): Locator {
    return this.page
      .getByRole('textbox', { name: /^last name$/i })
      .or(this.page.getByLabel(/^last name$/i))
      .or(
        this.page.locator(
          '[data-testid="staff-last-name"], [data-test="staff-last-name"], #lastName, input[name="lastName"]'
        )
      );
  }

  get email(): Locator {
    return this.page
      .getByRole('textbox', { name: /^email address$/i })
      .or(this.page.getByLabel(/^email( address)?$/i))
      .or(
        this.page.locator(
          '[data-testid="staff-email"], [data-test="staff-email"], input[type="email"], input[name="email"]'
        )
      );
  }
}
