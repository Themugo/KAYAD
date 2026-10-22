# KAYAD Stage 13 — Change Ledger (2026-10-12)

| ID | Severity | Finding | Change | Verification | Residual status |
|---|---|---|---|---|---|
| AUC-PUB-01 | Medium | Public discovery exposed raw generic server errors and repeated section failure details | Removed raw exception text; use section-specific human-readable copy | Public error-state validator 14/14; discovery tests authored | Unit tests blocked by dependency install failure |
| AUC-PUB-02 | Medium | Scheduled-list failure could mislabel the selected Live tab; first paint could imply an empty floor | Headline follows selected tab; explicit loading copy; other failures remain visible in supporting copy | Public error-state validator 14/14 | Runtime browser check not run |
| AUC-PUB-03 | Medium | Failed refresh replaced prior successful list with empty data | Update each list only on fulfilled request | Public error-state validator 14/14; regression test authored | Vitest not run |
| AUC-PUB-04 | Low | Signed-out watchlist displayed a zero count and misleading empty state | Show unavailable count and sign-in action; cancel stale favorite requests on identity change | Public error-state validator 14/14 | Browser auth interaction not run |
| AUC-ROOM-01 | Medium | Any auction detail failure rendered “Auction not found” | Distinguish 404 from temporary failure; retry and back actions; accessible loading status | Public error-state validator 14/14; tests authored | Vitest not run |
| AUC-ROOM-02 | Low | Detail and bid-history endpoints were fetched redundantly on initial room load | Consume sanitized bids in canonical detail response | Bid surface 6/6; auction hardening 28/28 | API load not measured live |
| AUC-API-01 | High | Public `status=live` list lacked start/end bounds and rejected-listing exclusion | Enforce start <= now, end > now, status != rejected in the canonical list/count filter | Auction domain 24/24; new static validator 14/14; regression tests authored | Backend Jest not run |
| AUC-API-02 | High | A valid published future setup could be listed before the car lifecycle mirror but its detail could return 404 | Allow pre-start state only when published setup exists and configured start is future | New static validator 14/14; regression tests authored | Backend Jest not run |
| AUC-API-03 | High | Public bid-history route lacked deleted/rejected vehicle checks | Return 404 for deleted/rejected vehicles and require published setup | New static validator 14/14; regression tests authored | Backend Jest not run |
| AUC-OPS-01 | High | Scheduled list returns 500; exact hosted cause unknown | Documented evidence that migration `20261002190000` is local-only and added read-only diagnostic steps | Existing evidence files reviewed; no live query in this pass | BLOCKED: exact hosted relation and logs need verification |

## Safety record

- No migrations added, applied or pushed.
- No commit, push or deployment.
- No live financial operation, payment, customer message or provider transaction.
- No mock auction records or fabricated metrics introduced.
- No duplicate auction implementation or new data authority introduced.
