# Unresolved blockers (Stage 5C.1) — unchanged by this work

5C.1 closed **local coverage** gaps only. It did not touch production, hosted data or real accounts.

| # | Blocker | Status after 5C.1 | Prerequisite / owner action |
|---|---|---|---|
| B1 | Live Brevo delivery unverified | **OPEN** (capture stub only) | Brevo key + verified sender/domain + authorization + owned mailbox |
| B2 | Live SMS unverified | **OPEN** | Africa's Talking production creds, sender ID, handset |
| B3 | Hosted schema unread | **OPEN** | run `runbooks/stage5c-onboarding-20261019/HOSTED_READONLY_PREFLIGHT_5C.sql`, supply results |
| B4 | 5B owner migration not applied on hosted | **OPEN** | owner decision D1 (5B) + reviewed apply |
| B5 | 5C subscription RPC fix not applied (candidate, unapplied) | **OPEN** | decision D5C-B, apply with rollback ready |
| B6 | Communication control rows on hosted unknown | **OPEN** | preflight §8 |
| B7 | The two designated real owner identities (`kayadautomotives@gmail.com`, `jimmythemugo@gmail.com`) not activated or verified | **OPEN** | `OWNER_ACTIVATION_READINESS_CHECKLIST_5C.md` |
| B8 | `adminOnly` admits `ghost_checker` (O5C-01) | **OPEN** | route review, decision D5C-A |
| B9 | Wholesale/trade listings have no column (503) | **OPEN** | schema decision |
| B10 | Deployed revision unknown | **OPEN** | compare deployed commit with `d9bfccfb` / this ZIP |
| B11 | **Windows working-tree reconciliation incomplete** | **OPEN** | the user's local tree was never inspected; `d9bfccfb` carries 5 unreviewed files from it (O5C1-09) |
| B12 | Real Cloudinary not contacted (all upload evidence is stub-backed) | **OPEN, new explicit item** | authorized test cloud + disposable credentials, non-identity images only |
| B13 | Production-mode error shaping (`NODE_ENV=production`) not exercised | **OPEN, new** | staging run |
