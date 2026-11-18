import sys,re,json
o=json.load(open('page_module2.json'));r={json.loads(l)['id']:json.loads(l) for l in open('manifest.jsonl')}
def show(p,cap=6000):
    t=open(r[p]['file']).read().split('\n',3)[-1]
    t=re.sub(r'\{\{[^}]*\}\}','',t); t=re.sub(r'\[\[[^\]|]*\|([^\]]*)\]\]',r'\1',t); t=re.sub(r'\[\[([^\]]*)\]\]',r'\1',t)
    t=re.sub(r'[ \t]+',' ',t); t=re.sub(r'\n\s*\n+','\n',t); t=re.sub(r'\*\*','',t)
    print(f'##### {p}\n{t[:cap]}')
args=sys.argv[1:]; cap=int(args[0]); 
for a in args[1:]:
    if a.startswith('@'):
        f,m=a[1:].split('/'); [show(p,cap) for p in sorted(x for x,v in o.items() if v==[f,m])]
    else: show(a,cap)
