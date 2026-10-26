# KAYAD Phase 14.2 — End-to-End Workflow Results

Environment tags: **[U]** Vitest component test with mocked services; **[B]** real browser, real bundle, mocked API; **[L]** live backend or staging (NONE run).

| # | Workflow | Result | Tier |
|---|---|---|---|
| 1 | Open dealer workspace → sidebar groups render in order Overview/Business/Operations/System Management; 14 items | PASS | U, B |
| 2 | Select each of 14 sections → heading, breadcrumb, current page, URL | PASS | U (several), B (all) |
| 3 | Browser Back/Forward between sections | PASS | U (simulated popstate), B (real history) |
| 4 | Refresh on `?section=team`; direct link `?section=reputation`; unknown section → Overview | PASS | U, B |
| 5 | Keyboard: focus nav item + Enter | PASS | B |
| 6 | Breadcrumb parent → Overview and URL clears `section` | PASS | U |
| 7 | KPI card Total Leads → Leads; Total Listings → Inventory | PASS | U |
| 8 | Overview shows dashboard values from `{success,data}` body | PASS | U, B |
| 9 | Leads / Customers / Marketing render records (no load error) | PASS | U, B |
| 10 | Bell → `/notifications` | PASS (control) | U |
| 11 | Auctions → links to existing auction routes | PASS (hrefs only; targets not opened) | U |
| 12 | Leaving Escrow drops `escrowId` | PASS | U |
| 13 | Signed-out state shows sign-in prompt, no workspace | PASS | U |
| 14 | Advance lead stage (PUT) → UI updates | NOT RUN end to end (code path hardened; no test of the write) | — |
| 15 | Create campaign → list refresh | NOT RUN | — |
| 16 | Non-dealer direct navigation / direct API denial | Existing backend suite (13D isolation, `dealerBusinessOnly`) passes in the full Jest run; **no browser or live-API test** | U (backend) |
| 17 | Logout with live session, profile menu | NOT RUN | — |
| 18 | `/dealer/onboarding`, `/dealer/auction-*` pages | NOT RUN | — |
| 19 | Escrow desk content | NOT RUN (protected; shell only) | — |
