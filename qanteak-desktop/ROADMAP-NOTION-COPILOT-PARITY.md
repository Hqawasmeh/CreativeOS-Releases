# Qanteak OS — Notion + Microsoft Copilot Feature-Gap Roadmap

Research date: 2026-09-12

## Product direction

Qanteak should not become a collection of disconnected copies of Notion, Microsoft 365, Slack, and project-management products. The target architecture is one permission-aware work graph where projects, tasks, clients, files, documents, databases, meetings, messages, finance, goals, automations, people, and external sources are all addressable objects. Qanteak AI should reason over that graph and propose or execute permission-checked actions.

Qanteak already has an important base: projects/tasks/calendar/timeline/reviews, clients/leads, documents/knowledge, files, invoicing/estimates/expenses, automations, notifications, permissions, cloud recovery, and an Ask/Do/Watch AI architecture with confirmation before writes. RC9 V0.20 adds the first no-paid-service Workspace foundation: custom databases, table/board/calendar views, goals, templates, activity, and local insights.

---

## Competitor capability map

### Notion strengths Qanteak should absorb

1. **Rich database schema** — typed properties, select/multi-select, people, files, URLs, formula, relation, rollup, generated IDs, buttons, timestamps and other structured property types.
2. **Database views** — table, board, calendar, timeline, list, gallery, chart/map/form-oriented experiences, with saved filters, sorts, groups and layouts.
3. **Relations + rollups + formulas** — connect records across databases and calculate derived values.
4. **Forms** — submit directly into a database and use the resulting records in views, charts and automations.
5. **Database automations** — event triggers, property conditions, recurring triggers, variables/formulas and actions against workspace objects or external services.
6. **Charts and dashboards** — data visualization directly from structured workspace data.
7. **Notion Agent** — permission-aware multi-step agent that can create/edit pages, databases and views using workspace and connected-app context.
8. **Agent instructions and reusable skills** — users can teach the agent repeatable work patterns.
9. **Enterprise Search** — permission-aware search and answers across the workspace, connected apps and the web, with source citations and source scoping.
10. **Research Mode** — longer-form analysis across pages, databases, files, connected systems and web sources.
11. **AI Meeting Notes** — transcription, summaries, decisions and action-item extraction.
12. **AI Connectors** — Slack, Teams, Google Drive, SharePoint/OneDrive, Jira, GitHub, Linear, Gmail, Outlook and calendars.
13. **MCP** — AI clients can read/write workspace content in real time while respecting permissions; enterprise governance controls which AI clients are allowed.
14. **Files as AI context** — PDFs/CSVs and other files can be ingested, analyzed and transformed into structured outputs.
15. **Model controls / AI governance** — admins choose models, usage controls and web-search behavior.

### Microsoft Copilot strengths Qanteak should absorb

1. **Context notebooks** — curated AI workspaces containing files, chats, pages, meeting notes, links, emails and other references, with answers grounded only in that notebook when desired.
2. **Persistent AI pages** — convert an AI answer into an editable/shareable work artifact instead of leaving it trapped in chat.
3. **Specialist agents** — Researcher for deep research, Analyst for data-heavy work, and other role-specific agents.
4. **Organization work graph / Work IQ concept** — combine files, emails, meetings, chats, calendars and business systems into persistent organizational context and memory.
5. **Large connector ecosystem** — external data can be indexed and searched while preserving source permissions.
6. **Agent builder / Copilot Studio model** — define instructions, knowledge sources, tools/actions, permissions, triggers and publishing rules for custom agents.
7. **Workflow designer** — combine API actions, business rules, approval steps and autonomous/agentic execution.
8. **Computer use** — agents can operate websites and Windows apps through a virtual mouse/keyboard when no API exists.
9. **Real-time collaborative components** — reusable synchronized content blocks and workspaces.
10. **Governance and observability** — administrators can control agent data/tool access and monitor actions.
11. **External developer APIs** — external applications can invoke context, search, agents and actions.

---

## Qanteak gap matrix

