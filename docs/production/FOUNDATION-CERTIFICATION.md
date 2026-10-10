# KAYAD Next Fix Foundation

Date: 2026-09-28

## Foundation source

This foundation is based on the last verified KAYAD Phase 8 source state.
No application/business-logic patch was applied for the V14 holistic failure.

## Certification finding

The V14 holistic validator passes 18/18 against the clean project source when local dependency directories are excluded.

The previously observed `EISDIR` failure on the Windows working copy is caused by `backend/node_modules` containing directories whose names end in `.js`:

- `backend/node_modules/bignumber.js`
- `backend/node_modules/decimal.js`
- `backend/node_modules/ipaddr.js`

The validator recursively scans `backend` and assumes every `.js`-suffix path is a file. This is a validator-environment issue, not an application source defect.

## Next-phase rule

Do not change marketplace, payment, escrow, authentication, communications, database, or other application business logic to address this issue.

Before the next fix cycle, install dependencies locally and address the validator's file/directory handling in a controlled validator-only change if required. Re-run the full release gates before producing the next foundation.

## Git / release discipline

- No commit or push is included in this foundation.
- This ZIP is a source foundation for the next certification/fix cycle.
- Generated `node_modules`, `dist`, coverage, backups, and `.git` metadata are intentionally excluded.
