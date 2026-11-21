#!/usr/bin/env python3
"""Resolve the middleware chain of every write route (POST/PUT/PATCH/DELETE) from source. Static analysis = a MAP for inspection, not proof."""
import re, os, sys, json, csv, glob
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BE = os.path.join(ROOT, 'backend')
def read(p): return open(p, encoding='utf-8', errors='replace').read()
def balanced(s, i):  # s[i] == '(' -> index after matching ')'
    d = 0; q = None; j = i
    while j < len(s):
        c = s[j]
        if q:
            if c == '\\': j += 1
            elif c == q: q = None
        elif c in '"\'`': q = c
        elif c == '(': d += 1
        elif c == ')':
            d -= 1
            if d == 0: return j + 1
        j += 1
    return len(s)
def split_top(a):
    out = []; d = 0; q = None; cur = ''
    for k, c in enumerate(a):
        if q:
            cur += c
            if c == q and a[k-1] != '\\': q = None
            continue
        if c in '"\'`': q = c; cur += c; continue
        if c in '([{': d += 1
        if c in ')]}': d -= 1
        if c == ',' and d == 0: out.append(cur.strip()); cur = ''
        else: cur += c
    if cur.strip(): out.append(cur.strip())
    return out
# ---- server.js mounts: name -> (prefix, [mount middleware])
srv = read(os.path.join(BE, 'server.js'))
imports = {}
for m in re.finditer(r'import\s+(\w+)\s+from\s+"(\./[^"]+)"', srv):
    imports[m.group(1)] = os.path.normpath(os.path.join(BE, m.group(2)))
mounts = {}
for m in re.finditer(r'app\.use\(\s*"([^"]+)"\s*,([^;]*?)\);', srv):
    prefix, rest = m.group(1), split_top(m.group(2))
    if not rest: continue
    name = rest[-1].strip()
    if name in imports: mounts.setdefault(imports[name], []).append((prefix, rest[:-1]))
def file_imports(path, src):
    out = {}
    for m in re.finditer(r'import\s+(\w+)\s+from\s+[\'\"](\.[^\'\"]+)[\'\"]', src):
        t = os.path.normpath(os.path.join(os.path.dirname(path), m.group(2)))
        if not t.endswith('.js'): t += '.js'
        out[m.group(1)] = t
    return out
parents = {}  # child file -> [(parent file, prefix, mws)]
for f in sorted(set(glob.glob(BE + '/**/*.js', recursive=True))):
    if 'node_modules' in f or '/tests/' in f: continue
    src = read(f)
    if not re.search(r'\.use\(', src): continue
    imp = file_imports(f, src)
    for m in re.finditer(r'\b(?:router|app)\.use\(', src):
        i = m.end() - 1; a = split_top(src[i+1:balanced(src, i)-1])
        if not a or a[-1] not in imp or imp[a[-1]] == f: continue
        pre = a[0].strip('"\'`') if a[0][:1] in '"\'`' else ''
        mws = a[1:-1] if pre else a[:-1]
        parents.setdefault(imp[a[-1]], []).append((f, pre, mws))
def ancestry(f, seen=()):
    # list of (path prefix string, middleware text) from the root down to f
    if f == os.path.join(BE, 'server.js'): return [('', '')]
    res = []
    for pf, pre, mws in parents.get(f, []):
        if pf in seen: continue
        for pp, pm in ancestry(pf, seen + (f,)): res.append((pp + pre, pm + ' ' + ' '.join(mws)))
    return res
