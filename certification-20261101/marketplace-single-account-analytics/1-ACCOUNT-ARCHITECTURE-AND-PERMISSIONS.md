# 1. Account architecture and permission report

## Principle
One person = one `users` row = one authentication identity (`user_auth`) = one login. Everything else is a **capability or an application attached to that user id**. Nothing creates a second identity.

## What was found in the existing code (before this change)
| Area | Finding |
|---|---|
| Registration | `POST /auth/register` creates one user (role `user`, shown as "buyer" in the UI). No separate buyer/seller registration route exists. |
| Private seller | Already a *capability* on the same user: `private_seller_capabilities` (status pending / approved / rejected / suspended / revoked), applied for via `POST /private-seller-capability/apply`, decided by staff. Independent of `users.status`. |
| Dealer | Buyer starts `POST /dealer/application` on the **same** account (done in the earlier dealer work); role becomes `dealer` only on admin approval. Rejection of a buyer's application leaves `users` untouched. |
| Inspector | **Defect D-44:** `InspectorApplication.user` was recorded, but approval looked the person up **by typed e-mail** and could create a *new* user with a random password when the typed address did not match the signed-in account. A signed-in buyer could therefore end up with two identities. |

## Changes
1. **Inspector application is bound to the signed-in identity** (`controllers/inspectorApplicationController.js`)
   - Signed-in applicant: the contact e-mail is forced to the account's own e-mail; the "already pending" check is per user id.
   - Approval loads **`application.user`** first (e-mail lookup is only the fallback for guest applications). The same user row is converted in place (same id, name, e-mail, phone, history).
   - All earlier safeguards are unchanged: staff/dealer accounts are refused (409), unverified buyer e-mail refused (409), reserved owner addresses refused, applicants cannot approve themselves, reviewer roles unchanged.
2. **`GET /api/account/capabilities`** (new, read-only, `protect`): one consistent view for the one account menu.
   `buyer`, `privateSeller{status,granted,canApply}`, `dealer{status,granted,canApply}`, `inspector{status,granted,canApply}`. Only GET exists - there is no way to write a capability from it.
3. No change to who may grant: dealer approval, inspector approval and private-seller decisions remain staff-only, permission-checked and audited.

## Capability matrix
| Capability | Granted by | Pending grants | Rejected / revoked effect on buyer + private-seller |
|---|---|---|---|
| Buyer (browse, save, enquire, bid, purchases) | Registration | n/a | never removed by any business decision |
| Private seller | Admin decision on `private_seller_capabilities` | nothing | rejection leaves buyer intact; can re-apply |
| Dealer | Admin approval -> role `dealer` | nothing (application rows only) | buyer rejection does **not** change `users.status` (earlier fix) |
| Inspector | Admin approval -> role `ghost_checker` + `inspection_providers` row | nothing | rejection changes only the application row |
| Staff roles | Owner/superadmin only | - | - |

## Known limitations (stated, not hidden)
- Roles are still a single `users.role` column. An approved **inspector or dealer** therefore *replaces* the display role `user`; their saved items, bids, messages and listings are untouched (no deletes occur), and the private-seller capability row is independent, but the platform does not yet model "dealer **and** inspector" simultaneously on one account. A full role-set refactor was judged too invasive for this change; the capability view and application binding were delivered instead.
- Buyer <-> private-seller switching is a UI/permission matter on the same session; no logout and no second account is involved. Private-seller activation keeps the **existing admin review gate** (it is not auto-granted), because that is the established business rule.

## Security non-regressions
No endpoint accepts a role or capability from the client. `protect`, `authorize`, `requireDecisionAuthority`, CSRF and the reserved-owner checks are untouched. Tests: `accountCapabilities.test.js`, `guestAccessContract.test.js`.
