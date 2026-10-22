# Stage 5F.12 — Dealer workflow acceptance matrix

| Flow | Existing contract found | Stage 5F.12 result | Required certification |
|---|---|---|---|
| Dealer submits verification | `dealerVerificationService.submitDealerVerification` | Preserved | Real API validation and document ownership tests |
| Admin reviews/decides | `transitionDealerVerification` compare-and-swap | Preserved; current suspension/rejection now overrides legacy approved flag | Role matrix and concurrent approve/reject integration test |
| Dealer approval vs listing publication | `verificationController` used to bulk-publish pending inventory under auto-publish policy | Separated: dealer approval marks trust attribute only; no bulk publish | Per-listing moderation/readiness acceptance test |
| Listing creation | Dealer verification middleware on relevant routes | Guard confirmed by source inspection | Test all aliases, update/delete/bulk paths and listing state transitions |
| Auction setup | `auctionSetupRoutes` includes verification middleware | Guard confirmed by source inspection | Runtime start/publish/scheduled-start and bid lifecycle tests |
| Staff membership | `dealerOrgAccess` resolves active dealer team membership and permission | Existing control preserved | Cross-dealer tenant isolation, invitation acceptance/revocation and suspended staff tests |
| Inventory → auction → settlement | Existing auction and settlement services/routes | Not certified in this stage | End-to-end isolated DB/RPC test with idempotency and ledger invariants |

## Must-pass negative cases

- Dealer document status is pending while legacy `dealer.approved` is true: current pending verification must not be bypassed.
- Verification is suspended and legacy `dealer.approved` is true: protected operation returns 403.
- Verification is rejected and legacy `dealer.approved` is true: protected operation returns 403.
- Suspension expiry time is in the past: system must remain suspended until explicit admin reinstatement.
- Dealer approval occurs with pending listings: no listing is changed from pending to public/available by this side effect.
- Staff membership is absent, inactive or belongs to another dealer: protected team/organization action is denied.
