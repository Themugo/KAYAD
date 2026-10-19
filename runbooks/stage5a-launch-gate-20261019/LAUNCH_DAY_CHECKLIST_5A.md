# Supervised first-onboarding checklist — Stage 5A (one private seller, one dealer)

Do not start until **every** box in section A is ticked. Nothing here is done for you.

## A. Pre-onboarding (blockers)
- [ ] D4: Gate C migration authorized, rehearsed on a branch, applied; hosted preflight shows **16/16 OK** (saved BEFORE/AFTER).
- [ ] D6: owner account provisioned intentionally on the hosted DB, its email **verified**, sign-in confirmed (an unverified owner is refused by design).
- [ ] D5: Brevo key + verified sender + `FRONTEND_URL` + `REQUIRE_EMAIL_VERIFICATION=true` set; live email test passed with your own mailbox (see EMAIL runbook) → Gate B = PASS.
- [ ] D7: Windows tree synced with this package via reviewed diff (no wholesale overwrite); stray `tatus --short` file removed; Node ≥ 22.22.2.
- [ ] Backup / PITR marker recorded; `verify:backup` run for real.
- [ ] Cloudinary (or the chosen media provider) configured on staging and a test listing with an image created.

## B. Settings (owner, in Admin → Onboarding) — confirm values with the register
- [ ] Sellers enabled (email verification always required)
- [ ] Dealer mode: ____________ (D1)   • Listing moderation: hold_for_review (D2)
- [ ] Dealer/seller approval authority: owner_only   • Listing decisions: owner_only
- [ ] Press **Save**, reload the page, confirm values persisted (revision increases).

## C. Private seller
- [ ] Register with the seller's real address → "Check your email" → open link → "Email verified".
- [ ] Sign in; account shows **Pending approval**; cannot list yet.
- [ ] Admin → Users → **Approve**; seller receives the notification.
- [ ] Seller submits a listing → it stays **pending** (hold_for_review) → Admin → Cars → **Approve** (publishes only that listing) or **Hide**.

## D. Dealer
- [ ] approval_required: register → verify email → shows pending → Admin → Users → **Approve** (or **Reject**). Confirm approving published nothing.
- [ ] self_onboarding: register → verify → limited listing (≤3) while unverified.
- [ ] Audit tab shows each decision; applicant received the message.

## E. Stop conditions
Any 5xx, an unexpected role, a listing published without your decision, or a verification link that works twice → stop, switch dealer mode to `closed` and sellers to `disabled`, and investigate.
