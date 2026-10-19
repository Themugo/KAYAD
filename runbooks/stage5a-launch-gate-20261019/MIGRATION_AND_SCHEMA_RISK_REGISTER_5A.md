# Migration and schema-risk register — Stage 5A

| ID | Risk | Evidence | Severity | Status / owner action |
|---|---|---|---|---|
| R1 | Hosted DB lacks `kayad_register_identity_atomic` → registration fails closed | hosted preflight | **Blocker** | Gate C migration (D4); branch rehearsal first |
| R2 | Hosted `refresh_tokens` lacks `session_id`/`family_id`; `users` lacks `deactivated_at`, `granted_permissions`, `revoked_permissions`, `last_active`; no lower(email) unique index | hosted preflight | **Blocker** | same migration |
| R3 | Hosted migration history names ≠ repo (135 hosted vs 181 repo, many renumbered duplicates) — `supabase db push` unsafe | `gateC_*` files | High | reconcile history deliberately; apply object-by-object per preflight |
| R4 | `cars_status_check` forbids `rejected`; `reportController` still writes `rejected` (not an onboarding path) | Stage 4A pins | Medium | D3; Hide used meanwhile. Admin moderation + duplicate removal now write `hidden` |
| R5 | No approved owner-bootstrap on hosted (2 users, 0 verified; seed blocked in production; runbook forbids seed recovery) | Gate A | **Blocker** | D6. App now fails closed: an unverified owner email is refused at login/refresh/protect/optionalAuth/sockets with `OWNER_IDENTITY_UNVERIFIED` |
| R6 | Seed leaves the owner `status='pending'` in the disposable DB | observed | Low | owner access works via the email-owner rule; set owner status explicitly during provisioning |
| R7 | Remaining raw-PostgREST dealer-dashboard queries use non-existent `cars.dealer` / camelCase columns (`dealerRoutes.js` ≈13 sites: list/stat/overview queries); `GET /api/dealer/cars` returned 200 in the probe (result not verified non-empty); other queries in that file may fail or return empty on the real schema | grep + probe | Medium | schedule a dealer-dashboard schema pass (D9); onboarding itself does not depend on them |
| R8 | `bulkUpdateListings` allows status `archived`, which the DB check rejects | code review | Low | observation only |
| R9 | `REQUIRE_EMAIL_VERIFICATION` defaults to `BREVO_API_KEY` presence | Gate B | Medium | set explicitly to `true` |
| R10 | UI copy "Listing needs KAYAD approval" is static regardless of the owner's moderation setting | UI | Low | follow-up |
| R11 | A rejected dealer keeps `role=dealer`, `status=rejected`; blocked from dealer routes (403), cannot create or publish (403), can read own empty inventory | probe | Low | acceptable; note for support |
| R12 | Cloudinary not configured in the isolated stack → seller image-upload listing creation untested end-to-end | browser report | Medium | test on staging after Gate C |
| R13 | The default shell `node` in this workspace is 22.22.0 (< required 22.22.2); every runtime stack and test run used the 22.22.2 toolchain (`node -v` recorded in each log) | env | Low | Windows machine must run Node ≥ 22.22.2 |
