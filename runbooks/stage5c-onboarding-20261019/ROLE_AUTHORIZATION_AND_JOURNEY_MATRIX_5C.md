# Role authorization and journey matrix (Stage 5C)

Evidence: real SPA + real Express API + real PostgreSQL (disposable) + capture stubs. Tier R+P. Harness: `evidence/stage5c-20261019/harness/`. Counts: API parts A–E and the browser run in the final report.

## Journeys
| Journey | Steps proven | Evidence |
|---|---|---|
| Private seller | register (SPA) → "Check your email." → sign-in refused before verification → resend (generic notice) → emailed link verifies → replay safe → sign-in → seller workspace → account `individual_seller`/`pending` → listing held for review (`hold_for_review`) | role_api_a, UI US.1–US.10 |
| Dealer | register with business name/location → verify → sign-in → Dealer Hub overview with real zero metrics → dealer row unapproved → verification submission → admin approval is owner-reserved (ordinary admin gets `DECISION_AUTHORITY_REQUIRED`) → approved dealer needs an active subscription (402 until activated) → subscription activation (candidate migration) | role_api_b, UI UD.1–UD.10 |
| Inspector | public application (no account, no session) → pending → reviewer approval → account `ghost_checker` → set-password link by email only → sign-in → Inspector Dashboard → `GET /api/inspections/assigned` → assign/start/submit audited | role_api_c, UI UI.1–UI.8 |
| OTP (phone) | request → delivery via SMS stub → verify → wrong code / expiry / lock / resend / delivery failure / rate limit | role_api_e |
| Owner (disposable stand-ins) | CLI `--plan` → `--apply` issues invitations only → emailed link → signed-in verified account accepts → membership active → login → Owners tab → step-up actions → removal/recovery rules | role_api_d, UI UO.1–UO.4 |

## Authorization checks proven
| Actor | Allowed | Refused (status) |
|---|---|---|
| Anonymous | apply as inspector, register, verify, resend | list/approve applications (401) |
| Buyer / seller | own profile, own listings | list/approve inspector applications (403) |
| Inspector (`ghost_checker`) | own `assigned` worklist, own inspections | application review (403 — D5C-07); **but see O5C-01: other `adminOnly` routes still admit this role** |
| Ordinary admin | reviewer actions, staff tools | owner routes, dealer/seller approval (owner-reserved), Owners tab (not rendered) |
| Owner (active membership) | `/api/owner/*` with step-up password + typed confirmEmail + reason ≥3 chars | without step-up (403) |
| Removed / unusable owner | — | privileges absent; account still protected from ordinary admins |

## Browser-visible surfaces
Seller, dealer and inspector sessions render no Owners tab; ordinary admin renders none; disposable owner renders the Owners table (UO.2–UO.4).
