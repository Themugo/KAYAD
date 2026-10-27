# KAYAD Phase 16B — Fixed and deferred

## Fixed locally (all verified; none applied to hosted)
1. Owner MFA lockout race → compare-and-set charge-before-evaluate (`services/ownerMfa.service.js`). No schema change.
2. Chainable `findByIdAndUpdate` (`models/_base.js`).
3. Mongo-style sort objects in `db/index.js`.
4. Error classification revived for 22P02/PGRST116 with a financial-path guard (`middleware/errorHandler.js`).
5. Communications admin: proper 400/404, no input echo (`communicationControl.service.js`).
6. Request validation guards: cms banners reorder, automation scheduled, config bulk/import, lowcode objects/reorder/suggest.
7. Dealer onboarding button contrast (`DealerOnboarding.jsx`).
8. Prepared and rehearsed (not applied): registration function + dealer onboarding columns + `suspended` CHECK migration with rollback.
9. New tests: 16B route-exception regression (4 groups), MFA attempt-charging contract, owner/dealer separation E2E (41 checks), real-stack browser check (18 checks), registration/onboarding PG rehearsal (47 checks).

## Deferred (explicit blockers)
| Item | Why deferred | Needed |
|---|---|---|
| Hosted application of registration/onboarding migration | hosted mutation is out of scope; staging first | owner approval + staging run |
| Hosted owner-governance and owner-MFA migrations; second-owner invitation; hosted MFA enrolment | same | owner approval gate |
| Real email delivery of owner invitations/recovery | no provider credentials here | staging with a real provider |
| 8 protected financial/auction/escrow 500s | payment/escrow/ledger domain is frozen | separate, approved financial phase |
| Feature-flag subsystem (10 routes) | needs a product decision (provision or remove) | owner decision |
| 33 missing-schema/missing-import admin-tool 500s | tables/models not provisioned | decide per feature: provision schema or retire route |
| Plain-`Error` → 500 convention across services | broad refactor | separate hardening pass |
| Owner management table at 390px | cosmetic | UI pass |
| Hosted verification of everything above | no hosted access in 16B | staging |
| Phase 15 operational risks (M-Pesa shortcode, amount-mismatch/late-success, dealer payment destination, live payment certification, seller commission policy) | explicitly out of scope; **still open** | unchanged |
