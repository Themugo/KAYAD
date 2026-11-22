# 00 - Baseline and repository state (2026-11-22)

| Item | Value |
|---|---|
| Repository | https://github.com/Themugo/KAYAD (sandbox worktree `/home/claude/p4`; owner's checkout `C:\Users\hp\Desktop\KAYARD-KE`) |
| Verified baseline | `origin/main` = **8e42413** "Final platform completion..." (parent 0400502). The brief's baseline `0400502` is superseded: 8e42413 adds only the previous phase's changes |
| Tree check | tree hash of 8e42413 = `25d035c2...`, identical to the tree delivered in the previous patch (verified with a temporary index; nothing in the owner's index was touched) |
| Work branch | detached worktree `p4` at 8e42413. Other worktrees (`p1/repo`, `p1/work`, `p2`, `p3`) untouched. `p3` still holds uncommitted copies of the same previous work (superseded) |
| Uncommitted work in p4 | none at start |
| Migrations | 209 files in `supabase/migrations` (unchanged since the previous phase; all 209 apply to a disposable PG16 database) |
| Test commands | frontend `npx vitest run`, `npm run typecheck`, `npm run build`; backend Jest in batches `--maxWorkers=1` (alone), `vitest --config vitest.config.js`, `npm run test:node`; `scripts/validate-*.mjs`; DB journeys `ci/db-journeys/run.sh` (disposable PostgreSQL 16, real PostgREST and backend) |

## Previously identified findings: still present at 8e42413?
| Finding | Re-verified at |
|---|---|
| Free-listing double submit creates two listings | to be reproduced before the fix (Phase 1) |
| Hosted schema behind repo (91 migrations / 44 tables / 107 functions / 58+37 columns / 14 of 16 triggers / listing-number index) | hosted state is unchanged by me; counts re-queried only if hosted is re-read (read-only) in Phase 3 |
| Dashboard 401/403: Banking, Settings, Profile still generic | Phase 5 |
| 52 admin routes, 19 unlinked | pinned by `AdminRouteInventory.test.ts` (passes) |
| Staff write denial: 385 calls, 0 violations | journey 14 in repo (passes) |
| Dark mode not implemented; ~11,237 hex literals | Phase 6 recount |
| Cloudinary / M-Pesa real tests blocked | re-checked below |

## Infrastructure and credentials available now
| Need | Available? |
|---|---|
| Disposable PostgreSQL 16 + PostgREST + Redis + backend (journeys) | YES (local, not running until started) |
| Docker daemon | **NO** (`docker ps` cannot reach a daemon) |
| Staging Supabase project/branch | **NO** (none provided; hosted Supabase MCP is read-only by rule) |
| Cloudinary credentials (name/key/secret) | **NO** (no `CLOUDINARY_*` in environment) |
| Daraja sandbox credentials and callback URL | **NO** (no `MPESA_*`; sandbox host not on the network allowlist) |
| Screen reader | **NO** |
| Real browser (Chromium + Playwright, axe-core) | YES |

## Work that cannot safely proceed
Phase 3 execution (needs staging), Phase 4 (needs real provider credentials), screen-reader testing, and any implementation that depends on D-17 to D-21 (no owner answer recorded). Independent work in Phases 1, 5, 6 proceeds.
