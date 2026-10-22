# Stage 5F.5 Defect Register — Private Seller Dashboard

| ID | Severity | Finding | Correction | Verification | Status |
|---|---|---|---|---|---|
| S5F5-01 | Medium | Listing and escrow request failures were silently converted to empty arrays. | Independent settled results and explicit error/unavailable states. | Source contract validator 11/11; syntax transpilation. | Source fix complete; runtime pending |
| S5F5-02 | Medium | Dashboard lacked manual refresh and last-updated context. | Added refresh action, loading protection and last-updated time. | Source contract validator 11/11. | Source fix complete; browser pending |
| S5F5-03 | Medium | Dashboard hierarchy did not surface seller metrics, status groupings and quick actions clearly. | Added responsive metric cards, status chips, latest listings and quick actions using existing routes. | Source contract validator 11/11. | Source fix complete; visual browser check pending |
| S5F5-04 | Low | Seller listing/escrow nav icons were less semantically clear than the rest of the Lucide icon set. | My Listings uses vehicle icon; Escrow & Deals uses payment/deal icon; accessible nav semantics added. | Source contract validator 11/11. | Source fix complete |
| S5F5-05 | Medium | Listing views could be summed as zero when the API omitted nullable values. | Views metric reports unavailable if one or more listing view counts are missing. | Source contract validator 11/11. | Source fix complete; API integration pending |
| S5F5-06 | High | Full build/test/browser verification cannot currently run in this environment. | No code bypass added; exact blocker documented. | `npm ci` timed out; build/test exit 127; typecheck missing dependencies. | OPEN — requires Node >=22.22.2 and dependencies |
