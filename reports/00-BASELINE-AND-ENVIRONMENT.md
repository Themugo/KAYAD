# 00 — Baseline and environment (2026-11-22)

| Item | Value |
|---|---|
| Repository | https://github.com/Themugo/KAYAD |
| Worktree for this phase | `/home/claude/p7` (detached at `8e42413`), created from `p6`; `p1`–`p6` preserved untouched |
| Baseline commit | `8e424139d65f3972958ed3fb571036e0b926c5f0` |
| `origin/main` at start of phase | `50733e2` "Feature/final platform completion (#264)" (3 commits ahead of the baseline; includes #263 and #264) |
| Uncommitted work carried into p7 | hero tightening, list view, 28px favourite, dealer sidebar/banner (the `final2` zip) |
| Final2 zip sha256 | `5783e0865420fa8353af…` (see `SHA256SUMS`) |

## Key baseline finding
`main` already contains the earlier hero/list/team-invite work (PRs #263, #264, squash-merged). The old branch `feature/final-platform-completion` therefore conflicts with its own squashed copy: this is why GitHub reported "can't automatically merge". The correct delta is computed against `origin/main` (see `KAYARD-KE-delta-on-main.zip`); `git apply --check` of that patch on a clean checkout of `origin/main` passed.

## What could not be established
* Production (`www.kayad.space`, `api.kayad.space`) is **not reachable** from the build sandbox (egress proxy returns 403). No live headers, release id or DNS were measured. Everything about production below is a code/config finding, not a measurement.
* GitHub Actions run history and Vercel deployment records are not visible from this session.
