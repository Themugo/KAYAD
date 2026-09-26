# KAYAD Homepage Hero — Direct Source Upgrade

Date: 2026-09-26

## Scope

This update was made directly against the latest corrected KAYAD source ZIP. It does not introduce a new homepage module or replace the existing marketplace architecture.

## Hero correction

- Replaced the previous block-style hero vehicle presentation with a continuous editorial hero canvas.
- Added a local Nairobi/KICC hero background so the hero composition is not dependent on a remote background request.
- Added transparent hero artwork for the existing fallback showcase vehicles:
  - Toyota Land Cruiser
  - Mercedes-Benz GLE
  - Toyota Prado
- Kept the hero vehicle identity and fallback selection rooted in `HomePageConfig` and therefore editable through the existing Home Page Admin controls.
- Real Featured/Promoted marketplace vehicles remain authoritative when they exist.
- Preserved existing hero CTAs, carousel state, admin slide content, vehicle selection and marketplace navigation.
- Added desktop previous/next controls and retained slide indicators.
- Reduced hero height and rebalanced the central typography to match the supplied reference composition.
- Preserved responsive behavior by collapsing the side showcase artwork on smaller breakpoints rather than allowing overlapping fixed-width panels.

## Inventory

No inventory business logic, filtering logic, pagination, 3/4/5 layout behavior, sidebar behavior, save/compare behavior or admin presentation configuration was intentionally changed by this hero pass.
