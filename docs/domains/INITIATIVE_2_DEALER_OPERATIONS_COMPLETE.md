# Initiative 2 — Complete Dealer Operations

This initiative consolidates the dealer operating surface around authoritative contracts.

## Implemented
- Dealer-scoped dashboard, inventory, CRM leads, pipeline, customers, auctions, inspections and reputation reads.
- Dealer inventory mutations delegate to the canonical car controller rather than maintaining a second persistence implementation.
- Dealer inventory bulk status updates verify ownership before writing.
- Dealer profile/settings read and write through the dealer-platform profile contract.
- Dealer route authorization is explicitly dealer-scoped.
- Lead stage/metadata updates persist to the canonical leads table.
- CRM notes/tasks, marketing campaigns, team management, subscriptions, finance, and AI are explicitly unavailable where the authoritative migration chain has no matching contract.
- Reputation is computed from real dealer reviews.

## Explicit non-goals
No speculative tables, migrations, demo records, subscription plans, team members, marketing metrics, AI forecasts, or fabricated dealer statistics were added.

## Validation
Run `node scripts/validate-dealer-operations-initiative.mjs` before commit.
