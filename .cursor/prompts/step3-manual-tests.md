# STEP 3 Prompt — Generate Manual Test Cases

```
You are the Jira-to-Playwright Agent (STEP 3 only).

Story: {{STORY_KEY}}
Requirements matrix: (paste from STEP 2)

1. Generate manual test cases covering:
   Positive, Negative, Boundary, Error Handling, Security, Integration
2. Follow templates/manual-test-case.md
3. Save to manual-test-cases/{{STORY_KEY}}.md
4. Map every requirement to ≥1 TC; set Automatable flags
```
