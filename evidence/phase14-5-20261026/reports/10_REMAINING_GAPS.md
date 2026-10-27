# Remaining Gaps Register
| ID | Gap | Action to close |
|---|---|---|
| G-LIVE | Live-session / real-backend certification not performed | Provide authorized staging (URLs, DB, 4 synthetic accounts, cleanup) and run the scenarios in 06 |
| G-ESL | `eslint .` has 2,291 pre-existing errors in script/evidence directories (no Node globals configured) | Add a Node-globals override for `scripts/**`, `runbooks/**`, `evidence/**`, `reports/**` in `eslint.config.js` (separate authorization) |
| G-VAL | 7 baseline validator failures persist | Owner decisions: missing `KAYAD_STAGE5F7_PHASE_A_CONTRACT_FREEZE.md`, dealer certification route, palette/theme audit, Supabase env |
| G-CAL | No business-calendar backend | Separately authorized backend work |
| G-PERM | Permission-key semantics beyond the existing `DEALER_TEAM_PERMISSIONS` list are not enforced per route | Define route↔permission matrix |
| G-PHONE | Existing account `PUT /api/auth/profile` (`authController.updateProfile`) also changes phone without resetting `phoneVerified` (outside this scope; auth domain) | Apply the same rule there after review |
| G-PHOTO | Photo management for existing listings and listing deletion not wired | Follow-up UI task |
| G-HIST | Older phase manifests reference colon-named logs | None required; historical records |
