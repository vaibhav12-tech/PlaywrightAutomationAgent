import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { uploadFile } from '../../utils/fileTransfer';

/**
 * File Upload — https://practice.expandtesting.com/upload
 *
 * Success UI is a post-submit view with "File Uploaded!" + filename (#uploaded-files).
 * Ads/overlays on this site can intercept the Upload click in headed runs.
 */
export class FileUploadPage extends BasePage {
  readonly url = 'https://practice.expandtesting.com/upload';

  readonly heading: Locator = this.page.getByRole('heading', {
    name: /file upload/i,
  });
  readonly fileInput: Locator = this.page
    .getByTestId('file-input')
    .or(this.page.locator('input#fileInput, input[type="file"]'))
    .first();
  readonly uploadButton: Locator = this.page
    .locator('#file-submit, button[type="submit"]')
    .or(this.page.getByRole('button', { name: /^upload$/i }))
    .first();
  readonly successHeading: Locator = this.page
    .getByRole('heading', { name: /file uploaded!?/i })
    .or(this.page.getByText(/^file uploaded!?$/i));
  readonly uploadedFiles: Locator = this.page.locator('#uploaded-files, #uploadedFilePath');

  async open(): Promise<void> {
    await this.goto(this.url);
    await expect(this.fileInput).toBeAttached({ timeout: 30_000 });
    await this.dismissNoise();
  }

  /** Best-effort close cookie / promo overlays that steal clicks. */
  private async dismissNoise(): Promise<void> {
    const candidates = [
      this.page.getByRole('button', { name: /accept|agree|got it|close|dismiss/i }),
      this.page.locator('[aria-label="Close"], .close, button.close'),
    ];
    for (const loc of candidates) {
      const btn = loc.first();
      if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
        await btn.click({ timeout: 2_000 }).catch(() => undefined);
      }
    }
  }

  async selectFile(absoluteFilePath: string): Promise<void> {
    await uploadFile(this.fileInput, absoluteFilePath);
    const count = await this.fileInput.evaluate(
      (el) => (el as HTMLInputElement).files?.length ?? 0
    );
    expect(count, 'file input should hold the selected file').toBeGreaterThan(0);
  }

  async clickUpload(): Promise<void> {
    await this.dismissNoise();
    await this.uploadButton.scrollIntoViewIfNeeded();
    await expect(this.uploadButton).toBeEnabled();

    const post = this.page.waitForResponse(
      (res) =>
        /\/upload/i.test(res.url()) &&
        res.request().method() === 'POST' &&
        res.status() < 500,
      { timeout: 30_000 }
    );

    await Promise.all([
      post.catch(() => null), // some builds may navigate without a visible XHR
      this.uploadButton.click({ force: true }),
    ]);

    await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
  }

  async upload(absoluteFilePath: string): Promise<void> {
    await this.selectFile(absoluteFilePath);
    await this.clickUpload();
  }

  async expectUploadSuccess(expectedFileName: string): Promise<void> {
    // Prefer concrete success markers over the form heading (still visible until submit).
    const successMarker = this.successHeading
      .or(this.uploadedFiles)
      .or(this.page.getByText(expectedFileName, { exact: false }));

    await expect(
      successMarker.first(),
      'Expected post-upload success UI (heading, #uploaded-files, or file name)'
    ).toBeVisible({ timeout: 25_000 });

    await expect(
      this.page.getByText(expectedFileName, { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });

    // Form upload control should be gone after successful navigation/view swap.
    await expect(this.uploadButton).toHaveCount(0);
  }
}
