# Full 9-Step Workflow

## Input

| Input | Required | Example |
|-------|----------|---------|
| Jira story key | Yes | `LOY-2041` |
| Environment (`TEST_ENV`) | No | `dev` / `qa` / `prod` (default `dev`) |
| Browser project | No | `chromium` (default) |

## STEP 1 — Fetch

1. Call Jira MCP to get issue by key.
2. Fetch comments thread.
3. Fetch issue links (blocks, relates, clones, etc.).
4. If AC is in a custom field (e.g. `customfield_*`), include it.
5. Abort only if the issue key is invalid or MCP is unavailable.

## STEP 2 — Analyse

Build:

```
requirements[] = {
  id: "R1",
  source: "AC|Description|Comment|Linked",
  text: "...",
  types: ["Positive"|"Negative"|...]
}
```

Linked stories: note shared flows and regression risks; add Integration cases when a link implies dependency.

## STEP 3 — Manual test cases file

Path: `manual-test-cases/{STORY-KEY}.md`

Each case must have:

- ID (`TC-001`, …)
- Title
- Type (one of the six coverage types)
- Priority (P0–P3)
- Preconditions
- Steps (numbered)
- Expected result
- Requirement IDs covered (`R1`, …)
- Automatable (`Yes` / `No` / `Partial`)

Header must include story key, title, generated date, and initial coverage estimate.

## STEP 4 — Coverage gate

```
coverage = (requirements with ≥1 TC) / (total requirements) * 100
```

Target: **≥ 95%**.

If below target:

1. List uncovered requirement IDs
2. Add TCs for each gap (prefer Negative / Boundary / Security if those buckets are thin)
3. Recompute until ≥ 95%
4. Update file header with final %

Also ensure each of the six categories has **at least one** TC when the story domain allows it. If a category is N/A (e.g. no auth surface), mark N/A in the Coverage Summary table with justification.

## STEP 5 — Framework inspection checklist

Before coding:

- [ ] List page classes under `src/pages/` and methods relevant to the story
- [ ] Check `src/fixtures/` for reusable fixtures
- [ ] Check `src/utils/` / `src/config/` for env and base URLs
- [ ] Read similar specs under `tests/`
- [ ] Decide: extend existing POM vs add methods to existing class
- [ ] Note selector style used in this repo (role/label first)

## STEP 6 — Spec generation rules

File: `tests/{STORY-KEY}.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
// Prefer project fixtures when available:
// import { test, expect } from '../src/fixtures';

test.describe('{STORY-KEY}: {short title}', () => {
  test('TC-001: {title}', async ({ page }) => {
    // steps using page objects — no waitForTimeout
  });
});
```

- One describe per story
- Test titles include TC ids from the manual file
- Use `expect` soft only when documenting multiple independent checks is intentional
- Import page objects from `src/pages/`
- New locators go on page objects, not inline in the spec (except trivial one-offs)

## STEP 7 — Execute

```bash
npx playwright test tests/{STORY-KEY}.spec.ts --project=chromium
```

Optional: `--reporter=list` for cleaner agent logs.

## STEP 8 — Retry loop

```
attempt = 1
while failures and attempt <= 3:
  analyse
  fix
  re-run
  attempt++
```

Fix order preference:

1. Wrong/flake selector → update POM
2. Missing wait for UI state → `expect(locator).toBeVisible()` / `waitFor`
3. Wrong assertion / data → fix test data or expect
4. Env/config → use `src/config` / `TEST_ENV`

Do not bump timeouts blindly. Do not use `waitForTimeout`.

## STEP 9 — Report

Path: `qa-report-{STORY-KEY}.md`

Include links/paths to:

- Manual file
- Spec file
- Execution summary (passed / failed / skipped / flaky)
- Coverage % and category matrix
- Heal attempt log (what failed, what changed)
