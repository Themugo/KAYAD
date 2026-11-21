# Dealer account implementation — summary

**Scope done:** DA-01 … DA-07 implemented and verified on a disposable database over real HTTP; no commit, push, deploy or hosted migration was made.

| | Result |
|---|---|
| DA-01 sale vs escrow / settlement | Fixed: atomic lifecycle function, 409 codes, race-safe triggers (journey 09) |
| DA-02 one canonical sold lifecycle | Fixed: single service for individual and both bulk endpoints, itemised, audited |
| DA-03 sold is read-only | Fixed in API and database; admin correction function audited |
| DA-04 banking read-back | Fixed (cache invalidation root cause), masked, uncached, journey 10 |
| DA-05 branding | Migration + client normaliser, tested on a scratch DB; **hosted not touched** |
| DA-06 sidebar / drawer | Fixed and measured at 9 viewports (see responsive report) |
| DA-07 listing numbers | Permanent, concurrency-safe, backfilled, shown as `#n` |

Reports: reconciliation, workflow, role matrix (unchanged roles), lifecycle, numbering, banking, branding, responsive / accessibility, legacy register (nothing deleted), migration review, test results, open issues, files changed, release readiness.

**Not done (decisions or limits, see OPEN-ISSUES):** Pause / Publish buttons in the dealer UI, the brief's renamed sidebar groups, role-permission contradictions DA-11 … DA-14, legacy deletions, real Cloudinary test, individually scripted 30 journeys, dark-mode capture.
