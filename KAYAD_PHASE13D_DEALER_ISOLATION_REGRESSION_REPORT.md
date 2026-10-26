# KAYAD Phase 13D — Dealer Isolation Regression Report
Evidence tier for every row: **mocked local runtime** (real routers and middleware over HTTP, persistence mocked). File: `backend/tests/regression/phase13dDealerIsolation.test.js` (173 cases). Pristine code: 73 fail / 100 pass. Corrected code: 173 pass.

| Required scenario | Expected | Result before | Result after | Test location |
|---|---|---|---|---|
| Ordinary buyer requests dealer-only API | Denied | legacy router: denied (existing); dealer-platform: denied | Denied | A-legacy, A-platform |
| Pending private seller | Denied | legacy denied by `requireApproved`; **platform ALLOWED (defect)** | Denied | A-platform; legacy status-gate case |
| Approved private seller | Denied | **Allowed (defect)** | Denied (business routes) | A-legacy, A-platform |
| Suspended private seller | Denied | legacy denied; **platform ALLOWED** | Denied | same |
| Rejected / revoked-capability user | Denied | legacy denied; **platform ALLOWED** for rejected; role-`user` revoked denied | Denied | same |
| Dealer owner, permitted route | Allowed | Allowed | Allowed | `dealer owner keeps …` |
| Team member, permitted team route | Allowed | Allowed | Allowed | `organisation team routes` |
| Team member, owner-only operation | Denied | Denied | Denied | `team member cannot perform an owner-permission operation` |
| Unrelated dealer reads another dealer's listing-quality data | Denied | **Allowed (200)** | Denied (403, service not invoked) | Workstream B |
| Private seller reads another dealer's listing-quality data | Denied | **Allowed** | Denied | Workstream B |
| Authorized user reads own data | Allowed | Allowed | Allowed | Workstream B |
| Authorized recalculation, owned resource | Allowed | Allowed | Allowed | Workstream B |
| Recalculation by substituted ID | Denied | **Allowed** | Denied | Workstream B (incl. nonexistent id, query/body override) |
| Private seller starts a listing workflow | No dealer identity created | **Dealer row created** | No `Dealer.create`; request continues | Workstream C |
| Legitimate dealer onboarding | Preserved | — | Preserved (dealer without row still refused; trigger path untouched; verified/pending/suspended/rejected gating) | Workstream C + `onboardingFlow` suite |
| Existing verified dealer and inventory | Preserved | — | Preserved | Workstream C; dealer-owner route cases |
| Staff and administrator routes | Preserved | Allowed | Allowed (admin, marketing) on legacy, platform-guard and quality routes | `staff … keep` cases |

Additional preservation proofs: an approved private seller keeps `GET /api/dealer/cars`, `PATCH /api/dealer/cars/bulk-status`, `GET /api/dealer/earnings`; pending/suspended/rejected sellers stay refused on `/api/dealer/cars`; a private seller may read and recalculate **only their own** quality data.

Not covered by these tests (and so not claimed): real database behaviour, RLS, the production cookie/CSRF flow, Playwright, external clients.
