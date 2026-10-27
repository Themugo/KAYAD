# Dealer business authorization matrix (verified on the real database)
| Operation | Endpoint | Allowed | Denied (tested) |
|---|---|---|---|
| Read own dealer profile (incl. phone) | GET /dealer-platform/profile/:id | owner | others get public fields only (no phone) |
| Edit business name/location/bio | PUT /dealer-platform/profile/:id | dealer role, own id | other dealer 403; buyer 403; anon 401; unknown fields 400 |
| Change contact phone | same | owner + current password | missing 403 STEP_UP_REQUIRED; wrong 403 STEP_UP_FAILED; repeated -> 429 |
| Settlement/payment details | PUT /dealer/settlement | verified dealer, own row | malformed paybill/phone/account 400 VALIDATION_FAILED; other dealer cannot touch |
| Earnings | GET /dealer/earnings | owning dealer | response carries only an explicit column list (no buyer phone/user id/checkout id/metadata) |
| Auction setup/publish/amend | /api/dealer/cars/:id/auction/* | owning verified dealer | other dealer 403/404; deleted 404; sold/reserved/active/closed/with bids 409 AUCTION_SETUP_LOCKED |
| Team invite/update/remove | /dealer-platform/team/* | dealerOrgAccess canManageTeam | roles without permission 403 (14.7 behavior re-run, 60/60) |
| Delete listing | listing delete | owner; blocked when reserved/live auction (14.8) | unchanged |
Dealers cannot alter another dealer's payout, settlement or auction configuration; staff-level overrides remain on the existing admin routes.
