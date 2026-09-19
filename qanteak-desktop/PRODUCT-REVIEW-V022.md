# Qanteak OS — product and engineering review

Date: 19 September 2026. Baseline: RC9 V0.21 (`1.0.0-rc.9.21`). Scope: desktop source, renderer layers, Electron bridges, local platform service, cloud boundaries, website billing, build scripts and GitHub release workflow. This is a source and interaction review; it is not a penetration test or a claim of production parity with Notion/Copilot.

## Product assessment

Qanteak brings project delivery, client relationships, documents, files and business operations into an authenticated desktop workspace. The most valuable everyday path is Home → priority task → project/client context → deliverable → invoice. That path should remain obvious while databases, agent configuration and developer tools remain available without dominating it.

The code contains two distinct data systems: the original cloud workspace snapshot and the V0.21 local universal platform. They do not share a cloud schema or permission model. A consistent appearance must not imply that local databases automatically sync to teammates. Hosted AI, Drive OAuth, connector implementations, signing and payment entitlements also have separate deployment dependencies.

## Evidence and priorities

| Area | Finding | Action |
| --- | --- | --- |
| Navigation | `src/app.js` and V0.20/V0.21 modules repeatedly replace renderer functions and add navigation. Workspace exposes seven technical tabs at the same level. | Simplify labels and overview, group advanced controls; retain existing data and routes. Follow with module consolidation. |
| Home | Final V0.13 home renderer shows seven panels, includes completed tasks in the upcoming list, calls counts “recent activity”, and always says good morning. | Replace with priority-led Home, real time greeting, open task ordering, meaningful empty states and direct actions. |
| Visual system | Three CSS layers mix tiny metadata, gradients, shadows and competing panel treatments. | One final V0.22 design layer for shell, forms, lists, tables, boards, editors, modals and platform pages; light/dark and compact windows. |
| Accessibility | Clickable cards and command results are generic elements; modal focus and keyboard navigation are incomplete. | Keyboard activation, focus visibility/trapping/restoration, dialog naming and descriptive action labels. |
| Reliability | `electron/platform.cjs:readState` overwrites unreadable state with defaults; renderer falls back to browser storage after bridge failures. | Preserve the damaged original, recover last valid backup when possible, otherwise stop writes and report the error. |
| Entitlements | `backend.cjs:getEntitlement` accepts active test-mode rows and ignores expiry. | Reject external test subscriptions and elapsed access periods; preserve explicit internal QA access. Website Sandbox uses separate tables. |
| API governance | Local MCP create tool bypasses configured tool allow-list and approval queue. | Reject direct MCP writes when approval is required or the tool is disabled; retain audit evidence for allowed writes. |
| Release identity | HTML says V0.20, Settings says V0.19, package says V0.21. | Generate one release metadata module from package version; preserve appId and user-data storage names. |
| Release pipeline | Existing Windows Actions workflow builds a single installer and verifies installer/blockmap/latest.yml before prerelease publication. | Reuse pipeline, bump to V0.22, trigger only after verification; do not replace published V0.21 files. |
| Testing | Interaction tests largely check source markers and ES-module smoke covers only app.js with a minimal DOM. | Add behavioral tests for recovery, entitlement and governance; exercise a synthetic UI fixture separately from packaged app. |
| Cloud/security | Supabase advisory reports pre-existing public SECURITY DEFINER functions; local universal data is device scoped. | Audit database function bodies and cross-account behavior before collaboration expansion. Do not change live roles speculatively. |

## V0.22 delivery roadmap

1. **Clarity and everyday usability:** redesign shell and every shared surface; replace Home; improve task browsing, empty states, and database overview. Use bundled AV Estiana headings and Flaticon interface icons, readable system body text, restrained blue accents and reduced-motion support.
2. **Trust and recovery:** non-destructive local storage recovery, explicit local-only platform labels, real installed version, accurate entitlement status and MCP write-policy enforcement.
3. **Verification and delivery:** run renderer/build checks and behavior tests, inspect the UI in light/dark and smaller windows, publish through the existing Windows RC channel and verify release assets.

## Follow-up roadmap

| Priority | Work | Completion criteria |
| --- | --- | --- |
| P0 before paid launch | Live PayPal lifecycle, refunds/reversals, failed payments, cancellations and plan changes | Verified signed events update production entitlements; duplicate/replayed events and cross-account requests are tested. Sandbox never unlocks paid access. |
| P0 before wider beta | Windows signing and installed-upgrade QA | Valid trusted publisher signature; real V0.21 → V0.22 install/restart tested on Windows with existing work preserved. |
| P1 | Renderer modularization | One owner per view and event handler; remove historical override chains; browser and Electron integration suite covers core CRUD. |
| P1 | Cloud graph migration | Versioned schema, tenant RLS, conflict handling, export/recovery and two-device collaboration tests for universal databases. |
| P1 | Permissions and security review | Review SECURITY DEFINER functions, IPC authorization, document HTML sanitization, connector/webhook destinations and least privilege. |
| P1 | Editing reliability | Autosave/conflict indicators for documents, keyboard grids and undo for reversible edits. |
| P2 | Real connector implementations | Start with one provider end-to-end: OAuth, refresh/revoke, permission-scoped reads/writes and visible failure/retry states. Catalog entries alone do not count. |
| P2 | Agent quality | Separate deterministic tools from model-backed reasoning; evaluate citations, action previews, failures and usage/cost limits. |
| P2 | Performance | Measure large workspace rendering and synchronization; virtualize large tables, paginate/search indexes and test crash recovery. |

External credential-dependent features are not considered delivered by this redesign. Release notes must distinguish verified behavior from manual Windows/buyer tests still outstanding.

Technical reference: [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security). Existing context isolation, sandboxing and nodeIntegration=false remain enabled.
