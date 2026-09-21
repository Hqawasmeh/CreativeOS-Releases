# V0.24 verification and release gate

Status: implementation prepared; live reminder API acceptance passed before release publication. Windows packaging and final visual acceptance are recorded below.

## Passed
- Renderer preflight and ES-module startup/link checks.
- Existing interaction, entitlement, persistence, API-authentication and workspace behavior suites.
- New model tests: CSV quoting/validation/formula escaping, monthly recurrence, dependency cycles, safe links, bounded goal progress.
- Incoming snapshot regression: remote data persists locally without scheduling an echo write.
- Transactional database tests with synthetic users and complete rollback: workspace isolation, role enforcement, explicit false permissions, optimistic record versions, history, private focus data, booking overlaps, chat room membership and editing ownership, expiring/revocable scoped shares, guest feedback, concurrent different-block merging and same-block conflicts, record-created automation.
- Reminder regression: repeating the same request creates exactly one reminder; personal reminder and attendance isolation remain enforced.
- Desktop and authenticated web builds complete locally.
- Earlier deployed synthetic preview exercised CRM create/edit, whiteboard persistence, and knowledge templates/history. Wide-board overflow discovered there is corrected in source. The final V24 preview confirmed no document overflow on wide boards, linked task import, and a readable 390px home layout. Browser signed-out startup and invalid client-link handling passed. A sign-in heading contrast issue found in screenshots was corrected.

## Live incident
The REST API initially returned HTTP 503 / PGRST002 for workspace reads and collaboration requests. Direct database tests passed. Schema/config reload notifications and notification-queue checks were performed. A temporary authenticator timeout diagnostic made no improvement and was reverted to its original eight seconds. The API subsequently recovered after reloads and the redundant snapshot guard. The exact provider-internal cache failure cause was not established; do not claim the desktop patch alone repairs provider outages.

Authenticated live HTTP acceptance then passed: reminder create, duplicate retry (one row), read, snooze, complete and delete. A temporary synthetic auth account and workspace were used and removed afterward. No customer records were deleted or replaced.

Reminder request deduplication has been applied to the database. Identical core snapshot submissions now return the existing revision without emitting redundant updates. The desktop echo-write fix is included in V24.

## Release gates still open
1. Live PostgREST reminder acceptance: PASSED.
2. Desktop/narrow-screen visual checks and browser startup: PASSED. Web sessions use the existing website storage key and existing account confirmation/recovery callback. Real-device media recording remains unverified.
3. Provider AI end-to-end and real-device media acceptance remain unverified; SQL authorization tests do not substitute for these checks.
4. Windows packaging and exact updater artifact verification are handled by the release workflow. A physical installed-client update remains a user-device acceptance check.

## Known boundaries
- Knowledge uses block-level optimistic merging and realtime refresh, not CRDT/cursors. Studio remains a shared versioned snapshot available to full-access members; core entities still use the legacy snapshot system.
- Module lists cap at 1,000 items. Large-workspace server pagination/search needs the next iteration.
- Public portal links grant access to selected content; entered guest names/emails are unverified. No client can browse the full workspace through this endpoint.
- CSV migration supports the defined module fields; native Notion/Slack imports and attachment-rich migration are not implemented.
- Browser workspace is responsive; there is no native mobile app or reliable closed-app alarm/push delivery.
- Screen/voice clips have a 10 MB cap. Provider integrations and automation branching/retries remain limited.
- Existing Supabase advisory warnings concerning legacy public security-definer functions, pg_net placement and password protection predate V24. RPC-only V24 tables intentionally have no direct-access policies and revoked grants.
- Installer is not yet Authenticode-signed.
