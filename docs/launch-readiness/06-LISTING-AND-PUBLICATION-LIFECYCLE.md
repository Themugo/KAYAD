# 06 — Listing and publication lifecycle
Policy recorded: dealer registration self-onboarding; verification reviewed by humans; listing submission by approved dealer (pending dealers also under progressive access); **listing review retired**; publication automatic (`auto_publish`) for eligible dealers and personal sellers; moderation after publication; no payment gate (`subscriptionRequired=false`; none added).
| Step | Result | Evidence |
|---|---|---|
| Create with photo → stored via configured provider, status `available` | PASS | 36, 37 |
| Edit price, body type, features; photos added on edit; cover/order preserved | PASS | 36, r2 browser |
| Draft hidden from public; published visible; public summary has no private fields | PASS | 37 |
| Other dealer cannot edit or read inventory; staff limited by permission | PASS | 37 (today); 14 (earlier, not re-run) |
| Duplicate submission idempotency, validation errors | PASS in earlier passes (journeys 15, 13; **not re-run today**) | – |
| Storage-provider failure / timeout recovery | covered by earlier suites; **real Cloudinary failure NOT VERIFIED** | – |
| Missing/invalid images | validated by upload middleware tests | backend suites |
Dealer sees the vehicle in inventory and on the storefront; buyers reach it from `/cars/:id`.
