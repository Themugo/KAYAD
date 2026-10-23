# Phase 7 Regression and Preservation Report

## Preserved by scope

- Public marketplace source was not intentionally edited.
- No routes were renamed or removed.
- Existing KPI destinations were preserved.
- Existing admin API method names and backend route contracts were reused.
- Existing server-side role and pending-status filtering was reused; no new approval endpoint was added.
- No schema, migration, payment, auction, escrow, ledger, M-Pesa, authentication, secret or deployment configuration was changed.
- Existing dark teal/cyan command-centre layout and Nairobi skyline hero were not redesigned.

## Corrections made

- Pending dealer preview now uses the backend-filtered pending-dealer result rather than deriving the preview solely from the first general user page.
- KPI count display rejects invalid count shapes instead of presenting negative/fractional values as real counts.

## Regression risks not yet runtime-verified

- The added pending-dealer request increases one dashboard's request count by one. Runtime load/refresh behavior and error presentation must be checked with the real API.
- The new malformed-count test has not executed.
- Existing queue and review routes need authenticated browser coverage.
- The KPI definitions for total users, vehicles and live auctions reflect current backend query semantics; any change to their business definitions requires separate authoritative domain evidence.
- Public marketplace and responsive regression checks remain blocked until dependencies and compatible Node are available.