| Capability | Qanteak now | Gap | Priority | Can build without new paid service? |
|---|---|---|---|---|
| Typed database properties | Basic V0.20 fields | Major | P0 | Yes |
| Relations | No generic relation engine | Major | P0 | Yes |
| Rollups | No generic rollup engine | Major | P0 | Yes |
| Formula engine | No database formula runtime | Major | P0 | Yes |
| Saved filters/sorts/groups | Limited | Major | P0 | Yes |
| Table/Board/Calendar | V0.20 foundation | Partial | P0 | Yes |
| Timeline/List/Gallery views | Project-specific only | Medium | P1 | Yes |
| Forms -> database | Missing | Major | P0 | Yes |
| Charts/dashboard builder | Fixed dashboards only | Major | P1 | Yes |
| Database buttons/actions | Missing | Medium | P1 | Yes |
| Internal automation engine | Existing simple rules | Partial | P0 | Yes |
| Generic trigger/condition/action designer | Missing | Major | P0 | Yes |
| Recurring automation triggers | Limited | Medium | P1 | Yes |
| Webhook actions | Missing generic layer | Major | P1 | Yes |
| Approval steps | Limited review flows | Medium | P1 | Yes |
| Comments/mentions/threads | Limited | Major | P1 | Yes |
| Real-time collaborative editing | Limited | Major | P2 | Mostly |
| Notebook/context spaces | Missing | Major | P0 | Yes for data model/UI |
| Persistent AI output pages | Documents exist, no chat->artifact flow | Medium | P1 | Yes |
| Agent instructions | Missing user-configurable layer | Major | P0 | Yes |
| Reusable agent skills | Missing | Major | P0 | Yes |
| Action planner + approval queue | Architecture exists | Partial | P0 | Yes |
| Permission-aware object graph | Partial through workspace modules | Major | P0 | Yes |
| Full-text workspace index | Search exists; not a full indexed semantic system | Major | P1 | Yes for lexical index |
| Source citations | Missing generalized citation layer | Major | P1 | Yes for internal objects |
| Enterprise search across connectors | Missing | Major | P2 | Connector credentials/API usage may vary |
| Researcher agent | Missing production implementation | Major | P2 | Framework yes; model execution costs later |
| Analyst agent | Missing | Major | P2 | Local calculations yes; advanced model use later |
| People agent / org intelligence | Missing | Major | P2 | Data model yes |
| AI meeting notes | Missing | Major | P2 | Local transcription possible; production scale may cost |
| Gmail/calendar actions | Missing in Qanteak app | Major | P2 | OAuth/API credentials required |
| Connector SDK | Missing | Major | P1 | Yes |
| MCP server | Missing | Major | P1 | Yes |
| MCP client support | Missing | Major | P2 | Yes |
| Public API + webhooks | Limited | Major | P1 | Yes |
| Agent builder | Missing | Major | P1 | Yes for builder/runtime framework |
| Agent catalog/store | Missing | Medium | P3 | Yes |
| Computer use | Missing | Major | P3 | Framework possible; substantial security/runtime work |
| Admin AI governance | Architecture-level only | Major | P2 | Yes |
| Model switcher/routing | Missing product layer | Medium | P2 | UI/routing yes; providers cost later |
| Windows signing | Prepared, credentials missing | External | Release gate | No — certificate required |

---

# Build roadmap

## Phase 1 — Universal Data Platform — P0

**Goal:** turn the RC9 V0.20 database foundation into the underlying data model for Qanteak rather than a separate mini-feature.

### 1. Typed property engine

Support property definitions independent of a specific database:

- Text
- Number / currency / percentage
- Select / multi-select
- Status
- Checkbox
- Date / date range
- Person / team
- File
- URL / email / phone
- Relation
- Rollup
- Formula
- Created time / created by
- Last edited time / last edited by
- Unique ID
- Action button

Every property gets a stable ID so renaming a property does not break formulas, automations or integrations.

### 2. Universal object IDs + schema registry

Create one object registry for pages, database rows, tasks, projects, clients, invoices, files, goals, meetings and external references. Every object should expose:

- object ID
- object type
- workspace ID
- title/name
- owner
- created/updated timestamps
- permission scope
- source
- relations
- searchable text
- activity history

This is the base for Qanteak AI context.

### 3. Relation engine

Allow any compatible Qanteak object to relate to another object. Examples:

- Client -> Projects
- Project -> Tasks
- Task -> Goal
- Meeting -> Decisions
- Invoice -> Client / Project
- Document -> Project / Client
- Database record -> any other record

