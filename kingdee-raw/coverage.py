import json,re,collections
recs={}
for l in open('manifest.jsonl'):
    r=json.loads(l); recs[r['id']]=r
allp=json.load(open('all_pages.json'))
lower={p.lower():p for p in allp}
text={}
for pid,r in recs.items():
    if r['status']=='ok': text[pid]=open(r['file']).read().split('\n',3)[-1]
def norm(t):
    t=t.split('|')[0].split('#')[0].strip()
    if not t or t.startswith('http'): return None
    t=t.lstrip(':').replace(' ','_').lower()
    return lower.get(t) or lower.get(t.replace('_',' '))
def links(pid):
    return [x for x in (norm(m) for m in re.findall(r'\[\[([^\]]+)\]\]',text.get(pid,''))) if x]
nav=text['navigation']; fam=None; roots=[]
for line in nav.splitlines():
    m=re.match(r'-->\s*(.+?)#',line)
    if m: fam=m.group(1); continue
    for t in re.findall(r'\[\[([^\]]+)\]\]',line):
        lab=t.split('|')[-1].strip(); p=norm(t)
        roots.append((fam,lab,p))
owner={}; q=collections.deque()
for fam,lab,p in roots:
    if p and p not in owner: owner[p]=(fam,lab); q.append(p)
skip={'navigation','start','wiki:navigation','sidebar'}
while q:
    p=q.popleft()
    for x in links(p):
        if x not in owner and x not in skip: owner[x]=owner[p]; q.append(x)
img=lambda s: len(re.findall(r'\{\{[^}]*\.(?:png|jpg|jpeg|gif|bmp)',s,re.I))
agg=collections.defaultdict(lambda:[0,0,0,0])
for pid in allp:
    k=owner.get(pid,('(未挂在导航树上)','孤立页/其它命名空间'))
    a=agg[k]; a[0]+=1
    if pid in text: a[1]+=1; a[2]+=len(text[pid]); a[3]+=img(text[pid])
json.dump({p:list(v) for p,v in owner.items()},open('page_module.json','w'),ensure_ascii=False)
ok=len(text); fail=[p for p in allp if recs.get(p,{}).get('status')!='ok']
cs={p:len(t.strip()) for p,t in text.items()}
short=sorted([p for p,c in cs.items() if c<50])
imgonly=sorted([p for p,t in text.items() if img(t)>0 and len(re.sub(r'\{\{[^}]*\}\}|\[\[[^\]]*\]\]|[=*|^\s-]','',t))<80])
totimg=sum(img(t) for t in text.values())
L=[]
L.append('# 金蝶云星空帮助中心 全站抓取覆盖率清单\n')
L.append('来源：https://help.open.kingdee.com/dokuwiki/doku.php  抓取方式：`do=index` 逐命名空间展开得到页面全集（站点 sitemap 已关闭），再逐页 `do=export_raw` 取原始 wiki 正文；3 线程、每请求后间隔 0.4s、失败重试 3 次。抓取完成时间：2026-11-13 11:21（Asia/Shanghai）。\n')
L.append('## 总体\n')
L.append(f'| 项 | 数量 |\n|---|---|\n| 页面总数（do=index 列出） | {len(allp)} |\n| 成功读取正文 | {ok} |\n| 读取失败 | {len(fail)} |\n| 正文合计字符 | {sum(cs.values())} |\n| 正文 <50 字符（空页/仅标题/仅跳转） | {len(short)} |\n| 疑似“只有图片没有文字”的页 | {len(imgonly)} |\n| 正文内引用的图片总数（未做 OCR，图中内容未读） | {totimg} |\n')
L.append('## 读取失败的页面\n')
for p in fail: L.append(f'- `{p}`：export_raw 与普通页面都只返回站点框架，正文区为空（页面本身无内容或需登录），已手工复核两次。')
L.append('\n## 按导航模块统计（以站点左侧导航为根，沿页面内 [[链接]] 广度优先归属，每页只归入最先到达的模块）\n')
L.append('| 领域 | 模块 | 页数 | 已读 | 正文字符 | 图片数 |\n|---|---|---|---|---|---|')
famorder=[]
for f,_,_ in roots:
    if f not in famorder: famorder.append(f)
keys=sorted(agg,key=lambda k:(famorder.index(k[0]) if k[0] in famorder else 999))
for k in keys:
    a=agg[k]; L.append(f'| {k[0]} | {k[1]} | {a[0]} | {a[1]} | {a[2]} | {a[3]} |')
L.append('\n导航中指向外站的条目（金蝶AI星空新特性、轻分析）不在本 wiki 内，未抓取。\n')
L.append('## 正文 <50 字符的页面\n'); L.append('、'.join(short))
L.append('\n## 疑似只有图片的页面（流程图/截图为主，文字内容需 OCR 才能读）\n'); L.append('、'.join(imgonly))
open('覆盖率清单.md','w').write('\n'.join(L)+'\n')
print(ok,len(fail),len(short),len(imgonly),totimg)
for k in keys: print(k,agg[k][:2])
