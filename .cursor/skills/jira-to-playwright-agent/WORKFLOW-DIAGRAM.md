# Jira-to-Playwright Agent — Workflow Diagram

```mermaid
flowchart TD
  A[User provides STORY-KEY] --> B[STEP 1: Fetch Jira via MCP]
  B --> C[STEP 2: Analyse Description / AC / Comments / Links]
  C --> D[STEP 3: Write manual-test-cases/KEY.md]
  D --> E[STEP 4: Coverage review]
  E -->|below 95%| D
  E -->|≥ 95%| F[STEP 5: Inspect pages / fixtures / utils / specs]
  F --> G[STEP 6: Generate tests/KEY.spec.ts]
  G --> H[STEP 7: npx playwright test]
  H -->|pass| J[STEP 9: qa-report-KEY.md]
  H -->|fail| I[STEP 8: Analyse + Fix]
  I -->|attempts < 3| H
  I -->|attempts = 3| J
```

## Commands

| Action | Command |
|--------|---------|
| Full agent | `@jira-to-playwright-agent Run full pipeline for KEY` |
| Run story tests | `npx playwright test tests/KEY.spec.ts --project=chromium` |
| Per-step prompts | `.cursor/prompts/step*.md` |
