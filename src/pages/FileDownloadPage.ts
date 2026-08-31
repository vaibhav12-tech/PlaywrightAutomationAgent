import { expect, type Locator } from '@playwright/test';
import path from 'path';
import { BasePage } from './BasePage';
import { downloadFile, ensureDownloadsDir } from '../../utils/fileTransfer';

/**
 * File Download — https://the-internet.herokuapp.com/download
 */
export class FileDownloadPage extends BasePage {
  readonly url = 'https://the-internet.herokuapp.com/download';

  readonly heading: Locator = this.page.getByRole('heading', { name: /file downloader/i });
  readonly downloadLinks: Locator = this.page.locator('#content a, .example a');

  async open(): Promise<void> {
    await this.goto(this.url);
    await expect(this.heading).toBeVisible({ timeout: 30_000 });
    await expect(this.downloadLinks.first()).toBeVisible({ timeout: 15_000 });
  }

  /** First downloadable link text (file name). */
  async firstFileName(): Promise<string> {
    const name = (await this.downloadLinks.first().innerText()).trim();
    if (!name) {
      throw new Error('No downloadable file link text found on the download page.');
    }
    return name;
  }

  linkByName(fileName: string): Locator {
    return this.page.getByRole('link', { name: fileName, exact: true });
  }

  /**
   * Download a named file (or the first link) into downloads/.
   * Returns saved absolute path and suggested filename.
   */
  async downloadNamedFile(fileName?: string): Promise<{
    savedPath: string;
    suggestedFilename: string;
  }> {
    ensureDownloadsDir();
    const targetName = fileName ?? (await this.firstFileName());
    const link = this.linkByName(targetName);

    await expect(link).toBeVisible({ timeout: 15_000 });

    const saveAs = path.join(ensureDownloadsDir(), targetName);
    const result = await downloadFile(this.page, () => link.click(), { saveAs });
    return {
      savedPath: result.savedPath,
      suggestedFilename: result.suggestedFilename,
    };
  }
}
