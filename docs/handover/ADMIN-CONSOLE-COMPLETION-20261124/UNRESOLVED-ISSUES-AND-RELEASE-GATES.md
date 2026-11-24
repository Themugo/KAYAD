# Unresolved Issues and Release Gates

Not production-ready. Status labels: Fixed and verified / Fixed but not yet verified / Existing and confirmed correct / Intentionally unavailable / Blocked by missing external dependency / Not verified / Requires separate owner decision.

## Release gates (all open)
1. **Apply migrations to hosted (owner action, not done):** `20261123210000_lead_create_find_before_insert.sql`, `20261123220000_dealer_temporary_duties.sql`, `20261124100000_admin_customer_care_and_market_tables.sql`. Until the last is applied, hosted report and feedback submission return 500 (tables missing) — Fixed but not yet verified on hosted.
2. **Commit/push Tasks A–E (owner action).** Nothing was committed by Claude. PR 266 stays open — NOT VERIFIED.
3. **Hosted verification** of the console (53 routes, Team & Employment live test) — Not verified.
4. **Live e-mail delivery** — Blocked by missing external dependency; no claim made.

## Requires separate owner decision
- Provision the 8 unprovisioned studio/suspicious-bid features (automation, config, lowcode, vxp, xos, ai, digital-twin, suspicious bids) or retire them; today they show an honest "not provisioned" state (503).
- Moderator UI mirror (`PAGE_PERMISSIONS`) vs server permissions for some moderator pages differ (UI is cosmetic; backend authoritative).
- HomePageAdminPanel "Private Sellers" label (escrow-config/test-tied).

## Not verified
- 26 of 53 routes have render + load verified but not every action exercised (see matrix; auctions, inspections, escrow admin actions, broadcast send, panic/recovery deliberately not executed).
- PublishedDesignRuntime test flake under load.
