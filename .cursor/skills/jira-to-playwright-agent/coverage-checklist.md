# Coverage Checklist (95%+)

## Requirement coverage

- [ ] Every Acceptance Criterion has ≥1 mapped TC
- [ ] Description-only requirements captured
- [ ] Comment clarifications captured
- [ ] Linked-story regressions / integrations considered
- [ ] Coverage ≥ 95% recorded in file header

## Category coverage

| Category | Minimum | Notes |
|----------|---------|-------|
| Positive | ≥1 happy path per primary AC | Valid data, expected success |
| Negative | ≥1 | Invalid input, unauthorized action, wrong state |
| Boundary | ≥1 when inputs exist | Min/max length, empty, zero, max+1 |
| Error Handling | ≥1 | API/UI errors, timeouts, empty states |
| Security | ≥1 when applicable | Authz, XSS input, IDOR, sensitive data exposure |
| Integration | ≥1 when links/deps exist | Upstream/downstream, shared modules |

## Quality bar

- [ ] Steps are unambiguous for a manual tester
- [ ] Expected results are observable
- [ ] Cases are independent (no order dependency unless stated)
- [ ] P0 covers critical path / blockers
- [ ] Automatable flag set honestly

## Security prompts (when relevant)

- Access without login / wrong role
- Tampered IDs in URL or payload
- Script tags / special characters in text fields
- Sensitive fields not echoed in UI/logs (as observable)

## Stop condition

Proceed to STEP 5 only when coverage ≥ 95% **and** category table is complete (or N/A justified).
