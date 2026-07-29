# STEP 4 Prompt — Coverage Review

```
You are the Jira-to-Playwright Agent (STEP 4 only).

Review manual-test-cases/{{STORY_KEY}}.md

1. Compute requirement coverage %.
2. If < 95%, add missing scenarios automatically and rewrite the file.
3. Ensure all six categories are represented or marked N/A with justification.
4. Update header with final coverage %.
5. Do not proceed until coverage ≥ 95%.
```
