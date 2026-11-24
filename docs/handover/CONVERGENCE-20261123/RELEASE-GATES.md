# Release-gate checklist (PASS = local evidence only)
| Gate | Local | Production |
|---|---|---|
| Dealer register / log in / business profile / approval states | PASS (journeys 12, 24) | NOT VERIFIED |
| Add / edit vehicle, photos add-remove-poster, persistence after refresh | PASS (journey 12, browser) | NOT VERIFIED |
| Listing status and public marketplace visibility | PASS (23, 24, browser) | NOT VERIFIED |
| Bulk select, bulk remove only for canDeleteCars, cross-dealer prevented | PASS (25, Vitest, browser) | NOT VERIFIED |
| Invite staff, Basic Staff Access default, enrol, accept | PASS (17, 21, 22) | NOT VERIFIED |
| Staff numbers (unique, never reused), work identity | PASS (22) | NOT VERIFIED |
| Custom roles, overreach refused | PASS (14, Jest) | NOT VERIFIED |
| Temporary duties granted, expire, revoked | PASS (25, Jest, browser) | NOT VERIFIED — migration not applied |
| Former staff lose access; records and attribution kept | PASS (22, 25) | NOT VERIFIED |
| Personal vs dealership separation; cross-dealer isolation | PASS (16, 21, 22, 23) | NOT VERIFIED |
| Buyer enquiry, dealer/staff reply, vehicle requests | PASS (23, browser) | NOT VERIFIED |
| Sidebar groups, active nav, sign-out reachable, desktop + mobile | PASS (Vitest, browser) | NOT VERIFIED |
| Keyboard / accessible names on new controls | PASS (Vitest role queries; buttons, `aria-expanded`, labelled checkboxes) — no screen-reader test | NOT VERIFIED |
| Backend permission checks and DB tenant isolation | PASS (Jest, journeys) | NOT VERIFIED (hosted RLS) |
| Live e-mail delivery | NOT VERIFIED | NOT VERIFIED |
| Business e-mail provisioning / verification | NOT IMPLEMENTED (deferred) | — |
| PR 266 | NOT VERIFIED | NOT VERIFIED |
