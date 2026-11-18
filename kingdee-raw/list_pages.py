import re,subprocess,urllib.parse,time,json
BASE='https://help.open.kingdee.com/dokuwiki/doku.php'
def get(u):
    return subprocess.run(['curl','-sL','-m','90',u],capture_output=True).stdout.decode('utf-8','ignore')
seen=set();pages=set();queue=['']
while queue:
    ns=queue.pop(0)
    if ns in seen: continue
    seen.add(ns)
    s=get(BASE+'?do=index'+('&idx='+urllib.parse.quote(ns) if ns else ''))
    for m in re.finditer(r'<a href="/dokuwiki/doku.php\?id=([^"&#]+)"[^>]*class="wikilink1"[^>]*data-wiki-id="([^"]*)"',s):
        pages.add(m.group(2) if m.group(2) else urllib.parse.unquote(m.group(1)))
    for d in re.findall(r'idx=([^"&#]+)"[^>]*class="idx_dir"',s):
        d=urllib.parse.unquote(d)
        if d not in seen: queue.append(d)
    print('ns',repr(ns),'pages so far',len(pages),flush=True)
    time.sleep(1)
json.dump(sorted(pages),open('all_pages.json','w'),ensure_ascii=False,indent=0)
print('TOTAL',len(pages),'namespaces',sorted(seen))
