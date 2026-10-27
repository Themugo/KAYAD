# KAYAD Phase 16 — Owner invitation flow and role/permission matrix

Evidence: `evidence/phase16-20261026/e2e_owner_identity_governance.txt` (72/72), real application + PostgREST + PostgreSQL 16 with the Stage 5B and Phase 16 MFA candidate migrations applied (disposable). Roles are real database rows exercised through real sign-in, not mocks.

## A. Adding a second System Owner (Priority B) — the flow that was proven
| Step | Control | Proven outcome |
|---|---|---|
| 1 | Only a verified, usable owner may open `/api/owner` | 8 lower roles (admin, accounts, hr, marketing, moderator, dealer, buyer, individual seller) and anonymous: **403/401** on list, invite and MFA routes |
| 2 | Invite = typed e-mail confirmation + owner password (+ second factor when enrolled) | wrong password / mismatched confirmation ⇒ refused, **no invitation row created** |
| 3 | One pending invitation per address | duplicate request does not create a second pending row |
| 4 | Token is 32 random bytes, stored as SHA-256 only, never in any API response, ledger or e-mail record | asserted; response contains no token |
| 5 | Preview shows a **masked** address only | asserted |
| 6 | Acceptance requires the mailbox-bound link; a *different* signed-in account cannot use it; an anonymous caller cannot take over a verified account | both refused |
| 7 | Single use; 24 h expiry | second use refused; expired link refused |
| 8 | An invitee without a verified account is verified **by** the link (the link proves mailbox control) and sets their own password; nobody is promoted silently | asserted |
| 9 | Two usable owners; no duplicate identity rows created | asserted (one `users` row per owner) |
| 10 | Any owner can remove another while ≥1 usable owner remains; **the last usable owner cannot be removed** | asserted |
| 11 | Lost device/credentials: the other owner runs *Recover* (out-of-band method + note ≥10 chars) | membership revoked, sessions dead, MFA factor and recovery codes reset, recovery invitation issued |
| 12 | Every step is appended to an immutable ledger (who/what/when/result/reason); ledger never contains a secret, token or recovery code | asserted |

**Provider caveat.** Delivery of the invitation e-mail uses Brevo. No provider is configured locally; the API honestly reports `emailDelivered: false` and nothing is fabricated. Live delivery is a staging item.

## B. Owner protection across ranks
For each of `admin`, `accounts`, `hr`, `moderator` (the four staff ranks tested): ban, deactivate, delete and role-change of an owner account are **refused (4xx) and the owner row is byte-unchanged**. `admin` could not ban/delete the *second* owner either. Owner e-mail address cannot be claimed by public registration under any casing (`OWNER_IDENTITY_RESERVED`).

## C. Staff least-privilege (Priority D) — before → after
| Area | Before (Phase 15 matrix) | After (Phase 16) | Gate |
|---|---|---|---|
| Ledger reads (`/api/ledger/*`) | open to all 9 staff roles | finance + admin/superadmin/owner only | `MANAGE_FINANCE` |
| Ledger writes | accounts + admin | unchanged | `MANAGE_FINANCE` |
| Communications config reads (rollout, templates, analytics, provider health) | all 9 staff roles | platform admin + support | any of `MANAGE_PLATFORM`, `MANAGE_SUPPORT` |
| Communications recipient history / delivery retry | all 9 staff roles | platform admin + support | same |
| Communications config writes | all 9 staff roles | platform admin | `MANAGE_PLATFORM` |
| Sales dashboard summary / revenue | staff | analytics / finance respectively | `VIEW_ANALYTICS` / `MANAGE_FINANCE` |
| Operations dashboards | admin only | **unchanged** — the controller (`ensureOperator`) already restricts to admin/superadmin/owner; verified empirically | — |

No new role or permission was invented; every gate is derived from `config/roles.js` (`config/staffAccessPolicy.js`, with unit tests). Per-role results for all 786 routes: `KAYAD_PHASE16_ROLE_ROUTE_PROBE_MATRIX.csv`.

Observed result for the communications/ledger examples (E2E): `hr`, `marketing`, `moderator`, `dealer`, `user` ⇒ 403 on ledger read; `accounts`, `admin` ⇒ allowed. Communications config: `hr`, `marketing`, `accounts`, `moderator`, `dealer`, `user` ⇒ 403; `admin` ⇒ 200.

## D. Deliberately not changed
* `adminOnly` still admits every staff role as a coarse first gate (documented defect D5); the fine gate is now per-area.
* `individual_seller` reads on `/api/dealer/*` (private-seller design).
