import json,re,os,collections
recs={json.loads(l)['id']:json.loads(l) for l in open('manifest.jsonl')}
owner={k:tuple(v) for k,v in json.load(open('page_module2.json')).items()}
REL=json.load(open('relevance.json'))
out='/workspace/erp-3d/fullsys/kingdee-digest'
by=collections.defaultdict(list)
for p,v in owner.items(): by[v].append(p)
def clean(t):
    t=re.sub(r'\{\{[^}]*\}\}','',t)
    t=re.sub(r'\[\[[^\]|]*\|([^\]]*)\]\]',r'\1',t); t=re.sub(r'\[\[([^\]]*)\]\]',r'\1',t)
    t=re.sub(r'\*\*|//|\\\\',' ',t); return t
def sents(t):
    for line in t.splitlines():
        line=line.strip(' *-\t')
        if not line or line.startswith(('^','|','=')): continue
        for s in re.split(r'(?<=[。；;])',line):
            s=s.strip()
            if 8<=len(s)<=220: yield s
def fields(t):
    res=[]; hdr=None
    for line in t.splitlines():
        ls=line.strip()
        if ls.startswith('^'):
            hdr=[c.strip() for c in ls.strip('^').split('^')]; continue
        if ls.startswith('|'):
            cells=[c.strip() for c in ls.strip('|').split('|')]
            if cells and cells[0] and len(cells[0])<=20 and not re.match(r'^[\d.]+$',cells[0]):
                res.append(cells[0])
        else: hdr=None
    for m in re.finditer(r'^\s*[*-]\s*([^\s：:]{2,14})\s*[：:]',t,re.M): res.append(m.group(1))
    seen=[]; [seen.append(x) for x in res if x not in seen and not x.startswith(('字段','序号','名称','说明'))]
    return seen
KW={'状态':r'状态[^。]{0,40}(包括|分为|有|为|：|:)|→|(?<!】)->|暂存|已审核|结案|关闭状态|作废',
    '上下游':r'下推|选单|反写|源单|关联生成|自动生成|携带|上查|下查',
    '参数':r'参数|勾选|选项|启用.{0,10}(时|后)',
    '审批':r'审批|工作流|审核流程|提交.{0,6}流程|会签|驳回'}
for (f,m),ps in sorted(by.items()):
    if f not in ('流程中心','BOS平台','基础管理','系统管理','共享服务中心','移动应用','星空云服务','经营分析','RPA机器人','协同开发云'): continue
    rel=REL.get(f'{f}/{m}',REL.get(f,'低'))
    core = rel=='高'
    cap = 40 if core else (15 if rel=='中' else 8)
    L=[f'# {m}（{f}，{len(ps)} 页）\n',f'- 与电子元器件生产 ERP 的相关度：**{rel}**',f'- 全文：kingdee-modules/{f}_{m}.md；本文件由 kingdee-raw/make_digest.py 从原文逐页抽取（只摘原句，不改写），【】内为来源页面名。人工精读结论在文首“精读要点”（仅核心模块有）。\n']
    feat=[];docs=[];sec={k:[] for k in KW};imgs=0;chars=0
    for p in sorted(ps):
        r=recs.get(p)
        if not r or r['status']!='ok': feat.append(f'- 【{p}】读取失败'); continue
        raw=open(r['file']).read().split('\n',3)[-1]; chars+=len(raw); imgs+=len(re.findall(r'\{\{[^}]*\.(png|jpg|gif|jpeg)',raw,re.I))
        t=clean(raw); ss=list(sents(t))
        first=next((s for s in ss if len(s)>=12 and not s.startswith(('返回','<<'))),'')
        feat.append(f'- 【{p}】{first[:160]}' if first else f'- 【{p}】（正文无说明文字，{len(raw)}字）')
        fl=fields(raw)
        if len(fl)>=3: docs.append(f'- 【{p}】'+'、'.join(fl[:60 if core else 25]))
        for k,rx in KW.items():
            for s in ss:
                if re.search(rx,s) and len(sec[k])<cap*len(ps) and s not in [x[1] for x in sec[k]]:
                    sec[k].append((p,s))
    def take(k):
        items=sec[k]; perpage=collections.Counter(); outl=[]
        for p,s in items:
            if perpage[p]>= (6 if core else 2): continue
            perpage[p]+=1; outl.append(f'- {s}【{p}】')
        lim= 400 if core else (80 if rel=='中' else 30)
        return outl[:lim] or ['- 原文未提及']
    L+=['## 0. 精读要点','（待人工补充）\n',f'## 1. 功能点（每页首句，共 {len(ps)} 页，正文 {chars} 字，图片 {imgs} 张未 OCR）']+feat
    L+=['\n## 2. 单据和关键字段（取自页面字段表/字段说明列表）']+(docs[: (500 if core else 60)] or ['- 原文无字段表'])
    L+=['\n## 3. 状态流转（含“状态”的原句）']+take('状态')
    L+=['\n## 4. 上下游：下推、选单、反写']+take('上下游')
    L+=['\n## 5. 参数和选项']+take('参数')
    L+=['\n## 6. 审批 / 工作流相关']+take('审批')
    open(f'{out}/{f}_{m}.md'.replace('/','／') if False else out+'/'+(f+'_'+m).replace('/','／')+'.md','w').write('\n'.join(L)+'\n')
print('ok',len(by))
