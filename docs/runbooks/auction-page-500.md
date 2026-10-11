# Auction page 500 — diagnosis and recovery

## What the symptom means

The customer auction floor requests three independent lists:

- `GET /api/auctions?page=1&limit=100&status=live` — live auctions from `cars`, excluding rejected listings and enforcing start/end time bounds.
- `GET /api/auctions?page=1&limit=100&status=draft` — scheduled auctions from published rows in `auction_setups`.
- `GET /api/auctions?page=1&limit=100&status=ended` — completed auctions from `cars`.

A `500 Internal server error` for `status=draft` does not prove that the schedule is empty. The backend intentionally does not fabricate auctions or turn a database error into an empty successful response.

The migration defining the scheduled-auction table is:

`supabase/migrations/20261002190000_auction_setup_publication_contract.sql`

## Verify the deployed database before changing code

Run these read-only queries in the SQL editor for the **KAYAD Supabase project actually used by the deployed backend**:

```sql
select to_regclass('public.auction_setups') as auction_setups_relation;

select count(*) as published_setup_count
from public.auction_setups
where publication_status = 'published';
```

Interpretation:

- `auction_setups_relation` is `auction_setups`: the relation exists; continue by checking the backend logs and permissions/configuration.
- The relation is `NULL` or the first query reports that the relation is missing: the migration is absent from that project. Review and apply the existing migration through the team's approved migration workflow, then re-run the read-only checks.
- The relation exists and the second query returns a count: this confirms the table is queryable in the SQL editor, but does not by itself prove the deployed backend uses the same project or credentials.

Do not create a second table manually and do not add fake rows to make the page look populated.

## Verify the deployed API

From a terminal, inspect each endpoint separately:

```text
https://api.kayad.space/api/auctions?page=1&limit=1&status=live
https://api.kayad.space/api/auctions?page=1&limit=1&status=draft
https://api.kayad.space/api/auctions?page=1&limit=1&status=ended
```

Record the HTTP status and response body for each. In the backend logs, correlate the `status=draft` request with its request ID and inspect the underlying Supabase/PostgREST error. Production intentionally sanitizes 5xx responses, so the browser's `Internal server error` text alone cannot identify the cause.

If the table exists, verify that the deployed backend's `SUPABASE_URL` points to that same project and that its configured server-side key is present and valid. Never print or paste secret values into logs or reports.

## Source changes in this patch

`src/features/AuctionsView.tsx` now attributes each failed request to its own section and avoids telling the visitor that the whole auction service is unreachable when only the scheduled list failed. The page continues to preserve successful live/completed responses and never substitutes mock auction data.

Regression coverage is in `src/__tests__/features/auctionsViewLoadFailure.test.tsx`.

## Release boundary

A source patch cannot repair a missing table in the hosted database by itself. No production migration, deployment, live payment, or financial operation is performed by this runbook. After the deployed schema/configuration issue is resolved, rerun the auction-page tests and verify all three endpoints against the actual deployment.

## Stage 13 source audit note — 2026-10-12

The Stage 12 live migration-diff evidence packaged with this source includes migration version `20261002190000` in `evidence/stage12/local_not_hosted.txt`. That version corresponds to `20261002190000_auction_setup_publication_contract.sql`, which creates `public.auction_setups`.

This is a concrete migration-parity warning and a plausible explanation for the scheduled-list failure, but it is **not proof that the relation is absent**: the hosted project could have received equivalent schema through another approved path. Verify against the exact Supabase project used by the deployed backend before changing schema:

```sql
select to_regclass('public.auction_setups') as auction_setups_relation;
select count(*) as published_setup_count
from public.auction_setups
where publication_status = 'published';
```

If the relation is missing, stop and reconcile the ordered migration history with the owner-approved staging workflow. Do not manually create a second table or push all local-only migrations. If the relation exists, capture the sanitized API response and request ID, correlate backend logs, and verify the deployed backend points to that same project. The UI now hides raw generic server-error text, but this source-side improvement does not repair a hosted schema/configuration mismatch.

Stage 13 also hardens the public live list against rejected listings and stale start/end boundaries, allows a valid published future setup to open before the car lifecycle mirror catches up, and blocks deleted/rejected listings from the public bid-history endpoint. These are source changes; the Jest/Vitest suites and hosted endpoints still need runtime verification.
