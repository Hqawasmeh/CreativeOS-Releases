# Qanteak OS security and Windows signing

RC9 V0.9 adds the production security foundation, but a trusted Windows publisher certificate is still an external credential that must be acquired and configured locally.

For public production releases set `QANTEAK_REQUIRE_SIGNING=1` and configure either:

- `CSC_LINK` + `CSC_KEY_PASSWORD` for a PFX certificate, or
- `WIN_CSC_SUBJECT` / `CSC_NAME` when the certificate is installed in the Windows certificate store.

The publisher runs signing preflight before the single installer build and `VERIFY_WINDOWS_SIGNATURE.ps1` after packaging. With required signing enabled, the release stops unless Authenticode status is `Valid`.

Do not put certificate passwords, service-role keys, or GitHub tokens in `.env.example` or the publisher ZIP.
