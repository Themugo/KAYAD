# 05 - Dashboard state coverage

Baseline matrix (dealer 15 sections, personal 12 sections; probe with forced 500, 403 and slow responses against the real backend): `docs/handover/BRAND-ADMIN-CONSOLIDATION-20261122/03-STATE-COVERAGE-MATRIX.md` and its `evidence/states-*.json`. Not re-run in this phase on the final code: the probe harness is in `/tmp/audit` (scratch) and was not rebuilt. Those results are therefore carried forward, labelled below.

## This phase
| State | Dealer | Personal | Admin | Status |
|---|---|---|---|---|
| Loading, empty, success | covered | covered | covered | VERIFIED earlier (probe), unchanged |
| Network/server error with working retry | covered | covered | admin reports show a dash, never zero | VERIFIED earlier |
| **Permission denied (403) distinct from 500** | Overview: dedicated message, no retry button. Leads, inventory, customers, team, reputation, campaigns: dedicated message (retry button still shown by those sections) | already distinct | route guards | **IMPLEMENTED AND VERIFIED by unit tests** (`DealerSectionContracts.test.tsx`: 13 tests; all 19 dealer test files, 128 tests pass). Banking, settings, profile panels still generic: NOT IMPLEMENTED |
| **Expired auth (401)** | Overview: "session has expired" message, no retry | session handling in the shared client | shared | IMPLEMENTED AND VERIFIED (overview only) |
| Retry clears the obsolete banner | verified per banner earlier | same | n/a | VERIFIED earlier |
| Partial data | personal Activity (per-source Unavailable) | | | VERIFIED earlier |
| Stale data | only where the page keeps old values on a failed refresh | | | LIMITATION: no systematic stale indicator; NOT IMPLEMENTED |
| Duplicate retry buttons | header Refresh vs banner Retry on multi-card pages | | | OBSERVATION: each banner retry works; a single "Retry all" is NOT IMPLEMENTED |

Closes DEF-02 for the overview and the six list sections; remaining dealer panels (banking, settings) keep the generic message and are tracked in doc 18.
