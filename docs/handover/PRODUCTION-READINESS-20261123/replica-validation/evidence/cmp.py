import collections,json,sys
KEYS={'COL':lambda f:(f[1],f[2]),'CON':lambda f:(f[1],f[2]),'IDX':lambda f:(f[1],f[2]),'FN':lambda f:(f[1],),'TRG':lambda f:(f[1],f[2]),'POL':lambda f:(f[1],f[2]),'RLS':lambda f:(f[1],),'ACL':lambda f:(f[1],),'SEQ':lambda f:(f[1],)}
def load(p):
    d=collections.defaultdict(dict)
    for l in open(p,encoding='utf8'):
        f=l.rstrip('\n').split('\t')
        if f[0] in KEYS and len(f)>1: d[f[0]][KEYS[f[0]](f)]=tuple(f[1:])
    return d
H=load('cat_hosted.tsv');R=load('cat_repo.tsv')
out={}
for k in KEYS:
    h,r=H[k],R[k]
    out[k]=dict(hosted=len(h),repo=len(r),hosted_only=sorted(x for x in h if x not in r),repo_only=sorted(x for x in r if x not in h),differ=sorted(x for x in h if x in r and h[x]!=r[x]))
    print(f"{k}: hosted={len(h)} repo={len(r)} hosted_only={len(out[k]['hosted_only'])} repo_only={len(out[k]['repo_only'])} differ={len(out[k]['differ'])}")
json.dump(out,open('cmp.json','w'),indent=1,default=str)
