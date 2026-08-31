import { test, expect } from '@playwright/test';
import { ApiClient } from '../../src/api/ApiClient';

/**
 * Standalone API suite — uses Playwright APIRequestContext only (no browser UI).
 * Against jsonplaceholder (stable public API) to validate client + schema patterns.
 *
 * Run: npm run test:api
 */
test.describe('APIRequestContext — ApiClient', () => {
  test('GET post — status, headers, schema', async ({ request }) => {
    const api = new ApiClient(request, 'https://jsonplaceholder.typicode.com');
    const { response, body } = await api.getJson('/posts/1', {
      status: 200,
      headers: { 'content-type': 'json' },
    });

    expect(response.ok()).toBeTruthy();
    api.assertSchema(body, {
      userId: 'number',
      id: 'number',
      title: 'string',
      body: 'string',
    });
    expect((body as { id: number }).id).toBe(1);
  });

  test('POST create — status 201 and payload echo', async ({ request }) => {
    const api = new ApiClient(request, 'https://jsonplaceholder.typicode.com');
    const payload = { title: 'fw-api', body: 'playwright', userId: 1 };
    const { body } = await api.postJson<{ id: number; title: string }>('/posts', payload, {
      status: 201,
    });

    api.assertSchema(body, {
      id: 'number',
      title: 'string',
    });
    expect(body.title).toBe('fw-api');
  });

  test('GET list — array payload', async ({ request }) => {
    const api = new ApiClient(request, 'https://jsonplaceholder.typicode.com');
    const response = await api.get('/users');
    await api.assertOk(response, { status: 200, contentTypeIncludes: 'json' });
    const users = await response.json();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
    api.assertSchema(users[0], {
      id: 'number',
      name: 'string',
      email: 'string',
    });
  });
});
