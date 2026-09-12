# Qanteak OS RC9 V0.20

AI agent foundation development release.

## Added
- Ask / Do / Watch modes in Qanteak AI.
- Authenticated server-side AI endpoint; model credentials are never bundled in the desktop app.
- Workspace-aware conversation context across projects, tasks, clients, files, reviews, documents and deterministic business totals.
- Multi-turn conversation context.
- AI plans and confirmation cards for safe workspace actions.
- Initial tools: create/update task, create project, create document, draft invoice, reminder and automation.
- Permission checks and mandatory confirmation for all AI writes in this release.
- Deterministic financial totals remain calculated by Qanteak code, not the language model.

## Not enabled yet
- Sending emails or invoices.
- Destructive file/project actions.
- Payments or refunds.
- Fully autonomous background agents.
- Server-side retrieval over normalized records; V0.20 sends a compact authenticated workspace context packet.
