import fs from 'fs';
import path from 'path';
import type { BrowserContext, Page } from '@playwright/test';

/** Shared auth artifact paths for Chrome → Edge session reuse */
export const AUTH_DIR = path.join('playwright', '.auth');
export const STORAGE_STATE_FILE = path.join(AUTH_DIR, 'user.json');
export const SESSION_BUNDLE_FILE = path.join(AUTH_DIR, 'session.json');

export type SessionBundle = {
  /** Playwright storageState (cookies + localStorage) */
  storageStatePath: string;
  /** Origin → key/value localStorage map (SauceDemo cart-contents lives here) */
  localStorageByOrigin: Record<string, Record<string, string>>;
  /** Origin → key/value sessionStorage map */
  sessionStorageByOrigin: Record<string, Record<string, string>>;
  /** Auth-related cookies / token-like values extracted for verification */
  authenticationTokens: Record<string, string>;
  /** Product added in Chrome — used for Edge cart assertion */
  productName: string;
  capturedAt: string;
  origin: string;
};

/**
 * Reads all sessionStorage entries from the current page origin.
 */
export async function captureSessionStorage(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const data: Record<string, string> = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) data[key] = sessionStorage.getItem(key) ?? '';
    }
    return data;
  });
}

/**
 * Reads all localStorage entries from the current page origin.
 */
export async function captureLocalStorage(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) data[key] = localStorage.getItem(key) ?? '';
    }
    return data;
  });
}

/**
 * Builds auth token map from cookies (and any bearer-like local/session keys).
 */
export async function captureAuthenticationTokens(
  context: BrowserContext,
  page: Page,
  originUrl: string
): Promise<Record<string, string>> {
  const tokens: Record<string, string> = {};
  const cookies = await context.cookies(originUrl);

  for (const cookie of cookies) {
    // SauceDemo uses session-username; also capture common auth cookie names
    if (/session|token|auth|jwt|access|id/i.test(cookie.name)) {
      tokens[`cookie:${cookie.name}`] = cookie.value;
    }
  }

  const storageKeys = await page.evaluate(() => {
    const keys: Record<string, string> = {};
    for (const store of [localStorage, sessionStorage]) {
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (key && /token|auth|jwt|access|session|bearer/i.test(key)) {
          keys[`${store === localStorage ? 'localStorage' : 'sessionStorage'}:${key}`] =
            store.getItem(key) ?? '';
        }
      }
    }
    return keys;
  });

  return { ...tokens, ...storageKeys };
}

/**
 * Saves Playwright storageState + sessionStorage + product name for Edge restore.
 */
export async function saveFullSession(options: {
  context: BrowserContext;
  page: Page;
  productName: string;
  origin?: string;
}): Promise<SessionBundle> {
  const origin = options.origin ?? 'https://www.saucedemo.com';
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // Cookies + localStorage (Playwright native format)
  await options.context.storageState({ path: STORAGE_STATE_FILE });

  const localStorageData = await captureLocalStorage(options.page);
  const sessionStorageData = await captureSessionStorage(options.page);
  const authenticationTokens = await captureAuthenticationTokens(
    options.context,
    options.page,
    origin
  );

  const bundle: SessionBundle = {
    storageStatePath: STORAGE_STATE_FILE,
    localStorageByOrigin: {
      [origin]: localStorageData,
    },
    sessionStorageByOrigin: {
      [origin]: sessionStorageData,
    },
    authenticationTokens,
    productName: options.productName,
    capturedAt: new Date().toISOString(),
    origin,
  };

  fs.writeFileSync(SESSION_BUNDLE_FILE, JSON.stringify(bundle, null, 2), 'utf-8');
  return bundle;
}

export function loadSessionBundle(): SessionBundle {
  if (!fs.existsSync(SESSION_BUNDLE_FILE)) {
    throw new Error(
      `Missing session bundle at ${SESSION_BUNDLE_FILE}. Run Phase 1 (loginAndSaveSession) first.`
    );
  }
  return JSON.parse(fs.readFileSync(SESSION_BUNDLE_FILE, 'utf-8')) as SessionBundle;
}

/**
 * Injects sessionStorage for the current origin, then reloads so the app picks it up.
 */
export async function restoreSessionStorageAndReload(
  page: Page,
  sessionStorageData: Record<string, string>
): Promise<void> {
  await page.evaluate((data) => {
    sessionStorage.clear();
    for (const [key, value] of Object.entries(data)) {
      sessionStorage.setItem(key, value);
    }
  }, sessionStorageData);

  await page.reload({ waitUntil: 'domcontentloaded' });
}
