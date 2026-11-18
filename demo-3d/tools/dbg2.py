import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':1600,'height':900})
        pg.on('console', lambda m: print('console', m.type, m.text[:300]))
        await pg.goto('http://127.0.0.1:8090/index.html#/workshop')
        await pg.wait_for_selector('body[data-ready="1"]', timeout=90000)
        await pg.wait_for_timeout(3000)
        r = await pg.evaluate("""(()=>{const w=window.__erp.world;const g=w.devices['L2-MNT1'];const v=g.getWorldPosition(new w.camera.position.constructor());v.y+=1.0;v.project(w.camera);const r=w.renderer.domElement.getBoundingClientRect();const x=r.left+(v.x+1)/2*r.width,y=r.top+(1-v.y)/2*r.height;const el=document.elementFromPoint(x,y);return [x,y,w.pick({clientX:x,clientY:y}),el.className, el.tagName]})()""")
        print(r)
        await pg.mouse.click(r[0], r[1]); await pg.wait_for_timeout(1500)
        print(await pg.evaluate("[window.__erp.world.selected, document.querySelector('.ws-panel').hidden]"))
        await b.close()
asyncio.run(main())
