# Jira MCP Integration

## Purpose

STEP 1 of the Jira-to-Playwright Agent fetches live Jira issues via MCP — never from memory or pasted stubs unless the user explicitly provides offline content **and** MCP is unavailable.

## Project MCP config

Configured in `.cursor/mcp.json`:

- `playwright-test` — Playwright Test MCP (planner / generator / healer tools)
- `Atlassian-MCP-Server` — official Atlassian Rovo MCP (`https://mcp.atlassian.com/v1/mcp/authv2`) for Jira

## Setup (user)

1. Open **Cursor Settings → MCP**
2. Ensure **Atlassian-MCP-Server** is enabled (green)
3. Click **Connect** / **Authenticate** — complete the browser OAuth login to your Atlassian Cloud site
4. Verify Jira tools appear (search/get issues, comments, links)

OAuth uses your Atlassian account permissions. No API token is required for the official Rovo MCP endpoint.

Legacy note: do **not** use `https://mcp.atlassian.com/v1/sse` (deprecated after June 2026).

## Agent procedure

1. Discover tools with the session MCP catalog (`GetMcpTools` for the Jira server).
2. If `serverStatus` is `needsAuth`, ask the user to authenticate — do not invent issue data.
3. Fetch issue by key; then comments; then links.
4. Prefer structured fields: summary, description, status, issuetype, priority, labels, custom AC fields.
5. Normalize story key to uppercase (`proj-1` → `PROJ-1`) for file names.

## Offline fallback

Only if the user pastes the story body **and** confirms MCP is unavailable:

- Proceed from STEP 2 with a warning banner in both output markdown files: `Source: user-provided (MCP unavailable)`

## Mapping to artifacts

| Jira field | Used in |
|------------|---------|
| Key | File names, describe titles, report |
| Summary | Titles |
| Description | Requirements R* |
| Acceptance Criteria | Requirements R* |
| Comments | Extra requirements / clarifications |
| Issuelinks | Integration / regression TCs |
