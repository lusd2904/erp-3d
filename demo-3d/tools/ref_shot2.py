import asyncio
from playwright.async_api import async_playwright
OUT='/workspace/erp-3d/screenshots/ref'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg=await b.new_page(viewport={'width':1600,'height':900})
        await pg.goto('file:///workspace/erp-3d/reference/boss-reference.html')
        await pg.wait_for_timeout(6000)
        for i,name in enumerate(['3D工艺监控','设备管理']):
            await pg.click(f'a:has-text("{name}")'); await pg.wait_for_timeout(9000)
            await pg.screenshot(path=f'{OUT}/ref_{i+1}.png')
            print(name, (await pg.evaluate("document.body.innerText.slice(0,800)")).replace('\n',' | '))
        # click center of canvas in 3D page
        await pg.click('a:has-text("3D工艺监控")'); await pg.wait_for_timeout(6000)
        btns=await pg.evaluate("[...document.querySelectorAll('button,.btn,[class*=tab]')].map(e=>(e.innerText||'').trim()).filter(Boolean).slice(0,40)")
        print(btns)
        await pg.mouse.click(800,450); await pg.wait_for_timeout(4000)
        await pg.screenshot(path=f'{OUT}/ref_3_click.png')
        await b.close()
asyncio.run(main())
