# KAYAD — Final Homepage Visual Balance

This pass is a controlled presentation correction, not a redesign.

## Locked visual contract
- Center card scale remains 80%.
- Center card width remains 42%.
- Vehicle scale remains 100%.
- Vehicle stage width remains 43%.
- Nairobi/KICC fills the complete hero stage using the repository-local background asset.
- The previous curved/masked foreground artwork is replaced rather than layered around.
- Left/right vehicle subjects use 22% outward nudges by default so their visible artwork clears the center card.
- Admin can adjust the two outward nudge values independently without code changes.

## Duplicate cleanup
The existing `platform_config.hero_presentation` contract remains canonical. No second hero CMS or second visual configuration table is introduced.
