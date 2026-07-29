# Playwright Framework Map (this repo)

## Layout

```
src/
  pages/          # Page Object Model classes (primary reuse target)
  fixtures/       # Playwright test fixtures (extend here)
  utils/          # Helpers (env, etc.)
  config/         # env.dev / env.qa / env.prod
  hooks/          # Cucumber browser lifecycle — not for new Playwright specs
tests/            # Playwright Test specs (agent output target)
features/         # Cucumber BDD (reference only for domain flows)
playwright.config.ts
```

## POM rules

1. **Reuse** existing classes: `SignupPage`, `WelcomePage`, `OcePortalPage`, `ExamplePage`, etc.
2. If a flow needs new interactions, **add methods** to the existing page class for that screen.
3. Create a **new** page class only when no class owns that screen.
4. Prefer role / label / placeholder locators (see existing `SignupPage` style).
5. Never duplicate a page object under another path.

## Fixtures

Prefer:

```typescript
// src/fixtures/index.ts
import { test as base } from '@playwright/test';
import { SignupPage } from '../pages/SignupPage';

export const test = base.extend<{ signupPage: SignupPage }>({
  signupPage: async ({ page }, use) => {
    await use(new SignupPage(page));
  },
});
export { expect } from '@playwright/test';
```

Specs import `test` / `expect` from fixtures when available.

## Waits — allowed vs forbidden

| Allowed | Forbidden |
|---------|-----------|
| Locator auto-waiting clicks/fills | `page.waitForTimeout(n)` |
| `await expect(locator).toBeVisible()` | `setTimeout` / sleep helpers |
| `locator.waitFor({ state: 'visible' })` | Fixed arbitrary delays |
| `waitForURL` / response assertions | `networkidle` (discouraged) |

## Env

- `TEST_ENV` → `src/utils/env.ts` → `src/config`
- Set `BASE_URL` / module URLs via config — do not hardcode production URLs in specs

## Execution

```bash
npx playwright test tests/{STORY-KEY}.spec.ts --project=chromium
```

Config: `playwright.config.ts` (`testDir: ./tests`).

## Relation to Cucumber

This agent **generates Playwright Test** files under `tests/`. Do not generate new `.feature` files unless the user explicitly asks for Cucumber.
