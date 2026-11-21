# Project Baseline Report (verification run 2026-11-21)

## Authoritative baseline
| Item | Evidence |
|---|---|
| Source of truth used | Fresh read-only clone of https://github.com/Themugo/KAYAD, branch `main` (shallow, depth 60) |
| Clone path | `/home/claude/align/remote` (sandbox, not the user's computer) |
| HEAD = origin/main | `6eb7c98a149b0c0b5066061b110f3bd38c6ba3ba` "Complete approved homepage and dealer workflow certification updates", 2026-11-19 22:31 +03:00 |
| Remote | `origin https://github.com/Themugo/KAYAD` (fetch/push); 2 remote branches listed by `git branch -r` in the shallow clone, many more on the server |
| Working tree before this run | clean (`## main...origin/main`). The only additions are this handover folder. Nothing committed, pushed or deployed. |
| Tracked files | 3,321 |
| Node / npm | v22.23.4 / 10.9.9. Repo requires `>=22.22.2` (satisfied; `engine-strict` install passed) |
| Lockfiles | `package-lock.json` (root), `backend/package-lock.json`, plus a stray `bun.lock` |
| Install | `npm ci` root exit 0, `npm ci` backend exit 0 |
| Env config | `.env.example`, `.env.production.example`, `backend/.env.example` only; no real `.env` tracked. Values not inspected or reported. |

## Is the registration ZIP the baseline?
No. `KAYAD-REGISTRATION-AUTH-CONVERGENCE-PARTIAL-20261027.zip`
- SHA-256 `a3f515ec7cb55954c80a6994e6aebedf7794a0144a669e2e0f3301363838e1a1`, `sha256sum -c` OK, `unzip -tq` OK.
- It is a 2026-10-27 checkpoint, built from the Phase 17 tree. `main` is about three weeks newer (rebrand to KAYARD KE, unified personal account, offer negotiation, personal listing lifecycle, auction engagement).
- Tree comparison (`evidence/checkpoint-vs-main-diff-summary.txt`): 1,661 differing entries: 519 files differ, 699 only in the checkpoint, 443 only on `main`.
- Of my registration-work files, none are identical to `main` (all 9 present files differ; `VehicleMarketplace.tsx` moved to `features/VehicleMarketplace/components/`).
- **Unintegrated work:** the registration idempotency fix from that ZIP is NOT on `main` (grep of `backend/` and `src/` finds no `Idempotency-Key` handling for registration, no `deriveRegistrationVerifyToken`, no `newRegistrationIdempotencyKey`).
- **Conflicting versions of the same functionality:** the ZIP's register controller still creates `individual_seller` accounts. `main` retired that (owner decision 2026-11-11), so the ZIP cannot be applied as-is. It would reintroduce the retired role.
- The ZIP must not replace any `main` file. A re-port onto current `main` is required (see RECOMMENDED-NEXT-DEVELOPMENT-SEQUENCE.md).

## State of each prior work stream (from `main`)
| Stream | Current state on main |
|---|---|
| Approved homepage | PRESENT. Four shortcuts, category strip, refine panel verified in a real browser. One mobile deviation found (see HOMEPAGE-AND-DEALER-VERIFICATION.md). |
| Dealer workspace/navigation | PRESENT. Canonical `components/layout/DealerLayout.tsx`; `components/dealer/DealerLayout.tsx` is a re-export. |
| Unified personal account | PRESENT (`accountCapabilities`, `DashboardHub`, registration maps to `user`). 51 of its UI tests fail on a test-harness defect (see TEST-AND-VALIDATOR-RESULTS.md). |
| Registration/auth convergence | PARTIAL. One form, one endpoint. Idempotent replay absent. |
| Transaction lifecycle/offers | PRESENT in code + migration; only 1 jest test references offer negotiation (see BUSINESS-LIFECYCLE-VERIFICATION.md). |
| Inspection/settlement | PRESENT; 5 inspection and 14 escrow test files in backend. |
| Prior certification reports | `docs/handover/*` (Nov 19) say "Not release-certified"; this run agrees. |

Baseline status: **ESTABLISHED** (not BLOCKED). Caveat: the GitHub clone was shallow; deeper history was not needed.

## Engineering governance (Phase 2)
| Item | Finding |
|---|---|
| `CLAUDE.md`, nested `CLAUDE.md`, `AGENTS.md`, `.claude/rules/` | **None exist in the repo.** No project instruction file was loaded by this session. |
| `GEMINI.md` | Present: a generic "KAYAD Development Guide" (never break existing functionality, no duplicate code, RBAC, test builds). Uses the old brand "KAYAD". Written for another tool; not auto-loaded by Claude. |
| Instructions that did apply | The prompt itself, and the user's saved project notes (auction business rules; "brand identity is KAYAD KE, change displayed brand text only, never code/identifiers"; user runs git/SQL; hosted DB read-only; full project ZIP, Windows-safe names). |
| Conflicts | (1) Brand: the saved note says "KAYAD KE", the code and this prompt say "KAYARD KE", and code identifiers still say `kayad` (consistent with "never code identifiers"). (2) This prompt says the role mapping includes `individual_seller`, `main` retired it for self-registration. (3) Delivery rule "full project ZIP" vs this prompt's repo-docs deliverable - both are provided. |
| Outdated documentation | ~25 `IMPLEMENTATION-*`/phase report files in the repo root; handover docs state Node 22.16.0 as runtime; several validators require docs that do not exist (`GIT_CONFLICT_AND_RELEASE_POLICY_20261114.md`, `docs/production/DISASTER_RECOVERY.md`, `docs/super-admin/PHASE7-DATA-SOURCE-LEDGER.md`, `KAYAD_STAGE5F8_EXECUTION_REPORT.md`, `docs/handover/API_VALIDATION_GAP_REGISTER_20261109.csv`). |
| Recommended corrections (not applied) | Add a short root `CLAUDE.md` (baseline branch, Node version, brand rules, unified-account rule, "no hosted writes", test commands); move root-level phase reports under `docs/handover/archive/`; retire or recreate the missing artifacts the validators require. No governance file was rewritten in this run. |
