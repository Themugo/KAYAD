# Phase 14.4 — Dealer Settings & Organization Profile Report

Contracts used (existing only):
* `GET /dealer-platform/profile/:dealerId` → `{id, businessName, name, bio, location, approved, memberSince, stats}` (public read).
* `PUT /dealer-platform/profile/:dealerId` → allowed fields `businessName, location, phone, bio`; self-only (403 otherwise).
* `GET /verification/status` (caller-scoped) → `onboardingStage` (email_unverified | application_not_submitted | pending_approval | approved | rejected | suspended | unknown).

Implemented in `DealerSettingsPanel.tsx`:
* Load state with retry, validation (business name required; bio ≤ 2000; phone shape), save with duplicate-submit guard, server-response refresh, `role="status"` success and `role="alert"` failure, unsaved-change warning.
* **Phone is write-only**: the GET contract does not return it, so the field is blank ("leave blank to keep current") and only sent when filled. No field or column was invented.
* Verification card is **read-only**; no approve/verify control exists. Failure degrades to "Verification status is unavailable right now." rather than a made-up status.
* The old "not backed by a canonical dealer-scoped data contract yet" placeholder was removed because a real contract exists; the test that asserted it was rewritten (not weakened) to assert the real load/retry behaviour.

Backend finding (not changed; needs separate authorization): `updateDealerProfile` runs `User.findByIdAndUpdate` **before** checking `user.role === "dealer"`, so a non-dealer calling the route for their own id can persist `bio`/`phone` and then receives a 404. Self-only and low impact, but the role check should precede the write.
