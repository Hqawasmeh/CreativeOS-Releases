# Qanteak OS RC9 V0.1 auto-update

RC9 V0.1 now uses the same proven publishing pattern as the original RC9 launch-prep folder.

The key difference is that publishing does **not** use `electron-builder --publish always` and does not ask the user to paste a `GH_TOKEN`. The original RC9 publisher used the authenticated GitHub CLI session stored in the Windows keyring, built the installer locally exactly once, verified the generated artifacts, and then uploaded those verified artifacts with `gh release create`.

## Release identity

- User-facing name: **Qanteak OS RC9 V0.1**
- Machine/update version: `1.0.0-rc.9.1`
- GitHub release tag: `v1.0.0-rc.9.1`

Required release assets:

- `latest.yml`
- `QanteakOS-Setup-1.0.0-rc.9.1.exe`
- `QanteakOS-Setup-1.0.0-rc.9.1.exe.blockmap`

## Proven RC9 publisher flow

1. Read the version from `package.json`.
2. Require Node.js, npm, and GitHub CLI (`gh.exe`).
3. Verify the existing GitHub CLI login with `gh auth status --hostname github.com`.
4. Verify access to `Hqawasmeh/CreativeOS-Releases`.
5. Refuse to overwrite an existing version tag.
6. Install dependencies.
7. Validate/build the application.
8. Run signing preflight.
9. Build the Windows NSIS installer **once** with `electron-builder --publish never`.
10. Verify `latest.yml`, SHA512, installer size, and `.blockmap`.
11. Check Authenticode status; signing is mandatory only when release policy explicitly requires it.
12. Create the GitHub prerelease and upload the already-verified files using `gh release create`.

If Windows has lost the existing GitHub CLI login, run `gh auth login` once. Normal Qanteak publishing should not prompt for a Personal Access Token.

This mirrors the method used by the original RC9 `PUBLISH_UPDATE.cmd` and its successful publisher log.