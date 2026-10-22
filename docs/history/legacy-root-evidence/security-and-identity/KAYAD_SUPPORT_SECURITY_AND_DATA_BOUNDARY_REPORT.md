# Support — Security & Data-Boundary Report

## Boundary model (after)
| Actor | Can | Cannot |
|---|---|---|
| Customer (owner) | create, list, read own case (allow-list projection), reply, rate once when resolved/closed | see internal notes, staff names/emails, priority, SLA internals, resolution note, other customers' cases (**same 404 as a missing case — no existence oracle**), set priority/status/assignee/SLA |
| Support staff = `PERM.MANAGE_SUPPORT` (technical_support, admin, superadmin, owner; honours per-user grants/revokes) | queue, metrics, read full case, public reply, internal note, assign, prioritise, escalate, resolve, close | act without that permission |
| Other staff (marketing, hr, accounts, ad_manager, moderator, ghost_checker…) | – | any support endpoint (403) — previously allowed via `adminOnly` |
| `authenticated` / `anon` (Supabase direct) | owner may SELECT safe columns only | read `messages`, staff fields; INSERT/UPDATE/DELETE; EXECUTE any `kayad_support_*` function |

## Enforcement layers (defence in depth)
1. **Route**: `requireSupportStaff` (permission-based). Customer routes always scope by caller id.
2. **Service**: ownership check *before* any RPC; customer actor kind is fixed to `customer` regardless of `req.user.role`; `isInternal` from a customer is ignored.
3. **Serializers**: customer projection is an allow-list; staff identities reduced to `{id,name,role}` (no email).
4. **Database**: RPCs re-check owner, closed state, transition table, reopen window, active-staff assignee, optimistic `row_version`; `service_role`-only EXECUTE; direct table writes revoked; column-level SELECT without `messages`.

## Proofs (PostgreSQL, migration-built; `evidence/support/support_hardening_proof_output.txt`)
P1 number generated · P2 idempotent create (1 row) · P3/P4 customer reply and staff internal note are **not** a first response · P5 staff public reply sets it · P6 other customer cannot append · P7 customer cannot post internal · P8 `open→closed` rejected · P9 resolve needs note · P10 marketing user rejected as assignee · P11 stale version rejected · P12 audit row written · P13 owner-only/1–5/once rating, comment kept out of `resolution_notes` · P14 reopen in window, rejected outside · P15 closed rejects replies · P16 legacy RPC inert · P17 **`authenticated` and `anon` get `permission denied` on EXECUTE** · P18 `messages` unreadable by owner · P19 owner sees own row, other customer 0 rows · P20 direct INSERT/UPDATE denied · P21 metrics, target compliance `null` when unconfigured.
Revert-proof: removing the internal-note filter fails the Jest guard (`revert_proof_internal_notes_leak.txt`: 1 failed → restored 41/41).

## Residual risk / not proven
- **ENVIRONMENT-BLOCKED**: grants and RLS were proven on a local PG16 that emulates Supabase roles; confirm on staging that `has_function_privilege('authenticated', 'kayad_support_append_message(uuid,uuid,text,text,boolean,integer)','EXECUTE')` is false and `messages` is not selectable (queries in the Runtime Certification).
- Free-text customer content is stored as text and rendered by React (escaped); no HTML rendering path exists. Email bodies carry only generic text and the case number — never subject/description/notes.
- No attachments: the API rejects them (nothing to scan/serve). Do not enable until private storage + signed URLs exist.
- Rate limits reuse the shared `createLimiter`/`chatLimiter`; limits are not support-specific.
