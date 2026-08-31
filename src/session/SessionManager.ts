import fs from 'fs';
import path from 'path';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { LoginPage } from '../pages/saucedemo/LoginPage';
import {
  AUTH_DIR,
  MULTI_USER_AUTH_DIR,
  STORAGE_STATE_FILE,
  userStorageStatePath,
} from '../../utils/sessionStore';
import { getUser, SESSION_ORIGIN, SESSION_TTL_MS } from './users.config';
import type { SessionEnsureResult, SessionMeta, UserRole } from './types';

export { MULTI_USER_AUTH_DIR };

type LockHandle = {
  lockPath: string;
  release: () => void;
};

/**
 * Production-oriented multi-user session manager.
 * - One storageState file per user/role
 * - Auto-create when missing or expired
 * - File lock for safe parallel / multi-worker refresh
 * - Browser-agnostic artifacts (Chromium / Firefox / WebKit / Edge)
 */
export class SessionManager {
  constructor(private readonly browser: Browser) {}

  storageStatePath(role: UserRole): string {
    return userStorageStatePath(getUser(role).userId);
  }

  /**
   * Persist storageState + meta from an already-authenticated context
   * (used by Chrome Phase-1 multi-user save, including cart sessions).
   */
  async persistAuthenticatedContext(
    role: UserRole,
    context: BrowserContext,
    _page: Page
  ): Promise<SessionMeta> {
    this.ensureAuthDir();
    const user = getUser(role);
    const storageStatePath = path.resolve(this.storageStatePath(role));
    await context.storageState({ path: storageStatePath });

    const now = Date.now();
    const meta: SessionMeta = {
      role,
      userId: user.userId,
      username: user.username,
      storageStatePath,
      createdAt: new Date(now).toISOString(),
      expiresAt: now + SESSION_TTL_MS,
      origin: SESSION_ORIGIN,
    };
    fs.writeFileSync(this.metaPath(role), JSON.stringify(meta, null, 2), 'utf-8');

    // Keep legacy single-file alias in sync for Admin.
    if (user.userId === 'admin') {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
      fs.copyFileSync(storageStatePath, STORAGE_STATE_FILE);
    }

    return meta;
  }

  metaPath(role: UserRole): string {
    const { userId } = getUser(role);
    return path.join(MULTI_USER_AUTH_DIR, `${userId}.meta.json`);
  }

  ensureAuthDir(): void {
    fs.mkdirSync(MULTI_USER_AUTH_DIR, { recursive: true });
  }

  readMeta(role: UserRole): SessionMeta | null {
    const metaFile = this.metaPath(role);
    if (!fs.existsSync(metaFile)) return null;
    try {
      return JSON.parse(fs.readFileSync(metaFile, 'utf-8')) as SessionMeta;
    } catch {
      return null;
    }
  }

  isExpired(meta: SessionMeta | null): boolean {
    if (!meta) return true;
    return Date.now() >= meta.expiresAt;
  }

  hasStorageFile(role: UserRole): boolean {
    return fs.existsSync(this.storageStatePath(role));
  }

