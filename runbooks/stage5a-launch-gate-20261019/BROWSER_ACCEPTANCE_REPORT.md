# Gate F/D/E — Browser and real-runtime acceptance (Stage 5A)

**Environment (isolated, disposable):** PostgreSQL (disposable, built from the 181-migration chain) → PostgREST → backend (Express, port 5050) → Vite dev server → **Chromium 141 via Playwright 1.56.1**. Email delivery = local capture listener standing in for Brevo (**not live**). Image upload (Cloudinary) is not configured here. All identities are `@example.test` disposables. No shared or hosted database was touched.
**Scripts:** `evidence/gateF/scripts/` (`acceptance.mjs`, `decide.mjs`, `ownerui.mjs`, `gateD.mjs`); results JSON beside them; screenshots in `evidence/gateF/shots/`.

## Defects found only by running the real app (all fixed, all with regression coverage)
| # | Defect (real stack) | Impact | Fix |
|---|---|---|---|
| F1 | Owner onboarding-settings page was never mounted in any reachable route | Owner could not operate Gate D settings through the UI at all | mounted as **Onboarding** tab in the admin console |
| F2 | Admin console loaded `/api/audit/logs` (no such route → 400 "Invalid ID format"); one failed call blanked stats/users/cars | Owner saw an empty console | use `/admin/audit-log` |
| F3 | Console used `_id` but the API returns `id` → every action sent id `undefined` | Ban/approve did nothing (400) | normalise `_id ← id` |
| F4 | No dealer/seller Approve/Reject or listing Approve/Hide controls in the live console (pages existed but unmounted) | Approval-based mode could not be operated through the UI | buttons added; server stays the authority |
| F5 | HPP guard rejected **any** JSON array with >1 element, and fell through to `next()` after replying | Every multi-id bulk endpoint (bulk moderate/status/delete) failed with 400 | duplicates rejected for query/form only |
| F6 | `POST /admin/cars/:id/moderate` did `car.save()` on a car loaded with a populated dealer → wrote the dealer object into `dealer_id` | **Every single-listing approve/hide returned 500** | update status only |
| F7 | `bulkModerateCars` threw on `dealer._id.toString()` | bulk moderation 500 after DB write | id helper |
| F8 | Seller bulk-status/bulk-delete queried `cars.dealer` (column is `dealer_id`) | 500 whenever a seller bulk edit reached the query | `dealer_id` |
| F9 | `GET /admin/users`, `/admin/stats`, `approve-dealer` used non-existent `users.approved`, `verification_status`, … (also absent hosted) | Admin users/stats 500; approving a dealer 500 | schema-true queries, RPC-based approval |
| F10 | A partially corrupt policy row still showed `auto_publish` | Misleading owner display (publication was already blocked) | any corrupt field ⇒ whole record RESTRICTIVE |
| F11 | Settings page used CSS classes that do not exist in the app (unstyled controls) | cosmetic | app `Button`, bordered selects |

## Results (final run)
See `TEST_EVIDENCE_MATRIX.md` for counts. Highlights:
* **Private seller (J1, 390 px):** UI registration → "Check your email"; pre-verification sign-in refused (403) and the UI shows a recoverable message; captured link verifies in the browser; replay and garbage token rejected; sign-in after verification; account stays `pending` (cannot self-approve); role/status injection via profile ignored (DB unchanged); logout revokes the session (`/me` → 401). *Seller listing submission with images: NOT TESTED (no Cloudinary here)* — the publication protections were verified through the bulk/copy endpoints and the DB (J4).
* **Dealer, approval_required (J2):** application received ≠ email verified ≠ approved — DB shows `dealer|pending|verified=true|dealers.approved=false`; pending dealer cannot list (403); concurrent duplicate approvals safe (200/200, one final state); audit rows and in-app notification created; approving a dealer published **0** listings.
* **Dealer, self_onboarding (J3) and closed:** self-onboarding creates a verified-but-unprivileged `dealer|pending`; closed mode refuses registration (403).
* **Decisions through the real UI (E-series):** pending badge; **Approve** dealer, **Reject** dealer, **Approve** seller via buttons; duplicate approve/reject and approve-vs-reject races leave a consistent state (no 5xx); non-owner admin refused (403 `DECISION_AUTHORITY_REQUIRED`) under `owner_only`, allowed once the owner selects `admins`; admins and dealers cannot change owner policy (403); **Hide** in the UI stores `hidden` and never says "rejected".
* **Moderation/self-publication on the real DB (J4):** dealer bulk-status and dealer-platform bulk cannot publish under `hold_for_review`; sold listings untouched by seller bulk (409/skip) and by owner moderation (409); single hide/approve/legacy "reject" ⇒ `hidden`/`available`/`hidden` (never `rejected`); bulk hide skips sold; `auto_publish` and `hold_for_review` toggle independently and immediately.
* **Owner settings UI (D-series):** reaches the page; shows server values; save persists; survives browser reload and **a real backend restart**; stale save ⇒ 409 conflict, the other operator's values are **not** overwritten, UI tells the owner; corrupt/non-object/invalid-enum rows ⇒ restrictive + self-publish blocked; missing row ⇒ launch defaults; unknown/extra fields ignored.
* **Responsive:** registration forms (seller, dealer) and the owner onboarding settings at **320, 360, 375, 390, 412, 430 px** — no horizontal scroll, submit controls visible (all PASS); verification message, pending state, conflict and error screens captured at 390 px.

## Not verified / limits
Live Brevo delivery; seller image-upload listing creation; hosted DB; "unreadable settings store" at runtime (covered by mocked tests only); desktop widths other than 1280 for non-settings pages; browsers other than Chromium; the owner seeded by the disposable seed has `status=pending` (owner access is governed by the email-owner rule, not `status`, and worked — but see the risk register).
