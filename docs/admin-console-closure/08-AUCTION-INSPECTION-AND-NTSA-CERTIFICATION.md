# 08 — Auction, bids, inspections, inspector applications, NTSA

| Area | Verified | Evidence |
|---|---|---|
| End auction with none live | idempotent: 200 `alreadyClosed` (or 4xx); vehicle unchanged | journey 31 E6 |
| Extend non-live auction | rejected 4xx | E7 |
| Choose winner without valid bid | rejected 4xx; no sale recorded | E8 |
| Bid history for a vehicle with no bids | honest empty list | E9 |
| Bids admin list (`/api/bids/admin/all`) | **Fix:** now requires `MANAGE_BIDS` (=manage_auctions) in addition to staff role (moderator was able to read all bids while the UI hid the page) | journey 32 T3 |
| Inspections list | admin/superadmin/ghost_checker/technical_support allowed; others refused; anonymous 401 | journey 31 E10 |
| Inspector applications | admin/superadmin/hr/technical_support allowed (HR reviews applicants by design); moderator/marketing/personal/dealer refused | E10 |
| NTSA queue | **Fix:** `GET /` and `POST /:id/process` now require `MANAGE_INSPECTIONS` + staff role (previously any staff). Allowed: admin, superadmin, ghost_checker. | E10; jest inspection suites (13 suites / 454 tests) |
| NTSA nature | internal verification queue; **no live NTSA lookup** — classed Safely simulated | journey 27 D4–D7 |

Not executed: live settlement, winner payments, provider-dependent inspection dispatch. Suspicious-bid flagging is deliberately unavailable (503, doc 11).
