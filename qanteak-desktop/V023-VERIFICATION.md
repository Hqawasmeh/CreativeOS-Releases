# V0.23 verification and operating notes

## Verified before release

- Renderer module startup, source interaction gates, existing entitlement/recovery/MCP safeguards, and renderer packaging pass.
- Behavioral model tests cover task transitions, legacy name links and ID links in the graph, finance visibility filtering, saved coordinates, overnight work duration and recorded finance totals.
- Live database verification uses synthetic users and a synthetic workspace inside one rolled-back transaction. It checks active membership, cross-workspace rejection, participant-only chat, no direct table access, duplicate direct-chat and message prevention, one open shift, checkout, owner-only team attendance, personal reminders and layout isolation, and anonymous denial.
- Browser preview uses explicitly labeled synthetic data with no production calls. Confirmed Home check-in/out, task status changes, client filtering and keyboard node positioning, saving layout, group creation, message send, reminder creation and an actual due reminder/snooze interaction, finance rendering, and phone-width chat navigation/back controls. Node positions survived a page reload.
- Compact CSS supports a navigation drawer, horizontally scrolling task columns, single-conversation chat, stacked time cards and two-column finance metrics. Windows OS notification delivery and a physical installed-device update remain manual checks.

## Data and delivery boundaries

The six q23 tables use RLS with no direct API grants or policies: direct access is deliberately denied. The sole public entry point is a SECURITY INVOKER wrapper around a private, fixed-search-path function with explicit auth and active workspace/room membership checks on every operation. This intentional deny-all table design produces informational RLS-without-policy advisor notices. Existing advisor warnings on older functions, pg_net placement and password protection are outside this additive change. Reference: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

Chat refreshes every five seconds while Qanteak is running. Drafts survive navigation in the current session. The client keeps a request UUID on failed sends to avoid duplicate messages on retry. This release does not include calls or attachments.

Attendance uses server timestamps. Employees see their own last 100 shifts; owner/admin roles can inspect up to 2,000 entries from the last 31 days. There is no payroll calculation or attendance correction workflow in this release.

Reminders are personal cloud records. Desktop notifications and an in-app sound/alert are attempted while the app is running. Missed reminders appear after reopening; closed-app alarms and waking a sleeping computer are not implemented.

The map derives relationships from the existing workspace records (stable IDs when present, legacy names otherwise). Layout positions belong to the signed-in user and workspace. Moving a node changes only its position. It does not change project ownership or record relationships. Existing Studio databases retain their separate local-only storage.

The finance dashboard represents manually recorded invoices and expenses, not a bank balance. Draft/void/cancelled invoices are excluded from outstanding collections. Billing remains in PayPal Sandbox until separately configured for live operation.
