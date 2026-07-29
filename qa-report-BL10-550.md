# QA Report — BL10-550

| Field | Value |
|-------|-------|
| Story | [BL10-550](https://revance-it.atlassian.net/browse/BL10-550) — Edit Staff Member Modal & Permission |
| Status | Partial (UI contract automated; live OCE gated) |
| Generated | 2026-07-27 |
| Environment | UI-contract fixture (+ optional `EDIT_STAFF_E2E=true`) |
| Heal attempts | 1 (locations empty-error locator strict mode) |

## User Story Summary

Admin edits a staff member in one modal (Practice Role, Permissions, Locations). Identity fields are view-only. Admin permission locks Locations to all; Team Member requires ≥1 Ship To. Update is atomic. Blocked by BL10-548 (staff list/admin gate). Status: **In UAT**. QA comment: Pass + artifact attached.

## Manual Test Cases

- File: [`manual-test-cases/BL10-550.md`](manual-test-cases/BL10-550.md)
- Total: 14 · Coverage: **100%**

## Automated Test Cases

- Spec: [`tests/BL10-550.spec.ts`](tests/BL10-550.spec.ts)
- POM: [`src/pages/EditStaffMemberPage.ts`](src/pages/EditStaffMemberPage.ts)
- Fixture: `editStaffMemberPage`

| Result | Count |
|--------|-------|
| Passed | 11 |
| Skipped | 1 (live E2E) |
| Failed | 0 |

## Execution Results

```
npx playwright test tests/BL10-550.spec.ts --project=chromium
11 passed · 1 skipped · 0 failed
```

### Heal Log

| Attempt | Issue | Fix |
|---------|-------|-----|
| 1 | `getByText(/ship to/i)` matched option labels | Use `[data-testid="locations-empty-error"]` |

## Coverage Report

| Metric | Value |
|--------|-------|
| Manual requirement coverage | 100% |
| UI-contract automation | 11 passed |
| Live staff list / admin gate | Skipped until `EDIT_STAFF_E2E=true` |

## Risks & Follow-ups

1. Point locators at real OCE Edit Staff modal markup.
2. Live E2E needs Admin session + BL10-548 staff list.
3. Related bug BL10-602 (Done) — regression-check Practice settings visibility for Team Member when enabling live runs.
