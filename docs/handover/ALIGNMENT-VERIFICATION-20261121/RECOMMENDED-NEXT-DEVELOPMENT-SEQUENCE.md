# Recommended Next Development Sequence

> **Superseded in part (2026-11-21, later):** the post-alignment phase executed journeys, reconciled the baseline failures and found/fixed further defects. Where this document disagrees, `IMPLEMENTATION-AND-VERIFICATION-REPORT-20261121.md`, `FAILURE-REGISTER-20261121.md` and `HOSTED-DATABASE-MIGRATION-RECONCILIATION-20261121.md` are authoritative.

Order follows the priority list (security/data integrity -> auth -> financial -> journeys -> production function -> duplication -> UX -> cleanup). Each step lists files, reason, regression risk, validation. Nothing here was changed in this run.

1. **Hosted schema parity (F-DB-1).** User applies the 79 later migrations in filename order, one at a time, to a staging copy first, then hosted. Risk: DDL on production, so snapshot first. Validate: re-run the existence probe and `get_advisors`. Until then, do not deploy `main` to production.
2. **Idempotent registration replay on current `main` (F-REG-1/2).** Files: `backend/controllers/authController.js` (post-unified-account register), `backend/server.js` (add `Idempotency-Key` to CORS allowedHeaders), `src/services/authApi.ts`, `src/context/AuthContext.tsx`, `src/components/OnboardingFlow.tsx` (replace the `earlierUncertain` heuristic). Reuse the checkpoint's HMAC-derived verification-token design but with roles `user|dealer` only. Risk: medium (touches the sign-up path). Validate: the four tests named in REGISTRATION doc, `tests/registrationFlow.e2e.test.js`, a 390px lost-response journey, and `validate-registration-*`.
3. **Make the test gate meaningful (F-TEST-1/2).** Wrap the dashboard tests in a Router (or give `PersonalSignOutButton` a safe fallback); update brand-string and category-label expectations; set `CLOUDINARY_*` in the photo-removal test; exclude `tests/node/` from jest. Do not loosen assertions. Validate: vitest 0 failures, jest 0 failures.
4. **Reconcile validators (F-VAL-1).** For each stale validator, pin behaviour rather than literals; recreate or retire the missing artifacts (F-DOC-1), starting with the genuine `API_VALIDATION_GAP_REGISTER` gap. Then trace the "not traced" list in OUTSTANDING-ISSUES section C.
5. **Fix the 390px hero clip (F-HOME-1).** Files: `src/components/home/PremiumHero.tsx`, `premium-hero.css`. Preserve the approved desktop composition. Validate: Playwright geometry check at 360/390/430 plus a visual diff against the reference.
6. **Offer negotiation behavioural tests (F-OFFER-1).** Cover `performOfferAction`: authorisation, one pending offer per lead (unique index), idempotency key replay, accept -> transaction. Risk: low (tests only).
7. **Authenticated journeys on a migrated staging stack.** Personal account -> list -> moderate -> offer -> accept -> escrow -> inspection -> settlement; dealer onboarding -> workspace; operations. Use test accounts, sandbox providers.
8. **Duplicate cleanup (D1-D3, F-ROLE-1).** Only after steps 3-4: migrate the legacy dealer-dashboard test, remove orphans, and plan a legacy `individual_seller` row migration.
9. **Governance.** Add `CLAUDE.md`; archive root-level phase reports.

Packaging note: deliver as a full project ZIP with Windows-safe names (no colons) when changes begin.
