# AUTHENTICATION REWIRE AND COMPLETE TEST SUITE REPAIR

Started from a real, unrelated crisis discovered while fixing typecheck errors: this session began by re-cloning the repository after an environment reset, and running a full typecheck on the actual, live, pushed code revealed the earlier vulnerability fix had never actually reached GitHub, plus 16 genuinely failing tests describing real, unbuilt or broken functionality. All of it is now fixed. Full test suite: 317/318 passing (1 intentionally skipped), 0 failing, across 48 test files. Backend: 216/216 passing, 0 vulnerabilities.

---

## The headline finding: real user authentication was completely fake

`AuthModal.tsx`, the component every real visitor uses to sign in, never made a single request to the backend. Clicking any role button called `onLogin(hardcodedFakeUser)` directly - no password check, no server contact, nothing. Confirmed by reading the live component's source directly, not from a test's claim.

Traced why: this project has two separate, never-reconciled systems for talking to its backend. `src/services/authApi.ts` (built and verified earlier in this project's history) correctly matches the real backend - cookie-based auth, correct `/api/v1/auth/...` paths. `src/api/api.ts`/`api.exports.ts` (an older system) uses an incompatible Bearer-token-in-localStorage scheme and calls `/api/auth/...` - missing the `/v1` segment the real backend actually mounts under. `AuthContext.tsx`, and therefore `AuthModal.tsx`, was wired to the broken, older one.

**Fixed in three parts:**
1. `AuthContext.tsx` rewired to import from `services/authApi.ts` - every call site (`login`, `register`, `logout`, `getMe`/`updateProfile`) updated for that client's real return shapes (returns the user directly, not wrapped in `{ user }`) and real signatures (`login(email, password)`, two arguments, not one object). Added a real `demoLogin` following the same pattern.
2. `services/authApi.ts` gained a real `updateProfile` function (`PUT /api/v1/auth/profile`, confirmed against the real backend route) - the one operation the old client had that the new one didn't yet.
3. `AuthModal.tsx` rebuilt completely: real email/password fields, real error display for both a failed login and a genuine network failure, a real Create Account flow with role selection, and demo access correctly hidden unless `VITE_ENABLE_DEMO=true`. Built directly against this project's own existing, detailed test specification for exactly this behavior.

A second, directly-caused-by-this-fix bug found in the same pass: `App.tsx` never wrapped its tree in `AuthProvider` at all - it maintains its own, separate `user` state and was never using this context previously. The moment `AuthModal` started calling `useAuth()` for real, the whole app crashed on render. Fixed with the minimal, safe wrapper (`AppInner` + an outer `App` providing `AuthProvider`) rather than migrating every consumer of `App`'s own `user` state onto the context - `AuthModal`'s existing `onLogin(user)` callback already bridges a real, authenticated user back into `App`'s state after login succeeds.

---

## Every other real gap found and fixed this session

- **A genuine React Rules of Hooks violation** in `VehicleDetailModal.tsx` - a `useMemo` sat after three early-return statements, meaning it ran a different number of times depending on whether the modal was open or closed. This would throw a real React error for real users the moment the modal opened from a closed state. Moved to join this component's other hooks, all called unconditionally, with a null-guard matching the existing pattern.
- **Stale auction prices** shown instead of the real, live current bid - found and fixed in both `VehicleDetailModal.tsx` (desktop panel and the separate mobile sticky bar, which had its own copy of the same bug plus a hardcoded label that never switched) and `VehicleCard.tsx`.
- **`escrowOverride`** (a per-vehicle admin override of the escrow-mandatory rule) and **escrow/auction deep-linking** (`getEscrowIdFromUrl`/`setEscrowDetailUrl`, `getAuctionIdFromUrl`/`setAuctionDetailUrl`) - both had complete, passing-elsewhere-impossible test specifications but no actual implementation in the codebase. Built both directly against their own tests' specifications.
- **`useCountdown`'s two consumers** (`CountdownDisplay.tsx`, both copies) expected a different shape (`d`/`h`/`m`/`s`/`expired`/`urgent`) than the hook actually returned (`msRemaining`/`label`/`isEndingSoon`/`hasEnded`) - extended the hook with the derived fields rather than reverting its more performance-conscious design.
- **`VehicleCard.tsx`'s trust badges** (Dealer/Certified/Escrow/Finance) were still rendered visibly on every card despite an existing, explicit direction to remove them and preserve the information only via `aria-label` - fixed, and corrected "150-Pt Certified" to "Pre-Purchase Inspected" in the same pass (matching language already corrected elsewhere in this project). The auction badge's live countdown (switching from calm "LIVE" text to a real mm:ss countdown once genuinely ending soon) was also unbuilt - wired to the now-fixed `useCountdown`.
- **A hardcoded, already-past booking date** (`'2026-07-31'`) in `PreAuctionInspectionModal.tsx`'s date picker, with no `min` constraint preventing past-date selection at all - both fixed.
- **Backend vulnerabilities regressed**: the `semantic-release` removal from an earlier session's work had never actually reached the pushed repository - redone, plus a new, separate, genuinely different finding (`dompurify`, a real XSS-sanitization dependency) fixed and its actual sanitization behavior verified directly, not just assumed from a clean `npm audit`.

## A structural finding, not fixed - flagged for a future pass

`App.tsx` imports its real `AuctionsView` from `src/features/AuctionsView.tsx` (1,820 lines) - a separate file from `src/features/AuctionsView/components/AuctionsView.tsx` (2,216 lines), which shares the same component name and was the file examined in earlier work on this project. Both files were kept in sync for the escrow-payment fix found in this same investigation, and the full test suite (which exercises the real, actually-imported file through rendering) is fully green - so nothing is currently broken by this duplication. Worth a dedicated cleanup pass to understand why two same-named components exist and consolidate them, not attempted here given time.

---

## Verification

| Check | Result |
|---|---|
| Frontend TypeScript | 0 errors |
| Frontend lint | Clean |
| Frontend unit test suite (Vitest) | 317/318 passing (1 intentionally skipped), 0 failing - up from 16 failing at the start of this session |
| Frontend production build | Succeeds |
| Backend syntax validation (every file) | 0 errors |
| Backend unit test suite (Jest) | 216/216 passing |
| Backend `npm audit` | 0 vulnerabilities |
