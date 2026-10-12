# KAYAD Dealer Platform — Change Ledger

Every code change made during this mission, in the order it was made. "Verified by" lists the real tooling run after the change (never asserted without a run). No change listed here was pushed, committed, or deployed — this session has no linked git remote; the user applies these via the git commands at the end of this document (or by extracting the delivered zip over the live checkout).

| # | File | Change | Reason (gap register ref) | Verified by |
|---|---|---|---|---|
| 1 | `src/pages/dealer/dashboard/DealerDashboard.tsx` | Added `finance: dealerApi.getFinanceApplications` to the `operations` loader map; narrowed the shared stub-check from `['finance','team','settings']` to `activeSection === 'settings'`; added a dedicated `finance` render branch. | R3 — Finance tab had a real, safe backend contract and was never wired to it. | `tsc --noEmit`, `vite build`, full `vitest run` |
| 2 | `src/pages/dealer/dashboard/DealerDashboard.tsx` | Added `team`/`teamLoading`/`teamError`/`teamLoaded` state + `useEffect` calling `dealerApi.getTeamMembers()`; added the Team tab's render block (members list with honest empty state). | R4 — Team tab was an unbuilt placeholder despite a safe, authorized backend contract. | same |
| 3 | `src/pages/dealer/dashboard/DealerDashboard.tsx` | Added `reputation`/`reputationLoading`/`reputationError`/`reputationLoaded` state + `useEffect` calling `dealerApi.getReputation()`; added a brand-new Reputation render block and a `{ id: 'reputation', label: 'Reputation', icon: Star }` sidebar nav entry. | R5 — a fully working reputation/reviews capability had no dashboard entry point anywhere. | same |
| 4 | `src/pages/dealer/dashboard/DealerDashboard.tsx` | Extended the `DealerOperationResponse` type with a `finance` field (`items: { id, applicantName?, vehicle?, status? }[]`) so the new Finance branch type-checks. | Required by change #1. | `tsc --noEmit` |
| 5 | `src/pages/dealer/dashboard/DealerDashboard.tsx` | Header "Add Listing" button: added `onClick={() => onNavigate?.('seller-platform')}` (previously no handler at all). | R6 — dead header button. | same |
| 6 | `src/pages/dealer/dashboard/DealerDashboard.tsx` | "View All" (Lead Pipeline card): added `onClick={() => setActiveSection('leads')}`. | R7 — dead button. | same |
| 7 | `src/pages/dealer/dashboard/DealerDashboard.tsx` | "View Inventory" (Top Performing Vehicles card): added `onClick={() => setActiveSection('inventory')}`. | R7 — dead button. | same |
| 8 | `backend/controllers/dealerPlatformController.js` (`getFinanceApplications`) | Resolved `vehicle`/`applicant` raw UUIDs to a car title and user name via batched `Car.find({id:{$in:[...]}})` / `User.find({id:{$in:[...]}})` lookups before returning `items`, matching the pattern `getInspectionOrders` already uses. | R17 — found while implementing #1: the raw endpoint response had no join, so the newly-wired Finance tab would have rendered blank/undefined names instead of the real data. | `node --check`, full backend `npm test` |
| 9 | `backend/controllers/carController.js` (`updateCar`) | Added a guard: any non-staff caller setting `status: "rejected"` on a car not already `"rejected"` is rejected with `403 STATUS_ADMIN_ONLY`. | R15 — `status` was writable with no enum check and no `AUCTION_LOCKED_FIELDS` protection, letting a dealer silently freeze bidding on their own live auction by writing the one status value (`"rejected"`) `placeBid`/`auctionController.js` use as a hard stop — a value meant to be admin-moderation-only. | `node --check`, full backend `npm test` |

## Deliberately NOT changed (require the user's explicit authorization — live production database)

