# KAYAD V14.4 — Holistic Production Activation

## Scope

This release replaces piece-by-piece V14 patching with a single coherent hardening pass over the existing KAYAD architecture. Existing canonical services, routes, data access, realtime transport and domain contracts were edited in place; no parallel domain implementations were introduced.

## Corrections included

- Canonical notification worker defect fixed and regression coverage retained.
- Dealer verification controller converged on `dealerVerificationService` and the Supabase DB adapter; legacy `DealerVerification` model mutation paths removed.
- Lead CRM converged on atomic Supabase RPCs for lead creation and stage transitions.
- Lead timeline/activity persistence converged on the DB adapter; obsolete Lead/LeadActivity model wrappers removed after runtime import audit.
- Dealer leads UI now uses the canonical `leadApi` transport.
- Dealer escrow approval/force controls removed from admin control-plane routes.
- Vehicle escrow is private-seller only; dealer listing create/update paths cannot enable it.
- M-Pesa STK paths explicitly reject vehicle escrow funding.
- Canonical escrow custody configuration exposes bank-transfer funding instructions and admin custody account management.
- Existing escrow custody account mapping added to the shared model/table map.
- Inspection provider payable account and settlement payout ledger direction finalized in a final V14 migration (`5100 -> 1000`).
- Inspection settlement payout remains idempotent and requires closed, fully paid, reported bookings.
- OpenAPI was updated for the newly exposed escrow funding endpoints.
- Stale validators that referenced superseded implementation details were updated to validate the current canonical architecture instead of forcing legacy code back into the project.

## Certification performed in this environment

- V14 production activation: **16/16 PASS**
- Finance domain: **8/8 PASS**
- Subscription domain: **16/16 PASS**
- Inspection/chat/realtime: **10/10 PASS**
- Admin/control-plane: **11/11 PASS**
- Transaction integrity: **14/14 PASS**
- Communications cleanup/static certification: **PASS**
- Dealer verification/onboarding: **PASS**
- Escrow custody: **14/14 PASS**
- Inspection settlement/ledger: **10/10 PASS**
- Lead CRM: **16/16 PASS**
- Wave 2 invariants: **PASS**
- Wave 3 convergence/OpenAPI: **PASS — 1116/1116 routes documented**
- Holistic V14 source gate: **13/13 PASS**
- Backend/scripts JavaScript syntax: **800/800 PASS**
- No backend `res.status(501)` placeholders found.

## Live gates intentionally not claimed

Real authenticated live API certification and third-party provider certification still require real KAYAD certification credentials and provider credentials/recipient details. No synthetic production records were inserted and no financial production mutation was fabricated as a substitute for live certification.

## Environment note

The current container reports Node.js 22.16.0 while the project contract is Node.js >=22.22.2. Therefore a fresh dependency install/build in this container is not claimed as a certification result. Previous authoritative Windows Node.js 22.22.2 certification remains the baseline for the V13/V14 source release.

## Packaging

The release archive excludes `.git`, `node_modules`, `dist`, temporary files, logs and generated governance reports.
