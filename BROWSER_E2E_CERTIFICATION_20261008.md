# STAGE 13 — BROWSER E2E CERTIFICATION (Phase S)

## Scope and honest framing

This certifies that the real customer-facing application loads, renders,
and degrades safely in a real browser against the real running backend —
it does **not** and cannot certify completion of any financial flow (bid,
payment, escrow) through the UI, because the backend is Supabase-blocked
in this sandbox (see `PRODUCTION_RUNTIME_CERTIFICATION_20261008.md` §3).
Per the master prompt's explicit instruction, financial completion is
never claimed from UI behavior alone.

## Setup

Started the real backend (`node server.js`, degraded mode: real local
Postgres + real local Redis, no Supabase) and the real frontend (`vite`
dev server). Drove a real Chromium browser instance
(`/opt/pw-browsers/chromium`) against both, headless, via a fresh
Playwright script written for this stage.

## Results — page load / crash matrix

4 pages (`/`, `/login`, `/register`, `/cars`) × 7 real viewports (desktop
1440×900 + the 6 required mobile widths: iPhone SE 375×667, iPhone 12
390×844, Pixel 5 393×851, Galaxy S8 360×740, iPad mini 768×1024, iPad Pro
1024×1366) = **28 combinations, all HTTP 200, zero page crashes, zero
uncaught console errors.**

## Results — real form interaction (no fake success)

Submitted a real login form with a real (but wrong) password against the
real degraded backend. The page correctly remained on `/login` with no
redirect and no false "success" state — proving the frontend does not
locally fabricate authentication success even when the backend cannot
complete a real check.

## Remaining gaps

- No full authenticated customer journey (login → browse → bid → pay →
  win → fulfil) was possible — ENVIRONMENT-BLOCKED, same wall as Phases
  G-R.
- No real-money or real-M-Pesa UI flow was exercised.
- Visual/accessibility regression testing already covered in Stage 12 was
  not re-run this stage (no source changes touched frontend UI this
  stage; only 6 backend migration files and one backend config file
  changed).
