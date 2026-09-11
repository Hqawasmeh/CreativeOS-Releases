# Qanteak OS RC9 V0.17

Emergency workspace recovery hotfix.

- Prevents a failed startup cloud pull from clearing the visible workspace.
- Prevents an empty boot state from being pushed over an existing cloud snapshot.
- Adds a per-workspace last-known-good local cache.
- Restores cached workspace data before attempting cloud hydration.
- Blocks cloud writes until a valid workspace snapshot has loaded.
- Merges queued local changes after reconnect before resuming sync.
- Keeps existing V0.16 UI/design changes unchanged.
