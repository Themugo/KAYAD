# KAYAD Unified Personal Account Correction — 16 November 2026

## Confirmed product rule
KAYAD has one personal account identity. The same person can browse/buy and access selling tools from that identity. Navigation must not create separate buyer and dealer docks or present a "Buyer Dashboard" as a distinct account identity. Selling and business operations are capabilities/workspaces attached to the account and remain subject to existing server-side permission checks.

## Implemented in this correction
- Replaced the buyer/dealer conditional mobile bottom navigation with one shared five-item dock: Home, Search, Sell, Messages, Account.
- Removed the role-based component switch and the separate dealer-only bottom dock from `src/components/MobileBottomNav.tsx`.
- The Sell shortcut uses the existing `seller-platform` route. Existing dealer/business workspace routes remain recognised as Sell activity for active-state purposes.
- Preserved the existing profile, chat, marketplace, and seller-platform destinations; preserved safe-area-aware bottom clearance.
- Changed the personal navigation drawer label from "Buyer Dashboard" to "My Account".
- Added `scripts/validate-unified-personal-account-mobile-dock.mjs` and updated the design/navigation validators to assert one personal-account dock.

## Validation executed
- `node scripts/validate-unified-personal-account-mobile-dock.mjs` — 9/9 PASS.
- `node scripts/validate-kayad-reference-design-polish.mjs` — 16/16 PASS.
- `node scripts/validate-unified-navigation-convergence.mjs` — 6/6 PASS.
- `node scripts/validate-navigation-convergence.mjs` — 43/43 PASS.

These are source-contract checks, not browser/runtime certification.

## Important architecture finding — not silently changed
The current backend `backend/services/accountCapabilities.service.js` already models `personal.buying` and `personal.selling` as capabilities of one `user` identity; `buyer` and `privateSeller` are explicitly deprecated API aliases. However, the same service still models `dealer` as a separate `users.role === "dealer"` identity, and `src/App.tsx` still routes that role to a dedicated dealer dashboard. The product requirement that dealership/business operations also belong to the same personal identity is therefore not yet fully implemented end-to-end.

Converting dealer accounts into business capabilities attached to personal identities requires a deliberate backend/auth/data migration: dealer ownership and membership, dealer verification, role/permission guards, seller inventory ownership, payouts/subscriptions, account recovery and existing dealer sessions must be migrated without orphaning current businesses or weakening authorization. This correction does NOT rewrite those authorities or alter the database. The separate dealer-role model is recorded as an outstanding P1 architecture gap rather than being hidden by a UI-only change.

## Not certified
No dependency installation, TypeScript build, Vitest suite, real browser run, API UAT or database migration was performed in this correction. No commit, push or deployment was performed.
