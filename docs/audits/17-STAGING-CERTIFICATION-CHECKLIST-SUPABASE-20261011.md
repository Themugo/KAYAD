# Staging certification checklist — Supabase schema, RLS, payments, realtime, attachments

To be executed by an authorised operator against the **staging** Supabase project (never production data). Nothing here was run against a hosted environment. Production was only *inspected* read-only (`evidence/hosted-readonly-20261011/`). Record PASS / FAIL / BLOCKED, evidence link, operator, date. Earlier checklists remain valid: `08-STAGING-CERTIFICATION-CHECKLIST-20261011.md` (attachments, sockets, two-account messaging, Messages redirect) and `02-STAGING-VERIFICATION-AND-ENV-CONVERGENCE-20261011.md`.

Never paste connection strings, passwords, service-role keys, cookies or JWTs into tickets or chats.

## A. Read-only discovery (before any change)
| # | Step | Expected |
|---|---|---|
| A1 | `BEGIN READ ONLY; \i supabase/preflight/INVENTORY_SCHEMA_SECURITY.sql; ROLLBACK;` → save as `staging-inventory.json` | one JSON document |
| A2 | `node scripts/supabase-reconcile.mjs docs/audits/evidence/certification-20261011/schema/repo-inventory-supabase-defaults.json staging-inventory.json --json staging-diff.json` | review every `critical`/`high` line; expected highs before the new migrations: the 14 `policy_differs`, `profiles.updated_at` missing, outbox objects missing if not yet applied |
| A3 | `node scripts/supabase-code-references.mjs staging-inventory.json` | list of tables the deployed code needs that staging lacks — compare with `08-…` §3 |
| A4 | `PREFLIGHT_MISSING_SCHEMA_OBJECTS.sql` | decide per object (esp. `transactions`, `config_*`, `disputes`) |
| A5 | `PREFLIGHT_FINANCIAL_AND_ROLE_STATE.sql` | record counts; if `profiles_role_mismatch > 0` take the backup in `11-…` §2 |
| A6 | Supabase dashboard → Authentication → "Allow new users to sign up" | **off** (the app uses its own auth; GoTrue sign-up only creates `authenticated` JWTs for attackers) |
| A7 | Supabase dashboard → Database → Replication / Realtime | note tables in `supabase_realtime` (expected: bids, cars, conversations, messages, notifications) |

## B. Apply (staging only)
| # | Step | Expected |
|---|---|---|
| B0 | staging built as a **schema-only clone of production**; the 38 hosted-only migrations exported and committed (`11-…` §6) | staging `schema_migrations` = production's 135 versions |
| B1 | apply every pending repository migration in version order (production is 52 behind, plus 5 unmatched older ones after diff review), ending with `20261011100000`, `20261011120000`, `20261011121000` | each succeeds; re-run A1/A2 → no `critical`, the 14 policies now match, no TRUNCATE for anon/authenticated (RLS-3) |
| B2 | deploy the backend build from this foundation | `/api/health` 200 |

## C. RLS and least privilege (use the public anon key only — never the service key)
| # | Step | Expected |
|---|---|---|
| C1 | `curl "$SUPABASE_URL/rest/v1/users?select=id&limit=1" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"` | `[]` or 401/permission error — **never rows** |
| C2 | same for `user_auth`, `refresh_tokens`, `chats`, `notifications`, `payments`, `ledger_entries`, `escrows`, `chat_message_outbox`, `governance_policies`, `risk_assessments` | no rows |
| C3 | `POST /rest/v1/rpc/kayad_place_bid_atomic` and `/rpc/kayad_claim_chat_outbox` with the anon key | permission denied |
| C4 | if sign-up cannot be disabled: create a throw-away Supabase-Auth user, repeat C1–C3 with its access token | no rows / denied |
| C5 | Supabase dashboard → Advisors → Security | no "RLS disabled", no "security definer view", no "function search path mutable" on `public` |

## D. Payments (M-Pesa sandbox only)
| # | Step | Expected |
|---|---|---|
| D1 | sandbox purchase/bid payment end to end | callback settles once; `webhook_events.processed = true` |
| D2 | auction registration with commitment (sandbox STK) | a `payments` row `type=bid_commitment`; on callback: payment `success`, hold `held`, registration `active/eligible`; provider receives 200 (not 500) |
| D3 | cancel the STK on the phone | payment `failed`, hold `failed`, registration `pending_commitment` |
| D4 | replay the same callback body | no second settlement |
| D5 | if `transactions` exists in staging with pending rows: complete one of those payments | still settles (legacy fallback) |
| D6 | escrow automation (FIN-1): do **not** enable; run the dry-run counts in A5 and attach them to the decision | decision recorded |

## E. Realtime
| # | Step | Expected |
|---|---|---|
| E1 | DevTools → Network → WS on the staging app: does the socket handshake to `VITE_SOCKET_URL` carry the `token` cookie? | Expected **no** if the socket host differs from the app host (see `15-…`) |
| E2 | user A and B signed in; B messages A | A's notification badge updates **without reload** only if E1 is yes |
| E3 | anonymous socket client | receives no `onlineUsers`, no user ids |

## F. Attachments and legacy assets
Rows A1–A12 of `08-STAGING-CERTIFICATION-CHECKLIST-20261011.md`, then `12-…` §3 steps 1–3 (inventory + plan, **no apply** without sign-off).

## G. Messages login redirect
Steps 1–11 of `02-…` §4 on the staging build.

## Sign-off
Do not promote to production while A6, B1, C1–C4, D1–D4 or E1 (decision on option A/B in `15-…`) is not resolved.
