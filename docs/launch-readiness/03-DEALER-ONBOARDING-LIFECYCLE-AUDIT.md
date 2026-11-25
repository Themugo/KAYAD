# 03 — Dealer onboarding lifecycle
| Step | Result | Evidence |
|---|---|---|
| Dealer registers → `role=dealer`, `status=pending`, business name required (400 without) | PASS | 20 C7–C8, 36 |
| Business (`dealers`) and verification records created with the identity | PASS | 36 |
| Application submit → dealer acknowledged, admins told "ready for review" | PASS | 36 |
| Owner approval with reason → dealer approved, **one** approval notice | PASS | 36 + unit test |
| Progressive access: a pending dealer can already create listings | observed (policy) — **owner to confirm** | 36 log |
| Approved dealer publishes a vehicle with a photo, live without per-listing approval | PASS | 36, 09 |
| Business profile: edit name/location/description, logo + banner upload, public preview link | PASS (API + browser) | 37, browser 19/19 |
| Public page only for approved, non-suspended dealers | PASS | 37, unit tests |
| Admin views applications, decides with reason, audit rows | PASS | journeys 26, 31, 33 (earlier passes; not re-run today) |
## Policy recorded (hosted values are HOSTED-READONLY)
- Dealer registration: self-onboarding; hosted `dealerOnboardingMode` stored as legacy `approval_required` (normalises to self-onboarding), `dealerDecisionAuthority=admins`.
- **Verification paperwork: nothing is mandatory by default** — no `dealer_paperwork_policy` row exists on hosted. Empty documents are therefore accepted by design; the repository states no approved launch list. **Owner decision required** (Admin → Settings → Onboarding); the system will then enforce at decision time.
- Listing review: retired; auto-publish; moderation after publication.
- Dealer approval is separate from listing moderation.
