#!/usr/bin/env python3
"""Phase C.1 schema reconciliation matrix builder (audit tool; evidence inputs are recorded in the report).
Sources: models/_base.js TABLE_MAP, direct table literals in backend code, disposable DB built from all
supabase/migrations (introspected), backend/db/*.sql (non-migration DDL), production metadata snapshot
(read-only list_tables / list_migrations, 2026-10-21), esbuild module graph from backend/bootstrap.js."""
import csv, json, os, re, sys, subprocess, collections

ROOT = sys.argv[1]; EV = sys.argv[2]; OUT = sys.argv[3]
B = os.path.join(ROOT, 'backend')
base = open(os.path.join(B, 'models/_base.js')).read()
tm_block = base[base.index('const TABLE_MAP'):]
tm_block = tm_block[:tm_block.index('\n};')]
table_map = []  # (model, table, line)
start_line = base[:base.index('const TABLE_MAP')].count('\n') + 1
for i, line in enumerate(tm_block.split('\n')):
    for m in re.finditer(r'([A-Za-z0-9_]+)\s*:\s*"([a-z0-9_]+)"', line):
        table_map.append((m.group(1), m.group(2), start_line + i))

meta = json.load(open(os.path.join(EV, 'backend-meta.json')))
reachable = {k for k in meta['inputs'] if k.startswith('backend/')}

src_files = []
for d, dirs, files in os.walk(B):
    dirs[:] = [x for x in dirs if x not in ('node_modules', 'tests', 'testing', 'coverage')]
    for f in files:
        if f.endswith(('.js', '.mjs')) and '.test.' not in f:
            src_files.append(os.path.join(d, f))
texts = {os.path.relpath(p, ROOT): open(p, encoding='utf8', errors='ignore').read() for p in src_files}

model_files = {}
for f in os.listdir(os.path.join(B, 'models')):
    if f.endswith('.js'):
        t = open(os.path.join(B, 'models', f)).read()
        m = re.search(r'createModel\(\s*["\']([A-Za-z0-9_]+)["\']', t)
        if m: model_files.setdefault(m.group(1), []).append('backend/models/' + f)

DB_CALL = re.compile(r'(?:(?<=\bdb\.)|(?<![.\w]))(findAll|findOne|findById|count|create|update|updateMany|upsert|remove|distinct|aggregate|insertMany)\(\s*["\']([a-z][a-z0-9_]+)["\']')
SB_FROM = re.compile(r'\.from\(\s*["\']([a-z][a-z0-9_]+)["\']\s*\)')
WRITE_OPS = {'create', 'update', 'updateMany', 'upsert', 'remove', 'insertMany'}
direct = collections.defaultdict(lambda: {'files': set(), 'read': False, 'write': False})
for rel, t in texts.items():
    for m in DB_CALL.finditer(t):
        e = direct[m.group(2)]; e['files'].add(rel)
        if m.group(1) in WRITE_OPS: e['write'] = True
        else: e['read'] = True
    for m in SB_FROM.finditer(t):
        e = direct[m.group(1)]; e['files'].add(rel)
        tail = t[m.end():m.end() + 80]
        if re.match(r'\s*\.(insert|update|upsert|delete)\(', tail): e['write'] = True
        else: e['read'] = True

