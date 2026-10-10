# Auction Starting-Soon Runtime Investigation

## Confirmed source path
`src/features/AuctionsView.tsx` requests the scheduled category with `fetchList({ page: 1, limit: 100, status: 'draft' })`. `src/services/auctionService.ts` sends this to `/api/auctions?status=draft`. `backend/controllers/auctionController.js` routes `draft`/`scheduled` requests to `findAll('auction_setups', { filters: { publication_status: 'published' } })` and derives future auctions from `config.startsAt`.

## Schema evidence
The archive contains `supabase/migrations/20261002190000_auction_setup_publication_contract.sql`, which creates `public.auction_setups`. Later auction financial migrations also reference this table. Thus, the source contract expects the table to exist after the canonical migration chain.

## Root cause status
The production cause is **not confirmed**. No staging Supabase credentials, deployed HTTP access or deployed backend logs are available in this environment. A missing/unapplied migration or schema drift is a plausible deployment issue, but it must not be stated as the confirmed cause without checking the target project.

## Required runtime proof
1. On the intended Supabase project, run `select to_regclass('public.auction_setups');`.
2. Verify the complete ordered migration chain was applied to that same project.
3. Capture the exact `/api/auctions?status=draft` response status, request ID and sanitized error.
4. Correlate it with backend logs and identify the deployed commit/build.
5. Verify public visibility still returns only published setups with future start times and eligible, non-deleted cars.

The frontend's independent request loading remains in place; it is failure isolation, not a claim that the backend error is repaired. Do not convert the failure to an empty list.
