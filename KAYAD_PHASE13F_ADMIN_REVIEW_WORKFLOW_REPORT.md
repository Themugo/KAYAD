# Administrator review workflow

Route `/admin/private-seller-applications`, inside the admin shell, sidebar entry with its own icon.

- [BROWSER] An administrator opens the queue, sees the real pending application, approves it; the queue refreshes from the server (A1–A4). Suspend (confirmation accepted), restore approval, revoke, reject with reason all exercised through the UI (S, R, V, X series).
- [BROWSER] A buyer cannot open the page and a direct API decision from the buyer's browser is refused (U1–U2); anonymous visitors cannot reach it (N4).
- [UNIT] 13 component tests incl. load failure (error-only state), duplicate decision conflict, required reasons, cache-failure warning toast.
- [HTTP] Decision response carries `visibility {changed, cacheInvalidated, listingsHiddenByPolicy}`; a cache-invalidation failure is reported to the admin and does not undo the decision (database and status filters remain authoritative).
- Legacy endpoint `approve-dealer` for an `individual_seller`: syncs the capability row first; a suspended/revoked seller is NOT reinstated and the response says so ([HTTP] §J).
- Phone width (390px): page renders without horizontal overflow ([BROWSER] M2).
