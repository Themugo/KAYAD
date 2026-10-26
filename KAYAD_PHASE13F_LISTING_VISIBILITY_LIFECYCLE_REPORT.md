# Listing visibility lifecycle

Mechanism: Postgres trigger on `private_seller_capabilities` (status change) plus an INSERT/UPDATE trigger on `cars` for listings created or republished while the owner is blocked; audit table `private_seller_listing_visibility_events`.

**Hide (suspend/revoke):** only `available`, `approved`, non-deleted listings of the owner are set to `hidden` and recorded. Sold, reserved, pending, draft, manually-hidden and unapproved listings are untouched.
**Restore (approve):** only listings this policy hid, still `hidden`, still owned by the same user, still approved and not deleted; each event closes with `restore_outcome` = `restored` or `skipped_ineligible`.
**New/republished while blocked:** hidden at write time and tracked (race serialized with `FOR SHARE`).

Public surfaces verified hidden after suspension and visible again after reinstatement over real HTTP: list, featured, search by brand filter, detail, price-history, insights, valuation, sitemap, favorites ([HTTP] §E–F, 103/103); and in a fresh anonymous browser: detail deep link, already-open page after refresh, marketplace ([BROWSER] S2–S4, R2). Ownership (`dealer_id`) was identical before and after every transition.
