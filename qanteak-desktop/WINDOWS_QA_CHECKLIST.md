# Qanteak OS RC9 V0.13 — Windows QA checklist

Test on at least one clean Windows 11 PC and, before public beta, one Windows 10 PC.

1. Install from a clean machine and verify expected Smart App Control/SmartScreen behavior for the current signing state.
2. Launch, sign in, sign out, relaunch, and verify signed-out workspace data is never shown.
3. Create an account, open the confirmation email, verify Qanteak opens through `qanteak://auth/confirmed`.
4. Request password reset, open the email, set a new password, and sign in with it.
5. Verify inactive subscriptions cannot load a workspace and internal QA/active subscriptions can.
6. Create/revoke an invitation. Accept the invite from the invited account and verify workspace access.
7. Open the same workspace on two PCs; edit on one and verify the other receives the cloud revision.
8. Trigger simultaneous edits and verify revision conflicts do not silently overwrite the newer cloud snapshot.
9. When Drive OAuth is configured: upload/download/delete small and large files, retry after network interruption, and verify permissions.
10. Update an installed V0.12 build to V0.13 using the in-app updater; test interrupted download and restart.
11. Export diagnostics from Settings > Security & privacy and confirm the log contains no secrets or passwords.
12. Uninstall/reinstall and verify no installer file-lock loop.
