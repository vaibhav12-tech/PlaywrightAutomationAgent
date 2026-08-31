import fs from 'fs';
import path from 'path';
import { expect, type Download, type Locator, type Page } from '@playwright/test';

/** Project-relative test data root (OS-safe via path.join). */
export const TESTDATA_DIR = path.join(process.cwd(), 'testdata');

/** Runtime download destination (gitignored contents). */
export const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads');

/** Resolve a file under testdata/ (e.g. resolveTestDataPath('uploads', 'sample-upload.txt')). */
export function resolveTestDataPath(...segments: string[]): string {
  return path.join(TESTDATA_DIR, ...segments);
}

/** Ensure downloads/ exists and return its absolute path. */
export function ensureDownloadsDir(): string {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  return DOWNLOADS_DIR;
}

/**
 * Attach a file to an `<input type="file">` (or file chooser target).
 * Prefer this over inline setInputFiles in specs.
 */
export async function uploadFile(fileInput: Locator, filePath: string): Promise<void> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Upload file not found: ${filePath}`);
  }
  await fileInput.setInputFiles(filePath);
}

export type DownloadFileOptions = {
  /** Absolute path to save as. Defaults to downloads/<suggestedFilename>. */
  saveAs?: string;
  /** Timeout for the download event (ms). */
  timeout?: number;
};

/**
 * Click an action that starts a browser download; wait for Playwright download event;
 * save under downloads/ (or saveAs). Returns the saved absolute path.
 */
export async function downloadFile(
  page: Page,
  triggerClick: () => Promise<void>,
  options: DownloadFileOptions = {}
): Promise<{ download: Download; savedPath: string; suggestedFilename: string }> {
  ensureDownloadsDir();

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: options.timeout ?? 30_000 }),
    triggerClick(),
  ]);

  const suggestedFilename = download.suggestedFilename();
  const savedPath =
    options.saveAs ?? path.join(DOWNLOADS_DIR, suggestedFilename);

  fs.mkdirSync(path.dirname(savedPath), { recursive: true });
  await download.saveAs(savedPath);

  const failure = await download.failure();
  if (failure) {
    throw new Error(`Download failed: ${failure}`);
  }

  return { download, savedPath, suggestedFilename };
}

/** Assert path exists on disk. */
export function verifyFileExists(filePath: string): void {
  expect(fs.existsSync(filePath), `Expected file to exist: ${filePath}`).toBe(true);
}

/** Assert file size is greater than minBytes (default 0 → must be > 0). */
export function verifyFileSize(filePath: string, minBytes = 0): number {
  verifyFileExists(filePath);
  const size = fs.statSync(filePath).size;
  expect(size, `Expected size of ${filePath} > ${minBytes} bytes`).toBeGreaterThan(minBytes);
  return size;
}

/** Optional cleanup helper for specs. */
export function deleteFileIfExists(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
