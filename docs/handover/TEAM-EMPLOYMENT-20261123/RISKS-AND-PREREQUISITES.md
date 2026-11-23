# Outstanding risks and owner prerequisites
1. **Hosted migration not applied.** Until `20261123200000_dealer_employment_and_staff_identity.sql` is applied on hosted Supabase (after backup + rehearsal), the app reports `employmentAvailable:false`: invitations/roles/access keep working, staff numbers/history/profile do not. Then `NOTIFY pgrst, 'reload schema'`.
2. **CORS/API deploy:** `X-Dealer-Org` header must be allowed by the deployed API (backend/server.js) before the dealership selector works for people with several memberships.
3. **Explicit `role` on the invite API** is still accepted (UI never sends it). Strict "always Basic" server-side is a one-line change, owner decision.
4. **Staff code derivation:** without a configured code the prefix is derived once from the existing business name (3–8 letters/digits); owner may set a code before the first hire. Dealerships whose names yield no code activate members without a number and notify the dealer.
5. **Legacy members:** backfilled with staff numbers (created_at order) but no employment start date (not guessed).
6. **Business e-mail** is a recorded contact only; no mailbox provisioning and no verification workflow (deferred).
7. **v5 limitations** still outstanding: replaced-vs-unknown link wording, login e-mail pre-fill, inviter-specific acceptance notification.
8. **Owner has no staff number** (not a team row). Deliberate.
9. **Four handover docs present at HEAD are absent from the supplied v5 tree** (see TEAM-EMPLOYMENT-SYSTEM.md §1).
10. Nothing here is production-verified. Merging to `main` deploys to production.
