# Qanteak OS RC9 V0.15

Creation reliability and invitation delivery hotfix.

- Fixed task, review, project, invoice and other create forms so submit always commits immediately to the active workspace UI.
- Workspace mutations now automatically schedule cloud synchronization.
- Added a capture-phase creation safety handler to prevent modal submit binding regressions.
- Invitation email endpoint now acknowledges secure invitations quickly while email delivery continues separately.
- Invite flow recovers from timeout by reusing an already-created pending invite or creating a secure-link fallback.

Version: `1.0.0-rc.9.15`
Tag: `v1.0.0-rc.9.15`
