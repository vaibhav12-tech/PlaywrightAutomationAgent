import config from './index';

export type OceAuthConfig = {
  baseUrl: string;
  username: string;
  password: string;
  practice: string;
  location: string;
};

type OceConfigShape = {
  oceBaseUrl?: string;
  oceBaseUrlnew?: string;
  oceUsername?: string;
  ocePassword?: string;
  ocePractice?: string;
  oceLocation?: string;
};

/**
 * Resolves OCE login + practice/location from:
 * 1) process.env overrides (OCE_*)
 * 2) environment-specific config (src/config/env.{TEST_ENV}.ts)
 */
export function resolveOceAuthConfig(): OceAuthConfig {
  const c = config as OceConfigShape;

  const clean = (value: string | undefined): string => {
    const v = value?.trim() ?? '';
    // Ignore copied placeholders like "..." from example commands.
    if (!v || /^\.+$/.test(v) || v === '...') return '';
    return v;
  };

  const baseUrl =
    clean(process.env.OCE_BASE_URL) ||
    c.oceBaseUrlnew?.trim() ||
    c.oceBaseUrl?.trim() ||
    '';

  const username = clean(process.env.OCE_USERNAME) || c.oceUsername?.trim() || '';
  const password = clean(process.env.OCE_PASSWORD) || c.ocePassword?.trim() || '';
  const practice =
    clean(process.env.OCE_PRACTICE) || c.ocePractice?.trim() || 'Pleasanton Dermatology';
  const location =
    clean(process.env.OCE_LOCATION) || c.oceLocation?.trim() || 'Pleasanton - CA';

  const missing: string[] = [];
  if (!baseUrl) missing.push('oceBaseUrl / OCE_BASE_URL');
  if (!username) missing.push('oceUsername / OCE_USERNAME');
  if (!password) missing.push('ocePassword / OCE_PASSWORD');
  if (missing.length) {
    throw new Error(
      `Missing OCE auth config for TEST_ENV=${process.env.TEST_ENV || 'dev'}: ${missing.join(', ')}`
    );
  }

  return { baseUrl, username, password, practice, location };
}
