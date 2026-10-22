#!/usr/bin/env python3
"""Phase C.1 soft-delete source-reference inventory (every deletedAt/deleted_at reference in backend source)."""
import csv, json, os, re, sys
ROOT, META, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
reach = {k for k in json.load(open(META))['inputs'] if k.startswith('backend/')}
PUBLIC = {'backend/controllers/carController.js': ['getCars', 'getCar'], 'backend/services/sitemapService.js': ['generateVehicleSitemap', 'generateAuctionSitemap'],
          'backend/services/searchService.js': ['buildFilters', 'PUBLIC_INVENTORY'], 'backend/controllers/auctionController.js': ['listAuctions', 'getActiveAuctions', 'getAuction']}
RUNTIME = {
 'backend/controllers/carController.js': 'soft-delete-integrity (getCars, getCar) + HTTP matrix P1-P16 + UI U2-U4',
 'backend/services/sitemapService.js': 'soft-delete-integrity (vehicle sitemap) + HTTP matrix P14',
 'backend/services/searchService.js': 'soft-delete-integrity (search + facets)',
 'backend/services/dealerSubscription.service.js': 'soft-delete-integrity (dealer entitlement)',
 'backend/controllers/commandCenterController.js': 'HTTP matrix A7 (snapshot count = DB active rows) + stage5f5CommandCenterSnapshot.test.js',
 'backend/db/index.js': 'soft-delete-integrity (helper semantics: null/undefined/omitted/$ne/$eq/$and/$or/count)',
 'backend/models/_base.js': 'soft-delete-integrity (model adapter incl. $ne:null) + softDelete concurrency',
 'backend/controllers/auctionController.js': 'deletedAtSemantics.adapter.test.js + auctionListIntegrity.test.js (Jest)',
}
rows = []
pat = re.compile(r'deletedAt|deleted_at|softDelete|SOFT_DELETE_TABLES')
for d, ds, fs in os.walk(os.path.join(ROOT, 'backend')):
    ds[:] = [x for x in ds if x not in ('node_modules', 'coverage')]
    for f in fs:
        if not f.endswith(('.js', '.mjs')): continue
        p = os.path.join(d, f); rel = os.path.relpath(p, ROOT)
        lines = open(p, encoding='utf8', errors='ignore').read().split('\n')
        for i, line in enumerate(lines, 1):
            if not pat.search(line) or line.strip().startswith('//') or line.strip().startswith('*'): continue
            s = line.strip()
            if re.search(r'deletedAt:\s*\{\s*\$exists:\s*false\s*\}', s): kind = 'READ_FILTER active-only ($exists:false)'
            elif re.search(r'deletedAt:\s*null\b', s): kind = 'READ_FILTER active-only (explicit null)'
            elif re.search(r'deletedAt:\s*\{\s*\$exists:\s*true\s*\}|deletedAt:\s*\{\s*\$ne:\s*null', s): kind = 'READ_FILTER deleted-only'
            elif re.search(r'softDelete\(', s): kind = 'WRITE soft-delete'
            elif re.search(r'deleted_?[aA]t\s*[:=]\s*new Date|deleted_at:\s*new Date|deletedAt = ', s): kind = 'WRITE stamp'
            elif 'softDeleted' in s: kind = 'READ visibility decision'
            else: kind = 'OTHER reference'
            ctx = '\n'.join(lines[max(0, i - 12):i])
            tm = re.findall(r'(?:count|counts|findAll|findOne|find|countDocuments|list|c)\(\s*["\']([a-z_]+)["\']|([A-Z][A-Za-z]+)\.(?:find|findOne|countDocuments|softDelete|findById)\(', ctx)
            table = ''
            if tm:
                t, m = tm[-1]
                table = t or {'Car': 'cars', 'User': 'users'}.get(m, m)
            test = 'tests/' in rel
            rows.append({'file': rel, 'line': i, 'kind': kind, 'table_or_model': table, 'expression': s[:160],
                         'is_test': 'Y' if test else '', 'reachable_from_bootstrap': 'Y' if rel in reach else ('n/a (test)' if test else 'N'),
                         'public_facing': 'Y' if rel in PUBLIC else '', 'runtime_evidence': '' if test else RUNTIME.get(rel, 'SOURCE-LEVEL ONLY (validators: phaseC-soft-delete)')})
with open(OUT, 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
src = [r for r in rows if not r['is_test']]
print(f'references: {len(rows)} (source {len(src)}, tests {len(rows)-len(src)}); source files {len({r["file"] for r in src})}')
from collections import Counter; print(Counter(r['kind'] for r in src))
print('unsafe explicit-null filters in source:', sum(1 for r in src if 'explicit null' in r['kind']))
