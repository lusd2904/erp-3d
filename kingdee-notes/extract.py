import sys,re
for p in sys.argv[1:]:
    L=open(p+'.txt').read().split('\n')[2:]
    print('=====',p)
    out=[];fields=[]
    for i,l in enumerate(L):
        if re.match(r'^\d+(\.\d+)*\s*\S',l) and len(l)<40:
            if fields: out.append('  字段: '+'、'.join(fields)); fields=[]
            out.append(l)
        elif len(l)<=14 and not re.search(r'[。；，：:;,.、（）()]',l) and l not in('字段','说明') and i+1<len(L) and len(L[i+1])>len(l):
            fields.append(l)
        elif re.search(r'(状态|下推|上游|下游|源单|生成|反写|关联|来源|包括|包含|取值)',l):
            if fields: out.append('  字段: '+'、'.join(fields)); fields=[]
            out.append('  · '+l[:200])
    if fields: out.append('  字段: '+'、'.join(fields))
    print('\n'.join(out))
