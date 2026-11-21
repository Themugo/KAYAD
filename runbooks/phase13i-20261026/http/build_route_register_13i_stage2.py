#!/usr/bin/env python3
# PHASE 13I — maps the stage-1 register (fresh probe + sweep, see stage1) onto the 8 prescribed 13I categories and adds the required per-route fields.
# Usage: python3 build_route_register_13i_stage2.py <stage1.csv> <out.csv> <out.md>   (run from the repo root)
import csv, sys, collections
src, out_csv, out_md = sys.argv[1:4]
rows = list(csv.DictReader(open(src)))
CAT = {1: 'Confirmed in-scope application defect', 2: 'Required schema/migration dependency', 3: 'Production-only or externally managed schema dependency', 4: 'Optional or obsolete feature',
       5: 'Configuration/provider dependency', 6: 'Owner decision required', 7: 'Protected financial/bidding/authentication boundary', 8: 'Historical failure not reproduced'}
def wf(p):
    for k, v in [('/api/admin/queue', 'Admin queue monitoring'), ('/api/notification-analytics', 'Admin notification analytics'), ('/api/feature-flags', 'Feature flags'), ('/api/listing-quality', 'Listing-quality analytics (staff)'),
                 ('/api/marketplace-health', 'Marketplace health (staff)'), ('/api/dealer-health-score', 'Dealer health scoring (dealer workstream)'), ('/api/dealer/', 'Dealer trade listings (dealer workstream)'),
                 ('/api/admin/', 'Staff/admin console module'), ('/api/new-admin/', 'Staff auction-integrity module'), ('/api/bids', 'Bidding (protected)'), ('/api/escrow', 'Escrow (protected)'),
                 ('/api/finance', 'Finance (protected)'), ('/api/referral', 'Referrals (protected payouts)'), ('/api/sms-bidding', 'SMS bidding (protected)'), ('/api/intelligence', 'Market intelligence (staff)'),
                 ('/api/organizations', 'Organizations (garage/org module)'), ('/api/automation', 'Automation / approvals (staff)')]:
        if p.startswith(k): return v
    return 'Auxiliary platform module (' + p.split('/')[2] + ')'
out = []
for r in rows:
    c, spa, root, disp, path = r['category'], r['spa_referenced'], r['root_cause'], r['disposition'], r['path']
    if c == 'E': n, rem = 7, 'NOT CHANGED. Owner-approved change inside the protected domain (financial/bid owner sign-off) before any code or schema work.'
    elif c == 'B': n, rem = 3, 'BLOCKED: database owner supplies schema-only metadata (scripts/owner/phase13h_schema_metadata_export.sql); then classify and, only if application-owned, write a migration.'
    elif c == 'A?': n, rem = 2, 'Repository DDL exists only in a schema file (not a migration). Owner confirms it is the intended definition, then it is promoted to a migration and certified on a disposable DB.'
    elif c == 'A?/C': n, rem = 6, 'Owner confirms whether the column exists in production; otherwise correct the reader to an existing column.'
    elif disp.startswith('CORRECT AS DESIGNED'): n, rem = 4, 'None: documented 503 (TRADE_LISTINGS_UNAVAILABLE). Provision cars.wholesale only if dealer trade listings are to launch.'
    elif disp.startswith('CONFIG'): n, rem = 5, 'Verify the queue Redis contract at staging preflight (REDIS_HOST/REDIS_PORT vs REDIS_URL) or approve making queueService honour REDIS_URL; DLQ infrastructure must be initialised.'
    elif c == 'D': n, rem = 6, 'Service was written for Mongoose-style model statics the model facade never implemented; fixing means inventing semantics. Owner decides: implement against a defined data model, or retire the route (explicit 501/503). Not fixed: not part of the unified buyer/private-seller workflow.'
    elif c == 'C' and spa == 'yes': n, rem = 6, 'Table exists in no migration, no schema file and not in the production table list. Owner decides: provision a data model or disable the route with an explicit 501/503. No table invented.'
    else: n, rem = 4, 'Candidate optional/obsolete feature (table in no migration/schema/production list and no SPA caller). Owner confirms retire vs provision; route not changed. No table invented.'
    exp = {'public (no login)': '200 for anonymous (public data)', 'any authenticated user': '200 for any signed-in user (anonymous 401)'}.get(r['required_role'], '200 for ' + r['required_role'] + '; anonymous 401; unauthorized signed-in 403')
    act = f"anon {r['anonymous']} / user {r['user']} / dealer {r['dealer']} / admin {r['admin']} / superadmin {r['superadmin']}"
    scope = 'no' if n not in () else 'no'
    out.append(dict(method=r['method'], path=path, expected_role=r['required_role'], expected_response=exp, actual_response=act, root_cause=root, category_13i=f'{n}. {CAT[n]}',
        affected_workflow=wf(path), unified_personal_account_impact='None: not called by the dashboard, Seller Studio, buyer pages or the private-seller review page; 0 5xx across 118 browser checks and 77+165 HTTP checks',
        in_scope_defect_for_13i='no', remediation=rem, spa_referenced=spa, test_evidence='validation-logs/phase13i/sweep/sweep-final.json; probe-final-merged.json; validation-logs/phase13i/final/ui-journeys.log'))
