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
- Earlier deployed synthetic preview exercised CRM create/edit, whiteboard persistence, and knowledge templates/history. Wide-board overflow discovered there is corrected in source. Latest V24 browser/mobile visual pass remains pending publication of an isolated preview or local preview access.

## Live incident
The REST API initially returned HTTP 503 / PGRST002 for workspace reads and collaboration requests. Direct database tests passed. Schema/config reload notifications and notification-queue checks were performed. A temporary authenticator timeout diagnostic made no improvement and was reverted to its original eight seconds. The API subsequently recovered after reloads and the redundant snapshot guard. The exact provider-internal cache failure cause was not established; do not claim the desktop patch alone repairs provider outages.

Authenticated live HTTP acceptance then passed: reminder create, duplicate retry (one row), read, snooze, complete and delete. A temporary synthetic auth account and workspace were used and removed afterward. No customer records were deleted or replaced.

Reminder request deduplication has been applied to the database. Identical core snapshot submissions now return the existing revision without emitting redundant updates. The desktop echo-write fix is included in V24.

## Release gates still open
1. Live PostgREST reminder acceptance: PASSED.
2. Review final desktop and narrow-screen preview; browser sign-in and auth redirect allowlist; private media upload/download and real-device recording.
3. Exercise workspace AI against the configured provider using a permitted test account; SQL context isolation alone is not provider end-to-end validation.
4. Trigger the Windows workflow only after gates pass, verify installer/blockmap/latest.yml, then test an installed-client update. RELEASE_REQUEST deliberately remains at V23.

## Known boundaries
- Knowledge uses block-level optimistic merging and realtime refresh, not CRDT/cursors. Studio remains a shared versioned snapshot available to full-access members; core entities still use the legacy snapshot system.
- Module lists cap at 1,000 items. Large-workspace server pagination/search needs the next iteration.
- Public portal links grant access to selected content; entered guest names/emails are unverified. No client can browse the full workspace through this endpoint.
- CSV migration supports the defined module fields; native Notion/Slack imports and attachment-rich migration are not implemented.
- Browser workspace is responsive; there is no native mobile app or reliable closed-app alarm/push delivery.
- Screen/voice clips have a 10 MB cap. Provider integrations and automation branching/retries remain limited.
- Existing Supabase advisory warnings concerning legacy public security-definer functions, pg_net placement and password protection predate V24. RPC-only V24 tables intentionally have no direct-access policies and revoked grants.
- Installer is not yet Authenticode-signed.
