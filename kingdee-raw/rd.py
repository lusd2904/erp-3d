import sys,re,json
d=json.load(open('g3_unread.json'))['unread'];r={json.loads(l)['id']:json.loads(l) for l in open('manifest.jsonl')}
def clean(p):
    t=open(r[p]['file']).read().split('\n',3)[-1]
    t=re.sub(r'\{\{[^}]*\}\}','[图]',t); t=re.sub(r'\[\[[^\]|]*\|([^\]]*)\]\]',r'\1',t); t=re.sub(r'\[\[([^\]]*)\]\]',r'\1',t)
    t=re.sub(r'[ \t]+',' ',t); t=re.sub(r'\n\s*\n+','\n',t); t=re.sub(r'\*\*|=====*|\^|\|',' ',t); t=re.sub(r'(\[图\]\s*)+','[图]',t)
    return t
mod=sys.argv[1]; i0=int(sys.argv[2]); i1=int(sys.argv[3])
for p,c in d[mod][i0:i1]:
    print(f'##### {p}\n{clean(p)}')
