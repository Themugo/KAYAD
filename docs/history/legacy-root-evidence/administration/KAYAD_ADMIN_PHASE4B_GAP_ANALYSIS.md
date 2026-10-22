# Phase 4B — Remaining Gap Analysis

| Area | Current state | Evidence | Remaining action | Priority |
|---|---|---|---|---|
| Foundation integrity | PASS | SHA-256 and ZIP integrity verified | None | P0 |
| Canonical route/navigation | Static PASS | 14/14 validator | Authenticated direct-route and active-state browser checks | P1 |
| Hero status honesty | Fixed, source-level | 13/13 dashboard validator | Browser verify restricted/failed-source state | P1 |
| Hero/quick actions | Source implemented | Existing component and links | Confirm action destinations in browser | P1 |
| KPI metrics | Partial | Existing stats API fields | Verify payload semantics with authorized runtime | P1 |
| Active Staff KPI | Honest link fallback | No authoritative count proven | Use count only if an existing verified source supports it | P2 |
| Approval queues | Static PASS | Phase 04 13/13; Stage 5F.2 11/11 | Browser verify real counts, review actions, empty/restricted/error states | P1 |
| System Health | Honest route fallback | Existing control-room link | Embed only real existing health source | P2 |
| Vehicle submissions | Partial; image fallback added in prior phase | Source checks | Test real/invalid image URL, detail/action links and payload fields | P1 |
| Live auctions | Partial | Explicit live-status filter | Verify API semantics; do not infer status from listing status | P1 |
| Team/RBAC | Sample-limited | Source labels sample limitation | Verify counts remain clearly sample-based | P2 |
| Department rail | Honest route fallback | Existing staff/departments route | Embed counts only if existing source supports them | P2 |
| Provider rail | Honest route fallback | Existing provider governance route | Embed status only if verified source supports it | P2 |
| Business calendar | No verified source | Data provenance audit | Keep absent unless an existing event source is found | P3 |
| Keyboard focus | Improved source-level | CSS focus rules; validator 13/13 | Real keyboard test | P1 |
| Responsive layout | CSS breakpoints present | Static source check | Browser screenshots at desktop/tablet/mobile | P1 |
| Typecheck | BLOCKED | Node 22.16.0; dependencies absent | Node >=22.22.2 and locked install | P0 |
| Build | BLOCKED | `vite: not found` | Install locked dependencies and build | P0 |
| Vitest | BLOCKED | `vitest: not found` | Install locked dependencies and run tests | P0 |
| Browser/screenshot | NOT RUN | No authenticated runtime | Run authenticated E2E and compare screenshots | P0 |
| Final scope | PASS by diff | Three existing files changed, reports added | Recheck diff before release | P0 |
