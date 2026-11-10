# KAYAD Buyer/Seller Offer Interface and Staging UAT Handover

Date: 10 November 2026
Status: **UI/API source integration completed; staging UAT not executed; production migration NOT approved.**

## Scope completed

### Buyer experience
- Added a buyer negotiation inbox to the buyer dashboard overview.
- Added an authenticated buyer-scoped endpoint `GET /api/leads/mine/offers`.
- The endpoint selects only the authenticated buyer's own lead records and returns only the lead reference, vehicle, dealer, stage and creation timestamp.
- Buyer can open each lead's negotiation and use the shared offer panel to submit, accept/reject/counter received offers, withdraw offers they sent, and inspect the durable event history according to backend participant authorization.

### Seller experience
- Added an Offers control to each existing dealer lead card.
- Expanding a lead opens the same shared negotiation panel and same canonical offer API used by the buyer.
- Seller can submit an offer, decide on an offer received, counter it, withdraw an offer they sent and inspect the event history.

### Shared offer panel
- Uses `leadApi.offers`, `submitOffer` and `respondToOffer`.
- Uses a fresh idempotency key for each deliberate action.
- Displays KES values, status, sender/recipient perspective, expiry, optional message and event history.
- Does not treat an accepted offer as payment, escrow funding or vehicle sale. Checkout/escrow remain separate workflows.
- Backend remains authoritative for participant authorization, allowed transitions, expiry, concurrency and idempotency.

### API addition
- `GET /api/leads/mine/offers` is registered before `/:leadId/offers` to avoid route parameter capture.
- Query is scoped with `.eq("buyer", req.user.id)`; no client-supplied buyer ID is trusted.

## Validation executed

| Check | Result |
|---|---:|
| Offer UI/API integration validator | 12/12 PASS |
| Canonical offer negotiation contract | 16/16 PASS |
| Customer transaction lifecycle contract | 21/21 PASS |
| Transaction integrity contract | 14/14 PASS |
| Payment gateway lifecycle contract | 13/13 PASS |
| Migration hygiene | 195 migration files; no exact duplicate bodies or duplicate table creators |
| Backend controller syntax | PASS |
| Backend route syntax | PASS |
| package.json parse and npm script invocation | PASS |

These are source and contract validations. They are not browser or live database execution.

## Staging UAT readiness

The staging UAT matrix is at `runbooks/offer-negotiation-staging-uat/README.md` and defines O-01 through O-18, covering buyer inbox isolation, submit/replay, seller visibility, accept/reject/counter/withdraw, expiry, invalid amounts, non-participant access, sold vehicle rejection, concurrent submissions and state convergence.

**UAT was not run.** Environment preflight found no configured Supabase staging URL/service credentials or M-Pesa provider credentials in this execution environment. The repository also has no `node_modules`; installed Node is `22.16.0`, below the package engine requirement `>=22.22.2`. Therefore:
- No staging API/database calls were made.
- No real buyer/seller test records were created.
- No M-Pesa initiation or callback was triggered.
- No migration was applied.
- No frontend build, TypeScript check, browser test or axe/Lighthouse scan was run.

## Production migration decision

**DO NOT APPROVE OR APPLY** `supabase/migrations/20261110120000_canonical_offer_negotiation_workflow.sql` to production yet.

Approval requires all O-01–O-18 staging cases to pass, RLS/role isolation evidence, fresh-database migration replay, supported Node build/typecheck, desktop/mobile buyer and seller browser journeys, rollback/backup plan and owner sign-off. Payment/refund/escrow UAT remains a separate release gate.

## Files changed

- `src/components/offers/MarketplaceOfferPanel.jsx` — shared buyer/seller offer panel.
- `src/pages/dealer/components/DealerLeadsTab.jsx` — seller lead-card integration.
- `src/pages/buyer/components/BuyerNegotiationsPanel.jsx` — buyer negotiation inbox.
- `src/pages/buyer/components/BuyerOverviewTab.jsx` — buyer dashboard integration.
- `src/services/leadApi.ts` — buyer inbox client method.
- `backend/controllers/offerNegotiationController.js` — buyer-scoped lead inbox handler.
- `backend/routes/leadRoutes.js` — buyer inbox route.
- `scripts/validate-offer-negotiation-ui.mjs` — source integration validator.
- `package.json` — validator script registration.
- `runbooks/offer-negotiation-staging-uat/README.md` — staging UAT matrix and production gate.

No production data, migration state, secrets, deployments, commits or pushes were changed.
