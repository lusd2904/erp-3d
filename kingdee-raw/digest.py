import json,re,os,collections
recs={json.loads(l)['id']:json.loads(l) for l in open('manifest.jsonl')}
owner=json.load(open('page_module.json')); allp=json.load(open('all_pages.json'))
out='/workspace/erp-3d/fullsys/kingdee-notes/全站整理'; os.makedirs(out,exist_ok=True)
by=collections.defaultdict(list)
for p in allp:
    f,m=owner.get(p,('未挂导航','孤立页'))
    by[f].append((m,p))
for f,items in by.items():
    L=[f'# {f}（{len(items)} 页）\n','每页：标题｜正文字符｜图片数｜章节标题｜表格表头（字段名）。由脚本从 kingdee-raw/pages 原文提取，原文见对应 txt。\n']
    for m,p in sorted(items):
        r=recs.get(p)
        if not r or r['status']!='ok': L.append(f'## [{m}] {p}  —— 读取失败\n'); continue
        t=open(r['file']).read().split('\n',3)[-1]
        hs=[h.strip() for h in re.findall(r'^=+\s*(.+?)\s*=+\s*$',t,re.M)]
        ths=[]
        for line in t.splitlines():
            if line.startswith('^'):
                cells=[c.strip() for c in line.strip().strip('^').split('^') if c.strip()]
                if cells and cells not in ths: ths.append(cells)
        img=len(re.findall(r'\{\{[^}]*\.(?:png|jpg|jpeg|gif)',t,re.I))
        L.append(f'## [{m}] {p}｜{len(t)}字｜图{img}')
        if hs: L.append('- 章节：'+' / '.join(hs[:40]))
        for c in ths[:6]: L.append('- 表头：'+'｜'.join(c)[:200])
        body=re.sub(r'\{\{[^}]*\}\}|\[\[[^\]|]*\|?([^\]]*)\]\]|[=*^|]',r'\1',t)
        body=re.sub(r'\s+',' ',body).strip()
        L.append('- 摘要：'+body[:160])
        L.append('')
    open(f'{out}/{f}.md','w').write('\n'.join(L))
print(sorted((f,len(i)) for f,i in by.items()))
