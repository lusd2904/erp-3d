import asyncio, os
from playwright.async_api import async_playwright
OUT='/workspace/erp-3d/screenshots/ref'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg=await b.new_page(viewport={'width':1600,'height':900})
        errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file:///workspace/erp-3d/reference/boss-reference.html')
        await pg.wait_for_timeout(8000)
        await pg.screenshot(path=f'{OUT}/ref_00_home.png')
        txt=await pg.evaluate("document.body.innerText.slice(0,3000)")
        print(txt)
        links=await pg.evaluate("[...document.querySelectorAll('a,button,[class*=menu] li,[class*=nav] *')].map(e=>e.tagName+'|'+(e.innerText||'').trim().slice(0,20)+'|'+e.className).filter(s=>s.split('|')[1]).slice(0,80)")
        print('\n'.join(links))
        print('ERR',errs)
        await b.close()
asyncio.run(main())
