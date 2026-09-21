# Qanteak OS RC9 V0.24 — Shared workspace apps

Adds a shared Workspace apps hub, unified inbox, connected Studio data, block-based knowledge pages, deeper chat, project planning, scoped client links and a browser workspace.

## Added
- Eighteen optional apps: project templates, client portals, CRM, content planning, brand library, goals, requests, support, equipment, bookings, onboarding, focus, whiteboards, knowledge, clips, public forms, workflows and project planning.
- Versioned cloud records, comments, private attachments, optimistic conflict checks and member permissions.
- Knowledge templates, per-block merge checks and recoverable version history. Updates refresh through realtime; same-block conflicting edits require review.
- Chat threads, attachments, mentions, search, author editing and linked message-to-task creation.
- AI retrieval across permitted records and conversations, source links, and explicit action previews.
- Dependencies, parent tasks, milestones, recurring task creation, workload totals and reusable project checklists.
- Expiring, revocable client links; selected deliverables and invoice summaries; guest feedback and public intake forms.
- Server-run record-created automation recipes with execution history; manual recipe previews.
- CSV import/export, JSON export, voice/screen clips and browser cloud file access.

## Reliability
- Reminder creation uses request IDs to prevent duplicate saves after retries. Failed saves preserve form input.
- Incoming core workspace snapshots no longer schedule echo writes; simultaneous snapshot pushes are serialized. Identical snapshots no longer create redundant revisions on the server.
- Improved narrow-screen layout for workspace apps and horizontal boards.

## Current scope
This is an initial implementation, not full parity with Notion, Slack or Copilot. Knowledge collaboration merges different blocks on save; it does not yet provide live cursors or character-level co-editing. Client portals use scoped bearer links and guest-supplied identities, not verified client accounts. Imports are generic CSV, not native Notion/Slack migrations. Native mobile apps, background push alarms, social publishing integrations, semantic retrieval, calendar provider synchronization and full automation branching remain follow-up work. Record lists currently load up to 1,000 records; chat pages are paginated. Attachments are limited to 10 MB. Clips require browser/OS media permission.

Windows installer signing remains a separate release prerequisite for a verified publisher identity. See V024-VERIFICATION.md for tested paths and open gates.
