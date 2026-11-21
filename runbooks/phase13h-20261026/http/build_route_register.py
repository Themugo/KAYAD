#!/usr/bin/env python3
# PHASE 13H — builds the remaining-route-failure register from the after-fix probe, the Phase C1 production-presence snapshot
# (reports/phase-c1/PHASE_C1_SCHEMA_RECONCILIATION.csv, 2026-10-21, table names only) and the repository DDL scan. Run from repo root.
import csv, json, re
P = json.load(open('validation-logs/phase13h/probe-after-13H.json'))
BASE = {r['path']: r for r in json.load(open('validation-logs/phase13h/probe113-baseline.json'))}
C1 = {r['table_name']: r for r in csv.DictReader(open('reports/phase-c1/PHASE_C1_SCHEMA_RECONCILIATION.csv'))}
DDL = json.load(open('validation-logs/phase13h/missing-relations-ddl-scan.json'))['nonMigrationDDL']
PROTECTED = {'/api/bids/admin/suspicious': 'bid integrity (bids.is_suspicious)', '/api/escrow/operations/dashboard': 'escrow operations', '/api/finance/issues': 'escrow issues / finance',
  '/api/referral/stats': 'referral payouts (transactions)', '/api/admin/referrals/stats': 'referral payouts (transactions)', '/api/sms-bidding/my': 'SMS bidding profile (bid domain)',
  '/api/new-admin/auction-integrity': 'auction integrity / bidding', '/api/new-admin/auction-integrity/dashboard': 'auction integrity / bidding', '/api/new-admin/auction-integrity/risk-profiles': 'auction integrity / bidding'}
SWEEP = {e['path']: e.get('cause','') for e in json.load(open('validation-logs/phase13h/sweep-after-13H.json'))['serverErrors']}
def clean(s): return s.replace('\\"', '"')
def cause(r):
    t = clean(' '.join(r.get('logExcerpt', [])))
    m = re.search(r'relation "public\.([a-z_0-9]+)" does not exist', t)
    if m: return ('missing-relation', m.group(1), f'relation public.{m.group(1)} does not exist')
    m = re.search(r'column ([a-z_0-9.]+) does not exist', t)
    if m: return ('missing-column', m.group(1), f'column {m.group(1)} does not exist')
    m = re.search(r'(\w+) is not defined', t)
    if m: return ('code-undefined-identifier', m.group(1), f'ReferenceError: {m.group(1)} is not defined (model never imported; its static methods are not implemented by the model facade)')
    m = re.search(r'(\w+(?:\.\w+)?) is not a function', t)
    if m: return ('code-unimplemented-method', m.group(1), f'TypeError: {m.group(1)} is not a function (Mongoose-style static absent from the model facade)')
    if 'replace is not a function' in t: return ('code-type-error', 'featureFlagService.getAllFlags', 'TypeError: s.replace is not a function (legacy Mongoose-style query on an unprovisioned flag store)')
    if 'ECONNREFUSED' in t: return ('provider-config', 'redis', 'ECONNREFUSED 127.0.0.1:6379 (BullMQ connection built from REDIS_HOST/REDIS_PORT, not REDIS_URL)')
    if 'not initialized' in t: return ('provider-config', 'dead-letter queue', 'Dead letter queue not initialized (queue infrastructure not started: Redis/BullMQ)')
    if 'embedded resource' in t or 'issue_details' in t: return ('relationship-embed', 'escrow_issues->issue_details', 'PostgREST relationship embed issue_details not resolvable')
    m = re.search(r'relation "public\.([a-z_0-9]+)" does not exist', SWEEP.get(r['path'], ''))
    if m: return ('missing-relation', m.group(1), f'relation public.{m.group(1)} does not exist')
    return ('unclassified', '', '')
