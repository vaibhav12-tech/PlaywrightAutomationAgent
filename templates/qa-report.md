# QA Report — {STORY-KEY}

| Field | Value |
|-------|-------|
| Story | {STORY-KEY} — {Summary} |
| Status | Pass / Fail / Partial |
| Generated | {ISO-DATE} |
| Environment | {TEST_ENV} |
| Heal attempts | {0–3} |

## User Story Summary

{Summary from Jira}

**Acceptance Criteria (condensed):**
- …

**Linked issues:** …

## Manual Test Cases

- File: [`manual-test-cases/{STORY-KEY}.md`](manual-test-cases/{STORY-KEY}.md)
- Total cases: {N}
- Coverage: {NN}%

| TC ID | Title | Type | Priority | Automatable |
|-------|-------|------|----------|-------------|
| TC-001 | … | Positive | P0 | Yes |

## Automated Test Cases

- Spec: [`tests/{STORY-KEY}.spec.ts`](tests/{STORY-KEY}.spec.ts)
- Framework: Playwright Test + TypeScript + POM
- Page objects reused/extended: …

| TC ID | Automated test title | Status |
|-------|----------------------|--------|
| TC-001 | … | Pass / Fail / Skipped / Not automated |

## Execution Results

```
Command: npx playwright test tests/{STORY-KEY}.spec.ts --project=chromium
Passed: {n}
Failed: {n}
Skipped: {n}
```

### Failure / Heal Log

| Attempt | Failure summary | Fix applied |
|---------|-----------------|-------------|
| 1 | … | … |

## Coverage Report

| Metric | Value |
|--------|-------|
| Requirement coverage | {NN}% |
| Category coverage | see table |
| Automation of automatable TCs | {NN}% |

| Category | Manual TCs | Automated | Notes |
|----------|------------|-----------|-------|
| Positive | | | |
| Negative | | | |
| Boundary | | | |
| Error Handling | | | |
| Security | | | |
| Integration | | | |

## Risks & Follow-ups

- …
