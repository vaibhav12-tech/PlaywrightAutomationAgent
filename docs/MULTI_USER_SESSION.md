# Multi-User Session Management Framework

Production-ready Playwright TypeScript design for unlimited role-based users, per-user `storageState`, auto-refresh, and parallel CI execution.

## 1. Architecture (text)

```
                    ┌─────────────────────────────┐
                    │     playwright.config.ts    │
                    │  globalSetup → session prep │
                    │  projects: chromium/firefox │
                    │            webkit/msedge    │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │ src/session/global-setup.ts │
                    │  launch Chromium (once)     │
                    │  SessionManager.ensureAll   │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │   SessionManager            │
                    │  - lock per user            │
                    │  - validate / expire        │
                    │  - login via LoginPage POM  │
                    │  - write storageState+meta  │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
              playwright/.auth/users/
                admin.storage.json + admin.meta.json
                manager.storage.json + manager.meta.json
                agent.storage.json + ...
                readonly.storage.json + ...
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │ src/fixtures/session.ts     │
                    │  (canonical session fixtures)│
                    │  adminPage / managerPage /  │
                    │  agentPage / readOnlyPage / │
                    │  asRole                     │
                    │  (src/session/fixtures.ts   │
                    │   re-exports for compat)    │
                    │  adminPage / managerPage /  │
                    │  agentPage / readOnlyPage / │
                    │  asRole(role)               │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │ tests/multi-user/*.spec.ts  │
                    │  InventoryPage / CartPage   │
                    │  (no duplicated login)      │
                    └─────────────────────────────┘
```

Browser reuse model: **storageState is browser-agnostic** (cookies + localStorage). The same `manager.storage.json` works in Chromium, Firefox, WebKit, and Edge.

## 2. Folder structure

```
src/session/
  types.ts              # UserRole, SessionMeta, ...
  users.config.ts       # Role → credentials (env-first)
  SessionManager.ts     # create / validate / ensure / locks
  global-setup.ts       # Playwright globalSetup entry
  fixtures.ts           # adminPage, managerPage, asRole, ...
  index.ts              # public exports

tests/multi-user/
  admin.inventory.spec.ts
  manager.inventory.spec.ts
  parallel.roles.spec.ts

pages/
  LoginPage.ts          # single login implementation (POM)
  InventoryPage.ts
  CartPage.ts

playwright/.auth/users/ # gitignored artifacts
.env.session.example
docs/MULTI_USER_SESSION.md
```

## 3. User configuration

| Role | Default username | Env overrides |
|------|------------------|---------------|
| Admin | `standard_user` | `SAUCE_ADMIN_USER` / `SAUCE_ADMIN_PASSWORD` |
| Manager | `problem_user` | `SAUCE_MANAGER_USER` / `SAUCE_MANAGER_PASSWORD` |
| Agent | `performance_glitch_user` | `SAUCE_AGENT_USER` / `SAUCE_AGENT_PASSWORD` |
| ReadOnlyUser | `visual_user` | `SAUCE_READONLY_USER` / `SAUCE_READONLY_PASSWORD` |

Add more users by extending `UserRole` + `USERS` in `users.config.ts` — file naming stays `{userId}.storage.json`.

## 4. SessionManager

Responsibilities:
- Resolve path per user
- Detect missing / expired / invalid sessions
- Login once through `LoginPage` POM
- Persist `storageState` + metadata
- File lock for parallel workers

## 5. Global setup

Configured in `playwright.config.ts` as `globalSetup: './src/session/global-setup.ts'`.

Skip for OCE-only runs:

```bash
set SKIP_MULTI_USER_SESSION_SETUP=true
```

## 6. Fixtures

```ts
import { test, expect } from '../src/fixtures/session';

test('manager', async ({ managerPage }) => { /* ... */ });
test('dynamic', async ({ asRole }) => {
  const page = await asRole('Agent');
});
```

## 7. Example tests

See `tests/multi-user/`.

## 8. Playwright configuration

`playwright.config.ts` wires:
- `globalSetup`
- multi-browser projects (`chromium`, `firefox`, `webkit`, Edge channel optional)
- existing `chrome-setup` / `msedge-reuse` flow left intact for legacy Phase1/Phase2 demos

## 9. Parallel execution strategy

1. **One storageState file per user** → no cookie clashes across roles.
2. **Workers read the same storageState** concurrently (read-only).
3. **Refresh uses `{userId}.lock`** so only one worker recreates a session.
4. Prefer `fullyParallel: true` and multiple workers locally; in CI start with 2–4 workers.
5. Use `test.describe.configure({ mode: 'parallel' })` for role matrix tests.
6. Do not share a single `BrowserContext` across roles — fixtures open isolated contexts.

## 10. Best practices & scalability

- Never commit `playwright/.auth/**` (already gitignored).
- Inject credentials only via CI secrets / env vars.
- Keep login UI code only in `LoginPage` (no duplicated login in tests).
- Tune `SAUCE_SESSION_TTL_MS` for your IdP session lifetime.
- For hundreds of users: generate `USERS` from a secure vault JSON and create sessions lazily via `ensureSession` instead of all-in global setup.
- For API-backed apps: optionally replace UI login inside `createSession` with token exchange, still writing Playwright `storageState`.
- Keep OCE fixtures (`src/fixtures`) separate from SauceDemo multi-user fixtures (`src/fixtures/session`).
- `EDIT_STAFF_E2E=true` auto-skips SauceDemo globalSetup (override with `MULTI_USER_SESSION_SETUP=true`).

## Unified Chrome → Edge flow (same credentials + storageState)

Phase 1 (`loginAndSaveSession.spec.ts`) and Phase 2 (`reuseSessionInEdge.spec.ts`) now use **`users.config.ts`** — no hardcoded `CREDENTIALS`.

```
Chrome (chrome-setup)
  for each role → login via getUser(role)
                → save playwright/.auth/users/{userId}.storage.json
  Admin also    → cart + {userId}.session.json bundle
        │
        ▼
Edge (msedge-reuse)
  for each role → storageState = that user's file
                → open inventory (no login)
                → assert session-username == users.config
  Admin also    → verify cart product from session bundle
```

## Commands

```powershell
# Multi-user fixtures (storageState via SessionManager / global-setup)
npx playwright test tests/multi-user --project=chromium

# Cross-browser reuse of the same storageState files
$env:HEADED='true'; npx playwright test tests/multi-user --project=chromium --project=firefox --project=webkit --project=msedge --headed

# Chrome save → Edge reuse (all roles)
npm run test:session-chrome-edge
# headed:
$env:HEADED='true'; npx playwright test --project=chrome-setup --project=msedge-reuse --headed

# Only Admin + Manager
$env:SAUCE_SESSION_ROLES='Admin,Manager'; npm run test:session-chrome-edge
```
