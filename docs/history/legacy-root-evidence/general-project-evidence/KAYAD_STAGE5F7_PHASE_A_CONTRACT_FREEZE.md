# KAYAD Stage 5F.7 — Private-Seller Auction & Physical Custody Contract Freeze

**Date:** 20 October 2026  
**Foundation:** Stage 5F.6 full-project ZIP  
**Foundation SHA-256:** `49595b3ed4901b433edf70659c62122c2899beea6a55dfc04cf0be283e3c8925`  
**Scope:** Phase A contract freeze and implementation boundary definition. No hosted database, account, production, payment, deployment, commit or push actions.

## 1. Frozen business decisions

1. Physical vehicle custody is mandatory for every private-seller auction. No standard self-custody exception is permitted by default.
2. The seller pays the disclosed inspection/custody charges before an inspection booking is confirmed. Payment confirmation must come from the canonical payment/ledger authority; a client boolean or uploaded receipt is not sufficient.
3. Failed or inconclusive verification blocks auction publication, scheduling, activation and bidding. A seller may correct evidence, request reinspection or appeal through a traceable workflow.
4. Eligible custodians are approved garages and dealers with a separate, explicit, active `vehicle_custody` capability. Dealer status or inspection capability alone is insufficient.
5. Admin approval is a separate decision from inspection and custody. The admin approves a specific evidence version and proposal version, not a mutable vehicle record in perpetuity.
6. Existing dealer auction operations, auction engine, bid/financial services, inspection services, seller dashboard and escrow remain canonical. No second marketplace, auction engine, or financial ledger is to be created.

## 2. Independent state dimensions

Do not overload the existing `cars.auctionStatus` or an auction setup `publication_status` with the entire trust lifecycle.

- `proposal_status`: `draft`, `submitted`, `under_review`, `changes_requested`, `approved`, `rejected`, `withdrawn`.
- `verification_status`: `not_started`, `awaiting_payment`, `assigned`, `in_progress`, `passed`, `failed`, `inconclusive`, `expired`, `disputed`.
- `custody_status`: `awaiting_partner`, `handover_scheduled`, `received`, `in_custody`, `release_authorized`, `released`, `refused`, `incident_hold`.
- `auction_status`: continue to use the existing canonical lifecycle state; never create a parallel live status source.
- `appeal_status`: `not_requested`, `submitted`, `under_review`, `upheld`, `overturned`, `closed`.

A current approved proposal is a conjunction of independent, authoritative records. It is not one client-editable status field.

## 3. Eligibility contract

For a private-seller auction, activation and bid placement require all of the following to be true at the server-side decision point:

- authenticated seller owns or is authorized to consign the canonical vehicle;
- seller and vehicle identity evidence is accepted and has not expired or been superseded;
- the required inspection is passed, attributable to an eligible inspector, and bound to the same vehicle identity/evidence version;
- seller payment for required inspection/custody charges is confirmed by canonical payment/ledger records before booking;
- a currently approved garage/dealer custodian has explicit active custody capability;
- handover is recorded and the vehicle is actually `received`/`in_custody`, with required intake evidence and accountable staff/location;
- an authorized admin approved the same proposal/evidence version and recorded actor, timestamp, reason and policy version;
- auction configuration passes existing `auctionSetup.contract.js` checks and the auction is not on hold, rejected, disputed, expired or suspended.

The server must re-evaluate eligibility on publication/activation, scheduled-start execution, public auction projection where applicable, and bid placement. UI hiding is not enforcement. If any authoritative record is missing, stale, contradictory or unavailable, the private-seller auction must fail closed.

## 4. Custody partner responsibilities

`vehicle_inspection` and `vehicle_custody` are distinct capabilities. A partner may have both only when each is separately granted and active. Custody intake should capture:

- canonical car/proposal identifiers and normalized VIN/chassis/registration match;
- assigned provider organization, responsible staff member, approved premises and capability status;
- appointment and handover timestamp, seller and recipient acknowledgements;
- intake odometer, key/document inventory, exterior/interior condition, existing damage and timestamped photos;
- current custody location and movement history;
- incident/exception state and authorized release instruction.

Do not expose seller identity documents, private contact information, risk notes, handover signatures or exact custody location in public auction payloads. Release must be a separately authorized, audited transition. `incident_hold` blocks release and auction actions until resolved.

## 5. Failure, appeal and financial rules

