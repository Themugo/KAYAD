# Staging certification checklist (all items: NOT DONE — requires approval)

- [ ] Written approval to apply `20261025130000` to staging; PITR/snapshot taken.
- [ ] Pre-check counts: sellers by status, `available` cars owned by suspended/revoked sellers (expected to be hidden by the reconciliation).
- [ ] Apply migration; confirm triggers exist; confirm EXECUTE revoked from anon/authenticated; RLS deny-all on both new tables with real Supabase roles.
- [ ] Re-run `phase13f_http_lifecycle_matrix.mjs` and the browser journeys against staging with staging-only test accounts (never real users).
- [ ] Verify Redis/CDN cache behaviour in the real hosting topology (CDN edge caching of `/api/cars/:id`, `Vary`, TTLs).
- [ ] Real Cloudinary upload path (local runs used placeholder credentials and an upload fixture).
- [ ] Email-verification and notification providers.
- [ ] Super Admin and admin MANAGE_USERS access with real accounts; audit-log rows written.
- [ ] Load/rate-limit behaviour (local runs raised limits on the disposable backend only).
- [ ] Rollback rehearsal on staging.
