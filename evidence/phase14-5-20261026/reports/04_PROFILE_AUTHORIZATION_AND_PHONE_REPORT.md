# Profile Authorization and GET/PUT Phone Report (Workstreams A and B)

**Defect confirmed in 14.4:** `PUT /api/dealer-platform/profile/:dealerId` ran `User.findByIdAndUpdate` before the dealer-role check, so any authenticated user could persist `bio`/`phone` on their own row and then receive a 404; no protected-field guard; no length/type validation; phone accepted unvalidated and left `phoneVerified` unchanged.

**Phone source of truth:** `users.phone` (account identity phone). It also gates bidding (`phoneVerified`), so a changed number must not inherit verification. No second phone field was added.

## Contract now (`backend/controllers/dealerPlatformController.js`, route in `backend/routes/dealerPlatformRoutes.js`)
Order: authenticate (`protect`, rate limit) → caller id == path id (else 403) → role == dealer (else 403, no write) → body is object → protected fields rejected (400 `PROFILE_FIELD_NOT_ALLOWED`: role, permissions, status, approved, verificationStatus, dealer, dealerId, user, owner, email, id, tokenVersion, emailVerified, phoneVerified, password…) → field validation (400 `VALIDATION_FAILED` with per-field errors) → existence check (404, read-only) → writes.
* Omitted field = unchanged. `bio`/`location` `""` clears; `businessName` and `phone` cannot be empty/null.
* Phone must be a valid Kenyan number (`formatPhone`); stored normalised; if it changes, `phoneVerified` is set false in the same write. Unchanged number does not reset verification.
* Dealer record written first, user second; if the user write fails the dealer record is restored (no partial state). Error responses carry no stack/DB text.
* Audit event `dealer_profile_updated` lists changed field NAMES only (never the phone value).
* GET: `phone` appears only when the signed-in caller is the profile owner (`optionalAuth`); anonymous, buyer and other-dealer responses contain no phone (tested).
* Frontend: phone prefilled, sent only when changed, validated client-side, "needs to be verified again" notice, unsaved indicator, 400 field errors mapped.

## Evidence
`backend/tests/regression/dealerProfileAndTeamAuthorization.test.js` (profile cases incl. unauthenticated, wrong role with unchanged stored state, cross-organization, 7 escalation fields, 4 malformed bodies, validation, omitted-vs-empty, phone normalisation/verification reset, audit privacy, partial-write rollback, owner-only phone). Against the unmodified 14.4 code: 27 of the file's 36 tests FAIL, 9 pass; after the fix: 36/36 pass. CSRF is enforced by the global middleware (unchanged); rate limiter now on the route (source assertion test). Tier: mocked persistence, real controller code — not live.
