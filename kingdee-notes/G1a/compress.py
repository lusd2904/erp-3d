import re,sys
for m in ['计划管理','工程数据','生产管理','日排产','委外管理','孤立页']:
    out=[]
    for line in open(f'all_{m}.txt'):
        line=line.rstrip('\n')
        if line.startswith('|') and line.count('|')>=3:
            cells=[c.strip() for c in line.strip('|').split('|')]
            if cells[0] in ('字段','字段名','字段名称'): continue
            if len(cells)>=2:
                d=' / '.join(c for c in cells[1:] if c)
                d=re.sub(r'(?<=[。；;])\s*','',d)
                if len(d)>70: d=d[:70]+'…'
                line=f'·{cells[0]}：{d}'
        out.append(line)
    open(f'c_{m}.txt','w').write('\n'.join(out))
