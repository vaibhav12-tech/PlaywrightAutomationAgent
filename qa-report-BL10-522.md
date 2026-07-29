# QA Report — BL10-522

| Field | Value |
|-------|-------|
| Story | [BL10-522](https://revance-it.atlassian.net/browse/BL10-522) — Patient Checkout Approval |
| Status | Partial (UI contract automated; live OCE/SMS E2E skipped) |
| Generated | 2026-07-27 |
| Environment | UI-contract fixture (+ optional OCE when `OCE_PENDING_E2E=true`) |
| Heal attempts | 1 (clipboard on about:blank → in-page stub) |

## User Story Summary

After Continue on provider checkout ([BL10-521](https://revance-it.atlassian.net/browse/BL10-521)), the Pending screen shows loading/instructions while an SMS asks the patient to approve. UI shows destination phone, Resend, copyable support contacts, Cancel; approval auto-advances to completion. Added error states: Patient Denied, Expired, Could not reach patient, Generic error. Status: **In UAT**. Parent epic: BL10-497.

**Acceptance Criteria:** AC-1…AC-6 + June 23 error states + FR-1…FR-9.

**Comments:** Error states requested/reviewed; QA verification artifact attached in Jira.

## Manual Test Cases

- File: [`manual-test-cases/BL10-522.md`](manual-test-cases/BL10-522.md)
- Total cases: 16
- Coverage: **100%** (14/14 requirements)

| TC ID | Title | Type | Automatable |
|-------|-------|------|-------------|
| TC-001 | Pending after Continue | Positive | Partial |
| TC-002 | Phone number displayed | Positive | Partial |
| TC-003 | Resend SMS | Positive | Partial |
| TC-004 | Copy support email | Positive | Yes |
| TC-005 | Copy support phone | Positive | Yes |
| TC-006 | Cancel transaction | Negative | Partial |
| TC-007 | Patient approval → completion | Positive | No (live SMS) |
| TC-008 | Placeholder copy | Boundary | Yes |
| TC-009–012 | Error states (4) | Error Handling | Partial |
| TC-013 | Cancel ≠ complete | Negative | Partial |
| TC-014 | Clipboard security | Security | Yes |
| TC-015 | Entry via BL10-521 | Integration | No (live) |
| TC-016 | Phone at mobile width | Boundary | Yes |

## Automated Test Cases

- Spec: [`tests/BL10-522.spec.ts`](tests/BL10-522.spec.ts)
- Page object: [`src/pages/PatientCheckoutPendingPage.ts`](src/pages/PatientCheckoutPendingPage.ts)
- Fixture: `patientCheckoutPendingPage` in [`src/fixtures/index.ts`](src/fixtures/index.ts)

| TC ID | Automated title | Status |
|-------|-----------------|--------|
| TC-001 | Pending loading + instructions | Pass |
| TC-002 | Destination phone displayed | Pass |
| TC-003 | Resend actionable | Pass |
| TC-004 | Copy support email | Pass |
| TC-005 | Copy support phone | Pass |
| TC-006/013 | Cancel does not complete | Pass |
| TC-008 | Placeholder controls usable | Pass |
| TC-009 | Patient Denied | Pass |
| TC-010 | Approval Expired | Pass |
| TC-011 | Could not reach patient | Pass |
| TC-012 | Generic error | Pass |
| TC-014 | Clipboard only support email | Pass |
| TC-016 | Mobile phone layout | Pass |
| TC-007/015 | Live OCE E2E | Skipped (`OCE_PENDING_E2E` not set) |

**Note:** Automatable UI ACs are covered via a story-aligned HTML fixture (UI-only story; deep OCE checkout + real SMS not available in this run). Point locators at real OCE Pending markup and set `OCE_PENDING_E2E=true` for live validation.

## Execution Results

```
Command: npx playwright test tests/BL10-522.spec.ts --project=chromium
Passed:  13
Failed:  0
Skipped: 1
```

### Failure / Heal Log

| Attempt | Failure | Fix |
|---------|---------|-----|
| 1 | `navigator.clipboard` undefined on `setContent` / about:blank | In-page `__lastClipboard` stub + POM `readClipboard` fallback |

## Coverage Report

| Metric | Value |
|--------|-------|
| Requirement coverage (manual) | 100% |
| UI-contract automation executed | 13/13 |
| Live E2E | 0 (gated) |

| Category | Manual | Automated (executed) |
|----------|--------|----------------------|
| Positive | 6 | TC-001–005, 008 |
| Negative | 3 | TC-006/013 |
| Boundary | 2 | TC-008, 016 |
| Error Handling | 4 | TC-009–012 |
| Security | 2 | TC-014 |
| Integration | 2 | skipped live |

## Risks & Follow-ups

1. Wire POM locators to real OCE Pending DOM once stable `data-testid`s exist.
2. Enable live E2E: `OCE_PENDING_E2E=true` + OCE credentials + BL10-521 Continue path.
3. TC-007 still needs patient SMS stub/device lab for full approval auto-advance.
