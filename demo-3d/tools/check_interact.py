# 真外壳交互核查：搜索框、模块内 navigate 跳转、toast 样式（无调试文字）
import asyncio
from playwright.async_api import async_playwright
U = 'http://127.0.0.1:8090/index.html'; O = '/workspace/erp-3d/screenshots/shell'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 1366, 'height': 768}); errs = []
        pg.on('console', lambda m: errs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: errs.append(f'[pageerror] {e}'))
        await pg.goto(U + '#/sales'); await pg.wait_for_selector('body[data-ready="1"]', timeout=120000); await pg.wait_for_timeout(1200)
        await pg.click('#g-search'); await pg.keyboard.type('MO2611-001'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f'{O}/i_01_search.png'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1500)
        print('after search hash', await pg.evaluate('location.hash'))
        await pg.screenshot(path=f'{O}/i_02_search_go_mo.png')
        await pg.evaluate("window.__erp.navigate('sales')"); await pg.wait_for_timeout(1200)
        link = pg.locator('#view [data-nav]').first; print('nav link', await link.count(), await link.get_attribute('data-nav') if await link.count() else None, await link.text_content() if await link.count() else None)
        if await link.count(): await link.click(); await pg.wait_for_timeout(1500); print('after data-nav hash', await pg.evaluate('location.hash'))
        await pg.screenshot(path=f'{O}/i_03_nav_jump.png')
        await pg.evaluate("window.__erp.navigate('inventory')"); await pg.wait_for_timeout(1200)
        await pg.evaluate("import('./src/app/main.js').catch(()=>null)")  # no-op
        await pg.evaluate("document.querySelector('#toasts') && (window.__t = 1)")
        await pg.evaluate("window.__erp.toast ? window.__erp.toast('【演示】已导出 31 条库存记录','success') : null")
        r = await pg.evaluate("[...document.querySelectorAll('#toasts .toast')].map(t=>[t.textContent, getComputedStyle(t).backgroundColor])")
        print('toasts', r)
        await pg.screenshot(path=f'{O}/i_04_toast.png')
        dbg = await pg.evaluate("document.body.innerText.match(/navigate\\(|ctx\\.|\\[\\\"/g)")
        print('debug text', dbg)
        await pg.evaluate("window.__erp.navigate('cockpit')"); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=f'{O}/i_05_cockpit_1366.png', timeout=150000)
        print('ERRORS', len(errs)); [print('  ', e) for e in errs[:20]]
        await b.close()
asyncio.run(main())
