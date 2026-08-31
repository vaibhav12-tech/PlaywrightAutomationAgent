import type { Page, Route } from '@playwright/test';

export type MockJsonOptions = {
  status?: number;
  headers?: Record<string, string>;
  /** Artificial latency before fulfilling (ms). */
  delayMs?: number;
};

/**
 * Network interception helpers for frontend edge-case testing.
 * Prefer glob URL patterns that match the real third-party / BFF path.
 */
export async function mockJson(
  page: Page,
  urlGlob: string | RegExp,
  body: unknown,
  options: MockJsonOptions = {}
): Promise<void> {
  const status = options.status ?? 200;
  const headers = {
    'content-type': 'application/json',
    ...options.headers,
  };

  await page.route(urlGlob, async (route: Route) => {
    if (options.delayMs && options.delayMs > 0) {
      await new Promise((r) => setTimeout(r, options.delayMs));
    }
    await route.fulfill({
      status,
      headers,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  });
}

/** Simulate backend 500 (or other) with a JSON error payload. */
export async function mockHttpError(
  page: Page,
  urlGlob: string | RegExp,
  status: number,
  message = 'Internal Server Error'
): Promise<void> {
  await mockJson(page, urlGlob, { error: true, message, status }, { status });
}

/** Abort matching requests (network failure / offline edge). */
export async function mockAbort(page: Page, urlGlob: string | RegExp): Promise<void> {
  await page.route(urlGlob, async (route) => {
    await route.abort('failed');
  });
}

/** Remove all routes registered on the page (test cleanup). */
export async function clearAllRoutes(page: Page): Promise<void> {
  await page.unrouteAll({ behavior: 'ignoreErrors' }).catch(async () => {
    // Older Playwright: unrouteAll may differ — best-effort.
  });
}
