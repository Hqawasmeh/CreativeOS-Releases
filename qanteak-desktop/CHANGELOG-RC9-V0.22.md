# Qanteak OS RC9 V0.22 — A clearer place to work

- Redesigned desktop shell and shared surfaces: quieter light/dark themes, AV Estiana headings, readable text, consistent buttons, tables, boards, editors and dialogs.
- New Home organized around open tasks, active projects, the calendar and direct next actions. Greetings reflect the time of day; empty workspaces get useful starting points.
- Search and filter tasks by open, completed, due today or overdue.
- Studio starts with databases, workflows and knowledge. Local-only storage is clearly identified and export is easy to find.
- Bundled fonts and Flaticon interface icons keep the interface readable offline.
- Better keyboard access for cards, command search and dialogs, with visible focus and reduced-motion support.
- Damaged Studio data is preserved. A last valid backup is recovered when available; otherwise writes stop instead of replacing work with an empty file.
- External test subscriptions and expired periods cannot grant desktop access. Explicit internal QA access remains supported.
- Direct MCP writes respect the configured create permission and are blocked when write approval is required.
- Installed version labels and Windows artifact verification now follow the current package version.

This is an RC prerelease. The existing app identity, cloud workspace storage and V0.21 local storage filenames are retained for in-place updates. Live payment activation, cloud synchronization of Studio data and credential-dependent integrations are separate follow-up work documented in PRODUCT-REVIEW-V022.md. Windows signing remains subject to the existing certificate configuration.
