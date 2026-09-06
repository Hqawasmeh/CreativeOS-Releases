# Qanteak OS RC9 V0.1 auto-update

RC9 V0.1 remains part of the RC9 release family. For Electron/electron-updater ordering, the package version is `1.0.0-rc.9.1` while the user-facing release name remains **RC9 V0.1**.

## Release assets

A finished Windows build must publish all three artifacts to the GitHub release tag `v1.0.0-rc.9.1`:

- `latest.yml`
- `QanteakOS-Setup-1.0.0-rc.9.1.exe`
- `QanteakOS-Setup-1.0.0-rc.9.1.exe.blockmap`

This preserves the same update mechanism already used by the RC9 GitHub release.

## Publisher authentication

`PUBLISH_UPDATE.cmd` should reuse the GitHub sign-in already present on the Windows PC rather than asking the user to paste a token.

Credential discovery order:

1. an existing `GH_TOKEN` / `GITHUB_TOKEN`,
2. local `.env`,
3. the authenticated GitHub CLI session (`gh auth token`),
4. Git Credential Manager / GitHub Desktop credentials via `git credential fill`.

The recovered credential is process-local, is not printed, and is not written into the source tree. A brand-new PC may require one normal GitHub sign-in first, but normal Qanteak publishes should not require a manual PAT paste.

## Integration

1. Add `electron-updater` to the desktop application.
2. Use `electron-builder.yml` when packaging the Windows build.
3. Load `updater.js` from the Electron main process.
4. Call `check()` after the app is ready or from the Settings > Updates surface.
5. When an update is available, let the user start the download.
6. After `update-downloaded`, offer restart/install or allow installation on app quit.

## Required launch checks

Before publishing RC9 V0.1:

- Build the installer and blockmap with electron-builder.
- Verify generated `latest.yml` points to the exact RC9 V0.1 installer.
- Verify the SHA512 in `latest.yml` matches the installer.
- Verify the release contains all three required assets.
- Sign the installer/application when the Windows certificate is available.
- Test RC9 → RC9 V0.1 auto-update on a clean Windows machine.

The source package delivered for RC9 V0.1 should keep this folder together with the application source so auto-update configuration is not lost.
