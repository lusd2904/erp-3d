import json,os,re
pm=json.load(open('page_module2.json'));r={json.loads(l)['id']:json.loads(l) for l in open('manifest.jsonl')}
def m(v): return v if isinstance(v,str) else '/'.join(v)
G3={'流程中心','BOS平台','基础管理','系统管理','共享服务中心','移动应用','星空云服务','经营分析','RPA','协同开发云'}
g3=[p for p,v in pm.items() if m(v).split('/')[0] in G3]
full=set(p for p in g3 if m(pm[p]).startswith('流程中心/') or m(pm[p])=='BOS平台/BOS平台')
named=open('read_named.txt').read().split()
full|=set(n for n in named if n in pm)
out={}
miss=[]
for p in g3:
    if p in full: continue
    if p not in r or not os.path.exists(r[p].get('file','')): miss.append(p); continue
    out.setdefault(m(pm[p]),[]).append((p,len(open(r[p]['file']).read())))
json.dump({'unread':out,'missing':miss,'full':sorted(full)},open('g3_unread.json','w'),ensure_ascii=False,indent=0)
print('missing',miss)
tot=0
for k,v in sorted(out.items(),key=lambda x:-sum(c for _,c in x[1])):
    s=sum(c for _,c in v); tot+=s; print(k,len(v),s)
print('total',sum(len(v) for v in out.values()),tot)
