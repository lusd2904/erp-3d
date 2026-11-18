import re,json,hashlib,os
OUT='kingdee-notes/G1a'
mods=['计划管理','工程数据','生产管理','日排产','委外管理']
extra=['可禁用物料分析可禁用物料分析','禁用子项查询','未完工切换产品_pt-146884','方案日历','方案日历模板','时段','材料监控方案','模具产品组合','预留关系','预留类型','订单准时率分析','工作站信息','物料解析对应表']
recs={json.loads(l)['id']:json.loads(l) for l in open('kingdee-raw/manifest.jsonl')}
def clean(t):
    t=re.sub(r'\{\{[^}]*\}\}','[图]',t)
    t=re.sub(r'\[\[[^\]|]*\|([^\]]*)\]\]',r'\1',t)
    t=re.sub(r'\[\[([^\]]*)\]\]',r'\1',t)
    t=re.sub(r'={2,}\s*','#',t)
    t=re.sub(r'\*\*|//|\\\\','',t)
    t=re.sub(r'[ \t\u3000]+',' ',t)
    t=re.sub(r'\|\|+','|',t)
    t=re.sub(r'\^+','|',t)
    t=re.sub(r' ?\| ?','|',t)
    t=re.sub(r'\n\s*\n+','\n',t)
    return t.strip()
pages=[]
for m in mods:
    t=open(f'kingdee-modules/生产制造_{m}.md').read()
    for p in re.split(r'\n---\n## 【页面】',t)[1:]:
        name=p.split('\n',1)[0]; body=p.split('\n',2)[-1] if '来源：' in p.split('\n',2)[1] else p.split('\n',1)[1]
        pages.append((m,name,body))
for e in extra:
    r=recs.get(e)
    if r: pages.append(('孤立页',e,open('kingdee-raw/'+r['file']).read().split('\n',3)[-1]))
seen={};meta=[]
for m,n,b in pages:
    c=clean(b); h=hashlib.md5(re.sub(r'\W','',c).encode()).hexdigest()
    dup=seen.get(h)
    if not dup: seen[h]=n
    imgs=b.count('{{')
    meta.append(dict(mod=m,page=n,raw=len(b),clean=len(c),imgs=imgs,dup_of=dup))
    if not dup:
        open(f'{OUT}/pages/{m}__{n}.txt','w').write(c)
json.dump(meta,open(f'{OUT}/meta.json','w'),ensure_ascii=False,indent=0)
u=[x for x in meta if not x['dup_of']]
print(len(meta),'pages; unique',len(u),'clean chars',sum(x['clean'] for x in u),'raw',sum(x['raw'] for x in meta))
for x in meta:
    if x['dup_of']: print('DUP',x['page'],'=',x['dup_of'])
