import { test, expect } from '@playwright/test';
import { ApiClient } from '../../src/api/ApiClient';

/**
 * Loyalty / BFF reachability via APIRequestContext (no UI).
 * Vercel bot protection may return 429/403 — those are soft-skipped, not failures.
 *
 * Full enrollment still uses browser fetch hybrid: src/api/loyaltyEnrollment.ts
 */
test.describe('Loyalty public API (request context)', () => {
  const base =
    process.env.BASE_URL?.replace(/\/$/, '') ||
    'https://revance-loyalty-git-dev-revances-projects.vercel.app';

  test('POST check-voip returns JSON or is blocked by edge protection', async ({ request }) => {
    const api = new ApiClient(request, base);
    const phone = `+19${Date.now().toString().slice(-9)}`;
    const response = await api.post('/api/phone/check-voip', { data: { phone } });

    if (response.status() === 429 || response.status() === 403) {
      test.skip(
        true,
        `Edge protection (${response.status()}) — use hybrid enrollLoyaltyProfileViaApi for full flow`
      );
      return;
    }

    // App may return 200 with body or 4xx validation — assert we got a structured reply.
    expect([200, 400, 422]).toContain(response.status());
    const ct = response.headers()['content-type'] ?? '';
    if (ct.includes('json')) {
      const body = await response.json();
      expect(body).toBeTruthy();
    }
  });
});