  /**
   * Returns false when storage is missing, meta TTL expired, or the SauceDemo
   * session-username cookie is missing/expired in the JSON — without opening a
   * browser. Hitting /inventory.html with a dead cookie shows SauceDemo's
   * "Epic sadface" banner in headed runs even though ensureSession later re-logins
   * and the test still passes.
   */
  isStorageStateStructurallyValid(role: UserRole): boolean {
    if (!this.hasStorageFile(role) || this.isExpired(this.readMeta(role))) {
      return false;
    }

    try {
      const raw = JSON.parse(fs.readFileSync(this.storageStatePath(role), 'utf-8')) as {
        cookies?: Array<{ name: string; value: string; expires: number }>;
      };
      const cookie = raw.cookies?.find((c) => c.name === 'session-username');
      if (!cookie?.value || cookie.value !== getUser(role).username) {
        return false;
      }
      // Playwright: -1 = session cookie; >= 0 = unix expiry seconds
      if (cookie.expires >= 0 && cookie.expires * 1000 <= Date.now() + 60_000) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates storageState: structural cookie check first, then a live inventory probe.
   * Skips the probe when the cookie is already known-bad so headed runs never flash
   * SauceDemo's unauthenticated inventory error during refresh.
   */
  async isSessionValid(role: UserRole): Promise<boolean> {
    if (!this.isStorageStateStructurallyValid(role)) {
      return false;
    }

    let context: BrowserContext | undefined;
    try {
      context = await this.browser.newContext({
        storageState: path.resolve(this.storageStatePath(role)),
        baseURL: SESSION_ORIGIN,
      });

      const cookieUser = (await context.cookies(SESSION_ORIGIN)).find(
        (c) => c.name === 'session-username'
      )?.value;
      if (cookieUser !== getUser(role).username) {
        return false;
      }

      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      await loginPage.openAsAuthenticatedUser();
      return true;
    } catch {
      return false;
    } finally {
      await context?.close();
    }
  }

  /** Performs UI login once and persists storageState + metadata. */
  async createSession(role: UserRole): Promise<SessionMeta> {
    this.ensureAuthDir();
    const user = getUser(role);
    const storageStatePath = this.storageStatePath(role);

    const context = await this.browser.newContext({ baseURL: SESSION_ORIGIN });
    const page = await context.newPage();
    const loginPage = new LoginPage(page);

    try {
      await loginPage.goto();
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();

      await context.storageState({ path: path.resolve(storageStatePath) });

      const now = Date.now();
      const meta: SessionMeta = {
        role,
        userId: user.userId,
        username: user.username,
        storageStatePath,
        createdAt: new Date(now).toISOString(),
        expiresAt: now + SESSION_TTL_MS,
        origin: SESSION_ORIGIN,
      };
      fs.writeFileSync(this.metaPath(role), JSON.stringify(meta, null, 2), 'utf-8');

      if (user.userId === 'admin') {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
        fs.copyFileSync(path.resolve(storageStatePath), STORAGE_STATE_FILE);
      }

      return meta;
    } finally {
      await context.close();
    }
  }

  /**
   * Returns a valid storageState path, creating/refreshing when needed.
   * Safe under parallel workers via per-user lock files.
   */
  async ensureSession(role: UserRole): Promise<SessionEnsureResult> {
    this.ensureAuthDir();
    const lock = await this.acquireLock(role);

    try {
      if (await this.isSessionValid(role)) {
        const meta = this.readMeta(role)!;
        return {
          role,
          userId: meta.userId,
          storageStatePath: this.storageStatePath(role),
          reused: true,
          meta,
        };
      }

      const meta = await this.createSession(role);
      return {
        role,
        userId: meta.userId,
        storageStatePath: meta.storageStatePath,
        reused: false,
        meta,
      };
    } finally {
      lock.release();
    }
  }

  async ensureSessions(roles: UserRole[]): Promise<SessionEnsureResult[]> {
    const results: SessionEnsureResult[] = [];
    for (const role of roles) {
      results.push(await this.ensureSession(role));
    }
    return results;
  }

  /** Cross-process lock so only one worker refreshes a given user session. */
  private async acquireLock(role: UserRole, timeoutMs = 120_000): Promise<LockHandle> {
    this.ensureAuthDir();
    const { userId } = getUser(role);
    const lockPath = path.join(MULTI_USER_AUTH_DIR, `${userId}.lock`);
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
      try {
        const fd = fs.openSync(lockPath, 'wx');
        fs.writeFileSync(fd, `${process.pid}:${new Date().toISOString()}`, 'utf-8');
        fs.closeSync(fd);
        return {
          lockPath,
          release: () => {
            try {
              fs.unlinkSync(lockPath);
            } catch {
              /* ignore */
            }
          },
        };
      } catch {
        // Another worker is refreshing — wait, then re-check validity.
        await new Promise((r) => setTimeout(r, 250));
        if (await this.isSessionValid(role)) {
          return { lockPath, release: () => undefined };
        }
      }
    }

    throw new Error(`Timed out acquiring session lock for role "${role}" (${lockPath})`);
  }
}
