# Jira-to-Playwright Agent

Complete Cursor agent package for this repository.

## Quick start

1. **Enable MCP** — `.cursor/mcp.json` includes `atlassian` (Jira) and `playwright-test`. In Cursor Settings → MCP, connect Atlassian and approve auth.
2. **Invoke the agent** in chat:

```
@jira-to-playwright-agent Run full pipeline for YOUR-STORY-KEY
```

3. **Artifacts produced**

- `manual-test-cases/{STORY-KEY}.md`
- `tests/{STORY-KEY}.spec.ts`
- `qa-report-{STORY-KEY}.md`

## Package contents

```
.cursor/
  agents/jira-to-playwright-agent.md     # Custom agent definition
  skills/jira-to-playwright-agent/       # 9-step skill + refs
  rules/                                 # Always-on + POM + artifact rules
  prompts/                               # Per-step and full-pipeline prompts
  mcp.json                               # Jira + Playwright MCP
templates/                               # Manual TC + QA report templates
src/fixtures/index.ts                    # Reusable Playwright fixtures
AGENTS.md                                # Agent index
```

## Run generated tests

```bash
npx playwright test tests/{STORY-KEY}.spec.ts --project=chromium
```

Or: `npx playwright test tests/{STORY-KEY}.spec.ts`
