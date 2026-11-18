import json,subprocess,urllib.parse,time,os,hashlib,threading,sys
from concurrent.futures import ThreadPoolExecutor
BASE='https://help.open.kingdee.com/dokuwiki/doku.php'
pages=json.load(open('all_pages.json'))
done={}
if os.path.exists('manifest.jsonl'):
    for l in open('manifest.jsonl'):
        r=json.loads(l)
        if r['status']=='ok': done[r['id']]=r
lock=threading.Lock()
def fname(pid):
    s=pid.replace('/','_').replace(':','__')
    if len(s.encode())>180: s=s[:50]+'_'+hashlib.md5(pid.encode()).hexdigest()[:8]
    return 'pages/'+s+'.txt'
def work(pid):
    url=BASE+'?id='+urllib.parse.quote(pid)
    for attempt in range(3):
        r=subprocess.run(['curl','-sL','-m','60','-w','\n__HTTP__%{http_code}',url+'&do=export_raw'],capture_output=True)
        out=r.stdout.decode('utf-8','ignore')
        body,_,code=out.rpartition('\n__HTTP__')
        if code=='200' and '<html' not in body[:200].lower():
            fn=fname(pid)
            open(fn,'w').write(f'ID: {pid}\nURL: {url}\n\n'+body)
            rec={'id':pid,'url':url,'file':fn,'status':'ok','chars':len(body)}
            break
        time.sleep(2*(attempt+1))
    else:
        rec={'id':pid,'url':url,'status':'fail','http':code}
    with lock:
        open('manifest.jsonl','a').write(json.dumps(rec,ensure_ascii=False)+'\n')
    time.sleep(0.4)
todo=[p for p in pages if p not in done]
print('todo',len(todo),flush=True)
n=0
with ThreadPoolExecutor(3) as ex:
    for _ in ex.map(work,todo):
        n+=1
        if n%200==0: print(n,time.strftime('%H:%M:%S'),flush=True)
print('DONE',flush=True)
