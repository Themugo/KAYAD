#!/usr/bin/env python3
"""Stage 4 static migration-chain analysis (read-only; touches no database).

Inputs : supabase/migrations/*.sql, KAYAD_MIGRATION_INVENTORY_20261013.tsv (historical production status; NOT live evidence)
Outputs: a TSV risk matrix (one row per migration) and a dependency-inversion report
         (an object referenced by a migration that sorts BEFORE the migration that creates it).
Usage  : python3 scripts/analyze-migration-chain-stage4.py <repo_root> <out_dir>
"""
import csv, os, re, sys

root, out = sys.argv[1], sys.argv[2]
mdir = os.path.join(root, "supabase", "migrations")
files = sorted(f for f in os.listdir(mdir) if f.endswith(".sql"))
inv = {}
with open(os.path.join(root, "KAYAD_MIGRATION_INVENTORY_20261013.tsv"), newline="") as fh:
    for r in csv.DictReader(fh, delimiter="\t"):
        inv[r["file"]] = r

def strip(sql):
    sql = re.sub(r"/\*.*?\*/", " ", sql, flags=re.S)
    return "\n".join(l for l in sql.split("\n") if not l.strip().startswith("--"))

text = {f: strip(open(os.path.join(mdir, f), encoding="utf-8", errors="replace").read()) for f in files}
ident = r'(?:public\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?'
CT = re.compile(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?" + ident, re.I)
CF = re.compile(r"CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+" + ident + r"\s*\(", re.I)
creates = {}
for f in files:
    for m in CT.finditer(text[f]): creates.setdefault(("table", m.group(1).lower()), f)
    for m in CF.finditer(text[f]): creates.setdefault(("function", m.group(1).lower()), f)
# first creator wins (CREATE OR REPLACE later does not move the creation point)
REF_T = re.compile(r"\b(?:FROM|JOIN|INTO|UPDATE|REFERENCES|TABLE(?:\s+IF\s+EXISTS)?|ON)\s+" + ident, re.I)
REF_F = re.compile(r"\b(kayad_[a-z0-9_]+)\s*\(", re.I)

inversions = []
for i, f in enumerate(files):
    refs = set()
    for m in REF_T.finditer(text[f]): refs.add(("table", m.group(1).lower()))
    for m in REF_F.finditer(text[f]): refs.add(("function", m.group(1).lower()))
    own = {k for k, v in creates.items() if v == f}
    for k in sorted(refs - own):
        c = creates.get(k)
        if c and c > f:
            guarded = bool(re.search(r"IF\s+EXISTS|to_regclass|information_schema|EXCEPTION", text[f], re.I))
            inversions.append((f, k[0], k[1], c, "guarded?" if guarded else "UNGUARDED"))

def flag(pat, s): return int(bool(re.search(pat, s, re.I)))
rows = []
for f in files:
    s = text[f]; r = inv.get(f, {})
    rows.append({
        "file": f,
        "historical_prod_status": r.get("prod_status", "?"),
        "inventory_class": r.get("classification", "?"),
        "drops_column": flag(r"DROP\s+COLUMN", s),
        "drops_table": flag(r"DROP\s+TABLE", s),
        "drops_or_replaces_constraint": flag(r"DROP\s+CONSTRAINT|ADD\s+CONSTRAINT", s),
        "unique_index_may_fail_on_duplicates": flag(r"CREATE\s+UNIQUE\s+INDEX", s),
        "set_not_null": flag(r"SET\s+NOT\s+NULL", s),
        "updates_users_or_roles": flag(r"UPDATE\s+(?:public\.)?(?:users|profiles|user_auth)\b|\brole\s*=", s),
        "deletes_rows": flag(r"\bDELETE\s+FROM\b|\bTRUNCATE\b", s),
        "grant_revoke": flag(r"\b(?:GRANT|REVOKE)\b", s),
        "enables_rls_or_policies": flag(r"ENABLE\s+ROW\s+LEVEL|CREATE\s+POLICY|DROP\s+POLICY", s),
        "security_definer": flag(r"SECURITY\s+DEFINER", s),
        "rerun_safe_per_inventory": r.get("rerun_idioms", "?"),
        "own_transaction": r.get("uses_txn", "?"),
    })
os.makedirs(out, exist_ok=True)
with open(os.path.join(out, "stage4_migration_risk_matrix.tsv"), "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()), delimiter="\t"); w.writeheader(); w.writerows(rows)
with open(os.path.join(out, "stage4_dependency_inversions.tsv"), "w") as fh:
    fh.write("migration\tobject_kind\tobject\tcreated_by_later_migration\tguard\n")
    for t in inversions: fh.write("\t".join(t) + "\n")
print("migrations:", len(files), "| objects tracked:", len(creates), "| dependency inversions:", len(inversions))
print("by guard:", {g: sum(1 for t in inversions if t[4] == g) for g in {t[4] for t in inversions}})
