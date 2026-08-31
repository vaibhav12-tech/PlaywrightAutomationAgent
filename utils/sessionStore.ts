import fs from 'fs';
import path from 'path';
import { expect, type BrowserContext, type Page } from '@playwright/test';

/** Shared auth roots (gitignored). */
export const AUTH_DIR = path.join('playwright', '.auth');
export const MULTI_USER_AUTH_DIR = path.join(AUTH_DIR, 'users');

/** Legacy single-user aliases (mirrored from Admin for backward compatibility). */
export const STORAGE_STATE_FILE = path.join(AUTH_DIR, 'user.json');
export const SESSION_BUNDLE_FILE = path.join(AUTH_DIR, 'session.json');

export type SessionBundle = {
  /** Playwright storageState (cookies + localStorage) */
  storageStatePath: string;
  userId: string;
  username: string;
  role?: string;
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

export function userStorageStatePath(userId: string): string {
  return path.join(MULTI_USER_AUTH_DIR, `${userId}.storage.json`);
}

export function userSessionBundlePath(userId: string): string {
  return path.join(MULTI_USER_AUTH_DIR, `${userId}.session.json`);
}

export function userMetaPath(userId: string): string {
  return path.join(MULTI_USER_AUTH_DIR, `${userId}.meta.json`);
}

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

export async function captureAuthenticationTokens(
  context: BrowserContext,
  page: Page,
  originUrl: string
): Promise<Record<string, string>> {
  const tokens: Record<string, string> = {};
  const cookies = await context.cookies(originUrl);

  for (const cookie of cookies) {
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
 * Saves per-user storageState + session bundle (cookies/local/session + product).
 * Also mirrors Admin artifacts to legacy user.json / session.json.
 */
export async function saveFullSession(options: {
  context: BrowserContext;
  page: Page;
  productName: string;
  userId: string;
  username: string;
  role?: string;
  origin?: string;
  mirrorLegacy?: boolean;
}): Promise<SessionBundle> {
  const origin = options.origin ?? 'https://www.saucedemo.com';
  fs.mkdirSync(MULTI_USER_AUTH_DIR, { recursive: true });

  const storageStatePath = userStorageStatePath(options.userId);
  await options.context.storageState({ path: storageStatePath });

  const localStorageData = await captureLocalStorage(options.page);
  const sessionStorageData = await captureSessionStorage(options.page);
  const authenticationTokens = await captureAuthenticationTokens(
    options.context,
    options.page,
    origin
  );

  const bundle: SessionBundle = {
    storageStatePath,
    userId: options.userId,
    username: options.username,
    role: options.role,
    localStorageByOrigin: { [origin]: localStorageData },
    sessionStorageByOrigin: { [origin]: sessionStorageData },
    authenticationTokens,
    productName: options.productName,
    capturedAt: new Date().toISOString(),
    origin,
  };

  fs.writeFileSync(userSessionBundlePath(options.userId), JSON.stringify(bundle, null, 2), 'utf-8');

  if (options.mirrorLegacy !== false && options.userId === 'admin') {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    fs.copyFileSync(storageStatePath, STORAGE_STATE_FILE);
    fs.writeFileSync(SESSION_BUNDLE_FILE, JSON.stringify(bundle, null, 2), 'utf-8');
  }

  return bundle;
}

export function loadSessionBundle(userId = 'admin'): SessionBundle {
  const perUser = userSessionBundlePath(userId);
  const file = fs.existsSync(perUser) ? perUser : SESSION_BUNDLE_FILE;
  if (!fs.existsSync(file)) {
    throw new Error(
      `Missing session bundle at ${perUser} (or legacy ${SESSION_BUNDLE_FILE}). ` +
        `Run loginAndSaveSession / multi-user setup first.`
    );
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as SessionBundle;
}

export async function restoreSessionStorageAndReload(
  page: Page,
  sessionStorageData: Record<string, string>
): Promise<void> {
  // Do not sessionStorage.clear() — wiping the store can race SauceDemo's client
  // router and briefly surface the unauthenticated inventory error on reload.
  await page.evaluate((data) => {
    for (const [key, value] of Object.entries(data)) {
      sessionStorage.setItem(key, value);
    }
  }, sessionStorageData);

  await page.reload({ waitUntil: 'load' });
  await expect(page.locator('[data-test="error"]')).toHaveCount(0);
}
