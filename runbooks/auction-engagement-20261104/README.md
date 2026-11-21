# Auction audience engagement (owner-run)

1. Run `supabase/migrations/20261104150000_auction_engagement.sql` in the Supabase SQL editor (idempotent). Adds follows, likes, comments, privacy-safe daily visit counts, peak-watchers, and the counters/insights functions. Service-role only (RLS on, no public policies).
2. Optional backend env: `VISITOR_HASH_SALT` (any long random string). Visitors are stored only as a salted hash; no IP or account id is kept in the clear. Falls back to JWT_SECRET if unset.
3. Deploy backend, then frontend. Before step 1, everything fails soft: live "watching now" still works (it is read from the live socket room), while views/likes/follows/comments show as unavailable and the like/follow buttons stay hidden.

What it does: live watchers per auction (room size, broadcast on join/leave/disconnect), views and unique visitors (bots excluded), follow (notified when the auction goes live and when it ends), like, public comments under anonymous bidder IDs ("Seller" for the owner), owner/organizer or staff can hide comments, authors can remove their own. Comments reject links, emails, 9+ digit numbers and off-platform contact/payment requests, 500 chars, one per 10 s. Owners see Audience insights per auction in Dealer Dashboard > Auctions: live and peak watchers, views, unique visitors, follows, likes, comments, a visitors > followers > registered > bidders funnel and a 14-day trend. API: GET /api/auctions/:id/insights (owner or staff).
Limits: watchers count sockets (one person with two tabs counts twice); peak is written at most every 15 s per auction.

## Addendum (deeper audit round)
- The same migration now also creates `auction_comment_reports` (re-run safe). Run it again if you already applied the earlier version.
- New endpoints: `POST /api/auctions/:id/comments/:commentId/report`, `GET /api/auctions/admin/reported-comments` (admin), `GET /api/auctions/:id/handover` (winner only), `GET /api/wallet/dealer-accounts` (admin).
- Admin Auctions page shows an Audience panel; winners see a handover panel after payment.
