# QA Report — BL10-685

| Field | Value |
|-------|-------|
| Story | [BL10-685](https://revance-it.atlassian.net/browse/BL10-685) — Consumer - REVA - ISI/Footer |
| Status | Partial |
| Generated | 2026-07-20 |
| Environment | DEV (`revance-loyalty-git-dev-revances-projects.vercel.app`) |
| Heal attempts | 2 (browser install + locator/fixme for undeployed sticky) |

## User Story Summary

Epic for REVA consumer Important Safety Information (ISI) and site footer: sticky condensed ISI at viewport bottom, hide when full ISI in view, reappear on scroll up, click-to-scroll to full ISI, full ISI in footer on all in-scope pages, UI-only, responsive + a11y.

**Acceptance Criteria (condensed):**
- AC-01 Sticky ISI fixed bottom + condensed content
- AC-02 Hide when full ISI fully in view
- AC-03 Reappear when full ISI leaves view
- AC-04 Click sticky → scroll to full ISI
- AC-05 Full ISI in footer on in-scope pages
- AC-06 UI-only / no backend dependency
- AC-07 Breakpoints; do not obscure interactive elements

**Linked issues:** Clones BL10-677 (Provider ISI/Footer); Cloned by BL10-690 (Consumer Story); Parent BL10-284

**Comments:** None

## Manual Test Cases

- File: [`manual-test-cases/BL10-685.md`](manual-test-cases/BL10-685.md)
- Total cases: 16
- Coverage: **100%** (12/12 requirements)

| TC ID | Title | Type | Priority | Automatable |
|-------|-------|------|----------|-------------|
| TC-001 | Sticky ISI visible on load | Positive | P0 | Yes |
| TC-002 | Sticky hides at full ISI | Positive | P0 | Yes |
| TC-003 | Sticky reappears on scroll up | Positive | P0 | Yes |
| TC-004 | Click sticky scrolls to full ISI | Positive | P0 | Yes |
| TC-005 | Full ISI in footer | Positive | P0 | Yes |
| TC-006 | Full ISI on multiple pages | Integration | P1 | Yes |
| TC-007 | UI-only / no backend | Integration | P2 | Partial |
| TC-008 | No CTA obscuring (desktop) | Boundary | P1 | Yes |
| TC-009 | Mobile breakpoint | Boundary | P1 | Yes |
| TC-010 | Tablet breakpoint | Boundary | P2 | Yes |
| TC-011 | Keyboard access | Security | P1 | Yes |
| TC-012 | Fixed approved copy | Security | P2 | Partial |
| TC-013 | Short page edge case | Error Handling | P2 | Yes |
| TC-014 | Rapid scroll stability | Error Handling | P3 | Yes |
| TC-015 | Click outside does not jump | Negative | P3 | Yes |
| TC-016 | Provider scope negative | Negative | P3 | No |

## Automated Test Cases

- Spec: [`tests/BL10-685.spec.ts`](tests/BL10-685.spec.ts)
- Page object: [`src/pages/RevaIsiFooterPage.ts`](src/pages/RevaIsiFooterPage.ts)
- Fixture: `revaIsiFooterPage` in [`src/fixtures/index.ts`](src/fixtures/index.ts)
- Framework: Playwright Test + TypeScript + POM

| TC ID | Automated test title | Status |
|-------|----------------------|--------|
| TC-001 | Sticky ISI visible on page load | Skipped (`test.fixme` — sticky not on DEV) |
| TC-002 | Sticky hides when full ISI in view | Skipped (`test.fixme`) |
| TC-003 | Sticky reappears on scroll up | Skipped (`test.fixme`) |
| TC-004 | Click sticky scrolls to full ISI | Skipped (`test.fixme`) |
| TC-005 | Full ISI / safety content in footer | **Pass** |
| TC-006 | Footer safety on multiple pages | **Pass** |
| TC-008 | Sticky does not obscure CTAs | Skipped (`test.fixme`) |
| TC-008b | Primary CTAs usable (baseline) | **Pass** |
| TC-009 | Footer at mobile | **Pass** |
| TC-010 | Footer at tablet | **Pass** |
| TC-011 | Keyboard access sticky | Skipped (`test.fixme`) |
| TC-013 | Short page edge case | Skipped (`test.fixme`) |
| TC-014 | Rapid scroll stability | Skipped (`test.fixme`) |
| TC-015 | Click outside does not jump | **Pass** |

## Execution Results

```
Command: npx playwright test tests/BL10-685.spec.ts --project=chromium
Passed:  6
Failed:  0
Skipped: 8 (test.fixme — sticky ISI not deployed on DEV)
```

### Failure / Heal Log

| Attempt | Failure summary | Fix applied |
|---------|-----------------|-------------|
| 1 | Chromium browser binaries missing | `npx playwright install chromium` |
| 2 | Sticky locators timeout — no sticky ISI on DEV; only footer Prescribing Information / Boxed Warning present | Updated POM for current footer copy; `test.fixme` on sticky-dependent cases with product-gap comment |

## Coverage Report

| Metric | Value |
|--------|-------|
| Requirement coverage (manual) | 100% |
| Category coverage | All 6 categories covered in manual suite |
| Automation of automatable TCs | Scripts written for all Yes/Partial automatable TCs; sticky cases skipped until deploy |

| Category | Manual TCs | Automated (executed) | Notes |
|----------|------------|----------------------|-------|
| Positive | 6 | TC-005 | Sticky positive cases fixme |
| Negative | 2 | TC-015 | TC-016 manual-only |
| Boundary | 3 | TC-008b, 009, 010 | Sticky overlap fixme |
| Error Handling | 2 | — | TC-013/014 fixme |
| Security | 2 | — | TC-011 fixme; TC-012 manual/partial |
| Integration | 3 | TC-006 | TC-007 not automated |

## Risks & Follow-ups

1. **Sticky ISI not on DEV** — Epic is In Progress; sticky bar absent (`fixed` elements = 0). Re-enable `test.fixme` cases after sticky ships; update locators if markup uses different `data-testid`.
2. **Footer copy vs full ISI** — Current footer shows DAXXIFY Prescribing Information / Boxed Warning line; confirm with Medical/Regulatory whether this satisfies AC-05 full ISI or more content is still pending.
3. **Scroll behavior** — Design open item (instant vs smooth) — tests accept either.
4. Remove `test.fixme` and re-run full suite when sticky ISI is available on the target environment.
