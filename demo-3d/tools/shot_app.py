# 线A自检截图：python3 tools/shot_app.py [url] [prefix] -- 按步骤截图并收集 console/pageerror
import asyncio, sys, json, os
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8090/index.html'
PFX = sys.argv[2] if len(sys.argv) > 2 else 'a'
OUT = '/workspace/erp-3d/screenshots'
STEPS = sys.argv[3] if len(sys.argv) > 3 else 'all'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 1600, 'height': 900})
        errs = []
        pg.on('console', lambda m: errs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: errs.append(f'[pageerror] {e}'))
        await pg.goto(URL)
        await pg.wait_for_selector('body[data-ready="1"]', timeout=90000)
        await pg.wait_for_timeout(4000)
        async def shot(n): await pg.screenshot(path=f'{OUT}/{PFX}_{n}.png', timeout=150000); print('shot', n)
        await shot('01_cockpit')
        if STEPS in ('all', 'cockpit'):
            await pg.evaluate("window.__erp.world.focusDevice('L1-RFL')"); await pg.wait_for_timeout(2500); await shot('02_cockpit_device')
            await pg.click('.ck-stock .sk'); await pg.wait_for_timeout(2500); await shot('03_cockpit_bin')
            await pg.click('.ck-views [data-view=campus]'); await pg.wait_for_timeout(2500); await shot('04_campus')
        if STEPS in ('all', 'ws'):
            await pg.evaluate("window.__erp.navigate('workshop')"); await pg.wait_for_timeout(3500); await shot('05_workshop')
            for v in ['L1', 'L2', 'L3', 'WH']:
                await pg.click(f'.ws-bar [data-view={v}]'); await pg.wait_for_timeout(2300); await shot('06_view_' + v)
            await pg.click('.ws-bar [data-view=L2]'); await pg.wait_for_timeout(6000)
            # 真实鼠标点击设备：投影 L1-MNT1 中心到屏幕
            pos = await pg.evaluate("""(()=>{const w=window.__erp.world;const g=w.devices['L2-MNT1'];const v=g.getWorldPosition(new w.camera.position.constructor()).add({x:0,y:1.0,z:0});v.project(w.camera);const r=w.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]})()""")
            await pg.mouse.move(pos[0], pos[1]); await pg.wait_for_timeout(500); await pg.mouse.click(pos[0], pos[1]); await pg.wait_for_timeout(2600); await shot('07_ws_click')
            await pg.fill('#ws-bin', 'WH-A-02-07-03'); await pg.click('[data-act=bin]'); await pg.wait_for_timeout(2800); await shot('08_ws_bin')
            await pg.fill('#ws-bin', 'WH-A-04-05-01'); await pg.click('[data-act=bin]'); await pg.wait_for_timeout(2800); await shot('09_ws_bin_row4')
        print('factory', await pg.evaluate("JSON.stringify(window.__erp.world.factoryReport)"))
        print('drawcalls', await pg.evaluate("window.__erp.world.renderer.info.render.calls"), 'tris', await pg.evaluate("window.__erp.world.renderer.info.render.triangles"))
        print('ERRORS', len(errs)); [print('  ', e) for e in errs[:30]]
        await b.close()
asyncio.run(main())
