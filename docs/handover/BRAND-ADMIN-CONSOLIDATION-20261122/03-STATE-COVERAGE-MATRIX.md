# 03 - Page-by-page state coverage matrix (addendum item 1)

Evidence: evidence/states-dealer.json (75 runs) and evidence/states-user.json (60 runs), produced by a Playwright probe against the disposable stack (real backend, real database). For each section the probe loads normally, forces every GET /api/* to 500, forces 403, delays 5 s, then fails-then-allows and clicks each alert-scoped retry control in turn.

"Empty" means an honest empty message with no data, not an error. "Retry to recover" means the retry made a real second request and cleared the error.

## Dealer workspace (15 sections)

| Section | Loading (slow) | Empty | Error (500) | Retry to recover | 403 shown as | Notes |
|---|---|---|---|---|---|---|
| Overview | OK | OK (honest empty copy) | OK, retry offered | OK (verified per banner) | generic load-failure copy |  |
| Inventory | OK | n/a (data present) | OK, retry offered | OK (verified per banner) | generic load-failure copy |  |
| Leads | OK | OK (honest empty copy) | OK, retry offered | OK (verified per banner) | generic load-failure copy |  |
| Pipeline | OK | OK (honest empty copy) | OK, retry offered | OK (verified per banner) | generic load-failure copy |  |
| Customers | OK | OK (honest empty copy) | OK, retry offered | OK (verified per banner) | generic load-failure copy |  |
| Auctions | OK | OK (honest empty copy) | OK, retry offered | OK (verified per banner) | generic load-failure copy |  |
| Inspections | OK | n/a (data present) | OK, retry offered | OK (verified per banner) | generic load-failure copy |  |
| Escrow | OK | OK (honest empty copy) | OK, retry offered | OK (verified per banner) | generic load-failure copy |  |
| Finance | OK | n/a (data present) | OK, retry offered | OK (verified per banner) | generic load-failure copy |  |
| Analytics | OK | n/a (data present) | OK, retry offered | OK (verified per banner) | generic load-failure copy |  |
| Reputation | OK | OK (honest empty copy) | OK, retry offered | OK (verified per banner) | generic load-failure copy |  |
| Marketing | OK | OK (honest empty copy) | OK, retry offered | OK (verified per banner) | generic load-failure copy |  |
| Team | OK | n/a (data present) | OK, retry offered | OK (verified per banner) | generic load-failure copy |  |
| Banking | OK | OK (honest empty copy) | OK, retry offered | OK (verified per banner) | generic load-failure copy |  |
| Settings | OK | n/a (data present) | OK, retry offered | OK (verified per banner) | generic load-failure copy | Verification card had no retry: FIXED this phase |

## Personal workspace (12 sections)

| Section | Loading (slow) | Empty | Error (500) | Retry to recover | 403 shown as | Notes |
|---|---|---|---|---|---|---|
| Overview | OK | OK (honest empty copy) | OK, retry offered | OK (verified per banner) | generic load-failure copy |  |
| Buying | OK | OK (honest empty copy) | OK, retry offered | OK (verified per banner) | permission message |  |
| Deals & escrow | OK | OK (honest empty copy) | OK, retry offered | OK (verified per banner) | permission message |  |
| Create listing | n/a (form, no initial read) | n/a | n/a | n/a | n/a | Write feedback covered by unit tests / journeys, not re-probed |
| My vehicles | not observed | OK (honest empty copy) | OK, retry offered | OK (verified per banner) | generic load-failure copy | Error view states "We will not show a false empty state" (verified by reading the rendered text) |
| Seller enquiries | not observed | OK (honest empty copy) | OK, retry offered | OK (verified per banner) | permission message |  |
| Performance | OK | OK (honest empty copy) | OK, retry offered | OK (verified per banner) | permission message |  |
| Messages | OK | OK (honest empty copy) | OK, retry offered | OK (verified per banner) | generic load-failure copy |  |
| Auctions | OK | OK (honest empty copy) | OK, retry offered | OK (verified per banner) | permission message |  |
| Activity | OK | OK (honest empty copy) | OK, retry offered | OK (verified per banner) | generic load-failure copy | Partial-data state implemented: per-source Unavailable plus "missing data is not treated as zero". Empty-sounding words in the error view are the anti-false-empty copy, verified by reading the rendered text |
| My Account | OK | n/a (data present) | OK, retry offered | OK (verified per banner) | generic load-failure copy |  |
| Verification & trust | n/a (form, no initial read) | n/a | n/a | n/a | n/a | Write feedback covered by unit tests / journeys, not re-probed |

## Findings (carried into the defect register)

- FIXED: Dealer Settings, Verification status. A failed read showed "unavailable" with no retry and no alert role, and did not recover when the profile card was retried. It now shows an alert with Try again that re-requests. New Vitest test added.
- FIXED earlier this phase: Admin Reports showed zero counts on failure (now a dash with an accessible "unavailable" label); security-log fallback ReferenceError; XOS studio crash.
- OPEN (design, medium): dealer sections render a 403 identically to a 500 ("could not load, try again"). It is not shown as missing data, but a denied user is offered a retry that cannot succeed and gets no permission explanation. Personal Buying, Deals and escrow, Seller enquiries, Performance and Auctions do show a permission message. Recommended: one shared dealer section-error component that branches on status. Not done here, to avoid an unreviewed sweep across 15 sections.
- OBSERVATION: pages with several independent data cards (personal Deals and escrow, Auctions) show one banner per failed request, each with its own Retry. The header Refresh does not clear card banners. Each banner's retry was verified to recover. A single "Retry all" would be an improvement.
- LIMITATION: stale-data and partial-data states exist only where a page keeps previous values on refresh failure (for example the personal listings banner says values "may be stale"). No systematic stale indicator exists for every dealer section and none was added.
- LIMITATION: only GET failures were probed. Write-action success and failure feedback was verified by existing unit tests and DB journeys, not re-probed per page.
- Admin and staff sections: see doc 11 and evidence/admin-ui-<role>.json; per-role route access is documented there.
