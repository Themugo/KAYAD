# KAYAD Marketplace Full-Width Surface — 2026-09-26

## Scope
Presentation-only refinement of the existing marketplace surface. No new product features, APIs, vehicle fields, filters, payment rules, escrow rules, or business logic were introduced.

## Changes
- Marketplace and Saved marketplace surfaces now use the full viewport width instead of the application `max-w-7xl` shell.
- The marketplace outer surface removes shell padding and vertical spacing so the hero, search bridge, inventory, and supporting sections can occupy the available frame.
- The existing hero remains true full-bleed.
- The search bridge now spans the available marketplace frame, retaining only responsive internal gutters for readability.
- Inventory results remain full-width while preserving responsive internal content gutters and the existing floating-ad rail behavior.
- Non-marketplace modules retain the previous constrained application shell.
- Mobile and desktop behavior continue to use the existing responsive layout and controls.

## Certification requirement
Run the complete Windows certification gate on Node 22.22.2 before committing/pushing. The authoritative gate must include lint, production build, all tests, local runtime, canonical architecture, release, dependency security, and deployment readiness.
