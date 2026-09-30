# Qanteak OS RC9 V0.25 — Operations expansion

This development update deepens Qanteak's connected operating-system workflow without adding paid external services.

## Added
- Project timeline view with start/due ranges, milestones and existing dependency support.
- Project templates remain connected to project/task creation and are part of the V0.25 operating workflow.
- CRM pipeline and client portals remain first-class shared workspace apps.
- Time tracking with billable/non-billable hours, rates, client/project context and billable-value summaries.
- Custom dashboard records plus a live workspace pulse for open tasks, active projects, pipeline, tracked time and outstanding invoices.
- Cross-record relations on shared workspace records.
- Connected rollups for related-item count, open work, tracked hours and billable value.
- Multi-step Qanteak AI planning: generate a supported action plan, review it, and apply safe internal create-task/create-project/create-document actions only after confirmation.
- Quick Capture for tasks, notes, projects, clients and time entries.
- Persisted fix for the V0.24 modules inbox alias ambiguity that produced `column reference "r.id" is ambiguous`.

## Safety / behavior
- AI plans do not execute until the user explicitly confirms the reviewed plan.
- AI plan execution remains limited to safe internal creation actions.
- Existing permissions continue to gate project/client/module writes.
- Existing record version history and archive flows remain intact.

## Development status
V0.25 is a development branch update. It is not a public release until QA passes and the release is explicitly approved.

- Preflight gate updated for the V0.25 package/version contract.
