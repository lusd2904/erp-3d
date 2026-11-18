import asyncio, time
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':1600,'height':900})
        pg.on('console', lambda m: print('console', m.type, m.text[:200]))
        await pg.goto('http://127.0.0.1:8090/index.html#/workshop')
        await pg.wait_for_selector('body[data-ready="1"]', timeout=90000)
        await pg.wait_for_timeout(2000)
        for v in ['L1','L2','L3','WH']:
            t=time.time(); await pg.click(f'.ws-bar [data-view={v}]'); print(v,'click',round(time.time()-t,1))
            await pg.wait_for_timeout(2500)
            t=time.time(); r=await pg.evaluate("(()=>{const w=window.__erp.world;return [w.t.toFixed(1), JSON.stringify(w.camera.position)]})()"); print('eval',round(time.time()-t,1), r)
            t=time.time(); await pg.screenshot(path=f'/workspace/erp-3d/screenshots/dbg_{v}.png', timeout=120000); print('shot',round(time.time()-t,1))
        await b.close()
asyncio.run(main())
