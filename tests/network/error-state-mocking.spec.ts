import { test, expect } from '@playwright/test';
import { mockHttpError, mockJson, mockAbort, clearAllRoutes } from '../../src/network/routeMocks';

/**
 * Error-state network mocking demos — page.route fulfill / abort.
 * Uses a real origin so relative fetch('/api/demo') is interceptable.
 *
 * Run: npm run test:network-mocks
 */
const FIXTURE = `<!DOCTYPE html>
<html>
  <body>
    <h1>Mock demo</h1>
    <button id="load">Load</button>
    <pre id="out"></pre>
    <script>
      document.getElementById('load').onclick = async () => {
        const out = document.getElementById('out');
        try {
          const res = await fetch('/api/demo');
          const text = await res.text();
          out.textContent = res.status + ':' + text;
          out.dataset.status = String(res.status);
        } catch (e) {
          out.textContent = 'NETWORK_ERROR';
          out.dataset.status = 'network_error';
        }
      };
    </script>
  </body>
</html>`;

test.describe('Network interception & error-state mocking', () => {
  test.beforeEach(async ({ page }) => {
    // Establish an http(s) origin so relative /api/demo is a real request.
    await page.goto('https://example.com');
  });

  test.afterEach(async ({ page }) => {
    await clearAllRoutes(page);
  });

  test('mock 500 — UI surfaces server error payload', async ({ page }) => {
    await mockHttpError(page, '**/api/demo', 500, 'Simulated backend failure');
    await page.setContent(FIXTURE);

    await page.getByRole('button', { name: 'Load' }).click();
    const out = page.locator('#out');
    await expect(out).toContainText('500:');
    await expect(out).toContainText('Simulated backend failure');
    await expect(out).toHaveAttribute('data-status', '500');
  });

  test('mock 200 JSON — happy path still works under route', async ({ page }) => {
    await mockJson(page, '**/api/demo', { ok: true, items: [1, 2] }, { status: 200 });
    await page.setContent(FIXTURE);

    await page.getByRole('button', { name: 'Load' }).click();
    await expect(page.locator('#out')).toContainText('200:');
    await expect(page.locator('#out')).toContainText('"ok":true');
  });

  test('mock abort — UI handles network failure', async ({ page }) => {
    await mockAbort(page, '**/api/demo');
    await page.setContent(FIXTURE);

    await page.getByRole('button', { name: 'Load' }).click();
    await expect(page.locator('#out')).toHaveText('NETWORK_ERROR');
    await expect(page.locator('#out')).toHaveAttribute('data-status', 'network_error');
  });

  test('mock delayed 503 — slow third-party', async ({ page }) => {
    await mockJson(
      page,
      '**/api/demo',
      { error: true, message: 'Service Unavailable' },
      { status: 503, delayMs: 300 }
    );
    await page.setContent(FIXTURE);

    await page.getByRole('button', { name: 'Load' }).click();
    await expect(page.locator('#out')).toContainText('503:', { timeout: 10_000 });
  });
});
