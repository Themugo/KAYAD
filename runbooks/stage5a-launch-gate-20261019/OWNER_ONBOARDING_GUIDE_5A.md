# Owner guide — operating onboarding (Stage 5A)

1. **Sign in** with the platform-owner email (the address in `WEBHOIST_EMAIL`). The account must exist and be email-verified; if it is not, sign-in is refused with "The platform-owner account is not verified" — use "Resend verification email" for that address, or the owner-recovery runbook. Nobody can claim the owner address by registering (it returns 403 `OWNER_IDENTITY_RESERVED`).
2. Open **Admin console → Onboarding**. You see the saved settings, their revision and last change. Only you can change them; admins and dealers get 403 even if they call the API directly.
3. Choose values and press **Save N changes**. If someone else changed settings meanwhile you get a conflict message and the latest values; nothing is overwritten.
4. **Users tab**: pending sellers/dealers show **Pending approval**. **Approve** makes the account active (dealers get the dealer record approved). **Reject** (dealers) records a rejection. Duplicate clicks are safe.
5. **Cars tab**: pending listings have **Approve** (publishes that one listing only) and **Hide** (not publicly visible; the seller is told "not approved"). Sold listings cannot be hidden or changed. "Rejected" as a stored status is not available until you decide D3.
6. **Audit tab** lists each decision (who, what, when).
7. If anything looks wrong, set dealer mode `closed` and sellers `disabled`, or leave `hold_for_review` — errors always resolve to the most restrictive behaviour.
