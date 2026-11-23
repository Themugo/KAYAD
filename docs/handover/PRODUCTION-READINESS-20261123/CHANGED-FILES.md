# Changed files versus current origin/main (5bbf2843), not committed by Claude
Modified (5): `backend/controllers/dealerPlatformController.js` (shared e-mail rule, coded 403 + masked hint, fingerprint log) · `src/pages/dealer/DealerTeamInvite.jsx` (wrong-account panel + sign-out-and-switch) · `backend/tests/regression/dealerTeamInvitationLifecycle.test.js` · `src/__tests__/pages/dealer/DealerTeamInvite.test.tsx` · `ci/browser/team-invitation.mjs`.
New (3 code/test): `backend/utils/emailIdentity.js` · `backend/tests/regression/emailIdentity.test.js` · `backend/tests/regression/authIdentitySource.test.js`.
Handover/evidence (13 modified or new): README, TEST-RESULTS, CHANGED-FILES, INVITATION-ACCEPTANCE-AUDIT, **MERGE-RECONCILIATION** (new), evidence logs and browser screenshots.
Removed (4 duplicate documents whose content already lives in the renamed files): `CI-DB-JOURNEYS.md`, `DEPLOYMENT-TOPOLOGY.md`, `LISTING-RPC-COMPATIBILITY.md`, `LOGIN-ROOT-CAUSE.md`.
No migration, workflow, financial, or production file changed.

## v5 addendum
Changed: backend/controllers/dealerPlatformController.js, backend/middleware/rateLimiter.js, backend/routes/dealerPlatformRoutes.js, backend/routes/dealerRoutes.js, backend/services/email.service.js, src/App.tsx, src/components/OnboardingFlow.tsx, src/pages/dealer/DealerTeamInvite.jsx, src/services/dealerPlatformApi.js, related tests, ci/db-journeys/17 and run.sh, ci/browser/team-invitation.mjs.
New: backend/tests/regression/teamInvitationEmails.test.js, src/__tests__/onboarding/OnboardingInvitation.test.tsx, ci/db-journeys/21_invitation_first_onboarding.mjs, DEALER-TEAM-ONBOARDING-AND-PRIVACY-AUDIT.md.
