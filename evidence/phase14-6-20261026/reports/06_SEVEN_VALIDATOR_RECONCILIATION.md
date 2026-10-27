# 06 Seven-validator reconciliation
Full sweep: 143 validate:* scripts run individually, 138 pass / 5 fail (14.5: 136 / 7). Logs: logs/val-validate_*.txt, logs/validators.txt.
| # | Command | Exit | 14.4 / 14.5 | Status | Root cause | Disposition |
|---|---|---|---|---|---|---|
| 1 | npm run validate:communications:providers | 1 | fail / fail | UNCHANGED, ENV-BLOCKED | needs real email/SMS provider credentials in the environment | Run in a credentialed environment |
| 2 | validate:live-runtime | 1 | fail / fail | UNCHANGED, ENV-BLOCKED | missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY | Run against staging |
| 3 | validate:v14:live-certification-contract | 0 | fail 14/15 / fail | RESOLVED | stale string check expected dealerOnly on /dashboard and /finance; Phase 13D deliberately moved those routes to dealerBusinessOnly (same 403 contract) | Check now accepts either guard and still requires protect on both routes; 15/15 |
| 4 | validate:v14:release-candidate | 0 | fail / fail | RESOLVED (cascade of #3) | executes #3 | 17 PASS, 0 FAIL |
| 5 | validate:brand-palette-convergence | 1 | fail / fail | UNCHANGED | legacy border-amber-200 in src/pages/admin/AdminPrivateSellerApplications.tsx | Admin surface, outside dealer scope; fix in an admin visual phase |
| 6 | validate:stage24-theme-convergence | 1 | fail / fail | UNCHANGED | requires KAYAD_STAGE24_THEME_SWEEP_AUDIT_20261012.md which is not in the repository | Restore the document or retire the check |
| 7 | validate:stage5f7-private-auction-contract | 1 | fail / fail | UNCHANGED | requires KAYAD_STAGE5F7_PHASE_A_CONTRACT_FREEZE.md which is not in the repository (ENOENT) | Restore the document; auction domain, untouched |
Validators 3/4 are the only ones changed; no check was weakened (the guard must still be present and protect is still required).
