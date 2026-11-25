# 08 — E2E test evidence (all on the DISPOSABLE stack unless stated)
## Automated results (this pass, after all changes)
| Suite | Result |
|---|---|
| Backend Jest — communications, regression, auction | 190 suites, 3,217 tests PASS |
| Backend Jest — all other directories | 73 suites PASS (1 skipped), 1,102 tests PASS, 21 skipped |
| Backend Vitest | 61 / 61 PASS |
| Backend node:test | 34 / 34 PASS |
| Frontend Vitest (full) | 239 of 240 files on first run; the one failure (generated dark-theme layer stale after new classes) was fixed by regenerating and re-run PASS; 2,095 tests passed in the full run |
| TypeScript typecheck / production build | PASS / PASS |
| Journey 20 registration + e-mail lifecycle | 54 PASS, 0 FAIL |
| Journey 36 first-dealer lifecycle | 23 PASS |
| Journey 37 storefront + isolation + notifications | 43 PASS |
| Journeys 07, 09, 17, 21, 32 | PASS |
| Journeys 22, 23, 29, 30 | PASS on fresh stacks (HTTP 429 when chained in one stack — harness artefact) |
| Browser `launch-storefront-bell.mjs` | 19 / 19 PASS |
Existing tests changed: `dealerApprovalWorkflow` (now pins exactly one dealer approval communication instead of the removed duplicate "Seller Account Approved" notice), `phase13dDealerIsolation` (mock gained the r2 `resetTeamRole` export), `dealerProfileAndTeamAuthorization` (fake response gained `set`; new storefront cases). No assertion was weakened; the pending-dealer behaviour is a deliberate, tested policy change.
## Journey coverage (brief section 10)
A buyer: register → verify → login → browse → vehicle → enquiry → dealer notified (20, 36, browser). B seller: API only (07, 30). C dealer: register → application → approval → profile + logo/banner → vehicle + photo → inventory → storefront (36, 37, browser). D staff: invite → accept → authorised/unauthorised → permission change → notice → suspend (17, 21, 22, 29, 37). E buyer→dealer: storefront → vehicle → enquiry → owner and permitted staff notified; **dealer reply visible to buyer** is covered by existing chat suites, not re-driven here. F isolation: A vs B on listings, leads, notifications, staff, profile (32, 37). G notification correctness (37 + browser bell).
## Browser evidence (`evidence/`)
Storefront at 320, 360, 390, 430, 768, 1024, 1440 px (name, verified badge, ≥6 vehicles, no horizontal scroll); settings storefront section at 1440 with real upload through the stub; buyer vehicle page at 390; dealer bell at 1440 and 390 (aria-label count equals database unread count; mark-all-read persists after reload). **Not browser-tested this pass:** registration form, e-mail verification screen, personal dashboard, vehicle creation form, inventory and staff screens at all widths, error states beyond storefront.
