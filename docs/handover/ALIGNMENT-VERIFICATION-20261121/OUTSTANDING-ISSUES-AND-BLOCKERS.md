# Outstanding Issues and Blockers

> **Superseded in part (2026-11-21, later):** the post-alignment phase executed journeys, reconciled the baseline failures and found/fixed further defects. Where this document disagrees, `IMPLEMENTATION-AND-VERIFICATION-REPORT-20261121.md`, `FAILURE-REGISTER-20261121.md` and `HOSTED-DATABASE-MIGRATION-RECONCILIATION-20261121.md` are authoritative.

Status vocabulary: VERIFIED / FAILED / BLOCKED / NOT TESTED / OBSOLETE.

## A. Findings from this run
| ID | Sev | Finding | Status | Evidence |
|---|---|---|---|---|
| F-DB-1 | Critical | Hosted DB lacks objects from migrations after ~Oct 2026 (offers, personal listing lifecycle, site designs, featured campaigns, auction engagement, dealer business-name uniqueness) | FAILED (hosted, read-only) | DATABASE-AND-SECURITY-AUDIT.md |
| F-REG-1 | High | False "earlier attempt went through" message; no idempotent replay on `main` | FAILED (reproduced) | `evidence/main-false-recovery.png` |
| F-REG-2 | High | No registration replay regression test | MISSING | grep, REGISTRATION doc |
| F-HOME-1 | Medium | 390px mobile hero clips the vehicle image and card | FAILED (measured) | `evidence/clip_probe.cjs` |
| F-OFFER-1 | Medium | Offer negotiation state machine has no behavioural backend test | NOT TESTED / gap | BUSINESS-LIFECYCLE doc |
| F-TEST-1 | Medium | 69 frontend tests fail (harness/stale), blocks a green gate | FAILED | TEST doc |
| F-TEST-2 | Medium | 5 jest + 1 vitest backend failures (brand strings, env-dependent, jest collecting node:test) | FAILED | TEST doc |
| F-VAL-1 | Medium | 38 validators fail; release gate (`validate:release`) fails through `recovery-repair` | FAILED | `evidence/validators.csv` |
| F-DOC-1 | Low | Missing documents required by validators (list in baseline report); no CLAUDE.md | FAILED | baseline report |
| F-DUP-1 | Low | Legacy duplicates D1-D3 | VERIFIED present | architecture audit |
| F-ROLE-1 | Low | DB RPC/constraint still accept `individual_seller` | VERIFIED | DB audit |
| F-ENV-1 | Info | `npm run test:jest` OOM-killed on 8 GB hosts | VERIFIED env limit | TEST doc |
| F-GOV-1 | Info | Spec conflict: prompt says role mapping "includes individual_seller"; main retired it | needs owner confirmation | REGISTRATION doc |

## B. Reconciliation of the previously reported concerns
| Prior concern | Current status |
|---|---|
| Two failing validators "credential-dependent" | On `main`: live-runtime and communications-provider-certification fail on missing credentials (confirmed by their messages); local-supabase fails because the Supabase CLI cannot start. Not dismissed: they remain unverified (BLOCKED). |
| Pending idempotency replay regression test | MISSING; the fix itself is not on `main` (F-REG-1/2). |
| Inconclusive CSRF test | STILL INCONCLUSIVE (cookie issued by earlier calls). |
| Hosted RLS not verified | PARTIAL: "RLS enabled on 213/213 hosted tables" verified read-only; policy correctness still NOT verified. |
| Email delivery not verified | BLOCKED (no provider credentials). |
| Desktop / physical-device coverage | Desktop homepage rendered; registration only at 390px; physical devices NOT TESTED. |
| Unknown production connectivity failure | BLOCKED (`api.kayad.space` is not reachable from the sandbox). |
| 1,009 / 3,156 / 21 of 21 / 141 of 143 | Historical; superseded by the current numbers in TEST-AND-VALIDATOR-RESULTS.md. Not comparable (different tree). |

## C. Phase 10 special-attention items
| Item | Status | Basis |
|---|---|---|
| Admin broadcast | OBSOLETE as a defect (stale validator) | audience groups handle legacy sellers as personal; "all" unaffected |
| Inspector error handling | OBSOLETE (stale validator) | load-error state and `statusCounts` present |
| Moderation stale data | NOT TRACED (validator failing) | validator wants text "Previously loaded records are retained and may be stale" |
| Logo upload | OBSOLETE (stale validator) | field names match end to end |
| Dealer operations/finance | PARTIAL: scope VERIFIED; finance/role gates NOT TRACED | |
| Dealer subscription admin | OBSOLETE (RPC moved to a service) | |
| Staff governance and audit | NOT TRACED (validator failing) | |
| Cache invalidation | OBSOLETE (centralised helper) | |
| Legacy mobile menu role assertions | NOT TRACED | |
| Private buyer auth/system surface | OBSOLETE (stale validator; gating intact) | |
| SPA fallback | OBSOLETE as defect (stale validator); production behaviour NOT verified | |
| Kenya showroom search/filters/accessibility | NOT TRACED | |
| Write-route gap register | FAILED: artifact missing | |
| Admin/super-admin quick actions | NOT TRACED | |
"OBSOLETE" here means the failing check pins an outdated literal and I found the behaviour in current source. It does not mean production-verified.

## D. Blockers requiring the user
1. Apply the missing migrations to hosted (user runs SQL; I did not write to hosted).
2. Provide non-production credentials/staging for email, Supabase live-runtime and browser journeys.
3. Decide the `individual_seller` wording (F-GOV-1) and confirm that `main`'s unified-account decision stands.
4. Provide Supabase CLI/Docker-capable runner for `validate:local-supabase`.
