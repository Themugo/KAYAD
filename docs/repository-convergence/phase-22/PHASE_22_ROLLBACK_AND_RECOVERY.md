# Phase 22 Rollback and Recovery

Phase 21 is the immediate immutable recovery foundation; Phase 19 remains the long-term checkpoint. To reverse a move, first verify the destination hash in `PHASE_22_STRUCTURAL_OPERATION_LEDGER.csv`, confirm the original path is absent, then move the file back and verify the recorded original SHA-256. To reverse the runbook index change, restore the Phase 21 version of `runbooks/README.md`. Do not overlay a ZIP onto a live checkout. Phase 19, 20 and 21 archives were not modified.
