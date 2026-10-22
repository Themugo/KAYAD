# KAYAD Stage 5F.7 — Private-Seller Auction Threat Model

**Foundation:** Stage 5F.6 (`49595b3ed4901b433edf70659c62122c2899beea6a55dfc04cf0be283e3c8925`)

## Assets to protect

1. Correct identity of the vehicle (VIN/chassis, registration and physical condition).
2. Seller authority to sell/consign the vehicle.
3. Integrity and freshness of inspection evidence and admin approval.
4. Physical possession, custody location, keys, documents and release authority.
5. Buyer bids, commitments, payments, escrow/ledger records and buyer trust.
6. Private identity documents, signatures, contact details and internal risk notes.
7. Integrity of audit history and dispute/appeal evidence.

## Trust boundaries

- Browser/client to API: all client-supplied state is untrusted.
- Seller to inspector: evidence can be incomplete, altered, mismatched or deliberately misleading.
- Inspector to custodian: inspection does not prove receipt or continued possession.
- Partner to KAYAD: provider identity and role are insufficient without active per-capability approval.
- Admin to workflow: admin decisions must be permission-scoped, version-bound and auditable.
- Scheduler/worker to auction engine: background activation is a privileged mutation and must run the same eligibility gate as manual activation.
- Auction engine to bid/payment/ledger: no ineligible auction may accept a bid or trigger a buyer commitment/payment side effect.
- Private evidence to public auction projection: only approved, explicitly public fields may cross this boundary.

## Threat scenarios and required mitigations

| Threat | Attack/failure | Required control | Negative test |
|---|---|---|---|
| Fake or stolen vehicle | Seller uploads a real document for a different car | Physical VIN/chassis match, registration/ownership evidence and signed inspection bound to evidence version | Mismatched VIN blocks proposal approval and activation |
| Seller self-approval | Client sends `approved`, `verified`, `received` or `live` fields | Ignore client authority fields; derive state server-side; admin-only decision endpoint | Forged body cannot change any trusted state |
| Admin approval bypass | Dealer publish route or another route starts private auction | Separate private-seller approval; central gate on every activation path | Direct endpoint, scheduler and bid endpoint all reject missing approval |
| Fake inspection | Seller or unapproved partner submits a pass | Inspector capability, assignment, evidence attribution, immutable result history | Unapproved/unassigned inspector cannot pass case |
| Fake custody | Partner marks received without actual handover | Explicit custody capability, assigned case, handover acknowledgements and intake evidence | Inspector-only partner cannot accept custody |
| Partner suspension | Suspended garage continues receiving vehicles | Recheck capability state at assignment and receipt; block new intake | Suspended provider cannot accept new case |
| Custody loss or release scam | Vehicle moved/released without authorization | Movement history, incident hold, separate release authorization and audit | Incident hold blocks release and auction continuation |
| Stale evidence | Approval remains after VIN/doc/inspection changes | Evidence/proposal version binding and expiry checks | Any changed version invalidates prior approval until re-review |
| Race condition | Two reviewers or worker/admin activate concurrently | Atomic compare-and-set/version checks and idempotency keys | Concurrent conflicting decisions cannot both succeed |
| Scheduler bypass | Scheduled auction starts based only on timestamp/setup | Re-run authoritative eligibility inside lifecycle transition | Ineligible scheduled auction stays non-live and non-biddable |
| Bid bypass | Auction appears live due stale status while trust gate fails | Bid endpoint independently evaluates eligibility before payment initiation | Failed/inconclusive/expired/custody-missing auction cannot initiate bid payment |
| Private data leak | API returns ID documents, custody details or risk notes | Scoped serializers, row/tenant authorization and field allowlists | Public API excludes sensitive fields; unauthorized user gets denial |
| Fee/refund dispute | Client claims payment or workflow invents refund/forfeit | Canonical payment/ledger confirmation and approved terms/refund rules | Uploaded receipt/client boolean cannot unlock booking; no duplicate refund |
| Evidence deletion | Failed case erased to hide history | Append-only event/audit history and versioned reinspection/appeal | Resubmission retains previous failure and actor/time/reason |
| Collusion/conflict | Same actor inspects and approves own case | Conflict-of-interest rule and reviewer separation where practical | Conflicted reviewer is blocked or escalated |
| Denial of service/abuse | Repeated proposal, booking or appeal requests | Rate limits, idempotency, scoped access and audit | Retries do not create duplicate charges/cases |

## Abuse-resistant invariants

- No public/live/biddable private-seller auction without current approval, passed current verification, confirmed seller-paid pre-booking fee, eligible custodian and recorded physical receipt.
- No state supplied by the browser is authoritative for payment, inspection, custody, approval or live status.
- A new verification result never erases a prior result; a new version requires a new decision.
- Financial side effects remain inside existing canonical payment/ledger services.
- Public projections exclude private evidence and custody secrets.
- Failure is fail-closed: missing record, timeout, ambiguous identity, expired capability or stale version means blocked, not presumed valid.

## Residual risks requiring operational policy

- Define the actual inspection/custody fee schedule, cancellation fees and refund authority before collection.
- Define liability, insurance, vehicle damage, storage duration, keys/documents handling, towing, abandonment and release terms with legal/operations review.
- Define verification sources and escalation for disputed ownership/registration records.
- Define custody SLA, no-show fees, partner service-level monitoring and emergency release process.
- Define retention periods and access controls for identity documents, signatures, location and inspection photos.

## Audit status

This is a threat model and contract freeze, not proof of implemented controls. The Stage 5F.6 source showed existing auction, bid, inspection and provider governance building blocks, but did not demonstrate a complete private-seller approval-plus-physical-custody chain. Phase B must establish canonical persistence and authorization before the gate is wired into live flows.
