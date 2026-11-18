# 在真实外壳中逐个打开业务模块截图 + 收集错误：python3 -u tools/shot_modules.py [url]
import asyncio, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8090/index.html'
OUT = '/workspace/erp-3d/screenshots'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 1600, 'height': 900})
        errs = []
        pg.on('console', lambda m: errs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: errs.append(f'[pageerror] {e}'))
        await pg.goto(URL + '#/base')
        await pg.wait_for_selector('body[data-ready="1"]', timeout=90000)
        ids = await pg.evaluate("window.__erp.state.modules.map(m=>m.meta.id)")
        print('modules', ids)
        for i, mid in enumerate(ids):
            n0 = len(errs)
            await pg.evaluate(f"window.__erp.navigate('{mid}')"); await pg.wait_for_timeout(1800)
            await pg.screenshot(path=f'{OUT}/m_{i:02d}_{mid}.png', timeout=150000)
            print('shot', mid, 'newErrors', len(errs) - n0)
        print('ERRORS', len(errs)); [print('  ', e) for e in errs[:40]]
        await b.close()
asyncio.run(main())
