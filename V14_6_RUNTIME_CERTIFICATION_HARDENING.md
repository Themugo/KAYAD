# KAYAD V14.6 — Runtime Certification Hardening

## Scope

This release continues the holistic V14 production-activation track. It does not introduce a parallel authentication, marketplace, inspection, payment, escrow, dealer, or communications implementation.

## Corrections

- Corrected the V14 live API certification harness to use the existing canonical `/api/v1/auth/profile` endpoint instead of a non-existent `/api/v1/auth/me` endpoint.
- Added `scripts/validate-v14-live-certification-contract.mjs` to prove the live certification harness only targets routes that exist in the current canonical route tree.
- Added the certification-contract validator to the holistic V14 gate.
- Preserved the Node.js production engine contract at `>=22.22.2`.

## Verification

- V14 live certification contract: 13/13 PASS.
- V14 holistic source gate: 18/18 PASS.
- JavaScript/MJS/CJS syntax: 866/866 PASS.
- No backend HTTP 501 placeholder responses detected.

## Runtime-dependent gates

Actual deployed API/provider certification remains environment-dependent and must use real KAYAD certification credentials and configured provider credentials. This release does not fabricate production records or claim live runtime certification without those credentials.

## Archive hygiene

The release archive excludes `.git`, `node_modules`, `dist`, coverage output, logs, temporary files, and other local build artifacts.