### 4. Rollup engine

Aggregate related values using count, sum, average, min, max, percentage, earliest/latest date and status summaries.

### 5. Formula engine

Implement safe expressions over row properties and rollups. Do not execute arbitrary JavaScript. Add formula parser, validation, dependency graph and recalculation.

### 6. View engine

One query/view definition should power:

- Table
- Board
- Calendar
- Timeline
- List
- Gallery

Each saved view stores filters, sorts, groups, visible fields, field order and layout settings.

### 7. Forms

Create public/internal forms backed by any compatible database. Add required fields, descriptions, validation, response confirmation, access control and optional automation triggers.

### 8. Charts and dashboards

Build reusable chart blocks driven by saved database queries:

- KPI number
- Bar
- Line
- Donut
- Funnel
- Progress

Allow a dashboard to combine charts, database views, goals, tasks and finance metrics.

---

## Phase 2 — Automation Platform — P0/P1

**Goal:** evolve the current automation list into a real workflow runtime.

### Core model

`Trigger -> Conditions -> Actions -> Approval -> Result`

### Internal triggers

- Object created
- Property changed
- Status changed
- Date reached
- Due/overdue
- Form submitted
- Review approved/rejected
- Invoice status changed
- File uploaded/version changed
- Member joined
- Goal changed
- Recurring schedule

### Internal actions

- Create/update object
- Assign owner
- Change status/property
- Create task/project/document
- Create notification
- Add relation
- Move/copy database row
- Create approval request
- Run another automation
- Prepare AI request

### External foundation

- Outbound HTTP webhook
- Signed webhook payloads
- Retry/backoff
- execution history
- failure reason
- disable-on-repeated-error safety

Money-moving, destructive and high-risk external actions should remain confirmation gated.

---

## Phase 3 — Qanteak Context + Agent Core — P0

**Goal:** make Qanteak AI an actual permission-aware work agent.

### 1. Permission-aware workspace graph

Index every Qanteak object and relation while preserving the same permissions the user has in the UI.

### 2. Context Spaces / Qanteak Notebooks

Users create a focused context space and add:

- projects
- clients
- documents
- files
- database views
- meetings
- emails/connectors later
- web links
- goals
- selected people

The AI can then be explicitly scoped to that Context Space.

### 3. Agent action planner

Replace direct “AI reply” behavior with:

`User request -> context retrieval -> plan -> tool proposals -> permission validation -> confirmation -> execution -> audit log`

### 4. Agent instructions

Workspace and user levels:

- role/persona
- writing preferences
- output standards
- required sources
- prohibited actions
- approval policy
- default context

### 5. Reusable Skills

A skill is a versioned instruction bundle plus allowed tools, expected input/output and optional template. Example skills:

- Prepare weekly client report
- Turn meeting decisions into tasks
- Build project kickoff
- Review overdue invoices
- Prepare launch brief
- Analyze campaign status

### 6. AI output -> artifact

Every useful AI answer should be convertible into:

- Document
- Database
- Task list
- Project
- Report
- Dashboard

Chat should not be a dead end.

### 7. Citation model

Every answer grounded in workspace data should carry object-level source references so a user can open the exact document, task, record, file, meeting or external source supporting the statement.

---

## Phase 4 — Platform & Connectors — P1

**Goal:** allow Qanteak to become the control plane for other work software before trying to replace every external system.

### 1. Qanteak API

Versioned REST or GraphQL API with scoped tokens, workspace permission enforcement and rate limits.

### 2. Webhooks

Subscriptions for object/create/update/delete, automation runs, approvals, comments, files and membership events.

### 3. Connector SDK

Standard connector contract:

- authenticate
- list/search
- fetch object
- subscribe or sync
- map external IDs
- expose actions
- permission metadata
- source citations

### 4. MCP server

Expose safe Qanteak read/write tools to external AI clients. Use short-lived authorization, least privilege, audit logs and workspace permissions.

### 5. MCP client

Allow Qanteak Agent to use approved MCP servers as external tools.

### Connector order

1. Gmail / Outlook
2. Google Calendar / Outlook Calendar
3. Google Drive / OneDrive / SharePoint
4. GitHub
5. Slack / Microsoft Teams
6. Jira / Linear
7. Figma
8. Salesforce / HubSpot class CRM tools
9. Support systems such as Zendesk

