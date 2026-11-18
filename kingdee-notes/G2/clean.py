import re,json,hashlib,os
OUT='kingdee-notes/G2'
mods=[('供应链',m) for m in ['库存管理','条码管理','采购管理','销售管理','信用管理','供应商协同','组织间结算']]+[('质量管理','质量管理'),('质量管理','质量追溯')]
extra=['订单表体-交货明细页签','订单表体-其他信息页签','订单表体-明细信息页签','订单表体-物料数据页签','订单表体-税务明细页签','订单表体-财务信息页签','订单表头-其他信息页签','订单表头-基本信息页签','订单表头-订单条款页签','订单表头-财务信息页签','订单管理','订单准时率分析','取消原因','退货管理','首检','自动发货方案','结算价目表自定义字段匹配设置','未生成结算清单跨组织业务单据查询','预留关系','预留类型','其他调减','其他调增','工序检验','移动质检_工序检验','移动质检_委外检验','工序不良品原因分析','柔性生产_报不良','柔性生产_报不良_返修方式_返修汇报','柔性生产_批次上料','生产_委外退料检验质量统计表','采购价款核算业务流程图','采购费用分配业务流程图','出库成本核算业务流程图','防伪防窜货组织对应','配货向导之订单选择','规格要求','采购入库核算应用介绍']
recs={json.loads(l)['id']:json.loads(l) for l in open('kingdee-raw/manifest.jsonl')}
def clean(t):
    t=re.sub(r'\{\{[^}]*\}\}','[图]',t)
    t=re.sub(r'\[\[[^\]|]*\|([^\]]*)\]\]',r'\1',t)
    t=re.sub(r'\[\[([^\]]*)\]\]',r'\1',t)
    t=re.sub(r'<<\s*返回[^\n]*','',t)
    t=re.sub(r'={2,}\s*','#',t)
    t=re.sub(r'\*\*|//|\\\\','',t)
    t=re.sub(r'[ \t\u3000]+',' ',t)
    t=re.sub(r'\|\|+','|',t)
    t=re.sub(r'\^+','|',t)
    t=re.sub(r' ?\| ?','|',t)
    t=re.sub(r'\n\s*\n+','\n',t)
    out=[]
    for line in t.split('\n'):
        if line.startswith('|') and line.count('|')>=3:
            cells=[c.strip() for c in line.strip('|').split('|')]
            if cells[0] in ('字段','字段名','字段名称','过滤条件','参数','名称'): continue
            if len(cells)>=2:
                d=' / '.join(c for c in cells[1:] if c)
                line=f'·{cells[0]}：{d}'
        out.append(line)
    return '\n'.join(out).strip()
pages=[]
for f,m in mods:
    t=open(f'kingdee-modules/{f}_{m}.md').read()
    for p in re.split(r'\n---\n## 【页面】',t)[1:]:
        name=p.split('\n',1)[0]; rest=p.split('\n',1)[1]
        if rest.startswith('来源：'): rest=rest.split('\n',1)[1] if '\n' in rest else ''
        pages.append((m,name,rest))
for e in extra:
    r=recs.get(e)
    if r and r['status']=='ok': pages.append(('孤立页',e,open('kingdee-raw/'+r['file']).read().split('\n',3)[-1]))
    else: print('MISSING',e)
seen={};meta=[]
for m,n,b in pages:
    c=clean(b); h=hashlib.md5(re.sub(r'\W','',c).encode()).hexdigest()
    dup=seen.get(h)
    if not dup: seen[h]=n
    meta.append(dict(mod=m,page=n,raw=len(b),clean=len(c),imgs=b.count('{{'),dup_of=dup,textlen=len(re.sub(r'\[图\]|\W','',c))))
    if not dup: open(f'{OUT}/pages/{m}__{n.replace("/","／")}.txt','w').write(c)
json.dump(meta,open(f'{OUT}/meta.json','w'),ensure_ascii=False,indent=0)
import collections
agg=collections.defaultdict(lambda:[0,0,0,0])
for x in meta:
    a=agg[x['mod']]; a[0]+=1; a[1]+=x['raw']; 
    if not x['dup_of']: a[2]+=x['clean']; a[3]+=1
for k,v in agg.items(): print(k,'pages',v[0],'raw',v[1],'unique',v[3],'clean',v[2])
print('total',len(meta),sum(x['raw'] for x in meta),sum(x['clean'] for x in meta if not x['dup_of']))
