# Stage 5F.7 — API and Authorization Contract Matrix

This is the target contract for implementation; it does not claim all endpoints exist yet.

| Operation | Seller | Inspector | Custodian | Admin reviewer | Buyer/public | Gate / audit |
|---|---|---|---|---|---|---|
| Create/edit proposal | Own draft only | No | No | Read/review | No | Owner check; proposal version |
| Submit proposal | Own proposal | No | No | Review queue | No | Evidence manifest and submit event |
| Confirm fee payment | Initiate own payment | No | No | Read-only status | No | Canonical provider callback/ledger only |
| Assign inspection | Read own assignment | Assigned inspector only | No unless also inspector | Authorized assignment | No | Capability and assignment audit |
| Submit inspection result | No | Assigned inspector | Only with inspection capability | Review evidence | No | Result version, evidence hash/refs, actor |
| Assign custody partner | Read own case | No | No self-assignment | Authorized operations/admin | No | Active `vehicle_custody` capability |
| Accept physical handover | Acknowledge handover | No unless also custodian | Assigned active custodian | Read/escalate | No | Intake evidence and both-party acknowledgements |
| Record custody movement/incident | Read limited status | No | Assigned custodian | Read/resolve | No | Append-only movement/incident events |
| Approve/reject proposal | No | No | No | Authorized reviewer only | No | Evidence/proposal version compare-and-set |
| Request correction/reinspection/appeal | Own case | Respond within assignment | Respond within assignment | Review/decide | No | Versioned reason and decision history |
| Publish/activate | No direct trusted-state mutation | No | No | Existing authorized action only after gate | Read public approved projection | Recompute all eligibility server-side |
| Place bid | No if owner | No | No | No | Eligible authenticated bidder | Recompute gate before payment initiation |
| Release vehicle | Acknowledge receipt | No | Only on authorized release | Authorized release decision | No | No release under incident hold |

## API design requirements for Phase B/C

- Use the canonical car ID; do not create a second vehicle identity table.
- Store proposal, verification, custody and appeal state separately from canonical auction lifecycle state.
- Make create/submit/payment-confirmation/receipt/decision/release operations idempotent.
- Require expected version or compare-and-set for admin decisions and activation.
- Keep public response schemas allowlisted and private evidence routes scoped to assigned parties.
- Every state transition must emit an auditable event with actor, role, timestamp, reason code, evidence/proposal version and correlation/idempotency key.
- All failures from the eligibility gate must return stable machine-readable codes; do not start payment initiation before the eligibility gate passes.
