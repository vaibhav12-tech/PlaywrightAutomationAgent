import path from 'path';
import { test, expect } from '../../src/fixtures';
import {
  verifyFileExists,
  verifyFileSize,
} from '../../utils/fileTransfer';

/**
 * File Download UI — the-internet.herokuapp.com
 *
 * Run: npm run test:file-transfer
 * Artifacts land in downloads/ (framework download directory).
 */
const SCREENSHOT_DIR = path.join('screenshots', 'file-transfer');

test.describe('File download (UI)', () => {
  test('downloads a file, saves under downloads/, verifies exists and size > 0', async ({
    fileDownloadPage,
  }, testInfo) => {
    let savedPath = '';
    let suggestedFilename = '';

    await test.step('Open download page', async () => {
      await fileDownloadPage.open();
      await fileDownloadPage.takeScreenshot(
        path.join(SCREENSHOT_DIR, '01-download-page.png')
      );
    });

    await test.step('Trigger download and save to downloads/', async () => {
      const result = await fileDownloadPage.downloadNamedFile();
      savedPath = result.savedPath;
      suggestedFilename = result.suggestedFilename;
      console.log(`[file-download] saved → ${savedPath}`);
      await testInfo.attach('downloaded-path', {
        body: savedPath,
        contentType: 'text/plain',
      });
    });

    await test.step('Verify file exists and size > 0', async () => {
      verifyFileExists(savedPath);
      const size = verifyFileSize(savedPath, 0);
      expect(suggestedFilename.length).toBeGreaterThan(0);
      console.log(
        `[file-download] ok name=${suggestedFilename} size=${size} bytes`
      );
      await testInfo.attach('downloaded-meta', {
        body: JSON.stringify({ suggestedFilename, savedPath, size }, null, 2),
        contentType: 'application/json',
      });
    });

    await test.step('Capture post-download screenshot', async () => {
      await fileDownloadPage.takeScreenshot(
        path.join(SCREENSHOT_DIR, '02-after-download.png')
      );
    });
  });
});
