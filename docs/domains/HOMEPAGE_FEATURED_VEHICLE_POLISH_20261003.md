# KAYAD Homepage Featured Vehicle Commercial Polish — 2026-10-03

Controlled presentation-only refinement of the existing premium homepage hero.

## Preserved
- Existing centered `Drive Your Dream Today` hero message.
- Existing marketplace, API, auth, escrow, inspection and navigation architecture.
- Existing Featured/Promoted vehicle source and admin public configuration contract (`heroFeaturedMode`, `heroCarIds`).
- Existing CTA actions and vehicle quick-view behavior.

## Refined
- Center hero card narrowed so it no longer visually crowds the featured vehicles.
- Featured vehicle subjects use responsive contain sizing and increased breathing room.
- Hero pair now performs a real horizontal slide transition between featured vehicle pairs.
- Hero vehicle presentation includes restrained commercial details: vehicle name, price/year/mileage data, trust state and auction state when applicable, plus existing View vehicle action.
- Admin selective mode now provides explicit Left hero vehicle and Right hero vehicle controls, while retaining the selected rotation pool.
- Duplicate hero CSS rules consolidated into one controlled presentation block.
- Mobile keeps the compact hero composition and hides secondary vehicle detail badges to preserve clarity.

## Validation note
Full dependency-backed TypeScript/build certification was not performed in this environment because the project requires Node >=22.22.2 and the available environment is Node 22.16.0. The project should be certified in the user's Windows Node 22.22.2 environment before deployment.
