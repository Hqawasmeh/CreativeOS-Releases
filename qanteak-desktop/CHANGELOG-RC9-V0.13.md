# Qanteak OS RC9 V0.13

RC9 V0.13 is a production-foundation release focused on account lifecycle, collaboration, recovery, diagnostics, cloud files and scale-readiness.

## Implemented

- Email confirmation now redirects to the `qanteak://` desktop protocol and the app handles confirmation links.
- Password recovery flow: request reset email, deep-link recovery handling, and secure password update.
- Secure workspace invitation foundation: manager-only invite creation/revocation, 7-day email-bound tokens, and in-app invite acceptance.
- Realtime workspace subscription for snapshot and workspace-event changes.
- Optimistic concurrency on workspace snapshots with revision conflict detection and merge/retry behavior.
- Normalized production tables for clients, projects, tasks and documents, with RLS, while retaining snapshot compatibility during migration.
- Snapshot writes mirror key collections into the normalized tables as a gradual data-architecture migration.
- Crash/error diagnostics stored locally with user-controlled diagnostic export.
- Google Drive Files UX: refresh, file sizes, per-file upload progress, download and delete controls.
- First-run clean-workspace onboarding without demo-data seeding.
- Stronger renderer CSP and continued Electron sandbox/context isolation.
- Automatic update UX and Windows QA documentation/preflight expanded for the V0.13 release path.

## External setup still required

- Google OAuth client ID/secret/refresh token must be configured as Supabase Edge Function secrets before Drive binaries are fully live.
- Automated invitation email delivery is not connected yet; V0.13 creates secure invite links that can be sent manually.
- Windows Authenticode code signing still requires the real Qanteak certificate/credentials.
- Leaked-password protection must be enabled in the Supabase Auth project settings.

## Release

Version: `1.0.0-rc.9.13`
Tag: `v1.0.0-rc.9.13`
