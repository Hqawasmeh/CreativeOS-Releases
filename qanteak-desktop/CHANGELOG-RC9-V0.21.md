# Qanteak OS RC9 V0.21

Universal Work OS roadmap foundation release.

## Universal Data Platform

- Replaces the V0.20 local Workspace UI with a V0.21 universal object/schema layer while preserving automatic V0.20 migration.
- Typed database properties: text, number, currency, percentage, select, multi-select, status, checkbox, date, person, file, URL, email, phone, relation, rollup, formula, created/edited metadata, unique IDs and action-button schema types.
- Stable field IDs so property renames do not have to break formulas, views or future integrations.
- Safe formula parser/runtime with no `eval` or arbitrary JavaScript execution.
- Relation fields across structured Qanteak records.
- Rollups with count, sum, average, min, max, earliest/latest and percentage operations.
- Saved view definitions with filters, sorts and grouping.
- Table, Board, Calendar, Timeline, List and Gallery database views.
- Database-backed Forms that create records and emit automation events.
- Dashboard composer with record-count, numeric aggregation and status-distribution widgets.
- CSV import, Markdown import and portable V0.21 JSON export/import.

## Automation Platform

- Trigger -> Conditions -> Actions -> Approval -> Result runtime.
- Manual, object-created, form-submitted and recurring schedule triggers.
- Conditional field matching.
- Log, create-record, approval and outbound-webhook actions.
- Approval queue for agent/automation writes and external actions.
- Recurring scheduler while Qanteak is running.
- HTTPS-only outbound webhook delivery from the Electron main process.
- Automation run history through the V0.21 audit trail.

## Qanteak Context + Agent Core

- Context Spaces / Qanteak Notebooks that scope objects and web links.
- Workspace-level and user-level agent instructions.
- Versioned reusable Skills.
- Agent Builder with purpose, Context Space, Skill selection, tool policy and confirmation policy.
- Deterministic local agent planner that creates an approval-gated plan before persisting output.
- AI/agent output can become persistent Qanteak document/report artifacts instead of remaining trapped in chat.
- Internal object citations for Researcher output.
- Universal lexical object search across records, goals, reports, meetings, tasks and agent artifacts.

## Specialist Intelligence

- Qanteak Researcher: creates cited reports from a Context Space.
- Qanteak Analyst: computes deterministic count/sum/average/min/max summaries over numeric database fields.
- Meeting Intelligence: extracts `Decision:`, `Action:` and `TODO:` lines from meeting notes/transcripts and creates linked task objects.
- People Intelligence: scans owners and Person properties and creates an ownership report.

These workflows are deliberately deterministic/local in V0.21. Paid model-backed reasoning can plug into the same planner and object graph later without changing the data model.

## Platform & Connectors

- File-backed V0.21 platform state in the Electron user-data directory.
- Local REST API bound only to `127.0.0.1`, disabled by default and protected with a generated bearer token.
- Local object/schema/audit endpoints.
- MCP tool endpoint with initialize, tools/list and tools/call foundations for Qanteak search, object reads and generic object creation.
- Connector SDK manifest/contract for authentication, search, fetch, subscriptions, actions, permissions and citations.
- Connector catalog for Gmail, Outlook, calendars, Drive/OneDrive/SharePoint, GitHub, Slack/Teams, Jira/Linear, Figma, CRM and support systems.
- External connectors remain adapter-ready until the required OAuth/provider credentials are supplied.

## Collaboration & Governance

- Object comments, @mention extraction and activity threads.
- Local audit/observability log with export.
- Agent/tool allow-list policy.
- Approval policy controls.
- External-action governance switch.
- Retention-policy setting.
- Computer Use remains intentionally disabled until Qanteak has a hardened isolated execution runtime, credential isolation and screenshot/action auditing.

## Migration and release safety

- Existing V0.20 databases and goals are migrated once into the V0.21 object/schema store.
- Existing RC9 cloud recovery, authentication, permissions, documents, files, business tools and update behavior remain untouched.
- Windows `appId` and NSIS in-place-upgrade path remain unchanged.
- V0.21 adds syntax and architecture markers to release preflight for the data engine, automation runtime, agent layer, API/MCP security gates and platform bridge.

## External gates not falsely marked complete

The roadmap code/framework is present, but the following still require outside credentials, paid infrastructure or a hardened runtime before production enablement:

- Trusted Windows code-signing certificate.
- Production OAuth registrations and provider credentials for Gmail/Outlook/Calendar/Slack/Teams/Jira/Linear/Figma/CRM/support connectors.
- High-volume production LLM/model usage and premium model routing.
- Production speech-to-text at scale if local transcription is insufficient.
- Production transactional email provider where required.
- Full Computer Use execution environment.
- Enterprise IdP/SSO configuration.
