# KAYARD KE — scope correction and regression enforcement (audit)

Local evidence only. Nothing here was deployed, applied to a hosted database, committed or pushed. PR 266 remains open: NOT VERIFIED.

## Implementation audit (against the confirmed business rules)
| Area | Finding | Result |
|---|---|---|
| Dealer registration / onboarding | `POST /api/v1/auth/register` (role dealer) and `PUT/GET /api/dealer/onboarding` need no payment; account starts `pending`, `dealers.approved=false`. | Conforms |
| Dealer approval | `approve-dealer` and `verify-dealer` (approve/reject) keep pending/approved/rejected/suspended states; they are owner-reserved (`DECISION_AUTHORITY_REQUIRED` for an ordinary admin). Existing behaviour, unchanged. | Conforms |
| Listings | No per-listing KAYARD approval anywhere: approved dealers publish directly; held listings (pending dealer, existing `sellerMayPublishDirectly` rule) are released automatically on dealer approval. Post-publication hide/approve stays as a safety/fraud/legal control. | Conforms |
| Personal accounts | Register free, no approval gate; can list; admin `toggle-ban` still blocks login/actions and can be lifted. | Conforms |
| Packages / monetisation | `dealer-listing-policy.subscriptionRequired` defaults to false (free). Admin can switch it on/off (configurable); plans are never required by default. No new payment paths were added. | Conforms |
| Staff | Basic Staff Access (`basic_staff`, zero permissions) is the default invite role; backend `dealerWorkspaceAccess` enforces permissions; invitation lifecycle and offboarding journeys (17, 21, 22) pass. KAYARD is not in the staff supervision path. | Conforms |
| RLS / tenant isolation | Journeys 16, 17, 23 assert cross-dealership isolation (404/403). Not weakened. | Conforms |

## Genuine conflicts found and corrected (UI wording only)
My earlier dashboard wording implied KAYARD reviews each listing:
1. `dealerStatusHint('pending')` said "Under review by KAYARD KE…" -> now "On hold until your dealership account is approved, then it goes live automatically. KAYARD KE does not review listings one by one."
2. Command Centre tile `tile-pending` label "Under review" -> "On hold".

No behaviour, route, migration, permission or table was changed.

## Documented, left unchanged (ambiguous / pre-existing)
- Shared lifecycle label `getListingLifecycle('pending') = "Under review"` and the status badge/filter option in inventory predate this work, are asserted by older tests, and are shared with personal-seller screens. Left as is; the row hint beneath now explains the real meaning. Owner may choose to rename it later.
- Pending dealers: the existing progressive-access rule may publish their listings directly; otherwise they are held. Preserved.

## New regression coverage
`ci/db-journeys/24_scope_correction.mjs` (26 checks; registered in `run.sh`): journeys 1–8, 14, 16, 17 — free registration, onboarding, pending state, ordinary admin refused, owner approve and reject, held listing released, workspace access, add/edit/publish without a per-listing gate, public visibility, personal account free, ban/unban, packages off by default, switchable and restored. Journeys 9–13, 15 are covered by 23 (enquiries, replies, staff RBAC), 17/21/22 (invitation, acceptance, wrong account, offboarding) and 16/23 (isolation).

## Files changed in this task
- src/pages/dealer/dashboard/DealerDashboard.tsx
- src/pages/dealer/dashboard/CommandCentrePanel.tsx
- src/__tests__/pages/dealer/DealerLaunchUi.test.tsx
- ci/browser/dealer-launch.mjs
- ci/db-journeys/24_scope_correction.mjs (new)
- ci/db-journeys/run.sh
- src/styles/dark-theme.generated.css (regenerated; no diff expected)
- docs/handover/SCOPE-CORRECTION-20261123/* (new)

## Local test evidence (this checkout, disposable DB)
| Command | Result |
|---|---|
| `npx tsc --noEmit -p .` | exit 0 |
| `npx vitest run` | 230 files, 1,969 passed, 1 skipped |
| `npm run build` | exit 0 |
| `cd backend && node --max-old-space-size=3072 --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit --maxWorkers=2` | 263 suites passed (1 skipped), 4,317 tests passed, 21 skipped |
| `ci/db-journeys/run.sh` (all, `INVITATION_RATE_LIMIT_MAX=1000`) | overall=PASS, 33 journeys, 213/213 migrations; 24 = 26/26; 23 = 42/42 |
| `node ci/browser/dealer-launch.mjs` (fresh stack) | 31/31 |
Note: without `INVITATION_RATE_LIMIT_MAX=1000` journeys 21–23 hit the invitation limiter (429) because they run many invitations; the production limiter is unchanged. Ten `scripts/validate-*.mjs` fail identically on baseline main (pre-existing).

## Remaining risks / blockers
- Mail delivery, Cloudinary, hosted RLS and Render/Vercel behaviour are not verified locally.
- Task A migration `20261123210000_lead_create_find_before_insert.sql` is not applied to the hosted database (see DEALER-LAUNCH-20261123/OWNER-SQL.md).
- Hosted Team & Employment live test still pending from the owner.
- Dealer paperwork upload path not exercised (no requirements configured in the disposable DB).

## Release-gate checklist
| # | Journey | Local | Production |
|---|---|---|---|
| 1 | Dealer registers without paying | PASS (24) | NOT VERIFIED |
| 2 | Business onboarding | PASS (24) | NOT VERIFIED |
| 3 | Correct admin review state | PASS (24) | NOT VERIFIED |
| 4 | Admin approve / reject | PASS (24) | NOT VERIFIED |
| 5 | Approved dealer workspace | PASS (24, browser) | NOT VERIFIED |
| 6 | Add / edit / manage vehicles | PASS (24, 09, 11) | NOT VERIFIED |
| 7 | Publication without blanket gate | PASS (24) | NOT VERIFIED |
| 8 | Public marketplace visibility | PASS (24, 23) | NOT VERIFIED |
| 9 | Buyer enquiries | PASS (23, browser) | NOT VERIFIED |
| 10 | Dealer/staff view and reply | PASS (23, browser) | NOT VERIFIED |
| 11 | Invite staff, Basic default | PASS (17, 21, 22) | NOT VERIFIED |
| 12 | Acceptance and linking | PASS (17, 21) | NOT VERIFIED |
| 13 | Staff limited to role | PASS (14, 23) | NOT VERIFIED |
| 14 | Personal vs dealership separation | PASS (24, 21, 22) | NOT VERIFIED |
| 15 | Offboarding keeps history | PASS (22) | NOT VERIFIED |
| 16 | Admin restrictions work | PASS (24) | NOT VERIFIED |
| 17 | Free access; packages configurable, inactive | PASS (24) | NOT VERIFIED |
| — | Live e-mail delivery | NOT VERIFIED | NOT VERIFIED |
| — | PR 266 | NOT VERIFIED | NOT VERIFIED |

This is not a claim that the project is production-ready.
