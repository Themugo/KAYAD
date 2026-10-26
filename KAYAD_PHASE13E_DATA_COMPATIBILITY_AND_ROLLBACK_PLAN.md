# KAYAD Phase 13E — Data Compatibility and Rollback Plan
| Population | Behaviour after 13E | Data changed by the code? |
|---|---|---|
| Ordinary buyers | unchanged; may apply to sell; state `none` | no |
| Existing `individual_seller` | keep working: fallback to `users.status` before the migration; row copied from it by the backfill; approved/pending behave as before; suspended/rejected/revoked are now refused for listing writes | no (backfill adds copy rows only when the migration is applied) |
| Pending applicants (role user) | buyer unchanged; no seller write | only their own capability row |
| Approved personal sellers | list/manage own vehicles; no escrow/private-auction/financial-route changes; no dealer access | no |
| Rejected / suspended / revoked | buyer unchanged; seller writes refused; status shown | no |
| Dealer owners, team members, staff | untouched (`dealerOnly`/13D guards; excluded from the capability service) | no |
Preserved: user ids, listing ids/ownership, favourites, bids, messages, notifications, payments, escrow/ledger references, dealer rows (including any created by the old behaviour — **not deleted**; report only), audit history. Nothing is merged by name/email/phone.
Dealer rows created by the pre-13D behaviour remain; sizing query: `SELECT u.role, d.approved, count(*) FROM dealers d JOIN users u ON u.id = d."user" GROUP BY 1,2` (read-only, not run).

## Rollback
1. Code: restore the foundation (13D ZIP, SHA `a63fa58c…c9c`) or revert the files in the change ledger; the new files can be deleted. Without the code, `dealerOnly` returns on `/api/cars` and role-`user` sellers lose write access (their rows remain inert).
2. Schema (only if it was ever applied): run the `.down.sql` after exporting `source='application'` rows. Legacy rows are copies of `users.status`, so nothing is lost.
3. Frontend: reverting `DashboardHub`, `PrivateSellerPlatform` and removing the three new frontend files restores the previous views.
