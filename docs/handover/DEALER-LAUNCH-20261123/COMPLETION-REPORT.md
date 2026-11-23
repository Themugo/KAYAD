# KAYARD KE — Dealer launch completion report (2026-11-23)
Status: **LOCAL COMPLETION with stated gaps. NOT production-verified; not declared launch-ready.**

1. **Scope and baseline** — main `ab75588` == working checkout; see BASELINE-AUDIT.md.
2. **Preserved work** — v5 invitation-first onboarding and Team & Employment untouched except the nav label ("Team & Employment") and group placement.
3. **Dealer registration/onboarding** — audited; existing flow and verification states retained (journeys 12/20/21 pass). Added: held `pending` listings are released when the dealer is approved.
4. **Team & employment** — unchanged architecture; Basic Staff Access default, staff numbers, backend enforcement re-verified by the full journey suite.
5. **Listing → publication** — auto-publish for eligible dealers (owner policy); dealer sees status plus what it means and what to do next; admin owner can hide/re-publish with a note (dealer notified, audited, public cache refreshed). No per-listing pre-approval (POLICY).
6. **Buyer enquiries & responses** — fixed duplicate-lead-per-message (migration), lead never moving to "contacted", unnamed leads; added dealer/staff reply from Leads (`GET/POST /dealer-platform/leads/:id/messages`), idempotent, rate limited, covered by the messaging freeze, staff replies audited.
7. **Vehicle-specific requests** — `GET/POST /dealer-platform/vehicle-requests` over support cases; dealer UI panel in Inventory; clear "not an approval" wording.
8. **Notifications/e-mail** — in-app notifications exist for buyer reply and moderation; e-mail depends on the provider (stubbed locally) → delivery NOT VERIFIED.
9. **Command Centre dashboard** — grouped sidebar (Overview / Sales operations / Transactions & finance / Business growth / People & business), collapsible desktop sidebar (remembered per browser), mobile drawer, top bar (brand, Dealer Account chip, own-vehicle search, notifications, identity), header (Verified Dealer chip only for approved dealers, date, city if known), required hero text, KPI/attention/pipeline/financial/auction/team sections with honest unavailable states. Deviations listed in RELEASE-GATES.md.
10. **Security/RBAC/tenancy** — lead conversation resolved from the caller's own lead (never request input); non-owner dealer → 404; Viewer/Basic/Finance refused; buyers/anonymous refused; vehicle ownership checked; dealers cannot moderate.
11. **Database** — one forward migration (OWNER-SQL.md); nothing applied; no financial function touched.
12. **Tests** — TEST-RESULTS.md.
13. **Screenshots** — evidence/browser (13 images).
14. **Gates** — RELEASE-GATES.md.
15. **Known limitations** — KNOWN-LIMITATIONS.md.
16. **Production dependencies** — apply the migration; deploy backend+frontend; configure mail provider; verify hosted invitation and enquiry end to end.
17. **Blockers** — none for local; hosted verification is the owner's.
18. **Handover** — OWNER-COMMANDS-WINDOWS.md, CHANGED-FILES.md. PR 266: NOT VERIFIED (not queried; keep open).
