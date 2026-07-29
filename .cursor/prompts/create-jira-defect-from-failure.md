# Create Jira Defect from Playwright Failure

```
@playwright-jira-defect-agent

Process the Playwright failure defect package and create a Jira Bug if appropriate.

Package path:
reports/jira-defects/latest.json

Rules:
1. Analyze root cause classification in the package.
2. Create Bug only for Product Bug + reproducible application failures.
3. Skip network / flaky / environment / test data / automation issues.
4. Search for duplicates with the package JQL before creating.
5. If duplicate exists — comment latest evidence; do not create another Bug.
6. Use summary + descriptionMarkdown from the package.
7. Set priority Medium, labels AutomationFailure + Playwright.
8. Return: Ticket ID, URL, Root Cause, Artifact list.
```
