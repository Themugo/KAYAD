# KAYAD Phase 16B — Owner / dealer authorization matrix

Ground truth is the database after each call (suite `runbooks/phase16b-20261027/http/e2e_phase16b_owner_dealer_separation.cjs`, 41 checks; role matrix 786 routes × 16 roles).

## Accounts
| Address | Intended status | What the code does with it |
|---|---|---|
| `jimmythemugo@gmail.com` | primary System Owner | owner only when an active verified `owner_memberships` row exists (database mode) or the address is verified in `WEBHOIST_EMAIL` (legacy). **No role rewrite is made or proposed.** Not touched in 16B |
| `kayadautomotives@gmail.com` | second System Owner | becomes owner only by accepting an invitation sent by an existing owner (password + typed email + TOTP). **Not invited in 16B** |
| `kamauwamakena@gmail.com` | preserved test dealer | plain dealer; no owner path; **not approved, not activated** |
| any other KAYAD-domain / look-alike address | none | plain user; no permission derived from the domain (S6) |

## Actions by actor (✔ allowed, ✖ refused, – not applicable)
| Action | Owner | Admin | "superadmin"-labelled non-owner | Staff roles | Dealer | Dealer staff | User/seller | Anon |
|---|---|---|---|---|---|---|---|---|
| Open owner management / list owners | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Invite second owner | ✔ (password+email+TOTP) | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Remove owner / recover owner | ✔ other owner only; last usable owner ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Enrol / disable own MFA | ✔ | – | – | – | – | – | – | – |
| Create staff with role superadmin/webhoist/owner | – | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Set another account to superadmin/webhoist/owner | – | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Self-promote via `PUT /api/auth/profile` | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | – |
| Gain privilege via `POST /api/auth/register` body (`role`, `super_admin`, `isOwner`, `status`, `permissions`…) | – | – | – | – | – | – | – | ✖ (stored role ≤ requested public role; never super_admin) |
| Dealer onboarding body with `approved/verified/role/isOwner` | – | – | – | – | ✖ (ignored) | ✖ | – | – |
| Dealer team invite with `owner/webhoist/superadmin/admin` | – | – | – | – | ✖ | ✖ | – | – |
| Use a session after demotion or ban | – | ✖ next request | ✖ | ✖ | ✖ | ✖ | ✖ | – |

## Layers
| Layer | Enforcement | Evidence |
|---|---|---|
| Database | owner authority is a table (`owner_memberships`) with append-only ledger; recovery/removal guarded; nothing derives it from `users.role`, domain or dealer tables | owner suite 73/73 (D) |
| API | owner router gate; step-up on sensitive changes; privilege fields stripped from register/profile/onboarding; staff create/update refuse owner-grade roles | S1–S4 41/41 |
| Session | role/ban re-read every request; recovered owner's old sessions die; MFA login challenge, replay, lockout | S5, owner suite, browser B4 |
| UI | `/admin/owners` shows nothing to dealers/users ("Access Denied"); owner page, MFA enrol/challenge/recovery work on the real stack; no overflow at 390px | browser 18/18 |

Role matrix: every `/api/owner*` route is 4xx for all 15 non-owner roles in both baseline and final; the set of low-privilege 2xx cells is identical before and after 16B (235 = 235, 0 added).
