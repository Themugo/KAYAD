# KAYAD Stage 20 — Two-Account Staging Isolation Runbook

**Purpose:** execute the next live buyer-portal authorization pass against a dedicated staging deployment with two real, separate test accounts. The runner is GET-only: it does not create, edit, delete, pay, upload, send messages, change state, or run migrations.

## Hard safety requirements

- Use a dedicated **staging** API and staging Supabase project only. Do not point this runner at `kayad.space`, production Render/Vercel services, or a production Supabase project.
- Use two distinct test users (A and B) with distinct seeded records in each domain. Do not use real customer records.
- Use each test user's short-lived bearer access token. Never paste tokens, service-role keys, passwords, or `.env` contents into chat or commit them.
- Supabase REST probes must use the public/anon key plus each user's access token. **Never use a service-role key** for RLS tests; it bypasses RLS and invalidates the test.
- Run from a shell where credentials are set as environment variables. The script prints no tokens.

## Required environment variables

Set these in the local shell, not in the repository:

- `STAGING_API_BASE_URL` — staging origin, e.g. `https://<your-staging-host>` (no trailing slash; do not include `/api`).
- `STAGING_ACCOUNT_A_TOKEN`, `STAGING_ACCOUNT_B_TOKEN` — separate staging user access tokens.
- `STAGING_ACCOUNT_A_ID`, `STAGING_ACCOUNT_B_ID` — the authenticated user IDs; must differ.

Set both accounts' fixture IDs (each ID must be unique to the named account):

- `STAGING_A_SAVED_CAR_ID`, `STAGING_B_SAVED_CAR_ID`
- `STAGING_A_LOAN_ID`, `STAGING_B_LOAN_ID`
- `STAGING_A_INSPECTION_BOOKING_ID`, `STAGING_B_INSPECTION_BOOKING_ID`
- `STAGING_A_INSPECTION_ORDER_ID`, `STAGING_B_INSPECTION_ORDER_ID`
- `STAGING_A_INSPECTION_REPORT_ID`, `STAGING_B_INSPECTION_REPORT_ID`
- `STAGING_A_OWNED_VEHICLE_ID`, `STAGING_B_OWNED_VEHICLE_ID`
- `STAGING_A_ESCROW_ID`, `STAGING_B_ESCROW_ID`
- `STAGING_A_CHAT_ID`, `STAGING_B_CHAT_ID`
- `STAGING_A_CHAT_UPLOAD_ID`, `STAGING_B_CHAT_UPLOAD_ID`
- `STAGING_A_NOTIFICATION_ID`, `STAGING_B_NOTIFICATION_ID`

The records must exist and be visible to their own account. For report/attachment probes, ensure the report or upload is ready and retrievable by its owner. A missing marker or inaccessible own fixture is a failed/precondition result, not a pass.

## Run the API isolation matrix

From the project root, after setting the variables above:

```powershell
node --version
node scripts/certify-buyer-portal-staging-isolation-20261012.mjs
```

The expected API paths are the current `/api` route mounts. The script checks own-record access and opposite-account denial for ownership vehicle details, inspection bookings/reports/orders, escrow details, chat messages, and chat attachments. It checks both account collection responses for leakage of the other account's saved-car, financing, inspection, escrow, chat, notification, and ownership fixture IDs.

Expected denial for direct cross-account reads is HTTP 401/403/404/410. A successful response to a foreign ID is a failure, even if the UI hides the result. For list endpoints, each account must see its own marker and not the other account's marker.

## Direct Supabase RLS probes (optional, strongly recommended)

Set:

- `STAGING_SUPABASE_URL` — staging Supabase URL.
- `STAGING_SUPABASE_ANON_KEY` — staging publishable/anon key only.
- `STAGING_RLS_PROBES` — JSON array of exact staging table probes, each shaped like:

```json
[
  {"table":"your_saved_vehicle_table","idColumn":"id","aId":"<account-A-row-id>","bId":"<account-B-row-id>","label":"saved vehicles"}
]
```

Replace example table/column names with the real tables and identifiers from the deployed schema; do not guess them. Add one probe per applicable table (favorites, ownership, loans, inspection bookings/reports, escrow, chat/attachments metadata, notifications). For each table, the user JWT for A must see zero rows when selecting B's row by its ID, and vice versa. HTTP errors, malformed responses, or visible foreign rows fail the probe. RLS can also be verified in Supabase SQL editor using the two user JWT contexts; do not test with a service-role connection.

## Account-switch browser test (required separately)

Use Playwright or a real browser against staging with the same two accounts and seeded unique marker strings:

1. Sign in as A. Open My Garage and confirm A's saved vehicle, owned vehicle, financing request, inspection, escrow, messages, and notifications appear where appropriate.
2. Throttle the network (or delay the relevant API responses), start loading My Garage and the chat/notification surfaces, then sign out and sign in as B before A's requests finish.
3. Confirm A's marker strings disappear immediately after identity changes and never flash while B is loading. Release the delayed A requests and confirm they cannot overwrite B's view.
4. Repeat B → A, and repeat with logout while child panels are loading.
5. Open B's copied URLs/IDs for A's ownership vehicle, inspection booking/report/order, escrow deal, chat, and attachment while signed in as B. Confirm the UI shows a safe not-found/unauthorized state and no A data.
6. Confirm navigation actions lead to the authenticated saved inventory, buyer workspace, chat, and notification route; a public explainer is not a substitute for private deal data.
7. Capture browser console/network results and correlate every request with the API runner output.

## Interpretation and report

- A clean API run certifies only the configured fixtures and GET requests on the staging deployment at the time of the run.
- It does not prove write-route authorization, webhook safety, complete RLS coverage, storage bucket policies, or race behavior unless the corresponding explicit tests are also run.
- No tests have been represented as live-passing until the runner has been executed with actual staging credentials and the browser test has been performed.