Build the connector framework first; add credentials/providers incrementally.

---

## Phase 5 — Specialist Intelligence — P2

These features can be architected now, but production usage may require paid model/transcription/provider capacity.

### Qanteak Researcher

- Multi-step research plan
- Workspace + connector + web sources
- Source citations
- comparison tables
- synthesized report
- save directly as a Qanteak report/document

### Qanteak Analyst

- CSV/XLSX/database input
- deterministic calculation layer
- Python/SQL execution sandbox later
- charts and tables
- anomaly detection
- explain drivers
- export report/dashboard

### Qanteak Meeting Intelligence

- record/transcribe with consent controls
- speakers
- summary
- decisions
- unresolved questions
- action items
- automatically create tasks after confirmation
- link the meeting to projects/clients/goals

### Qanteak People Intelligence

- directory
- roles and skills
- project history
- collaborators
- ownership knowledge
- “who knows about X?” search

### Enterprise Search

Search and answer across Qanteak + approved connectors + optionally web. Support source selection and strict permission filtering.

---

## Phase 6 — Enterprise Agent Platform — P2/P3

### Agent Builder

Non-developers can configure:

- name/purpose
- instructions
- context sources
- tools
- trigger
- confirmation policy
- allowed users/teams
- output destination
- schedule

### Governance

- complete agent/action audit trail
- tool allow/deny list
- model allow list
- data-source allow list
- approval policies
- retention controls
- usage budgets
- per-agent limits

### Agent catalog

Internal library for installing and sharing approved agents/skills/templates.

### Computer Use — later

Use only where no API exists. Requires a hardened isolated execution environment, explicit confirmation for sensitive steps, credential isolation, screenshot/action auditing and strong domain/app policy controls.

---

# Immediate no-paid-service backlog

Build in this order:

1. Typed database property engine.
2. Universal object/schema registry.
3. Relations.
4. Rollups.
5. Formula parser/runtime.
6. Saved filters, sorts and grouping.
7. Timeline/List/Gallery database views.
8. Forms -> database records.
9. Chart blocks + dashboard composer.
10. Generic internal event bus.
11. Automation trigger/condition/action runtime.
12. Recurring automation scheduler.
13. Approval workflow object.
14. Webhook actions + run history.
15. Context Spaces / Qanteak Notebooks.
16. Agent instructions.
17. Reusable Skills.
18. AI plan/action approval queue.
19. Internal source-citation model.
20. Permission-aware object graph/search index.
21. Public API.
22. Webhooks API.
23. Connector SDK.
24. MCP server.
25. MCP client framework.
26. Comments, mentions and activity threads.
27. Import/export framework for CSV/JSON/Markdown.
28. Admin audit log and AI governance controls.

---

# Paid / credential-gated work to defer

Do not block core development on these:

- Trusted Windows code-signing certificate.
- High-volume production LLM usage.
- Premium AI model routing.
- Production speech/transcription capacity if local transcription is insufficient.
- Transactional email provider at production scale.
- OAuth production registrations and commercial API quotas for some external connectors.
- Enterprise identity integrations that require customer IdP configuration.

The interfaces, permission model and connector contracts for these should still be built before credentials are purchased.

---

# Qanteak differentiation

Qanteak should beat “Notion + Copilot glued together” by making business objects native rather than generic pages only.

A single project can natively connect:

- client
- tasks
- documents
- files and versions
- reviews
- meetings
- goals
- invoices and estimates
- expenses
- automations
- people
- database records
- external connector objects

The AI then reasons over that exact graph. Financial totals remain deterministic code, permissions remain enforced by Qanteak, and every material AI action is auditable and confirmation-gated according to policy.

That is the architectural advantage to preserve while closing the Notion and Copilot gaps.

---

## Official research sources

Notion: Enterprise Search, Notion Agent, Notion AI Connectors, Research Mode, AI Meeting Notes, Notion MCP, database properties/views/forms/automations and Notion AI documentation.

Microsoft: Microsoft Copilot Notebooks, Copilot Pages/Loop comparison, Researcher, Analyst/agent experiences, Copilot Connectors, Work IQ and Copilot Studio computer-use documentation.
