import { type Page } from 'playwright';

export class ExamplePage {
  readonly page: Page;
  readonly url: string = '/';

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    // Uses baseUrl from config
    await this.page.goto(process.env.BASE_URL || 'https://example.com');
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }
}
