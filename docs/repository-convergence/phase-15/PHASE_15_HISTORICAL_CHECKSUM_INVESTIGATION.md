# Phase 15 Historical Checksum Investigation

## Finding

**Outcome: `RESOLVED_WRONG_ARTIFACT_REFERENCE`.** The original Phase 12 archive is available and has now been independently verified. The earlier Phase 15 report incorrectly stated that the Phase 12 ZIP was unavailable; this supplemental reconciliation corrects that statement without altering historical Phase 12, Phase 13, or Phase 14 reports.

- **Phase 12 archive:** `KAYAD-REPOSITORY-CONVERGENCE-PHASE-12-STRUCTURAL-CERTIFICATION-20261022.zip`
- **Phase 12 size:** 84,114,539 bytes
- **Independently calculated Phase 12 SHA-256:** `5b60f88681eef57dfb70775535aa25917d7045adc560d45fca2a9ebe4933e302`
- **Phase 12 sidecar:** matches the independently calculated digest
- **Phase 12 ZIP integrity:** PASS
- **Phase 12 archive inventory:** 6,945 entries (6,457 files; 488 directory entries)
- **Phase 13 archive digest referenced by the conflicting later record:** `d2cdbf4eae9caefbc0be9e872ae768c757c35c0dc67db32eaa95c810a1a617cf`. This is the Phase 13 ZIP digest, not a competing Phase 12 digest.

The discrepancy is therefore a **wrong-artifact reference in the later summary/context**, not evidence of an integrity failure. The verified Phase 12 digest is `5b60f88681eef57dfb70775535aa25917d7045adc560d45fca2a9ebe4933e302`. No evidence establishes tampering or corruption.

## Methods

1. Independently calculated SHA-256 over the exact Phase 12 ZIP bytes.
2. Read and compared the Phase 12 `.zip.sha256` sidecar.
3. Ran ZIP integrity verification using the archive reader.
4. Recalculated the Phase 12 entry, file, and directory counts.
5. Independently verified that the Phase 13 digest belongs to the separately available Phase 13 ZIP.
6. Preserved the original conflicting claims in prior-phase evidence and added this supplemental finding in Phase 15.

## Historical preservation

No earlier report or sidecar was rewritten. The Phase 15 records are corrected additively to reflect the newly completed verification. The original source files remain preserved in the checkpoint.

## Conclusion

`5b60f88681eef57dfb70775535aa25917d7045adc560d45fca2a9ebe4933e302` is verified as the Phase 12 ZIP SHA-256. `d2cdbf4eae9caefbc0be9e872ae768c757c35c0dc67db32eaa95c810a1a617cf` is associated with the Phase 13 ZIP. The discrepancy arose from assigning the Phase 13 digest to the Phase 12 context in the later narrative. The Phase 12 checksum issue is closed based on the actual archive and matching sidecar now available.
