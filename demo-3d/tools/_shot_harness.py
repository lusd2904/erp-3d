# 用 modules-harness.html 逐个打开 12 个模块截图并收集 console 错误
import asyncio, sys
from playwright.async_api import async_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8090/tools/modules-harness.html'
OUT = '/workspace/erp-3d/screenshots/modules'
IDS = ['base','sales','mo','ppbom','kitting','picking','prodreport','instock','inventory','quality','trace','reports']

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':1600,'height':900})
        errs = []
        pg.on('console', lambda m: errs.append(f'[{m.type}] {m.text}') if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: errs.append(f'[pageerror] {e}'))
        await pg.goto(BASE, wait_until='networkidle', timeout=90000)
        await pg.wait_for_function('window.__ready === true', timeout=60000)
        print('ready')
        # invalid params should not crash
        bad = [
            ('base', {'tab':'nope','bom':'不存在'}),
            ('quality', {'tab':'xxx'}),
            ('reports', {'report':'xxx'}),
            ('trace', {'id': ['[]']}),
        ]
        for mid, params in bad:
            n0 = len(errs)
            await pg.evaluate('(p) => window.__mount(p[0], p[1])', [mid, params])
            await pg.wait_for_timeout(800)
            print('invalid', mid, 'newErrors', len(errs)-n0, 'mounted', await pg.evaluate('window.__mounted'))
        for mid in IDS:
            n0 = len(errs)
            await pg.evaluate('(id) => window.__mount(id, {})', mid)
            await pg.wait_for_timeout(1800)
            path = f'{OUT}/fix_{mid}_1600.png'
            await pg.screenshot(path=path, timeout=150000)
            print('shot', mid, 'newErrors', len(errs)-n0, '->', path)
        # extra: reports diff search by material, kitting, trace SN, mo 0031
        extra = [
            ('reports', {'report':'diff'}, 'fix_reports_diff_1600.png'),
            ('trace', {'id':'PWR261110L100368'}, 'fix_trace_sn_1600.png'),
            ('mo', {'id':'MO2610-0031'}, 'fix_mo_0031_1600.png'),
            ('kitting', {'id':'MO2611-0018'}, 'fix_kitting_0018_1600.png'),
            ('inventory', {}, 'fix_inventory_1600.png'),
            ('quality', {'tab':'oqc'}, 'fix_quality_oqc_1600.png'),
        ]
        for mid, params, name in extra:
            n0 = len(errs)
            await pg.evaluate('(p) => window.__mount(p[0], p[1])', [mid, params])
            await pg.wait_for_timeout(2000)
            await pg.screenshot(path=f'{OUT}/{name}', timeout=150000)
            print('shot extra', name, 'newErrors', len(errs)-n0)
        print('ERRORS', len(errs))
        for e in errs[:60]:
            print('  ', e)
        await b.close()
        return len(errs)

asyncio.run(main())
