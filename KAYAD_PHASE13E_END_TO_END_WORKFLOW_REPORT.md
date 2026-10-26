# KAYAD Phase 13E — End-to-End Workflow Report
**No browser or live-service end-to-end test was run.** The backend requires Supabase (no database available in this environment), and no Playwright run was attempted against mocked APIs, because a mocked critical path must not be reported as end-to-end. Evidence tiers are labelled per step.

| # | Journey step | Tier | Result |
|---|---|---|---|
| 1 | Existing personal login | existing suites (unchanged) | not re-exercised in a browser |
| 2 | Seller application entry (dashboard / `/sell` → seller-platform) | component test | form shown for `none`/`rejected` |
| 3 | Submission (same `users.id`, no second user) | mocked-runtime HTTP (real protect/RBAC, in-memory table) + component | 201, one row keyed to the buyer id; role/status untouched |
| 4 | Duplicate / failed submission | mocked-runtime HTTP + component | 409 `SELLER_APPLICATION_EXISTS`; server error shown |
| 5 | Pending status, buyer access intact | component + guard test | pending text; seller writes 403; buyer sections remain |
| 6 | Authorized review | mocked-runtime HTTP + new admin review UI | `MANAGE_USERS` API, self/buyer/dealer/anonymous denied; dedicated UI added but not browser-tested after follow-up |
| 7 | Approval / rejection / suspension / revocation / reinstatement | mocked-runtime HTTP | validated transitions, reasons required, compare-and-set |
| 8 | Listing creation guard (direct API) | guard unit tests with real middleware | buyer 403, approved allowed, dealer privilege never granted |
| 9 | Draft edit, submission, moderation, publication | **existing, unchanged** (`createCar`/`updateCar` moderation policy; approval never publishes) | covered by the existing backend suites that passed; no new run of the full journey |
| 10 | Manage listing / seller history | existing `/cars/my-listings`, own-data reads | allowed for every non-`none` state |
| 11 | Buyer enquiries to a seller | existing lead/chat flows, unchanged | not re-exercised end to end |
| 12 | Suspension/revocation effect on **live** listings | local migration/trigger + cache invalidation added | not executed against a database; static contract checks 14/14 pass; DB behavior remains unverified |
| 13 | Return to buyer use at every stage | component tests | buyer dashboard present in every state |
| 14 | Dealer denial for personal accounts | mocked-runtime HTTP (13D suite) + 13E guard test | 403 |
| 15 | Refresh/deep links, logout/login, desktop/mobile layout | **not run** (needs Playwright + running stack) | — |

Blocker for Playwright/local-service journeys: no database/Supabase service and no seeded accounts; running the stack would require credentials that must not be created or faked.


## Follow-up validation boundary
The new admin review UI and listing visibility policy were added after the earlier workflow table was written. They have not been exercised in a browser or against Postgres. A static migration/UI contract validator passed 14/14; this is not equivalent to SQL execution, RLS validation, or an end-to-end pass.
