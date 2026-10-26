# Dealer isolation regression

- [UNIT/INT] Phase 13D dealer-isolation suites run as part of the full backend jest: 156/156 suites pass; none were edited except the public-listing cache test (see below).
- [HTTP] §K: an approved private seller is refused by the dealer-business API (403); a dealer keeps the dealer workflow; no `dealers` row is ever created for a personal seller (also asserted in [DB] and [BROWSER] DL4).
- [BROWSER] DL1: dealer owner opens Dealer Hub; DL2: approved private seller does not get it; DL3: dealer API 403.
- The capability trigger has a role guard so dealer-owned cars are never hidden by a personal-seller decision.
- Test change disclosed: `phaseC1PublicListingCacheInvalidation.test.js` asserts the exact set of cache patterns; it was **extended** with the two new car-route patterns. Its assertion that unrelated keys (admin stats) survive invalidation is unchanged — an earlier, over-broad `cache:*` pattern failed it and was narrowed rather than the test weakened.
