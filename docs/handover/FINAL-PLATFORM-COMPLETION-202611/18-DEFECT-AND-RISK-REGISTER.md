# 18 - Defect and risk register (in progress)

| ID | Severity | Status | Item |
|---|---|---|---|
| DEF-01 | Medium | NOT FIXED (design decision) | Free-listing dealer path ignores `Idempotency-Key`; simultaneous double submit creates two listings (doc 09). |
| DEF-02 | Medium | PARTLY FIXED | Dealer sections rendered a 403 like a 500. Overview, inventory, leads, customers, team, reputation, campaigns now show a permission message (tests added). Banking, settings, profile panels still generic (doc 05). |
| RISK-01 | Critical | OPEN | Hosted database drift (D-20): 91 migrations unapplied; 44 tables, 107 functions missing (doc 13). |
| RISK-02 | High | BLOCKED | No staging environment (doc 14). |
| RISK-03 | High | BLOCKED | M-Pesa sandbox and Cloudinary credentials absent (docs 10, 11). |
| RISK-04 | Low | OPEN | Pre-existing flaky `visitorAnalytics.test.js` (timing); not modified. |
| OBS-01 | Low | OWNER DECISION | Least-privilege observations: `/api/bids/admin/all`, `/api/admin/alerts`, `/api/admin/stats` readable by every staff role; `/admin/config` and `/admin/feedback` render a shell for roles whose API is refused (doc 08). Not changed. |
| RISK-05 | Medium | OPEN | 16 admin write routes have inline guards not covered by the automated denial matrix; cross-business dealer-staff isolation and per-role session expiry not tested (doc 08). |
