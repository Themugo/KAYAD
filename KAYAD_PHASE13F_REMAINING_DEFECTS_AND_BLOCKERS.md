# Remaining defects and blockers

## Blockers for production
1. **No staging evidence** [BLOCKED/APPROVAL] — no approved staging environment was available; no migration applied anywhere but the disposable local database.
2. Real Supabase/Cloudinary/Redis-in-production/CDN not exercised (local PostgREST+Postgres, local Redis, placeholder storage settings).

## Pre-existing defects found, NOT fixed (outside the 13F scope or product decisions)
| ID | Defect | Evidence |
|---|---|---|
| R1 | Keyword search (`q=`) is broken at baseline; brand filter used for visibility probes | probe notes in http matrix |
| R2 | Legacy `isVerifiedDealer` semantics for role `individual_seller` listings still derive from `users.status` | carController |
| R3 | Saved-list `total` may count items the visibility filter removes (page shorter than total) | favoriteController |
| R4 | `admin_alerts` table is referenced by code but defined by no migration → `/api/admin/alerts` 500 | backend log |
| R5 | `error_budgets`, `disputes`, `escrows.warning_sent`, `bids.bid_count` missing on a migrations-only database (schedulers log errors) | backend-ui-run.log |
| R6 | Accessibility: colour-contrast (auction rail overline labels, Approve button, a Seller Studio control), scrollable-region-focusable on auction steps (phone), unlabeled icon button in Dealer Hub | axe output in final-ui-journeys.log |
| R7 | ESLint `eslint .` baseline: 2255 errors / 1557 warnings (unchanged by 13F in application code) | final-eslint.log |
| R8 | Stage 5F.7 validator documentation-path issue | not re-run in 13F |

## Not run
Playwright cross-browser (Chromium only), real payments/M-Pesa and other protected financial workflows (unmodified, not exercised), email/SMS providers, mobile native.
