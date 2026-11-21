# Dealer role × action permission matrix

**No role was added and no permission was widened in this implementation.** The matrix below is the verified result of the earlier audit (real HTTP, 32 operations × 9 actors, run against the pre-change build). The changes made since then affect it only as follows, each re-verified in journeys 09 and 10:

* `PATCH /api/dealer/cars/:id/mark-sold` and `/cars/bulk-status` remain **owner-only** (staff are refused); the new lifecycle function records the real actor (`dealer_owner` / `dealer_staff`) so that a future decision to let managers mark sold needs no schema change.
* `GET/PUT /api/dealer/settlement` (banking): owner only. Journey 10 re-verified that manager, finance_officer, sales_agent, lot_agent and viewer are all refused (read and write) and that nothing changes.
* Editing, photo changes and removal of a **sold** listing are refused for everyone below administrator level.

Contradictions found by the audit that are **not** resolved here because they need an owner policy decision (details and consequences in OPEN-ISSUES): DA-11 sales / lot agents get 403 on the dashboard they land on; DA-12 viewer has no read access; DA-13 manager cannot mark sold; DA-14 finance officer cannot see earnings or escrows.

---


Method: every cell is a real HTTP call to the running backend on a disposable loopback database, run as that actor. Staff joined through the real invite and accept endpoints (the invitation e-mail is not delivered in this environment, so a known token hash was installed on the row; a disposable-DB shortcut). Mutation probes use a non-existent id so a **404** (or **403n** = "not owned by this dealer") means the permission layer let the caller through and the record was simply absent, whereas **403** means denied by permission and **401** means unauthenticated. `*` = first run hit the deliberate per-user write limiter (429, a control, not weakened); the cell was re-run after the window (`evidence/dealer-matrix-429-recheck.mjs`).

Role definitions come from `backend/services/dealerTeamRoles.service.js` and are not modified. **There is no "administrator" or "inspection/operations staff" role in the product; none was invented.** Platform admin accounts were not part of this matrix.

| Operation | Owner | Manager | Sales agent | Lot agent | Finance officer | Viewer | Outsider (personal) | Other dealer | Anonymous |
|---|---|---|---|---|---|---|---|---|---|
| GET dashboard | 200 | 200 | 403 | 403 | 200 | 403 | 403 | 200 | 401 |
| GET inventory | 200 | 200 | 200 | 200 | 403 | 403 | 403 | 200 | 401 |
| POST inventory (create) | 201 | 201 | 201 | 201 | 403 | 403 | 403 | 201 | 401 |
| PUT inventory/:id | 404 | 404 | 404 | 404* | 403 | 403 | 403 | 404 | 401 |
| DELETE inventory/:id | 404* | 404* | 403 | 403 | 403 | 403 | 403 | 404 | 401 |
| POST inventory/bulk | 403n* | 403n* | 403n* | 403n* | 403 | 403 | 403 | 403 | 401 |
| GET leads | 200 | 200 | 200 | 403 | 403 | 403 | 403 | 200 | 401 |
| PUT leads/:id | 404 | 404 | 404 | 403 | 403 | 403 | 403 | 404 | 401 |
| GET customers | 200 | 200 | 200 | 403 | 403 | 403 | 403 | 200 | 401 |
| GET pipeline | 200 | 200 | 200 | 403 | 403 | 403 | 403 | 200 | 401 |
| GET analytics | 200 | 200 | 403 | 403 | 200 | 403 | 403 | 200 | 401 |
| GET marketing | 200 | 403 | 403 | 403 | 403 | 403 | 403 | 200 | 401 |
| GET team | 200 | 403 | 403 | 403 | 403 | 403 | 403 | 200 | 401 |
| POST team/invite | 201 | 403 | 403 | 403 | 403 | 403 | 403 | 201 | 401 |
| PUT team/:id | 404* | 403 | 403 | 403 | 403 | 403 | 403 | 404 | 401 |
| DELETE team/:id | 404 | 403 | 403 | 403 | 403 | 403 | 403 | 404 | 401 |
| GET team/roles | 200 | 403 | 403 | 403 | 403 | 403 | 403 | 200 | 401 |
| GET subscription | 200 | 403 | 403 | 403 | 403 | 403 | 403 | 200 | 401 |
| GET auctions | 200 | 200 | 200 | 200 | 403 | 403 | 403 | 200 | 401 |
| GET inspections | 200 | 200 | 200 | 200 | 403 | 403 | 403 | 200 | 401 |
| GET finance | 200 | 403 | 403 | 403 | 403 | 403 | 403 | 200 | 401 |
| GET reputation | 200 | 403 | 403 | 403 | 403 | 403 | 403 | 200 | 401 |
| GET dealer/settlement (banking) | 200 | 403 | 403 | 403 | 403 | 403 | 403 | 200 | 401 |
| PUT dealer/settlement (banking) | 200 | 403 | 403 | 403 | 403 | 403 | 403 | 200 | 401 |
| GET dealer/earnings | 200 | 403 | 403 | 403 | 403 | 403 | 403 | 200 | 401 |
| GET dealer/escrows | 200 | 403 | 403 | 403 | 403 | 403 | 403 | 200 | 401 |
| POST dealer/payouts/:id/initiate | 404 | 403 | 403 | 403 | 403 | 403 | 403 | 404 | 401 |
| PATCH dealer/cars/:id/mark-sold | 404 | 403 | 403 | 403 | 403 | 403 | 403 | 404 | 401 |
| POST dealer/cars/:id/auction/start | 404 | 403 | 403 | 403 | 403 | 403 | 403 | 404 | 401 |
| PUT dealer/profile | 200 | 403 | 403 | 403 | 403 | 403 | 403 | 200 | 401 |
| GET dealer/team (legacy route set) | 200 | 403 | 403 | 403 | 403 | 403 | 403 | 200 | 401 |
| POST dealer/team/invite (legacy route set) | 410 | 403 | 403 | 403 | 403 | 403 | 403 | 410 | 401 |

## Observations (all VERIFIED by the calls above)
1. **Business scoping holds.** The other dealer and the outsider cannot reach another business's data. On a real listing, the other dealer got 403 on edit, delete, photo upload and `/api/cars` PUT, and 404 on mark-sold; the price was unchanged. Sales staff edited their own business's listing (200); viewer and outsider got 403.
2. **Server enforces permissions independently of the UI.** Every denial above is a server response, not a hidden button.
3. **Viewer is effectively a no-access role.** Described as "Read-only; no actions", it receives 403 on every read (dashboard, inventory, leads, customers). Description and behaviour disagree. (Defect DA-12.)
4. **Sales and lot agents cannot open the dashboard** (403: it requires the earnings permission), though they can list inventory. The UI's default landing section is Overview. (DA-11.)
5. **Manager cannot mark a vehicle sold or use `/api/dealer/*` endpoints** (403), although the role holds edit permission. Only the owner can mark sold. May be intentional; needs an owner decision. (DA-13.)
6. **Finance officer** sees dashboard and analytics but not earnings, escrows, finance or settlement (403). Role text says "sees earnings". (DA-14.)
7. **Banking (`/api/dealer/settlement`) is owner-only**; all staff roles got 403. Good.
8. **Legacy route set:** `POST /api/dealer/team/invite` returns 410 (deprecated) while `GET /api/dealer/team` still returns 200 for the owner; the live team API is `/api/dealer-platform/team*`. (Duplicate register.)
9. Anonymous = 401 on every route.
