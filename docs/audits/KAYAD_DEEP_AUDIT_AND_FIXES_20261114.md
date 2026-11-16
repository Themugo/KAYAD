# KAYAD R20 — Deep audit and evidenced fix
**Baseline:** `KAYAD-FULL-CORRECTED-2026-11-14-R19.zip`
**Date:** 14 November 2026
**Scope:** Continue the release audit, prioritize dealer onboarding and listing ownership boundaries, rerun repository source validators, and preserve the existing application architecture.

## Critical defect discovered and fixed

### Dealer onboarding GET returned a ReferenceError
`backend/routes/dealerRoutes.js` had a `GET /onboarding` handler that referenced `businessName`, a variable that was never declared in that handler. It also ran company-name validation in a read-only GET route. This caused the onboarding draft request to fail at runtime before returning the dealer's saved draft.

**Correction**
- Removed business-name validation from the GET draft retrieval route.
- GET now returns the authenticated dealer's own onboarding draft with `Cache-Control: no-store`.
- Moved `validateCompanyName(businessName, { personName: req.user.name })` to `PUT /onboarding`, where `businessName` is sourced from the successfully parsed request body.
- Validation runs before dealer persistence or verification submission.
- Preserved the dealer-only applicant boundary. Personal accounts remain personal accounts; starting a separate dealer business application remains a distinct dealer-account flow.

### Regression protection
Added `scripts/validate-dealer-onboarding-readonly-draft.mjs` and npm script:
`npm run validate:dealer-onboarding-readonly-draft`

The new contract verifies:
1. Pending dealers can retrieve a saved/incomplete draft without a ReferenceError.
2. The write endpoint validates submitted company identity before persistence.
3. Dealer onboarding remains restricted to dealer business accounts.

## Validation run

### Focused checks passed
- Homepage responsive polish: 9/9
- Homepage convergence: PASS
- Mobile navigation polish: 38/38
- Listing self-publication: 21/21
- Business ownership and mobile navigation: PASS
- Phase 13E listing visibility: 14/14
- Registration/onboarding source gate: 47/47
- Registration/onboarding end-to-end source contract: 14/14
- New dealer onboarding read/write boundary: 3/3
- Migration hygiene: 198 files scanned; no duplicate migration bodies or duplicate table creators
- `node --check` across 1,503 backend and script JavaScript/MJS files: 0 syntax failures

### Broad static validator sweep
311 `scripts/validate-*.mjs` files were executed from the repository root:
- 265 passed
- 46 failed

The 46 failures are not all confirmed production defects. They include:
- Environment/dependency blockers: missing root/backend dependencies (`typescript`, `dotenv`, `lucide-react`), Node runtime below the repository's `>=22.22.2` requirement, missing live Supabase secrets, missing provider credentials, and validators that need live runtime.
- Stale or mismatched source contracts: e.g. prior featured-inventory request limit, prior admin quick-action destinations, prior personal-account dealer-application assumptions, and historical documentation paths that are not present in the current archive.
- Genuine source-contract failures still requiring investigation: admin seller list scoping/error states, dealer operations query contract, brand palette legacy utility use, and several admin/moderation/settings contracts. These have deliberately not been papered over by weakening checks or rewriting production logic without tracing the correct current contract.

The detailed validator names and output are available in the tool execution transcript; this report does not claim the 46 failures are resolved.

## Runtime/build limitations
- Environment Node is `v22.16.0`; project requires `>=22.22.2`.
- Root and backend dependencies are not installed in this extracted environment.
- Full Jest/Vitest, TypeScript, Vite production build, browser automation and live Supabase checks could not be certified.
- `validate:live-runtime` cannot run without `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Email/SMS provider certification reports providers as not configured in this environment.

## Items intentionally not changed
- No database migrations or live database writes.
- No change to personal-vs-dealer account identity model.
- No change to self-publication policy: personal listings and dealer listings remain self-managed without per-listing admin approval, subject to email verification, dealer verification submission, suspension/revocation and safety moderation rules.
- No administrator access to edit/delete another business's inventory was introduced.
- No payment, escrow, auction, communication provider or RLS policy was modified.
- No Git commit, push, merge or deployment.

## Next required audit targets
1. Trace seller directory scoping and ensure role filtering is consistent with the current user/dealer identity model.
2. Trace dealer operations queries and prove every listing/lead/finance query is scoped to the authenticated dealer or its authorized team membership.
3. Reconcile stale admin listing/moderation validators with the actual permission and ownership contract; do not reintroduce admin delete of seller-owned listings.
4. Fix confirmed brand palette violations only after checking semantic status meaning (success/warning/danger colors must not be blindly recolored).
5. Re-run all source validators after Node 22.22.2+ and dependency installation.
6. Perform real authenticated HTTP tests for GET/PUT dealer onboarding, two-dealer isolation, personal seller publication, dealer pending-verification publication, and public inventory visibility.

## Change control
R20 is an audit continuation and a targeted backend defect fix. R19 remains the rollback baseline. No commit, push, merge, deployment, migration or live production mutation was performed.
