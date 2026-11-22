# 12 — Final handover (dealer workspace, team enrolment, navigation)
Nothing committed, pushed, deployed or applied to hosted databases.
## Implemented and tested
- Settings no longer repeats Team and Banking as tabs; old deep links forward to the real sections (test added/updated).
- Invitation e-mail names the dealership (invite + resend). Accepting an invitation clears the cached "no dealership" answer and offers "Open the dealership workspace".
- New real-link journey `17_team_invitation_lifecycle` (39 checks, loopback e-mail stub `brevo_stub.cjs`, `run.sh` wiring, `lib.mjs` optional fixed e-mail): creation, delivery failure/retry, resend invalidation, wrong person, other dealer, new-user acceptance, expiry, revocation/re-issue, duplicate, role change, cross-dealer manipulation, member denied invite, removal cut-off.
- Dealer browser harness `ci/browser/dealer.mjs`; regression evidence in `evidence/`.
## Implemented but not fully tested
Mobile Team/Settings layout (loads and fits at 13 widths; no form-interaction tests).
## Blocked / owner decision / not implemented
See 11.
## Files changed
`src/pages/dealer/dashboard/{DealerSettingsPanel,DealerDashboard}.tsx`, `src/pages/dealer/DealerTeamInvite.jsx`, `backend/controllers/dealerPlatformController.js`, tests `DealerSettingsCentre.test.tsx`, `DealerTeamInvite.test.tsx`, `ci/db-journeys/{17_team_invitation_lifecycle.mjs,brevo_stub.cjs,run.sh,lib.mjs}`, `ci/browser/dealer.mjs`, plus all earlier uncommitted work in the patch base.
## Safe to integrate?
The code changes are small and gate-green; recommend an owner review of the invitee sign-up flow in a real browser with a real e-mail provider on staging before release.
