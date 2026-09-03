# KAYAD Phase 50 — Authoritative Notification State Consolidation

## Scope
Remove split-brain notification state from MarketplaceContext and make the existing backend-backed NotificationContext the single client notification source.

## Changes
- Removed local notification state and fabricated bid/escrow/price-alert notification records from MarketplaceContext.
- Mounted SocketProvider and NotificationProvider beneath the real AuthProvider.
- Updated NotificationPanel to consume NotificationContext and navigate with react-router.
- NotificationPanel now marks backend notification records read instead of mutating local-only records.
- Preserved CompareProvider and Phase 46 App ref hardening.
- Added scripts/validate-phase50.mjs with 11 contract checks.

## Production principle
Notifications are server-owned state. The UI must read, mutate, and acknowledge persisted notification records rather than manufacture parallel browser-only notification objects.
