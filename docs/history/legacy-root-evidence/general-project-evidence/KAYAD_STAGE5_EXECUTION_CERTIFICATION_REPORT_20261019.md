# KAYAD — Stage 5: Owner-controlled onboarding, email verification and first-seller readiness
**Execution and certification report** · work performed Sunday 18 October 2026 (Africa/Nairobi); archive named for 19 October 2026 as the brief requires · Node.js 22.22.2 / npm 10.9.4

## 1. Decision
# **READY WITH EXPLICIT BLOCKERS**
Not "READY FOR CONTROLLED FIRST-SELLER ONBOARDING", because the launch-critical *email delivery* path and the *hosted* database/owner-account state have not been proven live, and no browser journey was run. Not "NOT READY": the registration, verification, authorization, dealer-mode, moderation and recovery paths pass on emulated persistence, and the registration function and settings storage pass on a real (disposable) PostgreSQL. Onboarding one supervised seller and one dealer tomorrow is reasonable **once the blockers in §3 are cleared**.

## 2. What was built (all server-enforced, owner-controlled, no redeploy to change)
- **Owner settings** (Settings → Onboarding; `GET/PUT /api/admin/settings/onboarding`): private-seller registration, dealer onboarding mode (`self_onboarding` / `approval_required` / `closed`), listing moderation (`hold_for_review` / `auto_publish`), and who may decide dealers and listings (`owner_only` / `admins`). Stored in the existing `system_settings` table — **no migration**. Strict validation, owner-only change (verified owner email), revision compare-and-swap (409 on conflict), audit of actor/old/new/outcome, fail-safe reads (missing → launch defaults; unreadable or damaged → restrictive).
- **Email verification for sellers is always required** (no longer depends on the Brevo configuration) and grants nothing except the verified flag.
- **Both dealer modes work and are switchable at runtime.** Application received / email verified / dealer approved are separate states with separate wording; acknowledgement notification on application; derived `onboardingStage` for the UI.
- **Moderation controls publication:** created `pending` under hold; approval of a dealer no longer bulk-publishes unless `auto_publish`; sellers can no longer self-publish via bulk endpoints.
- **Dealer decisions:** one authority rule on all three approval endpoints plus single and bulk listing moderation; atomic transitions (concurrent approve/reject → one 409); consistent `users.status`.
- **Security fixes found in the audit:** verification tokens no longer reach logs; owner-only controls require a verified owner email; inherited-key validation bypass (found by my own test) closed.

## 3. Blockers and gates (what still blocks onboarding tomorrow)
| # | Blocker | Type | Clear by |
|---|---|---|---|
| B1 | **Live email delivery not proven** (no Brevo credentials/authorized recipient here). Registration succeeds without it, but the seller cannot verify and therefore cannot act | Verification | Email runbook §3–4; checklist 8–10 |
| B2 | **Owner account must exist with a verified email** (else owner-only controls refuse; an unregistered owner address could be claimed) | Operational | Checklist 4 |
| B3 | **Hosted database state unknown** (registration function, `system_settings`, migration level) | Verification | Checklist 5–6 |
| B4 | **Owner must save the initial settings** (defaults apply otherwise; they keep dealers closed to listing) | Owner action | Checklist 12 |
| B5 | **No browser journey** (mobile/desktop) was run | Verification | Supervised first session + checklist 11, 14 |
| B6 | G0: Windows working tree, backup and the odd path artifacts were not inspected; five previously missing files not found in any archive held | Provenance | Owner re-link of the Windows device |
| — | Not a blocker, but limits the reject action: **D3** (`rejected` status) | Needs migration + approval | Use "hide" until decided |

## 4. Required lists
**Implemented:** everything in §2, 6 behaviour changes (see change ledger), UI tab, tests, runbooks.
**Verified — mocked/emulated tier (M):** all owner-setting paths, registration policy, seller gate, token lifecycle, both dealer modes, decisions and authority, moderation outcomes, wording, log redaction, UI states. Suites in §5.
**Verified — real disposable PostgreSQL (P):** full 181-migration replay (0 failures); atomic registration incl. duplicate/concurrent/orphan/privileges; settings uniqueness, compare-and-swap under row lock, anon/authenticated denial; `cars_status_check` content; candidate 03B on a copy.
**Mocked, not live:** email sending, token delivery, persistence in route tests, Supabase client.
**Needs live provider verification:** Brevo sending, sender authentication, link host, replay/resend in a mailbox.
**Needs owner approval:** S5-D1 initial configuration, S5-D2 owner identity, S5-D4/D3 rejected status, S5-D5 progressive limit, S5-D6, S5-D7, S5-D8, S5-D9, S5-D10 and the open Stage 4A items (D5–D8, D12–D17).
**Needs a database migration:** none for Stage 5 to function. Optional/gated: 03B (`rejected`), duplicate-index cleanup, earlier-stage candidates (D14, D15).
**Not done:** live provider test, hosted/staging DB test, Playwright journeys, Windows tree inspection, dedicated tests for the dealer-platform bulk and duplicate-listing self-publication blocks (implemented; covered only by inspection).

## 5. Test results on the final tree (full table: `runbooks/stage5-onboarding-20261019/TEST_EVIDENCE_MATRIX.md`)
tsc clean · build clean · frontend 82 files / 650 passed / 1 skipped · backend Jest **113 suites / 1728 passed** · backend Vitest 36 · node:test 1 · real-PG checks 28/28 · migration replay 181/181 · validators: 126 pass, the same 8 hosted/live validators non-zero as the Stage 4A baseline. No regression against baseline. The final archive was extracted into a separate directory and the offline suites rerun there (see the certification file for the numbers).

## 6. Findings that change how you operate
1. The old "Require Dealer Approval" toggle never did anything. It is gone; the Onboarding tab replaces it.
2. Before Stage 5, a seller could publish their own listing through three bulk paths, and approving a dealer published every pending listing. Both now obey your moderation setting.
3. `system_settings` is service-role only in the final migration chain (public read policy was removed by hardening), so policy values are not world-readable.
4. Registration still answers 409 "account already exists" (enumeration trade-off; decision S5-D8).
5. Explicit rejection of a single listing fails at the database until decision D3 is taken; bulk reject hides.

## 7. Safety statement
Nothing was committed or pushed (scratch Git only), nothing deployed, no hosted database or provider touched, no real account created or changed, no secrets read or printed, no dependency changed. The only database used was a local throwaway PostgreSQL (loopback; its scripts refuse any other host). Earlier ZIPs and backups were not modified.

## 8. Where to read next
Owner guide → `runbooks/stage5-onboarding-20261019/OWNER_ONBOARDING_CONFIGURATION_GUIDE.md` · Launch day → `LAUNCH_DAY_CHECKLIST_20261019.md` · Email → `EMAIL_PROVIDER_…RUNBOOK.md` · Seller / Dealer runbooks · Moderation guide · State tables · Evidence matrix · Migration and schema-risk register · Security audit · Decision register · Change ledger · Baseline report.
