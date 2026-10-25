import json,glob,os,re,sys,collections
from PIL import Image
ROOT=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','evidence','super-admin-completion-20261025'))
FIN=sys.argv[1] if len(sys.argv)>1 else ROOT+'/screenshots-after/final'
rows=[]
for f in sorted(glob.glob(FIN+'/*.log.json')):
    n=os.path.basename(f)[:-9]
    m=re.match(r'(fin-\w)-(\w+?)-(.+)-(\d+)x(\d+)$',n)
    if not m: continue
    tag,scen,rt,w,h=m.groups(); d=json.load(open(f)); mt=d['metrics']
    ax=mt.get('axe') or []
    rows.append(dict(name=n,scenario=scen,route=rt,vw=int(w),vh=int(h),h1=mt.get('h1'),hov=mt.get('hOverflowPage'),boundary=mt.get('boundary'),unnamed=mt.get('unnamedControls'),
      lowc=mt.get('lowContrastCount'),lowcItems=mt.get('lowContrast'),axe=ax,interact=mt.get('interact'),pageErrors=len(d.get('pageErrors',[])),
      console=d.get('console',[]),failed=len(d.get('failed',[])),overflowing=len(mt.get('overflowing') or [])))
json.dump(rows,open(FIN+'/aggregate.json','w'),indent=1)
print(len(rows),'records')
by=collections.Counter((r['scenario'],r['vw']) for r in rows); print(dict(by))
print('page errors',sum(r['pageErrors'] for r in rows),'boundary',sum(1 for r in rows if r['boundary']),'hov',sum(1 for r in rows if r['hov']),'unnamed',sum(r['unnamed'] or 0 for r in rows))
axec=collections.Counter()
for r in rows:
    for v in r['axe']: axec[(v['id'],v['impact'])]+=r['axe'] and 1
print('axe',axec.most_common(12))
