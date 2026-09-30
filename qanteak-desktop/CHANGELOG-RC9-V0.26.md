# Qanteak OS RC9 V0.26 — Editing recovery

This update focuses on everyday editing reliability so document work is harder to lose and safer to recover after an accidental close, renderer refresh or interrupted session.

## Added
- Local document draft recovery for shared Knowledge documents.
- Automatic local draft snapshots while editing, without silently overwriting the cloud record.
- Recovery prompt when a newer local draft exists for the same document.
- Explicit restore and discard controls for recovered drafts.
- Document-level structural Undo and Redo controls for block edits, additions, removals and template insertion.
- Unsaved-change status, local-save status and save-to-workspace status inside the document editor.
- Exit protection while an edited document still has unsaved local changes.
- Seven-day expiry for stale recovery drafts so old editor state does not accumulate forever.
- Dedicated V0.26 reliability model tests for draft keys, block normalization, draft age validation, deduplication and history bounds.

## Reliability behavior
- Cloud writes still happen only through the existing explicit **Save document** action.
- Local recovery data never bypasses the existing shared-document version/conflict API.
- A failed cloud save leaves the editor and its local recovery draft intact.
- A successful save clears the matching local recovery draft when the dialog closes.
- Canceling or closing an edited document preserves the local draft for recovery.
- Native textarea undo remains untouched; Qanteak's document Undo/Redo handles structural block changes outside active text inputs.

## Why this is next
The product review identified editing reliability as a P1 gap. V0.24 already introduced versioned cloud records and block-level conflict handling; V0.26 adds the missing user-facing recovery layer so interrupted edits are recoverable without weakening the existing conflict model.

## QA gates
- V0.26 source files are required by preflight.
- V0.26 renderer modules are syntax checked.
- Reliability model tests run as part of the normal build.
- Existing interaction, renderer startup, reliability, workspace, module and sync tests remain in the build chain.

## External gates unchanged
- Windows Authenticode signing still requires signing credentials.
- Live third-party OAuth connectors still require provider credentials.
- Production hosted AI capacity remains service-dependent.