- `failed`, `inconclusive`, `expired` or `disputed` verification blocks activation and bidding.
- Correction/reinspection creates a new evidence/result version; it must not overwrite or erase the previous result.
- Appeal is a review workflow, not an automatic override. A reviewer must not silently convert a failed result to passed.
- Suspected fraud can trigger an operational hold and restricted review; retain evidence and immutable decision history.
- Inspection/custody charges and any refund are handled through the existing canonical payment/ledger path. This contract does not authorize inventing a fee, refund, forfeiture or buyer-remedy rule. Exact fees, cancellation treatment and refund authority must be configuration/terms-backed before collecting money.
- If an auction becomes ineligible while live, block new bids immediately and initiate the approved suspension, notice and financial-reconciliation workflow. Do not directly mutate ledger outcomes from the custody service.

## 6. Authorization contract

| Actor | Permitted | Must not be able to |
|---|---|---|
| Private seller | Create/edit own draft, submit evidence, pay disclosed fee, schedule handover, request correction/reinspection/appeal | Self-approve, mark inspection passed, mark vehicle received, grant custody capability, publish/live/enable bids |
| Inspector | View assigned cases, record inspection evidence/result within capability | Accept custody without capability, approve own case, edit seller ownership evidence |
| Custodian garage/dealer | Accept assigned handover, record intake/movement/incident, request authorized release | Grant itself capability, approve auction, release under incident hold, alter inspection result |
| Admin reviewer | Review evidence and decide within permission scope; suspend/escalate | Approve missing/stale evidence or bypass the eligibility gate without a separately audited policy exception |
| Scheduler/system worker | Activate only after the same server-side eligibility contract passes | Treat a past approval or published setup as a permanent eligibility token |
| Buyer/bidder | View public approved projection and bid if all existing bidder gates pass | Read private evidence/custody data or bid on ineligible auction |

Where practical, the reviewer should be independent of the inspector/custodian. Conflicts must be disclosed and block self-approval under the frozen policy.

## 7. Source-of-truth boundaries found in Stage 5F.6

- Existing private-seller UI: `src/features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx`.
- The existing canonical bid endpoint is `backend/controllers/bidController.js`.
- Existing dealer setup endpoints: `backend/routes/auctionSetupRoutes.js`, mounted under `/api/dealer` and `/api/v1/dealer`.
- Existing setup contract and readiness: `backend/services/auctionSetup.contract.js` and `backend/services/auctionSetup.service.js`.
- Existing canonical bid endpoint: `backend/routes/bidRoutes.js` / `backend/controllers/bidController.js`.
- Existing auction lifecycle: `backend/services/auctionLifecycle.service.js`, plus scheduler/atomic transaction functions.
- Existing provider governance: `backend/inspection/services/providerGovernanceService.js`.
- Existing inspection API/service and existing payment/ledger/escrow services must be reused.

Important observed limitation: dealer setup routes are guarded for dealer role; their `publish` operation is not a distinct private-seller admin approval. Existing `vehicleReadiness()` checks inspection and ownership-related flags but does not establish physical custody. Financial escrow is not vehicle custody. The complete route/job/bid matrix still needs executable integration tests.

## 8. Implementation sequencing / exit criteria

### Phase A — Contract and threat-model freeze

This document and `KAYAD_STAGE5F7_THREAT_MODEL.md` freeze business decisions, trust boundaries, state dimensions, authorization and fail-closed criteria.

### Phase B — Backend source-of-truth and persistence integration

Before modifying behavior, map the actual production-compatible database abstraction and canonical identity/car/inspection/provider/payment records. Define local migration(s), RLS/authorization policy and idempotent service operations for proposal, payment confirmation, inspection, custody intake, admin decision and appeals. Avoid introducing an unconnected shadow schema.

### Phase C — Universal enforcement

Wire the authoritative eligibility evaluator into every path that publishes, schedules, starts, exposes as live or accepts a bid. Ensure atomic/stale-version protection and negative tests. Preserve dealer behavior unless a shared invariant applies to all sellers.

### Phase D — UI integration

Integrate into the existing seller, partner and admin screens after backend contracts stabilize. No parallel dashboard or mock inventory.

### Phase E — Staging certification

Run unit/service tests, API authorization matrix, real PostgreSQL/RLS, concurrency/idempotency, scheduler and Playwright end-to-end journeys. No production migration or deployment without explicit authorization.

### Phase A exit

- Business decisions above are frozen from the user’s explicit selection.
- Threat model, role matrix, eligibility conjunction and failure semantics are documented.
- The next implementation step is Phase B schema/record ownership integration, followed by Phase C enforcement. This artifact alone is not a security implementation and does not certify production.
