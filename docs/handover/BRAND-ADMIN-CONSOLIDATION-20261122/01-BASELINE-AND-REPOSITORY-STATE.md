# 01 — Baseline and repository state

* Repository `Themugo/KAYAD`. Work started from `origin/main` **a652701** ("Dealer account completion … (#262)"), which already contains the earlier dealer work (#261 lifecycle, numbering, banking read-back, KAYARD KE branding migration; #262 pause/publish, navigation, journeys). My earlier checkout (1eb1489, uncommitted) is superseded; it was left untouched.
* New work lives in a separate git worktree at `/home/claude/p2` (detached at a652701). **Nothing is committed, pushed or deployed.** All changes are working-tree changes, delivered as a patch.
* Read before starting: `CLAUDE.md`, the DEALER-COMPLETION / DEALER-IMPLEMENTATION handovers, `docs/handover/CATALOGUE-DETAILS-INSPECTION-REPORT-20261121.md`.
* Hosted database (read-only inspection only): project "KAYAD EA" `ubvgixwhfybbyjuvxboj`; migration history ends 20260922; the dealer-lifecycle objects and ~86 later migrations are not applied there. **No migration was applied anywhere hosted.** Also found: hosted has `market_data` and `ntsa_verification_requests` tables that no repo migration creates (hosted drift), and lacks `reports`, `feedback`, `automation_tasks`, `feature_flags`, `announcements`.
* Test environment: disposable Postgres + PostgREST + Redis + the real backend (`/home/claude/stk/stack-p2.sh fresh`), Vite dev server for the UI, Playwright/Chromium, axe-core 4.10.2. Accounts use `example.test` addresses and a disposable password; no real personal data.
* Evidence tiers used throughout: VERIFIED (executed, evidence kept) / FAILED / BLOCKED / NOT TESTED.
