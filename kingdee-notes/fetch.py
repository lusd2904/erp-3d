import re,sys,urllib.parse,subprocess,os,html
from bs4 import BeautifulSoup
BASE='https://help.open.kingdee.com'
def get(pid):
    url=BASE+'/dokuwiki/doku.php?id='+urllib.parse.quote(pid)
    r=subprocess.run(['curl','-sL','-m','40',url],capture_output=True)
    return url,r.stdout.decode('utf-8','ignore')
def text(h):
    s=BeautifulSoup(h,'html.parser')
    c=s.select_one('div.page') or s.select_one('#dokuwiki__content') or s.body
    for t in c.select('script,style,.toc,#dw__toc'): t.decompose()
    links=[(a.get('href'),a.get_text(strip=True)) for a in c.select('a[href]') if 'doku.php?id=' in a.get('href','')]
    return c.get_text('\n',strip=True),links
if __name__=='__main__':
    for pid in sys.argv[1:]:
        url,h=get(pid)
        t,l=text(h)
        fn='raw/'+pid.replace('/','_').replace(':','__')+'.txt'
        os.makedirs('raw',exist_ok=True)
        open(fn,'w').write(url+'\n\n'+t+'\n\n=== LINKS ===\n'+'\n'.join(f'{a}\t{b}' for a,b in l))
        print(pid,len(t),len(l))