AUTH = re.compile(r'\b(protect|requireRole|allowRoles|requireOrgAccess|guard|authorizeAdmin|authenticate|requireAuth|verifyToken|authMiddleware|ensureAuth|protectOptional|auth)\b')
AUTHZ = re.compile(r'\b(allowRoles|authorize\w*|requireRole\w*|requirePermission\w*|checkPermission\w*|adminOnly|isAdmin|requireAdmin\w*|ownerOnly|requireOwner\w*|requireDealer\w*|dealerOnly|requireStaff\w*|requireCapability\w*|require\w*Role|require\w*Access|guard\w*|assertRole\w*|require[A-Z]\w*)\b')
VALID = re.compile(r'\b(validate\w*|zodValidate|celebrate|body\(|check\(|\w*Schema|sanitize\w*|validateRequest|validateBody)\b')
RATE = re.compile(r'\b(\w*[Ll]imiter\w*|rateLimit\w*|throttle\w*)\b')
IDEM = re.compile(r'\b(idempoten\w*)\b', re.I)
SIG = re.compile(r'\b(verify\w*(Signature|Webhook|Callback|Hmac)\w*|\w*(webhook|callback)\w*(Auth|Guard|Verify)\w*|validateMpesa\w*|mpesaCallback\w*Auth|requireApiKey|apiKeyAuth\w*|verifyProvider\w*|\w*[Ss]ignature\w*)\b')
TIERS = [
 ('T1 auth/account', r'(authRoutes|userRoutes|accountCapabilit|privateSellerCapability|ownerAccess|sessionRoutes|twoFactor|kyc|identity)'),
 ('T2 listings/moderation', r'(carRoutes|listing|moderation|uploadRoutes|vehicleIntel|mediaRoutes|inspection)'),
 ('T3 offers/negotiation', r'(leadRoutes|offer|negotiation|chatRoutes|bidRoutes|auctionRoutes|auctionRegistration|savedSearch)'),
 ('T4 payments/settlement', r'(paymentRoutes|walletRoutes|transactionRoutes|marketplaceFulfilment|auctionSettlement|auctionFulfilment|payout|b2c|mpesa)'),
 ('T5 escrow/reconciliation', r'(escrow|reconcil|disputeRoutes|refund|ledger)'),
 ('T6 admin/dealer', r'(adminRoutes|dealer|owner|admin|governance|cms|configuration)'),
]
def tier(path):
    for n, rx in TIERS:
        if re.search(rx, path, re.I): return n
    return 'T7 other'
rows = []
files = [f for f in glob.glob(BE + '/**/*Routes.js', recursive=True) + glob.glob(BE + '/routes/*.js') + glob.glob(BE + '/**/*routes*.js', recursive=True) + glob.glob(BE + '/**/*Router.js', recursive=True) if 'node_modules' not in f and '/tests/' not in f]
files = sorted(set(files))
for f in files:
    s = read(f)
    if not re.search(r'\b(Router|router|app)\b', s): continue
    # file-level router.use(...) chain applies to subsequent routes
    uses = [(m.start(), m.group(0)) for m in re.finditer(r'\brouter\.use\(([^;]*?)\);', s)]
    mp = [(a, [b]) for a, b in ancestry(f)] or mounts.get(f, [])
    ownguard = re.findall(r'const\s+guard\s*=[^;]*;', s)
    for m in re.finditer(r'\b(?:router|app)\.(post|put|patch|delete)\(', s):
        i = m.end() - 1; j = balanced(s, i); args = split_top(s[i+1:j-1])
        if not args: continue
        p = args[0].strip('"\'`') if args[0][:1] in '"\'`' else args[0]
        mids = args[1:-1] if len(args) > 1 else []; handler = args[-1] if len(args) > 1 else ''
        pre = ' '.join(u for pos, u in uses if pos < m.start())
        mount = ' '.join(' '.join(x[1]) for x in mp)
        chain = ' '.join(mids); allc = chain + ' ' + pre + ' ' + mount + ' ' + ' '.join(ownguard if 'guard(' in chain else [])
        line = s.count('\n', 0, m.start()) + 1
        pfx = ';'.join(sorted({x[0] for x in mp})) or '(not mounted in server.js)'
        rows.append({
            'tier': tier(os.path.relpath(f, BE)), 'file': os.path.relpath(f, BE), 'line': line, 'method': m.group(1).upper(), 'mount': pfx, 'path': p,
            'auth': 'yes' if (AUTH.search(allc) or re.search(r'\b\w*[Gg]uard\b', allc)) else ('signature/apikey' if SIG.search(allc) else 'NONE'),
            'authz': 'yes' if AUTHZ.search(allc.replace('requireAuth', '')) else 'none',
            'validation': 'yes' if VALID.search(allc) else 'none',
            'rate_limit': 'yes' if RATE.search(allc) else 'none',
            'idempotency': 'yes' if IDEM.search(allc) else 'none',
            'csrf': 'global(/api)' ,
            'handler': handler[:60].replace('\n', ' '),
        })
cols = list(rows[0].keys())
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'docs/handover/NEXT-PHASE-20261121/WRITE-ROUTE-MATRIX-20261121.csv')
with open(out, 'w', newline='') as fh:
    w = csv.DictWriter(fh, cols); w.writeheader(); w.writerows(rows)
print(len(rows), 'write routes ->', out)
