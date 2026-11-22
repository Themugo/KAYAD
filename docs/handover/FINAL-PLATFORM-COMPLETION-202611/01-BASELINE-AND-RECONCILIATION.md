# 01 - Baseline and reconciliation (2026-11-22)

## Repository state (verified with git)
| Item | Value |
|---|---|
| Remote | https://github.com/Themugo/KAYAD |
| `origin/main` (after fetch) | **0400502** "Brand/admin consolidation: accessibility, admin dashboard layout fix, state coverage, D-16 legacy guard, reports" |
| Parent | a652701 "Dealer account completion ... (#262)", before that 6960e02 (#261) |
| Earlier worktree `/home/claude/p2` | detached at a652701 with 42 uncommitted files; its content tree hash equals 0400502 exactly (289e1bc8...), i.e. the user pushed the previous patch unchanged |
| New worktree for this phase | `/home/claude/p3`, detached at 0400502, clean (0 changes) |
| Feature branch | none; this phase's work is uncommitted in p3 |

The previous report expected a652701 and noted 6960e02. Both are ancestors. The current baseline is **0400502**. The earlier patch must NOT be re-applied (already merged). `p2` is superseded and was left untouched.

Reconciliation actions: fetched only (no reset, force, overwrite or delete). `git checkout` in p2 was attempted and aborted by Git because untracked files would be overwritten; nothing changed. node_modules in p3 are symlinks to p2's installed packages (not packaged).

## Owner decisions (exact status)
See `15-OWNER-DECISIONS-D17-D21.md`. D-1..D-16 were recorded in earlier handovers and are preserved. **D-17..D-21 are open questions raised in the last phase; the owner has not answered any of them.** They are not "decisions" yet. This phase therefore does not implement anything that depends on them.

## Environment facts (verified)
- No Cloudinary, M-Pesa/Daraja or hosted Supabase credentials in this sandbox (env scan: 0). Real-integration tests: **BLOCKED**.
- Hosted Supabase: read-only SELECT only, via the project connection.
- Disposable stack (local Postgres + PostgREST + Redis, 209 migrations, 20 journeys) works.
- No assistive technology (screen reader) available.
- The brief says "nine" staff roles; `backend/config/roles.js` STAFF_ROLES lists ten (admin, superadmin, marketing, technical_support, hr, accounts, escrow_officer, ad_manager, moderator, ghost_checker). All ten are tested; the discrepancy is recorded rather than resolved by guessing which role the owner excludes.

## Outstanding-work matrix (carried from 0400502 docs 03/12/13/15)
| # | Item | Status at 0400502 | This phase |
|---|---|---|---|
| 1 | Admin Console redesign and navigation rationalisation | NOT IMPLEMENTED (audit + fixes only) | Route/workflow matrix and gap fixes; nav regrouping limited by D-21 |
| 2 | Duplicate-function consolidation | NOT IMPLEMENTED (register only) | Only low-risk, dependency-proven items |
| 3 | Banking one architecture | OWNER DECISION REQUIRED (D-18, D-19) | Blocked for payout routing; read-back verified earlier |
| 4 | State coverage | PARTIAL (A-09 403 as generic; no stale; banners) | Implement and test |
| 5 | Dark mode | NOT IMPLEMENTED | Implement (explicit request); dark logo needs approval |
| 6 | Accessibility | PARTIAL, screen reader NOT TESTED | Keyboard/overlay audit; screen reader remains NOT TESTED |
| 7 | Staff roles | PARTIAL (GET only) | Writes, denials, isolation, session expiry |
| 8 | Listing numbering concurrency | NOT TESTED | Stress test |
| 9 | Cloudinary | BLOCKED | Remains BLOCKED; exact setup listed |
| 10 | M-Pesa/financial E2E | BLOCKED | Remains BLOCKED for sandbox; offline idempotency tests re-run |
| 11 | D-16 files | RETAINED | Unchanged; guard test re-run |
| 12 | DB reconciliation/staging | BLOCKED (no staging; hosted drift) | Recount hosted vs repo read-only; staging remains BLOCKED |
