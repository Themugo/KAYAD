# Phase 5 Batch 01 — Approval and Plan

**Decision: BLOCKED — BASELINE RECONCILIATION REQUIRED**

## Foundation
The required Phase 4 archive SHA-256 matches: `0e288bbc12b4f2ad8fd54469fc9f91755875d4a2f24b9880d8558458fc97b754`. ZIP integrity passed. The embedded baseline accounting does not reconcile with the archive's actual entry count.

## Candidate-specific decision
No relocation is approved in this batch. No candidate should be moved while the Phase 4 inventory, hash-manifest and summary counts conflict. This is an evidence integrity blocker, not blanket approval for a later move.

## Required resolution
1. Reconcile the actual Phase 4 ZIP entry list with the Phase 4 baseline inventory and hash manifest.
2. Identify whether the 6,277-entry claim, the 6,760-row inventory, and the actual 6775-entry ZIP represent different counting scopes or an undocumented addition.
3. Reconcile missing/unexpected paths and every hash discrepancy.
4. Re-run the candidate-specific reference, consumer, provenance and destination audit after the baseline is trusted.
5. Obtain explicit approval for any candidate requiring it.

## Change scope
Files moved: 0. Reference updates: 0. Application/source/configuration edits: 0. No snapshot was required because no file was changed. The exact Phase 4 ZIP remains the recovery point.
