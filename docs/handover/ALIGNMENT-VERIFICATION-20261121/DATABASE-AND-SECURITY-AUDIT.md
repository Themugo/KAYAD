# Database and Security Audit

## Local vs hosted
| Check | Local disposable DB (migrations applied) | Hosted `KAYAD EA` (read-only queries) |
|---|---|---|
| Public tables | 229 | 213 |
| RLS enabled | 229/229 | 213/213 |
| Policies | 146 policies; 130 RLS tables have no policy (deny-all for non-service roles) | not queried |
| Register RPC | present | present (`kayad_register_identity_atomic`) |
| Dealer verification RPC | present | present (`kayad_apply_dealer_verification_atomic`) |
| `users_role_check` | includes `individual_seller` | identical definition |

"RLS enabled" is not "RLS correct": policy semantics, tenant isolation and column grants were **not** verified on hosted. Local `anon` has table privileges on 150 tables (default grants; with RLS enabled and no permissive policy this is deny-all, but it depends on the role setup of the real project). NOT VERIFIED on hosted.

## F-DB-1: hosted schema is behind `main` (VERIFIED, read-only)
- Hosted migration tracking table ends at `20260922060457`. `main` has 202 migration files; 79 are dated after that record (70 of them after 2026-10-01).
- Probe of objects from later migrations on hosted: **absent** - `marketplace_offers`, `personal_listing_lifecycle_events`, `kayad_personal_listing_lifecycle_atomic`, `site_designs`, `site_design_publications`, `featured_vehicle_campaigns`, `auction_follows/likes/comments`, `visitor_analytics_events`, `kayad_normalize_business_name`, `dealers_business_name_unique`. **Present** - `inspector_applications`, `kayad_register_identity_atomic`.
- Meaning: code paths for offer negotiation, personal listing lifecycle, auction engagement, featured campaigns and site designs cannot work on hosted until those migrations are applied. Only ~14 objects were probed, so more may be missing. I did not write to hosted.
- Apply order should follow filenames. All 14 migrations after my checkpoint's schema applied cleanly to the local disposable DB (`evidence/migrations.txt`); the earlier ones were assumed present in the template.

## Migration hygiene
- No duplicate timestamp prefixes among 202 files.
- `kayad_register_identity_atomic` is redefined in three migrations (20261001090000, 20261001220000, 20261110140000) - the latest wins; acceptable but worth a note.
- Register RPC still allows role `individual_seller` (defence in depth gap vs the retired role); it is reachable only through the backend's service role.

## Application security (code inspection, not attack-tested on main)
- CSRF: `app.use("/api", csrfProtection)` in `server.js`; no-CSRF register request returned 403 in earlier-session API test on the checkpoint.
- CORS allow-list: `Content-Type, Authorization, X-Requested-By, X-CSRF-Token, X-XSRF-Token` (note: an `Idempotency-Key` header would need adding when registration idempotency is re-introduced).
- Rate limits: `authLimiter` on `/api/auth`, `globalLimiter`; registration limiter in routes. Limits not stress-tested.
- Uploads: `middleware/upload.js` has MIME + extension allow-lists and magic-byte verification. Not attack-tested.
- Secrets: only `.env.example` files are tracked; a pattern scan of non-doc files flagged only scripts/config that mention patterns (`.gitleaks.toml`, two verifier scripts), not actual keys. Not a full secret audit.
- Backend tests (jest) cover security areas (`tests/security/*`); these pass except the 4 listed failures, none of which is a security assertion.
