# Qanteak backend — RC9 V0.13

Supabase remains the authority for authentication, subscriptions, workspace membership, row-level security, collaboration metadata and normalized business data. Google Drive is the binary file store and is accessed only through the `qanteak-drive` Edge Function.

V0.13 adds secure invitation RPCs, revision-controlled snapshot writes, Realtime workspace events, and normalized `q_clients`, `q_projects`, `q_tasks`, and `q_documents` tables. Snapshot sync remains the compatibility read path while writes also mirror core entities into normalized tables.

Never place a Supabase service-role key, Google OAuth client secret or Google refresh token in the desktop source or publisher ZIP.