| Finding | Why it's not applied here | What's ready to apply |
|---|---|---|
| R12 — `dealers` table missing `bio`, `payment_details`, `onboarding_complete`, `onboarding_completed_at` columns that onboarding-completion code tries to write | Live-database schema change against the connected production Supabase project ("KAYAD EA"). This mission's standing rule is never to touch production without explicit authorization — reported via `SendUserMessage` with proposed SQL during Phase 3; no response received as of this delivery (checked repeatedly via `ReadNotifications`). | Additive migration SQL already drafted in `KAYAD_DEALER_ONBOARDING_STATE_MACHINE.md` §4. |
| R14 — `dealer_verifications.verification_status` CHECK constraint missing `'suspended'`, breaking the dealer-suspend admin action | Same reason — live-database constraint change, reported via `SendUserMessage` during Phase 4-5; no response received. | Additive migration SQL already drafted in the security report and gap register R14 entry. |

**If the user wants these applied:** say so explicitly (or reply to either `SendUserMessage`), and they can be run as a normal additive Supabase migration — nothing else in this delivery depends on them being applied first.

## Deliberately NOT changed (scoped out / informational, not defects)

- R1-NEW / R2 (`dealerPlatformRoutes.js` missing `requireApproved`; `dealerRoutes.js` duplicate-ownership architecture) — real but lower-severity findings left open per the brief's own rule against merging/deleting duplicate route namespaces without a proven migration plan.
- R8 (Settings tab) — genuine unbuilt capability, no existing backend contract to bind to; a build item, not a wiring fix, so out of this mission's "wire existing safe endpoints" scope.
- R9 (three orphaned dealer-dashboard frontend subtrees) — informational; no deletion performed without the user's own cleanup decision.
- R10 (Stage 36 footer-bypass) — explicitly out of scope per the brief's own Phase 8 instruction; no dependency found linking it to this mission's work.
- R11 (RLS row-vs-column gap on `dealer_verifications`) — confirmed not currently exploitable (no base GRANT exists for any client-side role); recorded as a hardening recommendation, not an active defect, and not changed without the user weighing in on tightening policy text that currently has zero live effect.
- R16 (no admin-visible dead-letter communications view) — a genuine new feature (an admin UI), not a fix to something broken; out of this mission's repair scope.

## Regression evidence (run after every code change above, not just once at the end)

- `npm run lint` (`tsc --noEmit`): 0 errors.
- `npm run build` (`vite build`): succeeds, `DealerDashboard` chunk present in output.
- Frontend `npx vitest run`: **643 passed, 1 skipped (pre-existing), 81 test files** — no regressions.
- Backend `npm test` (Jest + Vitest + node:test): **1159 Jest tests / 79 suites, 16 Vitest tests / 5 files, 1 node:test** — all passing, no regressions.
- `npm run validate:backend-boot`: PASS.
- Targeted validators directly touching this mission's surfaces — `validate:dealer-modal-convergence`, `validate:database-contract-alignment`, `validate:domain-lifecycle-integrity`, `validate:explicit-auth-flows`, `validate:registration-role-matrix`: all PASS.
- `validate:registration-onboarding` fails on `ENOENT: .env.production.example` — confirmed pre-existing (file absent from this checkout, script untouched by this mission) — see `KAYAD_DEALER_GAP_AND_RISK_REGISTER.md`'s "Validator-battery note."

## Exact git commands (for the user's own clone — this session has no linked GitHub)

```bash
# From the root of your local kayad-stage36 clone, after extracting the
# delivered zip over it (or applying the diffs by hand from this ledger):
git status
git add src/pages/dealer/dashboard/DealerDashboard.tsx \
        backend/controllers/dealerPlatformController.js \
        backend/controllers/carController.js \
        KAYAD_DEALER_CAPABILITY_WIRING_MATRIX.md \
        KAYAD_DEALER_GAP_AND_RISK_REGISTER.md \
        KAYAD_DEALER_ROUTE_API_OWNERSHIP_MAP.md \
        KAYAD_DEALER_CHANGE_LEDGER.md \
        KAYAD_DEALER_VALIDATION_MATRIX.tsv \
        KAYAD_DEALER_EXECUTION_REPORT.md \
        KAYAD_DEALER_*.md
git commit -m "Dealer platform convergence: wire Finance/Team/Reputation tabs, fix finance applicant/vehicle enrichment, block dealer-writable rejected status, dead-button fixes"
git push origin <your-branch>
```
