import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';

export type JsonObject = Record<string, unknown>;

export type ApiAssertOptions = {
  /** Expected HTTP status (default 200). */
  status?: number;
  /** Header name → expected substring or exact value. */
  headers?: Record<string, string | RegExp>;
  /** Content-Type must include this (default application/json when expectJson). */
  contentTypeIncludes?: string;
};

/**
 * Thin wrapper around Playwright APIRequestContext for standalone API suites.
 * Validates status, headers, and JSON payload shape without opening a browser UI.
 */
export class ApiClient {
  constructor(
    readonly request: APIRequestContext,
    readonly baseURL?: string
  ) {}

  private url(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    const base = (this.baseURL || '').replace(/\/$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return base ? `${base}${p}` : path;
  }

  async get(path: string, options?: Parameters<APIRequestContext['get']>[1]): Promise<APIResponse> {
    return this.request.get(this.url(path), options);
  }

  async post(
    path: string,
    options?: Parameters<APIRequestContext['post']>[1]
  ): Promise<APIResponse> {
    return this.request.post(this.url(path), options);
  }

  async put(
    path: string,
    options?: Parameters<APIRequestContext['put']>[1]
  ): Promise<APIResponse> {
    return this.request.put(this.url(path), options);
  }

  async delete(
    path: string,
    options?: Parameters<APIRequestContext['delete']>[1]
  ): Promise<APIResponse> {
    return this.request.delete(this.url(path), options);
  }

  async assertOk(response: APIResponse, opts: ApiAssertOptions = {}): Promise<void> {
    const expected = opts.status ?? 200;
    expect(response.status(), await response.text()).toBe(expected);

    if (opts.headers) {
      for (const [name, expectedValue] of Object.entries(opts.headers)) {
        const actual = response.headers()[name.toLowerCase()] ?? '';
        if (expectedValue instanceof RegExp) {
          expect(actual, `header ${name}`).toMatch(expectedValue);
        } else {
          expect(actual.toLowerCase(), `header ${name}`).toContain(expectedValue.toLowerCase());
        }
      }
    }

    if (opts.contentTypeIncludes) {
      const ct = response.headers()['content-type'] ?? '';
      expect(ct.toLowerCase()).toContain(opts.contentTypeIncludes.toLowerCase());
    }
  }

  async getJson<T = JsonObject>(
    path: string,
    opts: ApiAssertOptions = {}
  ): Promise<{ response: APIResponse; body: T }> {
    const response = await this.get(path);
    await this.assertOk(response, {
      contentTypeIncludes: opts.contentTypeIncludes ?? 'json',
      ...opts,
    });
    const body = (await response.json()) as T;
    return { response, body };
  }

  async postJson<T = JsonObject>(
    path: string,
    data: unknown,
    opts: ApiAssertOptions = {}
  ): Promise<{ response: APIResponse; body: T }> {
    const response = await this.post(path, { data });
    await this.assertOk(response, {
      status: opts.status ?? 201,
      contentTypeIncludes: opts.contentTypeIncludes ?? 'json',
      ...opts,
    });
    const body = (await response.json()) as T;
    return { response, body };
  }

  /** Lightweight schema check: required keys present and optional type predicates. */
  assertSchema(
    body: unknown,
    schema: Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>
  ): void {
    expect(body, 'JSON body').toBeTruthy();
    expect(typeof body).toBe('object');
    const obj = body as JsonObject;
    for (const [key, kind] of Object.entries(schema)) {
      expect(obj, `missing key: ${key}`).toHaveProperty(key);
      const value = obj[key];
      if (kind === 'array') {
        expect(Array.isArray(value), `${key} should be array`).toBe(true);
      } else if (kind === 'object') {
        expect(value !== null && typeof value === 'object' && !Array.isArray(value)).toBe(true);
      } else {
        expect(typeof value, `${key} type`).toBe(kind);
      }
    }
  }
}