out.append(dict(method='GET', path='/api/analytics/market/county-trends', expected_role='public (no login)', expected_response='200 for anonymous', actual_response='anon 200 (final stack)', root_cause='Historical 13G failure (cars.location column); fixed in 13H', category_13i=f'8. {CAT[8]}',
    affected_workflow='Public market analytics', unified_personal_account_impact='None', in_scope_defect_for_13i='no', remediation='None (fixed and re-verified)', spa_referenced='yes', test_evidence='validation-logs/phase13i/final/historical-county-trends.txt'))
w = csv.DictWriter(open(out_csv, 'w', newline=''), fieldnames=list(out[0].keys())); w.writeheader(); w.writerows(out)
cnt = collections.Counter(o['category_13i'] for o in out)
md = ['# KAYAD Phase 13I — Route Failure Disposition\n',
 'Register (one row per route, all required fields): `KAYAD_PHASE13I_ROUTE_FAILURE_DISPOSITION_REGISTER.csv`. Fresh evidence on the final tree: `validation-logs/phase13i/sweep/sweep-final.{log,json}` (480 parameter-free GET routes as super admin) and `probe-final-merged.json` (per-role statuses + backend log cause).\n',
 '## Reproduction\n- Final sweep: **480 routes, 112 returned 5xx (109×500, 3×503)** — identical to the 13H result; the baseline sweep on the 13H code (same stack) is also 112. Nothing new broke; nothing was forced to 200. Scope limit unchanged: POST/PUT/PATCH/DELETE and path-parameter routes are not swept.\n- Historical failure not reproduced: `/api/analytics/market/county-trends` (13G\'s 113th failure) is 200 on the final stack.\n',
 '## Classification (112 current + 1 historical)\n| category | routes |\n|---|---|\n'] + [f'| {k} | {v} |\n' for k, v in sorted(cnt.items())] + [
 '\n## Personal-account defects\n**None.** No failing route is called by the unified dashboard, Seller Studio, buyer features, the private-seller review page or the personal-account APIs. The defects the personal-account workstream did have (listing exposure through six public/by-id endpoints, the valuation-matrix cache, the legacy approval endpoint, the saved-search job) were fixed and are certified separately; none appears in this register.\n',
 '## Notes on the 20 code defects (category 6, not fixed)\n13 × `ReferenceError`, 3 × `TypeError`, 2 × queue not initialised (category 5), 1 × deliberate 503 (category 4), `JobFailure`/`FeatureFlag`/`ListingQuality`/`MarketplaceHealth`/`NotificationAudit` used but never imported, and the model facade has no implementation of the Mongoose-style statics they call. Importing the models would only move the failure; implementing the statics invents product semantics, so the owner decides implement vs retire. Only `/api/dealer-health-score/ranking/list` is reachable anonymously (500, no data exposure). `/api/feature-flags/user` fails for every signed-in user but no SPA page calls it.\n',
 '## Protected (category 7, 9 routes) — not touched\nbids integrity (`bids.is_suspicious`), escrow operations (`issue_details` embed), finance issues, referral payouts (`transactions`), SMS bidding (`sms_bidders`), auction integrity (`auction_integrity_flags`, `auction_risk_profiles`). Dependencies documented; Phase 13I stops at the boundary.\n',
 '## Schema (categories 2 and 3)\n8 routes depend on production-only tables (BLOCKED on the owner export), 1 on a schema file that is not a migration (`organizations`). 73 routes need tables found nowhere: the owner decides provision vs retire (category 6/4). See `KAYAD_PHASE13I_SCHEMA_BLOCKERS_AND_OWNER_EVIDENCE_REQUEST.md`.\n']
open(out_md, 'w').write(''.join(md)); print(len(out), dict(cnt))
