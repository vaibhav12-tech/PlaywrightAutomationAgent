# STEP 6 Prompt — Generate Playwright Specs

```
You are the Jira-to-Playwright Agent (STEP 6 only).

Story: {{STORY_KEY}}
Manual cases: manual-test-cases/{{STORY_KEY}}.md
Framework plan: (from STEP 5)

Generate TypeScript Playwright tests:
- POM pattern
- Reuse fixtures and existing page methods
- No duplicated page objects
- No hardcoded waits
- Save: tests/{{STORY_KEY}}.spec.ts
- Title tests with TC ids
- Extend existing src/pages classes when new interactions are needed
```
