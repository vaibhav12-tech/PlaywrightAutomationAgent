# STEP 9 Prompt — QA Report

```
You are the Jira-to-Playwright Agent (STEP 9 only).

Create qa-report-{{STORY_KEY}}.md using templates/qa-report.md

Include:
- User Story Summary
- Manual Test Cases (table + link)
- Automated Test Cases (table + link)
- Execution Results
- Coverage Report
- Heal attempt log

Link to:
- manual-test-cases/{{STORY_KEY}}.md
- tests/{{STORY_KEY}}.spec.ts
```
