# RC9 V0.21 Roadmap Delivery Status

V0.21 turns the Notion + Copilot parity roadmap into a working local/platform foundation inside Qanteak OS.

## Delivered in V0.21

### Phase 1 — Universal Data Platform

Delivered: typed properties, universal object IDs, schema registry, relations, rollups, safe formulas, saved filters/sorts/grouping, Table/Board/Calendar/Timeline/List/Gallery views, database-backed forms, dashboards, CSV/JSON/Markdown import/export.

### Phase 2 — Automation Platform

Delivered: internal event runtime, manual/object/form/schedule triggers, conditions, internal actions, approval queue, recurring scheduler, HTTPS webhooks, run/audit history.

### Phase 3 — Qanteak Context + Agent Core

Delivered: universal object graph foundation, Context Spaces, persistent workspace/user instructions, reusable Skills, Agent Builder, deterministic planner, approval-gated agent plans, persistent output artifacts, internal citations and workspace search.

### Phase 4 — Platform & Connectors

Delivered locally: versioned local REST API, bearer-token authorization, localhost-only binding, webhooks, connector SDK manifest, connector catalog and MCP tool endpoint foundation.

Credentialed live integrations remain gated by provider OAuth/API credentials.

### Phase 5 — Specialist Intelligence

Delivered local deterministic workflows: Researcher, Analyst, Meeting Intelligence and People Intelligence. These create Qanteak artifacts and use the same object graph.

Production model-backed reasoning/transcription can replace or extend the deterministic execution layer later.

### Phase 6 — Enterprise Agent Platform

Delivered: Agent Builder, tool allow-list, write approval policy, external-action control, audit trail, retention setting and agent/skill storage.

## Deliberate external/runtime gates

The following cannot truthfully be called production-complete without external infrastructure or credentials:

- Windows Authenticode signing certificate.
- Live Gmail/Outlook/Calendar/Slack/Teams/Jira/Linear/Figma/CRM/support OAuth connections.
- Paid/hosted production LLM capacity and premium model routing.
- Production-scale speech transcription if local processing is insufficient.
- Enterprise SSO/IdP configuration.
- Computer Use. Qanteak requires an isolated browser/desktop execution runtime, credential isolation, domain/app policy controls, confirmation gates and screenshot/action auditing before this can safely be enabled.

## Architecture note

V0.21 intentionally stores the new platform state in a dedicated file under Electron user-data and migrates V0.20 local databases/goals once. Existing RC9 cloud snapshot/recovery code is not rewritten in this release. A later cloud migration can move the V0.21 universal graph into the shared backend after the schema and permission model are proven stable.
