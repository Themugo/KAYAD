# SUPPORT PAGE REBUILD, NAVBAR RESTORED, SELL/SIGN-IN ROUTING FIXED

Complete response to: "add support on the navbar and make a good support page. sell and sign in to direct to their intended pages."

---

## 1. Support restored to the main navbar

Re-added as the 4th item (Marketplace, Auction, Pre-Purchase Inspection, Support) - supersedes an earlier revision of this same nav that had reduced it to 3 items per a different, prior explicit instruction. Both instructions were genuine, direct requests; this one is simply the most recent. Updated the one existing test that asserted the 3-item state to assert 4 again, confirmed passing.

## 2. Sell Vehicle now checks for a real signed-in user before navigating

Found a real problem while checking this: clicking "Sell Vehicle" while logged out landed on the seller-listing form pre-filled with fabricated `SAMPLE_SELLER` data - looking like it was the visitor's own information. Fixed at the navbar level: the button now opens the sign-in modal first if no user is logged in, and only navigates to the real seller platform once someone actually is. Sign In itself was already correctly wired directly to the auth modal - no fix needed there.

## 3. The support page: found real problems, not just cosmetic ones

The previous ticket-submission form was pure UI theater: its submit handler never made any API call at all - it just showed a fake "Support Request Received (#SUP-882)" success message and a made-up ticket number. A visitor using it would believe help was coming when nothing had actually been sent.

Investigated the backend before building anything new: a real, complete, mounted support-ticket system already existed (`POST /api/support`, `GET /api/support/my-tickets`, real auth middleware) - but its target table did not exist in the schema, the same "real code, missing table" pattern found and fixed repeatedly elsewhere in this project. Built the missing `support_tickets` table (tested directly against a real, running database - confirmed present and correctly structured), built a real API client (`src/services/supportApi.ts`, matching this project's established client pattern exactly), and rewrote `SupportView.tsx` to genuinely submit tickets - with a real sign-in prompt for logged-out visitors instead of a silent failure, a real loading state, and real error handling if the request fails.

Also fixed, found while rebuilding this page:
- A "15-Min Response SLA" badge that didn't match the real backend's own configured SLA (1 hour). Corrected to state the real figure.
- A phone number and a physical office address with no real, verifiable source anywhere in this project - removed rather than presented as real contact information nobody could confirm.
- An unconditional "100% refunded immediately" guarantee - softened to accurately describe the real, reviewed refund process this project's own backend actually implements (a request that goes through approval, not an automatic instant payout).

## 4. The FAQ content: found and fixed the same fabrication pattern already caught once before

A test file (`supportFaqTrustClaims.test.ts`) already existed, written after an earlier pass found and fixed the FAQ claiming KAYAD's escrow was already "CBK regulated" and held in named bank vaults ("NCBA Bank & Standard Chartered") as confirmed fact - directly contradicted by the person building this project, who confirmed in an earlier conversation that KAYAD is not yet CBK-certified. That earlier fix held (still passes), but auditing the rest of the file against language already corrected elsewhere in this project (the inspection page, the homepage filters) found the same underlying problem had crept back in two more places:

- "150-Point"/"150-Pt" language throughout, naming one fixed inspection depth as a universal standard - the real system has providers define their own checklist depth, no fixed KAYAD standard exists.
- "Escrow Vault" used inconsistently alongside the file's own already-correct "Escrow" label.
- The financing FAQ separately named specific bank partners (NCBA, Stanbic, Equity) and a specific interest rate (12.5% p.a.) as confirmed fact - the exact same unverified-partnership pattern the existing test already established as unacceptable for escrow, just not yet applied to financing.

Fixed all of it, and extended the existing test file (not a new one) with 3 new assertions locking in these specific fixes, matching the file's own established pattern.

---

## Verification

| Check | Result |
|---|---|
| Migration applied against a real, running PostgreSQL database | Success, table confirmed present and correctly structured |
| Frontend TypeScript | 0 errors |
| Frontend lint | Clean |
| Frontend unit test suite (Vitest) | 200/200 passing (197 existing + 3 new) |
| Frontend production build | Succeeds |
| Backend syntax validation (every file) | 0 errors |
| Backend unit test suite (Jest) | 216/216 passing |
