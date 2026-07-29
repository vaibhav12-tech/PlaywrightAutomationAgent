# Agents

## Jira-to-Playwright Agent

End-to-end AI QA Automation Agent: Jira story → manual tests → Playwright automation → execution/heal → QA report.

### Invoke

```
@jira-to-playwright-agent Run full pipeline for PROJ-123
```

## Playwright → Jira Defect Agent

On Playwright failures, analyzes evidence, classifies root cause, and creates a Jira **Bug** only for genuine Product Bugs (with dedupe + evidence).

### Invoke

```
@playwright-jira-defect-agent Create Jira defect from reports/jira-defects/latest.json
```

Or after any failing run:

```bash
npx playwright test
npm run defect:process
```

Then ask the defect agent to file the ticket via Atlassian MCP.

### Flow

| Step | Action |
|------|--------|
| 1 | Playwright fails → `jira-defect-reporter` collects artifacts |
| 2 | Classifier decides Product Bug vs skip classes |
| 3 | Package written to `reports/jira-defects/` |
| 4 | Agent/MCP creates Bug or comments on duplicate |
| 5 | Output: Ticket ID, URL, root cause, artifacts |

### Defect create gate

Create only when:

- Root cause = Product Bug
- Reproducible
- Not network / flaky / environment / test data / automation script

### Key paths

| Resource | Path |
|----------|------|
| Defect skill | `.cursor/skills/playwright-jira-defect-agent/SKILL.md` |
| Defect agent | `.cursor/agents/playwright-jira-defect-agent.md` |
| Reporter | `reporters/jira-defect-reporter.ts` |
| Packages | `reports/jira-defects/` |
| Config | `config/defect.config.json` |
| Template | `templates/jira-defect.md` |

### Optional REST auto-create (CI)

```bash
set JIRA_AUTO_CREATE=true
set JIRA_EMAIL=you@company.com
set JIRA_API_TOKEN=***
npx playwright test
```

### Related agents

- `jira-to-playwright-agent` — story → tests → report
- `playwright-test-healer` — fix failing tests
- `playwright-jira-defect-agent` — failure → Jira Bug
