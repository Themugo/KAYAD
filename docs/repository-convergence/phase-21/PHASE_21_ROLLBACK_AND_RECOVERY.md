# Phase 21 Rollback and Recovery

The immutable Phase 19 checkpoint remains the primary recovery source. Phase 20 remains unchanged and can recover the exact pre-Phase-21 tree. To reverse the only pre-existing-path operation in Phase 21, move `docs/history/legacy-root-evidence/general-project-evidence/TOPLINE_FLOORING_ARCHITECTURE_BASELINE.md` back to `docs/ARCHITECTURE.md` after confirming the destination is absent; verify SHA-256 against the operation ledger. Do not overlay an archive onto a live checkout.
