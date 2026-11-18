import json,re,os,collections
recs={json.loads(l)['id']:json.loads(l) for l in open('manifest.jsonl')}
allp=json.load(open('all_pages.json'))
owner={k:tuple(v) for k,v in json.load(open('page_module2.json')).items()}
lower={p.lower():p for p in allp}
text={p:open(r['file']).read().split('\n',3)[-1] for p,r in recs.items() if r['status']=='ok'}
def norm(t):
    t=t.split('|')[0].split('#')[0].strip()
    if not t or t.startswith('http'): return None
    t=t.lstrip(':').replace(' ','_').lower()
    return lower.get(t) or lower.get(t.replace('_',' '))
links={p:[x for x in (norm(m) for m in re.findall(r'\[\[([^\]]+)\]\]',t)) if x] for p,t in text.items()}
# orphan assignment: by outgoing links (e.g. 返回xx), iterate
orph=[p for p in allp if p not in owner]
how={}
for it in range(5):
    ch=0
    for p in orph:
        if p in owner: continue
        for x in links.get(p,[]):
            if x in owner and x not in ('navigation','start'):
                owner[p]=owner[x]; how[p]='出链'; ch+=1; break
    if not ch: break
# backlinks: orphan linked from an assigned page? (already covered by BFS) ; system namespaces
for p in allp:
    if p not in owner:
        ns=p.split(':')[0] if ':' in p else ''
        owner[p]=('其他','系统页') if ns in ('wiki','playground','en','talk') or p in('navigation','start','sidebar') else ('其他','未归类')

out='/workspace/erp-3d/fullsys/kingdee-modules'; os.makedirs(out,exist_ok=True)
by=collections.defaultdict(list)
for p in allp: by[owner[p]].append(p)
idx=[]
for (f,m),ps in sorted(by.items()):
    fn=f'{out}/{f}_{m}.md'.replace('/','／')
    fn=out+'/'+(f+'_'+m).replace('/','／')+'.md'
    L=[f'# {f} / {m}（{len(ps)} 页）\n','原文来自 kingdee-raw/pages（do=export_raw），按页拼接；图片只保留文件名占位（未 OCR）。\n']
    tot=0
    for p in sorted(ps):
        t=text.get(p)
        if t is None: L.append(f'\n---\n## 【页面】{p}\n（读取失败：正文为空）\n'); continue
        t2=re.sub(r'\{\{\s*:?([^}|?]+)[^}]*\}\}',lambda m:'[图:'+m.group(1).split(':')[-1].strip()+']',t)
        tot+=len(t)
        L.append(f'\n---\n## 【页面】{p}\n来源：{recs[p]["url"]}\n\n{t2.strip()}\n')
    open(fn,'w').write('\n'.join(L))
    idx.append((f,m,len(ps),tot,os.path.basename(fn)))
with open(out+'/00-索引.md','w') as o:
    o.write('# 模块正文汇总索引\n\n|领域|模块|页数|正文字符|文件|\n|---|---|---|---|---|\n')
    for r in idx: o.write('|%s|%s|%d|%d|%s|\n'%r)
c=collections.Counter(how.values()); print('orphans',len(orph),'assigned by outlink',c, 'left', sum(1 for p in orph if p not in how))
print(len(idx),'modules', sum(r[3] for r in idx))
