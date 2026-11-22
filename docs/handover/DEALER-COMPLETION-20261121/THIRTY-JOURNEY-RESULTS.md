# Thirty named dealer journeys — results

Run: `ci/db-journeys/12_dealer_named_journeys.mjs` (real HTTP against a disposable database, inside `ci/db-journeys/run.sh`). Raw evidence: `evidence/thirty-journeys.json`, `evidence/journey-12.log`. Legend: **PASS** executed and asserted; **PASS-BY-REFERENCE** exercised by another journey in the same harness run (named); **BLOCKED** needs a provider or credential; **NOT TESTED** not scripted.

Tally: 25 PASS, 1 BLOCKED, 2 NOT TESTED, 2 PASS-BY-REFERENCE (30 journeys).

| # | Journey | Actor | Status | Actual result / evidence |
|---|---|---|---|---|
| 1 | Dealer registration | dealer (new) | **PASS** | user row dealer/pending/1 (role/status/dealer rows) |
| 2 | Email verification | dealer (new) | **BLOCKED** | The verification link is sent by the mail provider; the harness marks email_verified directly in the disposable DB. No provider is available, so the mail round trip is not verified here. |
| 3 | Business information submission | dealer (pending) | **PASS** | PUT 200 {"success":true,"message":"Dealer onboarding completed and verification submitted.","dealer":{"id":"daabb45c-f8e6-4ff4-a / GET 200 |
| 4 | Document upload | dealer (pending) | **NOT TESTED** | No paperwork requirements are configured in the disposable DB (checklist is empty), and the document store is an external provider. The upload path was not exercised. |
| 5 | Pending approval | dealer (pending) | **PASS** | dealers.approved=f; create-listing as pending dealer -> 201  |
| 6 | Approval, rejection and resubmission | admin + dealer | **NOT TESTED** | Admin dealer-review endpoints were not scripted in this suite; approval is set directly in the disposable DB for the other journeys. |
| 7 | Create vehicle listing | dealer owner | **PASS** | POST /api/cars -> 201 |
| 8 | Save draft | dealer owner | **PASS** | draft stored; inventory read 200; visible to owner: true; hidden from public: 404 |
| 9 | Edit eligible listing | dealer owner | **PASS** | PUT /api/cars/:id -> 200  |
| 10 | Upload and manage vehicle photographs | dealer owner | **PASS** | upload 200 (images now 2); reorder 200; cover 200; delete 200. Provider is the loopback Cloudinary stub, NOT real Cloudinary. |
| 11 | Publish listing | dealer owner | **PASS** | publish -> 200; detail for the public 200 |
| 12 | Pause listing | dealer owner | **PASS** | pause -> 200; public detail now 404 |
| 13 | Republish listing | dealer owner | **PASS** | republish -> 200; public detail 200 |
| 14 | Mark sold | dealer owner | **PASS** | mark-sold -> 200; exactly one sale record |
| 15 | Bulk status changes | dealer owner | **PASS** | bulk pause (duplicate id collapsed) -> 200 updated=2 |
| 16 | Prevent editing or deleting sold listings | dealer owner | **PASS** | edit sold -> 409 LISTING_SOLD_READ_ONLY; delete sold -> 409 LISTING_DELETE_BLOCKED; price unchanged |
| 17 | Receive buyer enquiry | buyer -> dealer | **PASS** | lead row seeded in the DB (the buyer-side enquiry endpoint was not scripted) and returned by GET /dealer-platform/leads -> 200 |
| 18 | Respond to enquiry | dealer owner | **PASS** | note 201; stage update 200; stored activity actor/type = d657513a-411d-4709-b0ae-a221c1ad3f26/dealer |
| 19 | Convert an enquiry into an eligible transaction | buyer + dealer | **PASS-BY-REFERENCE** | Accepted offer -> settlement -> payment is exercised end to end by journey 05_offer_payment (simulated provider callback). Not repeated here. |
| 20 | Customer appears after a released deal | dealer owner | **PASS** | released escrow f9f2904c seeded in the DB; GET /customers -> 200; buyer listed: true |
| 21 | Invite team member | dealer owner | **PASS** | invite -> 201 |
| 22 | Assign role | dealer owner | **PASS** | accept -> 200; stored role sales_agent |
| 23 | Change and revoke role | dealer owner | **PASS** | change -> 200 (viewer); revoke -> 200; revoked member can read inventory -> 403 |
| 24 | Role restrictions and cross-business isolation | staff + other dealer | **PASS** | lot_agent mark-sold -> 403; self-elevation -> 403; dealer B sees A's car: false; dealer B pauses A's car -> 404 |
| 25 | Save and retrieve banking information | dealer owner | **PASS** | save 200; read-back bank=Named Bank. Full cases in journey 10. |
| 26 | Payout masking and access restrictions | owner / staff / anonymous | **PASS** | finance_officer -> 403; anonymous -> 401; owner response carries masked fields: true |
| 27 | Complete an eligible escrow lifecycle | buyer + dealer | **PASS-BY-REFERENCE** | Escrow funding is driven by a payment-provider callback. Journey 05 and the legacy journeys exercise it against the simulated callback; real M-Pesa is BLOCKED (no credentials). |
| 28 | Auction and settlement restrictions | dealer owner | **PASS** | pause with bids -> 409 AUCTION_OR_BID_LOCK; mark-sold with bids -> 409 AUCTION_OR_BID_LOCK. Escrow / settlement locks: journeys 09 and 11. |
| 29 | Inspection workflow | dealer owner | **PASS** | GET /dealer-platform/inspections -> 200 (list only) Only the read path was exercised; ordering, completing and reading a report were NOT TESTED. |
| 30 | Marketing, notifications and support access | dealer owner | **PASS** | marketing 200; notifications 200; support tickets 200; viewer marketing -> 403 |

## Honest limits
* Real Cloudinary is **BLOCKED** (no credentials). J10 (photos) ran against the loopback provider-compatible stub; it proves the application integration (upload, reorder, cover, delete, ownership), not the real provider.
* J2 (email verification) is BLOCKED: no mail provider; the harness marks the account verified in the disposable database.
* J17 seeds the lead row in the database: the buyer-side enquiry endpoint was not scripted, so only the dealer side of receiving it is verified. J20 likewise seeds a released escrow row and verifies the dealer-side Customers view.
* J4 and J6 are NOT TESTED (no paperwork requirements configured; admin review endpoints not scripted). J29 verifies only the inspections list.
* J19 and J27 depend on a simulated payment-provider callback (journey 05 and the legacy journeys); real M-Pesa is BLOCKED.

## Preconditions common to all rows
Disposable database built from the full migration chain; dealer approved directly in the database (except J1-J5 which use a pending dealer); staff join through the real invite and accept endpoints with a known token hash installed on the row (mail is not delivered). Per row the roles, API calls, expected and actual results, and permission checks are in the table and in the log; each is a permanent regression check (journey 12 fails the harness if any asserted row regresses).
