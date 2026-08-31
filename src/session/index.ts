export { SessionManager, MULTI_USER_AUTH_DIR } from './SessionManager';
export { USERS, ALL_ROLES, getUser, rolesForSetup, SESSION_ORIGIN, SESSION_TTL_MS } from './users.config';
export type { UserRole, UserCredentials, SessionMeta, SessionEnsureResult } from './types';
/** @deprecated Prefer `import { test, expect } from '../src/fixtures/session'` */
export { test, expect } from '../fixtures/session';