def model_refs(model):
    pat = re.compile(r'models/' + re.escape(model) + r'\.js|createModel\(\s*["\']' + re.escape(model) + r'["\']')
    files = sorted(r for r, t in texts.items() if pat.search(t) and not r.startswith('backend/models/'))
    read = write = False
    var = re.compile(r'\b' + re.escape(model) + r'\.(\w+)\(')
    for r in files:
        for m in var.finditer(texts[r]):
            op = m.group(1)
            if op in ('create', 'insertMany', 'updateOne', 'updateMany', 'findByIdAndUpdate', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findByIdAndDelete', 'softDelete', 'save', 'upsert'): write = True
            elif op in ('find', 'findOne', 'findById', 'countDocuments', 'count', 'exists', 'distinct', 'aggregate', 'estimatedDocumentCount'): read = True
    return files, read, write

disp = {}
for line in open(os.path.join(EV, 'disposable-table-meta.psv')):
    p = line.rstrip('\n').split('|')
    disp[p[0]] = {'cols': p[1], 'pk': p[2], 'fks': p[3], 'idx': p[4], 'rls': p[5] == 't', 'policies': p[6], 'deleted_at': p[7] == 't'}
prod = set(open(os.path.join(EV, 'prod-tables.sorted')).read().split())

# Which migration file creates each table (first CREATE TABLE in sorted migration order)
mig_dir = os.path.join(ROOT, 'supabase/migrations')
creator = {}
CT = re.compile(r'create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?', re.I)
for f in sorted(os.listdir(mig_dir)):
    for m in CT.finditer(open(os.path.join(mig_dir, f), encoding='utf8', errors='ignore').read()):
        creator.setdefault(m.group(1).lower(), f)
nonmig = collections.defaultdict(list)
for f in sorted(os.listdir(os.path.join(B, 'db'))):
    if f.endswith('.sql'):
        for m in CT.finditer(open(os.path.join(B, 'db', f)).read()):
            nonmig[m.group(1).lower()].append('backend/db/' + f)
# Rehearsed migration candidates kept in runbooks (not in supabase/migrations; awaiting owner approval)
for d, dirs, files in os.walk(os.path.join(ROOT, 'runbooks')):
    for f in files:
        if f.endswith('.sql') and ('CANDIDATE' in f.upper() or 'migration-candidate' in d):
            rel = os.path.relpath(os.path.join(d, f), ROOT)
            for m in CT.finditer(open(os.path.join(d, f), encoding='utf8', errors='ignore').read()):
                if rel not in nonmig[m.group(1).lower()]: nonmig[m.group(1).lower()].append(rel)
prod_hist_versions = set(open(os.path.join(EV, 'prod-mig.sorted')).read().split())
prod_hist_stems = set(l.strip() for l in open(os.path.join(EV, 'prod-stems.txt')))
def in_prod_history(fname):
    v = fname[:14]; stem = re.sub(r'^\d{14}_', '', fname[:-4]); stem2 = re.sub(r'^\d{14}_', '', stem)
    return v in prod_hist_versions or stem in prod_hist_stems or stem2 in prod_hist_stems

existing = set(disp) | prod
def similar(t):
    cands = []
    sing = t[:-1] if t.endswith('s') else t
    for e in sorted(existing):
        if e == t: continue
        if e.endswith('_' + t) or e.startswith(t + '_') or e.endswith('_' + sing + 's') or e == sing or e == t + 's' \
           or (len(sing) > 4 and (sing in e.split('_'))):
            cands.append(e)
    return cands[:4]

rows = {}
for model, table, line in table_map:
    r = rows.setdefault(table, {'models': [], 'map_lines': [], 'sources': set()})
    r['models'].append(model); r['map_lines'].append(str(line)); r['sources'].add('TABLE_MAP')
for table in direct:
    rows.setdefault(table, {'models': [], 'map_lines': [], 'sources': set()})['sources'].add('direct db/sb call')
# Complete the inventory with every table in either schema, even when the application never names it
# directly (reached through SQL functions/RPCs, triggers, or unused).
rpc_names = set()
for t in texts.values():
    rpc_names |= set(re.findall(r'\.rpc\(\s*["\']([a-z0-9_]+)["\']', t))
for table in sorted(set(disp) | prod):
    if table not in rows:
        rows[table] = {'models': [], 'map_lines': [], 'sources': {'schema only (no direct application reference)'}}

out = []
for table in sorted(rows):
    r = rows[table]
    files = set(); read = write = False; reach_models = []
    for model in r['models']:
        f, rd, wr = model_refs(model); files |= set(f); read |= rd; write |= wr
        mf = model_files.get(model, [])
        if any(x in reachable for x in mf): reach_models.append(model)
    d = direct.get(table)
    if d: files |= d['files']; read |= d['read']; write |= d['write']
    live_refs = sorted(f for f in files if f in reachable)
    in_mig = table in disp; in_prod = table in prod
    mig_file = creator.get(table, '')
    hist = ('YES' if in_prod_history(mig_file) else 'NO') if mig_file else ''
    dm = disp.get(table, {})
    sim = [] if (in_mig or in_prod) else similar(table)
    schema_only = r['sources'] == {'schema only (no direct application reference)'}
    if schema_only and in_mig and in_prod: cls = 'ALIGNED'; act = 'Present in both; no direct application reference (may be used via SQL functions/RPC/triggers).'
    elif schema_only and in_mig and not in_prod: cls = 'MIGRATION_EXISTS_NOT_APPLIED'; act = f'No direct app reference but used by repository SQL functions/RPCs; apply {mig_file} with its dependants.'
    elif schema_only and in_prod and not in_mig: cls = 'DDL_MISSING_FROM_REPOSITORY'; act = 'Exists in production only (production-only migration); capture DDL into a reviewed repository migration.'
    elif in_mig and in_prod: cls = 'ALIGNED'; act = 'None at table level (column-level parity not verified; see report).'
    elif in_mig and not in_prod: cls = 'MIGRATION_EXISTS_NOT_APPLIED'; act = f'Apply {mig_file} (and its dependants) to staging first, then production after approval.'
    elif in_prod and not in_mig: cls = 'DDL_MISSING_FROM_REPOSITORY'; act = 'Exists in production only (production-only migration). Capture DDL from production into a reviewed repository migration (schema-only, no data).'
    elif in_mig is False and in_prod is False and not live_refs and 'schema only' in ''.join(r['sources']): cls = 'OBSOLETE_OR_UNREACHABLE'; act = 'n/a'
    elif not live_refs: cls = 'OBSOLETE_OR_UNREACHABLE'; act = 'No reachable backend code references it. Do not create; review for removal in a separate change.'
    elif nonmig.get(table) and any('runbooks/' in x for x in nonmig[table]): cls = 'PARTIALLY_IMPLEMENTED'; act = f'Rehearsed migration CANDIDATE awaiting owner approval ({", ".join(x for x in nonmig[table] if "runbooks/" in x)}); not applied anywhere. Code path must keep its documented fallback until applied.'
    elif sim: cls = 'RENAMED_OR_LEGACY_REFERENCE'; act = f'Likely legacy name; canonical candidate(s): {", ".join(sim)}. Needs owner/architect decision on remapping; do not create a duplicate table.'
    elif nonmig.get(table): cls = 'PARTIALLY_IMPLEMENTED'; act = f'DDL drafted outside migrations ({", ".join(nonmig[table])}); feature code reachable. Needs reviewed migration + RLS before use.'
    else: cls = 'DDL_MISSING_FROM_REPOSITORY'; act = 'Reachable code depends on a table with no DDL anywhere and absent from production. Feature cannot work; needs design decision (implement schema or disable route).'
    out.append({
        'table_name': table, 'models': ';'.join(r['models']), 'table_map_lines': ';'.join(r['map_lines']),
        'reference_sources': ';'.join(sorted(r['sources'])),
        'reachable_models': ';'.join(reach_models), 'reachable_referencing_files': len(live_refs),
        'sample_reachable_references': ';'.join(live_refs[:4]),
        'reads': 'Y' if read else '', 'writes': 'Y' if write else '',
        'creating_migration': mig_file, 'creating_migration_in_prod_history': hist,
        'non_migration_ddl': ';'.join(nonmig.get(table, [])),
        'in_repo_migration_schema': 'YES' if in_mig else 'NO',
        'in_production_20261021': 'YES' if in_prod else 'NO',
        'staging': 'BLOCKED_NOT_VERIFIABLE (no KAYAD staging project exists)',
        'columns': dm.get('cols', ''), 'primary_key': dm.get('pk', ''), 'foreign_keys': dm.get('fks', ''), 'indexes': dm.get('idx', ''),
        'rls_enabled_repo': ('YES' if dm.get('rls') else 'NO') if dm else '', 'policies_repo': dm.get('policies', ''),
        'soft_delete_column': 'YES' if dm.get('deleted_at') else ('NO' if dm else ''),
        'similar_existing_tables': ';'.join(sim), 'classification': cls, 'recommended_action': act,
    })
with open(OUT, 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(out[0].keys())); w.writeheader(); w.writerows(out)
c = collections.Counter(o['classification'] for o in out)
print('tables in inventory:', len(out), '| TABLE_MAP mappings:', len(table_map), '| unique mapped:', len({t for _, t, _ in table_map}), '| direct-only:', sum(1 for o in out if o['reference_sources'] == 'direct db/sb call'))
for k, v in c.most_common(): print(f'  {k}: {v}')
