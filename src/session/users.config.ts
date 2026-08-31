import type { UserCredentials, UserRole } from './types';

/**
 * Multi-user credential map.
 *
 * Prefer environment variables in CI/CD:
 *   SAUCE_ADMIN_USER / SAUCE_ADMIN_PASSWORD
 *   SAUCE_MANAGER_USER / SAUCE_MANAGER_PASSWORD
 *   SAUCE_AGENT_USER / SAUCE_AGENT_PASSWORD
 *   SAUCE_READONLY_USER / SAUCE_READONLY_PASSWORD
 *
 * Demo defaults target SauceDemo (https://www.saucedemo.com/).
 * Manager defaults to problem_user as provided for this framework.
 */
function envOr(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

export const SESSION_ORIGIN =
  process.env.SAUCE_BASE_URL?.replace(/\/$/, '') || 'https://www.saucedemo.com';

/** Default session TTL — recreate after 4 hours (or SAUCE_SESSION_TTL_MS). */
export const SESSION_TTL_MS = Number(process.env.SAUCE_SESSION_TTL_MS || 4 * 60 * 60 * 1000);

export const USERS: Record<UserRole, UserCredentials> = {
  Admin: {
    role: 'Admin',
    userId: 'admin',
    username: envOr('SAUCE_ADMIN_USER', 'standard_user'),
    password: envOr('SAUCE_ADMIN_PASSWORD', 'secret_sauce'),
    displayName: 'Admin (standard_user)',
  },
  Manager: {
    role: 'Manager',
    userId: 'manager',
    username: envOr('SAUCE_MANAGER_USER', 'problem_user'),
    password: envOr('SAUCE_MANAGER_PASSWORD', 'secret_sauce'),
    displayName: 'Manager (problem_user)',
  },
  Agent: {
    role: 'Agent',
    userId: 'agent',
    username: envOr('SAUCE_AGENT_USER', 'performance_glitch_user'),
    password: envOr('SAUCE_AGENT_PASSWORD', 'secret_sauce'),
    displayName: 'Agent (performance_glitch_user)',
  },
  ReadOnlyUser: {
    role: 'ReadOnlyUser',
    userId: 'readonly',
    username: envOr('SAUCE_READONLY_USER', 'visual_user'),
    password: envOr('SAUCE_READONLY_PASSWORD', 'secret_sauce'),
    displayName: 'ReadOnlyUser (visual_user)',
  },
};

export const ALL_ROLES: UserRole[] = ['Admin', 'Manager', 'Agent', 'ReadOnlyUser'];

export function getUser(role: UserRole): UserCredentials {
  const user = USERS[role];
  if (!user?.username || !user?.password) {
    throw new Error(
      `Missing credentials for role "${role}". Set SAUCE_${role.toUpperCase()}_USER/PASSWORD.`
    );
  }
  return user;
}

/**
 * Optional filter: SAUCE_SESSION_ROLES=Admin,Manager
 * When unset, global setup prepares all roles.
 */
export function rolesForSetup(): UserRole[] {
  const raw = process.env.SAUCE_SESSION_ROLES?.trim();
  if (!raw) return ALL_ROLES;
  const requested = raw.split(',').map((r) => r.trim()) as UserRole[];
  const invalid = requested.filter((r) => !ALL_ROLES.includes(r));
  if (invalid.length) {
    throw new Error(`Invalid SAUCE_SESSION_ROLES: ${invalid.join(', ')}`);
  }
  return requested;
}
