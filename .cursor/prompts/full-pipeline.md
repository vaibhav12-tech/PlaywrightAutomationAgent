# Full Pipeline Prompt — Jira-to-Playwright Agent

```
@jira-to-playwright-agent

Run the complete Jira-to-Playwright Agent pipeline for story {{STORY_KEY}}.

Follow .cursor/skills/jira-to-playwright-agent/SKILL.md steps 1–9.

Deliverables:
1. manual-test-cases/{{STORY_KEY}}.md
2. tests/{{STORY_KEY}}.spec.ts
3. qa-report-{{STORY_KEY}}.md

Rules:
- Fetch Jira via MCP
- 95%+ manual coverage before automation
- Inspect src/pages, src/fixtures, src/utils, tests before coding
- TypeScript POM, reuse fixtures/methods, no duplicate POs, no hardcoded waits
- npx playwright test with max 3 heal retries
```