out = []
for r in P:
    path = r['path']; kind, obj, detail = cause(r)
    if path == '/api/dealer/trade-listings': kind, obj, detail = ('intentional-503', 'cars.wholesale', 'Deliberate 503 TRADE_LISTINGS_UNAVAILABLE: cars.wholesale is not in the repository schema (Stage 5C decision), not a defect')
    if path == '/api/admin/queue/aggregated' and kind == 'unclassified': kind, obj, detail = ('code-undefined-identifier', 'JobFailure', 'queue metrics service calls JobFailure statics (JobFailure not imported / statics not implemented)')
    if path == '/api/intelligence/countries': kind, obj, detail = ('missing-column', 'users.country', 'intelligenceService selects users.country/countryCode/country_code: none exists in any DDL (users has only `location`)')
    if path == '/api/dealer-health-score/ranking/list' and kind == 'unclassified': kind, obj, detail = ('code-unimplemented-method', 'DealerHealthScore.getTopDealers', 'TypeError: DealerHealthScore.getTopDealers is not a function (statics absent; table dealer_health_scores is production-only)')
    if path == '/api/escrow/operations/dashboard': kind, obj, detail = ('relationship-embed', 'escrow_issues->issue_details', 'PostgREST: issue_details is not an embedded resource in this request')
    # category + disposition
    if path in PROTECTED:
        cat = 'E'; disp = 'PROTECTED - NOT CHANGED'; owner = f'Owner-approved change inside the protected domain ({PROTECTED[path]}); needs financial/bid owner sign-off before any code or schema work.'
    elif kind == 'intentional-503':
        cat = 'D'; disp = 'CORRECT AS DESIGNED (documented 503)'; owner = 'None. Provision cars.wholesale only if dealer trade listings are to launch.'
    elif kind == 'missing-relation':
        t = obj; c1 = C1.get(t); prod = c1['in_production_20261021'] if c1 else 'not in C1 list'
        if t in DDL: cat = 'A?'; disp = 'DECISION: promote repository schema file to a migration'; owner = f'DDL exists only in {DDL[t]} (not a migration, not applied). Owner confirms it is the intended definition before it is promoted.'
        elif prod == 'YES': cat = 'B'; disp = 'BLOCKED: production-only schema (needs read-only schema export)'; owner = f'Table {t} exists in production (2026-10-21 snapshot, name only) with no DDL in the repository. Database owner supplies schema-only metadata.'
        else: cat = 'C'; disp = 'DECISION: provision or retire the feature'; owner = f'Table {t} exists in no migration, no schema file and not in the production table list. Owner decides: build a data model, or disable the route with an explicit 501/503.'
    elif kind in ('code-undefined-identifier', 'code-unimplemented-method', 'code-type-error'):
        cat = 'D'; disp = 'DECISION: implement or retire (code defect independent of schema)'; owner = 'The service was written for Mongoose-style model statics that the model facade never implemented; importing the model is not enough. Implementing them means inventing semantics, so the owner decides: implement against a defined schema, or retire the route.'
    elif kind == 'provider-config':
        cat = 'D'; disp = 'CONFIG: verify queue Redis connection contract at preflight'; owner = 'Confirm production sets REDIS_HOST/REDIS_PORT (queueService) as well as REDIS_URL, or approve making queueService honour REDIS_URL.'
    elif kind == 'missing-column':
        cat = 'A?/C'; disp = 'DECISION: column has no DDL anywhere'; owner = f'{obj}: confirm whether the column exists in production; otherwise correct the reader to an existing column (owner decision).'
    else: cat = '?'; disp = 'UNRESOLVED'; owner = 'Needs investigation.'
    b = BASE.get(path, {}); spa = bool(b.get('feRef'))
    required = 'any authenticated user' if (r['anonymous'] in (401, 403) and (r['user'] or 0) >= 500) else ('public (no login)' if (r['anonymous'] or 0) >= 500 else ('staff (admin/superadmin)' if r['user'] == 403 else ('dealer-business' if r['dealer'] in (200, 503) or (r['dealer'] or 0) >= 500 else 'see statuses')))
    tier = 'P1 public/any-user + SPA-referenced' if (required != 'staff (admin/superadmin)' and spa) else ('P2 staff + SPA-referenced' if spa else 'P3 not referenced by the SPA')
    out.append(dict(method='GET', path=path, required_role=required, anonymous=r['anonymous'], user=r['user'], dealer=r['dealer'], admin=r['admin'], superadmin=r['superadmin'],
        expected_unauth='401', expected_unauthorized='403 for non-staff on staff routes', root_cause=detail, object=obj, category=cat, spa_referenced='yes' if spa else 'no',
        priority_tier=tier, disposition=disp, owner_decision=owner, regression_evidence='validation-logs/phase13h/probe-after-13H.json; no 5xx in the 76 browser journey checks'))
w = csv.DictWriter(open('KAYAD_PHASE13H_REMAINING_ROUTE_FAILURE_REGISTER.csv', 'w', newline=''), fieldnames=list(out[0].keys())); w.writeheader(); w.writerows(out)
import collections
print(len(out), 'rows'); print(collections.Counter(o['category'] for o in out)); print(collections.Counter(o['priority_tier'] for o in out)); print(collections.Counter(o['disposition'].split(':')[0] for o in out))
print('public 5xx:', [o['path'] for o in out if o['required_role'].startswith('public')])
