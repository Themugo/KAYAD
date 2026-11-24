#!/usr/bin/env python3
"""Final-closure Phase 5: Migration | Repository | Hosted ledger | Schema evidence | Classification.
Inputs are the READ-ONLY hosted evidence files (ledger, missing tables/functions/columns). Nothing here touches a database."""
import re,os,sys,csv
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ev=f'{root}/docs/admin-console-closure/evidence/hosted-readonly'
ledger={}; names={}
for l in open(f'{ev}/ledger-20261124.tsv'):
    p=l.rstrip('\n').split('\t')
    if len(p)>=2: ledger[p[0]]=p[1]; names.setdefault(re.sub(r'^\d+_','',p[1]).replace('.sql',''),[]).append(p[0])
def words(f): return set(open(f).read().split('\n',1)[1].split())
mt=words(f'{ev}/missing-tables-20261124.txt'); mf=words(f'{ev}/missing-functions-20261124.txt')
mc=set()
for l in open(f'{ev}/missing-columns-20261124.txt').read().split('\n')[1:]:
    if ':' in l:
        t,cs=l.split(':',1)
        for c in cs.split(): mc.add(f'{t}.{c}')
out=[]; files=sorted(os.listdir(f'{root}/supabase/migrations'))
for f in files:
    m=re.match(r'^(\d{14})_(.*)\.sql$',f); ver,name=m.group(1),m.group(2)
    sql=open(f'{root}/supabase/migrations/{f}',errors='ignore').read()
    tabs=set(re.findall(r'create\s+(?:or\s+replace\s+)?(?:table|view|materialized\s+view)\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?(\w+)"?',sql,re.I))
    fns=set(re.findall(r'create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?(\w+)"?\s*\(',sql,re.I))
    cols=set()
    for t,body in re.findall(r'alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?"?(\w+)"?\s+([^;]*);',sql,re.I):
        for c in re.findall(r'add\s+column\s+(?:if\s+not\s+exists\s+)?"?(\w+)"?',body,re.I): cols.add(f'{t}.{c}')
    missT=sorted(tabs&mt); missF=sorted(fns&mf); missC=sorted(cols&mc)
    objs=len(tabs)+len(fns)+len(cols)
    inl=ver in ledger
    nameLedger=names.get(name,[])
    if inl and re.sub(r'^\d+_','',ledger[ver]).replace('.sql','') not in (name,) and name not in ledger[ver]:
        # ledger version matches but the recorded name differs from the file
        cls='Conflicting' if not (missT or missF or missC) else 'Recorded but schema missing'
    elif inl and (missT or missF or missC): cls='Recorded but schema missing'
    elif inl: cls='Matched and verified' if objs else 'Matched and verified'
    elif nameLedger and not (missT or missF or missC): cls='Matched and verified'; inl=True
    elif nameLedger: cls='Recorded but schema missing'; inl=True
    elif missT or missF or missC: cls='Missing from hosted'
    elif objs: cls='Schema present but ledger missing'
    else: cls='Requires investigation'
    ev_txt=('absent hosted: '+', '.join((missT+missF+missC)[:6])+(' …' if len(missT+missF+missC)>6 else '')) if (missT or missF or missC) else (f'{objs} object(s) named; none flagged absent' if objs else 'no table/function/column DDL detected (data, policy, grant or index only)')
    out.append([f,'yes','yes ('+(ledger.get(ver) or ','.join(nameLedger))+')' if inl else 'no',ev_txt,cls])
w=csv.writer(open(f'{root}/docs/admin-console-closure/migration-reconciliation.csv','w',newline=''))
w.writerow(['Migration','Repository','Hosted ledger','Schema evidence','Classification']); w.writerows(out)
from collections import Counter
c=Counter(r[4] for r in out); print(len(out),dict(c))
