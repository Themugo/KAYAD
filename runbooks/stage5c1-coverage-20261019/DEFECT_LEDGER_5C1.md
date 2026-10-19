# Defect ledger — cumulative through Stage 5C.1

Stage 5C rows D5C-01…D5C-21 and O5C-01…12 are unchanged: see `runbooks/stage5c-onboarding-20261019/DEFECT_LEDGER_5C.md`. Stage 5C.1 additions:

## Fixed in 5C.1
| ID | Area | Defect | Fix | Proof |
|---|---|---|---|---|
| D5C1-01 | Release hygiene | 5C ZIP contained test residue (`backend/uploads/*.png` ×2, populated `backend/data/uploads.json`); not committed to Git | scrubbed; `uploads.json` restored to the certified 5B content; package guard refuses `backend/uploads/*` files and a non-baseline `uploads.json` | 5C.1 ZIP member check (certificate) |
| D5C1-02 | Uploads | multer disk files left behind when an upload request is rejected or fails (3 routes) | `cleanupUploadsOnError` (`middleware/upload.js`) wired in `carRoutes.js` ×2, `dealerPlatformRoutes.js` ×1 | before 98/6 → after 104/0 (`role_api_g`); jest `tests/stage5c1/uploadCleanup.test.js` 4/4 |
| D5C1-03 | Provenance | 5C report did not identify the certified 5B closure archive as the foundation, and described the pushed tree as byte-identical | `PROVENANCE_RECORD_5C1.md`; 5C report amended | provenance record |
| D5C1-04 | Reporting | "9 non-zero validators" counted the runner's `DONE` marker; actual 8 | corrected | `regression/validators_results.txt` |

## New observations (not defects; no authorization semantics changed — owner decision where noted)
| ID | Observation | Decision needed |
|---|---|---|
| O5C1-01 | `dealerOnly` admits `dealer` and `individual_seller` (and staff): each seller role can call the other's endpoints; all responses are caller-scoped (asserted in `role_api_i`) | owner: keep, or narrow per role |
| O5C1-02 | no dealer-onboarding document file upload in the SPA; `/api/upload` documents path is API-only | product decision |
| O5C1-03 | admin can read private uploads (existing policy) | owner: confirm |
| O5C1-04 | ordinary admin can edit/delete others' listings via MANAGE_CARS | owner: confirm (cf. D5C-A) |
| O5C1-05 | `GET /cars/:id` 404 for pending listings even to the owner | UX decision |
| O5C1-06 | dev-mode stack traces in 5xx; production shaping not exercised | verify on staging |
| O5C1-07 | recovery worker for failed background media uploads not located/triggered | engineering follow-up |
| O5C1-08 | socket periodic re-check (5 min) not waited on; join-time re-check proven | optional soak test |
| O5C1-09 | 5 files committed in `d9bfccfb` from the Windows tree were never reviewed (see provenance §3) | review before next release |
