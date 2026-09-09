# RC9 V0.13 database changes

The production Supabase project already received the V0.13 collaboration/data migrations during development.

Applied migration names:
- `rc9_v013_collaboration_and_normalized_foundation`
- `rc9_v013_editor_write_permissions`

These changes add the normalized core tables, workspace event stream, Realtime publication, secure invite RPCs, revision-controlled snapshot writes, and editor-vs-viewer write enforcement. The live database is the source of truth for the exact migration history.
