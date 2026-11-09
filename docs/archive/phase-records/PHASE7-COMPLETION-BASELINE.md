# Super Admin Polishing — Phase 7 Baseline

**Phase:** Operational content cards, data integrity, approval workflows and release evidence  
**Status at execution start:** NOT STARTED / NOT CERTIFIED  
**Archive foundation:** `KAYAD-main (2).zip`  
**Archive SHA-256:** `7b9f647cb6bc4be4f2f872f7b2583a67db5d134b6208dfb34ac499b324b7aa93`  
**Archive embedded source revision marker:** `041eb836f022c6a39511f6879ce3b8670dfccd4e`  
**Runtime target:** Node `>=22.22.2` as declared by `package.json`, `.nvmrc` and `.node-version  
**Runtime available in execution environment:** Node `v22.16.0` — below requirement  
**Dependencies:** `node_modules` absent at start  
**Lockfiles:** `package-lock.json`, `bun.lock`  
**Production changes:** None; no deployment, migration or production data mutation performed.

## Foundation decision

The newly supplied ZIP is the source foundation for this phase, in accordance with the operator's instruction that each new ZIP becomes the next phase foundation. The archive's embedded revision marker is `041eb836…`, which differs from the previously discussed publication commit `8a6432e7`. The ZIP contents, rather than an assumed Git checkout, are therefore the audited foundation for this execution. This workspace is an extracted archive and has no `.git` metadata available for a live branch/status check.

## Initial source findings

- `src/App.tsx` routes `/admin` and `/admin/*` through `AdminRouteSurface`; `/admin` resolves to the lazy-loaded `AdminView`.
- `AdminView.tsx` reads dashboard statistics from `adminAPI.stats()` and its API adapter calls `GET /admin/stats`.
- The backend `/stats` handler uses independently settled metric queries and returns `null` plus an `unavailable` list for failed metric sources; genuine zero values are not defaulted on query failure.
- KPI meanings observed in backend code: `totalUsers` counts all User documents; `totalCars` counts all Car documents; `activeAuctions` counts Cars with `auctionStatus: "live"`; `verifiedDealers` counts dealer Users with `status: "approved"`; `openEscrows` counts Escrows in `funded`, `vehicle_confirmed` or `delivered` statuses.
- The Active Staff KPI is an intentional link to `/admin/staff`, not a numeric metric in the current six-card layout.
- Approval preview previously filtered pending dealers from the first page of general user records in the client. This could omit pending dealer records outside that page. Phase 7 corrects the preview to use the existing server-side `role=dealer&pendingApproval=true` query, with `status=pending` filtering already enforced in `backend/routes/adminRoutes.js`.
- KPI rendering now rejects negative, fractional, unsafe-integer and non-numeric values instead of rendering them as counts.

## Known blockers and limits

- Node runtime is below the declared engine requirement.
- Dependencies are not installed; tests, typecheck and production build cannot be honestly certified in this environment without a compatible runtime and dependency installation.
- No authenticated staging environment or live API credentials were used. Runtime data provenance, authorization and real-record approval behavior remain unverified.
- The six KPI definitions above describe the current backend implementation; they are not independent proof that all business definitions are ideal. In particular, `totalCars` includes all Car documents, and `activeAuctions` uses status without a time-window predicate in this route. Those existing semantics are documented rather than silently changed.
