import re
for m in ['计划管理','工程数据','生产管理','日排产','委外管理','孤立页']:
    out=[];flds=[]
    def flush():
        if flds: out.append('  字段: '+'、'.join(flds)); flds.clear()
    for line in open(f'all_{m}.txt'):
        line=line.rstrip('\n')
        if line.startswith('|') and line.count('|')>=3:
            cells=[c.strip() for c in line.strip('|').split('|')]
            if cells[0] in ('字段','字段名','字段名称'): continue
            flds.append(cells[0]); continue
        flush()
        if re.match(r'^#?\s*\d?[\d\.]*\s*字段说明',line): continue
        out.append(line)
    flush()
    open(f'd_{m}.txt','w').write('\n'.join(out))
