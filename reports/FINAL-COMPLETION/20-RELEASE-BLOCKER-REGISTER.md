# 20 — Release Blocker Register

| ID | Blocker | Severity | Owner | Evidence |
|---|---|---|---|---|
| B-01 | Hosted DB diverges from repo chain (44 missing tables, 24 hosted-only, 50 differing tables, 35 differing functions, key triggers/unique index absent) | **Critical** | Owner decision D-20 + Eng | 04 |
| B-02 | No staging environment; no rehearsal or rollback/restore test | **Critical** | Owner / Infra | 03, 05, 06 |
| B-03 | New migration `20261122120000` + backend must ship together; not applied anywhere hosted | High | Eng | 01, 07 |
| B-04 | No real Daraja sandbox test (STK, callbacks, B2C) | **Critical** (payments) | Owner (credentials) | 09 |
| B-05 | No real Cloudinary test | High | Owner (credentials) | 08 |
| B-06 | Owner decisions D-17…D-21 unanswered (D-18 payout destination affects money routing) | High | Owner | 02 |
| B-07 | Dark mode not shipped (half-dark risk); dark logo needs approval | Medium | Owner/Eng | 16 |
| B-08 | Homepage axe findings (contrast 4, target-size 5) need owner approval to change; no manual keyboard / screen-reader testing | Medium | Owner/Eng | 17, 18 |
| B-09 | 3 validators not exercised (Docker, Supabase creds, comms providers) | Medium | Infra | 19 |
| B-10 | Not tested: access-token natural expiry, password-change revocation, real-device mobile, exports/realtime/storage isolation, custom team roles | Medium | Eng | 10–13 |
| B-11 | Backend-process-restart idempotency scenario not exercised; personal-seller path covered by controller tests only | Low–Med | Eng | 01 |
| B-12 | Remaining definition classes (grants, views, enums, extensions, sequences, storage, RLS flags) not compared | Medium | Eng | 04 |
