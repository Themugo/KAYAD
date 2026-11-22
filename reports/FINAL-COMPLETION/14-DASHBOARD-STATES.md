# 14 — Dashboard States (Banking, Settings, Profile)

**Implemented:** `src/utils/loadFailure.ts` classifies a failed request as `denied` (403), `expired` (401), `offline` (browser offline / network error), `unavailable` (5xx/429/408) or `error`. Retry is offered only when retrying can help.
| Surface | 403 | 401 | Offline | 5xx | Other | Status |
|---|---|---|---|---|---|---|
| Dealer Banking (load) | permission message, no retry | "session expired", no retry | offline message + retry | "temporarily unavailable" + retry | existing generic wording + retry | IMPLEMENTED, VERIFIED by unit tests |
| Dealer Settings (profile load) | same | same | same | same | existing wording | IMPLEMENTED; verified through existing `DealerSectionContracts` + classifier tests |
| Personal Profile (save) | server message | "session expired" | offline message | generic | generic | IMPLEMENTED; no dedicated UI test (NOT TESTED beyond typecheck) |
| Dealer overview and six list sections | dedicated 403 copy (previous phase) | overview only | n/a | generic | | unchanged |

Tests: `src/__tests__/pages/dealer/PanelLoadStates.test.tsx` (classifier cases + 4 Banking states); existing Banking/Settings/Section tests still pass with unchanged wording. Frontend subset run after the change: 170 files / 1,458 tests passed; `tsc --noEmit` clean.
Not done: stale-data indicator, "Retry all", dealer Settings/Profile save-time offline states, personal dashboard sections other than Profile.
