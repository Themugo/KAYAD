# Unified personal account and seller mobile audit — 2026-11-09

## Changes applied
- Registration now shows one **Personal account** choice for buyer and private-seller use. A seller deep-link maps to that choice, which registers the existing `user` backend role. Dealer and provider paths remain distinct.
- Existing seller capability/approval checks are preserved; registration does not bypass seller authorization.
- Seller platform main content, listing wizard panels, headings and horizontal step rail have width constraints and mobile-responsive padding to prevent the most obvious viewport overflow.

## Critical unresolved defect
The existing `ListingWizardSection` is not a functioning twelve-step data-entry wizard. It displays a start panel and advances a counter, but does not render actual fields for the twelve steps. Its `handlePublish` reads `draft` data that the wizard itself does not collect. This is a functional blocker, not merely a CSS issue. Do not describe private listing as fixed or release-ready until the complete field, photo, draft persistence, validation and submission workflow is implemented and tested.

## Verification limits
Static source inspection and ZIP integrity only. Dependencies are absent and Node 22.16.0 is below the declared project requirement. No successful build, automated test, real-account UAT, mobile-browser or backend integration certification was performed. Other dashboard sections have not been fully end-to-end verified.

## Next actions
1. Implement or reconnect a real twelve-step seller form to persisted draft state and backend create/update endpoints.
2. Verify seller capability activation for a normal `user` account, approval state, and the create-car endpoint permissions.
3. Test actual registration, email verification, sign-in, seller application, upload, draft saving, submission and approval with test accounts.
4. Browser-test 320, 360, 375, 390, 430px, tablet and desktop sizes; ensure no horizontal page overflow and that bottom navigation is unobstructed.
