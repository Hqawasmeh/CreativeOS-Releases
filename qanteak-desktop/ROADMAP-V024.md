# Qanteak after V0.24

The immediate priority is reliability and coherent workflows across the new apps. V24 provides the first working layer for every requested area; it is not a completed replacement for mature document, communications and AI platforms.

| Priority | Work | Done when |
| --- | --- | --- |
| Release blocker | Restore database API schema cache and verify reminders | Authenticated create, retry without duplicates, snooze and complete pass through the actual API |
| Release blocker | Web and Windows acceptance | Phone/desktop screenshots, sign-in redirects, file/media permissions and auto-update verified |
| Next | Normalize core/Studio synchronization | Per-record cloud edits, durable outbox, conflict review, deletions and reconnection tested across two accounts/devices |
| Next | Production document collaboration | Character-level shared editing, presence, inline comments, reliable undo and restore under concurrent edits |
| Next | Chat completion | Room management, attachment preview, reliable unread counts, notification controls and message-to-task backlinks tested across two users |
| Next | Planning consistency | Atomic recurrence generation, core/planning bidirectional identity, subtasks and dependencies visible in every task view |
| Next | Client accounts | Verified client identities, per-client authorization, deliverable versions, approval audit trail and invoice payment handoff |
| Next | Search and scale | Permission-aware indexed search, paginated records, upload recovery and measured performance with realistic workspaces |
| Next | AI quality | Semantic retrieval, citation validation, provider cost limits and audited reversible actions; privacy preferences enforced |
| Later | Migration | Native Notion/Slack/CSV mapping, previews, resumable batches, deduplication and full export/restore |
| Later | Integrations | Google/Outlook calendar, email, external storage and content publishing through properly scoped OAuth |
| Later | Mobile and notifications | Focused mobile app/PWA, push delivery, accessible gestures and timezone-safe background reminders |
| Later | Automation depth | Conditions, branching, scheduled runs, idempotency, retries, failure inbox and connector credentials |
| Later | Operations | Backup restore drills, signed Windows builds, monitoring, staged rollouts and rollback |

Avoid expanding every app at the same time. Finish one complete path first: client inquiry → project → task → conversation → deliverable approval → invoice → reporting.
