# Qanteak OS RC9 V0.19

Cloud recovery hotfix.

- Retries transient Supabase/PostgREST schema-cache failures with short backoff instead of failing immediately.
- Keeps the V0.17/V0.18 local workspace recovery safeguards and blocks cloud writes until a valid cloud snapshot has loaded.
- Preserves the V0.18 New creation popup and all V0.16 document/sheet/lifecycle changes.
- No design changes.
