import path from 'path';
import { test, expect } from '../../src/fixtures';
import {
  resolveTestDataPath,
  verifyFileExists,
} from '../../utils/fileTransfer';

/**
 * File Upload UI — ExpandTesting practice site.
 *
 * Run: npm run test:file-transfer
 * Report: Playwright HTML (list + html reporters) + steps via test.step
 */
const SAMPLE_FILE = resolveTestDataPath('uploads', 'sample-upload.txt');
const SAMPLE_NAME = path.basename(SAMPLE_FILE);
const SCREENSHOT_DIR = path.join('screenshots', 'file-transfer');

test.describe('File upload (UI)', () => {
  test('uploads sample file and verifies success + file name', async ({
    fileUploadPage,
  }, testInfo) => {
    await test.step('Verify test data file exists', async () => {
      verifyFileExists(SAMPLE_FILE);
      console.log(`[file-upload] test data → ${SAMPLE_FILE}`);
      await testInfo.attach('upload-source-path', {
        body: SAMPLE_FILE,
        contentType: 'text/plain',
      });
    });

    await test.step('Open upload page', async () => {
      await fileUploadPage.open();
      await fileUploadPage.takeScreenshot(
        path.join(SCREENSHOT_DIR, '01-upload-page.png')
      );
    });

    await test.step('Select file and click Upload', async () => {
      await fileUploadPage.upload(SAMPLE_FILE);
      console.log(`[file-upload] submitted → ${SAMPLE_NAME}`);
    });

    await test.step('Assert upload success and displayed file name', async () => {
      await fileUploadPage.expectUploadSuccess(SAMPLE_NAME);
      await fileUploadPage.takeScreenshot(
        path.join(SCREENSHOT_DIR, '02-upload-success.png')
      );
      await testInfo.attach('uploaded-file-name', {
        body: SAMPLE_NAME,
        contentType: 'text/plain',
      });
    });

    expect(SAMPLE_NAME).toBe('sample-upload.txt');
  });
});
