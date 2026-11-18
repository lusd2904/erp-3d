import asyncio, json, re, os
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path('/workspace/erp-3d/screenshots/nodemo')
OUT.mkdir(parents=True, exist_ok=True)
URL = 'http://127.0.0.1:8090/index.html'
FILE_URL = 'file:///workspace/erp-3d/screenshots/nodemo/_unpack/erp-3d-demo/index.html'
PAGES = [
    ('cockpit', '驾驶舱'),
    ('workshop', '三维车间'),
    ('base', '基础资料'),
    ('sales', '销售订单'),
    ('mo', '生产订单'),
    ('ppbom', '生产用料清单'),
    ('kitting', '齐套分析'),
    ('picking', '领料退料补料'),
    ('prodreport', '生产汇报'),
    ('instock', '完工入库退库'),
    ('inventory', '仓储库存'),
    ('quality', '质量检验'),
    ('trace', '质量追溯'),
    ('reports', '查询报表'),
]
DEMO_RE = re.compile(r'演示|非真实|虚构')

async def ready(pg, ms=120000):
    await pg.wait_for_function("() => document.body && document.body.dataset.ready === '1'", timeout=ms)

async def scan_demo(pg):
    text = await pg.evaluate("""() => {
      const t = (document.body && document.body.innerText) || '';
      const title = document.title || '';
      return title + '\\n' + t;
    }""")
    hits = []
    for i, line in enumerate(text.splitlines()):
        if DEMO_RE.search(line):
            hits.append(line.strip())
    return hits

async def check_wan(pg):
    return await pg.evaluate("""() => {
      const cards = [...document.querySelectorAll('.bm-kpi')];
      const amt = cards.find(c => (c.innerText || '').includes('订单金额'));
      if (!amt) return { found: false };
      const kv = amt.querySelector('.kv');
      const small = kv && kv.querySelector('small');
      if (!kv || !small) return { found: true, error: 'missing kv/small', text: amt.innerText };
      const cr = amt.getBoundingClientRect();
      const sr = small.getBoundingClientRect();
      const kr = kv.getBoundingClientRect();
      const cs = getComputedStyle(amt);
      const clipped = sr.right > cr.right + 0.5 || sr.bottom > cr.bottom + 1 || sr.left < cr.left - 0.5;
      return {
        found: true,
        text: kv.innerText,
        unit: small.innerText,
        fontSize: getComputedStyle(kv).fontSize,
        card: {x: cr.x, y: cr.y, w: cr.width, h: cr.height, r: cr.right, b: cr.bottom},
        unitBox: {x: sr.x, y: sr.y, w: sr.width, h: sr.height, r: sr.right, b: sr.bottom},
        kvBox: {x: kr.x, y: kr.y, w: kr.width, h: kr.height},
        overflow: cs.overflow,
        clipped
      };
    }""")

async def main():
    report = {'errors': [], 'demoHits': {}, 'wan': {}, 'file': {}}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for w, h in [(1920, 1080), (1366, 768)]:
            errs = []
            pg = await b.new_page(viewport={'width': w, 'height': h})
            pg.on('console', lambda m, w=w: report['errors'].append(f'{w} console.{m.type}: {m.text}') if m.type == 'error' else None)
            pg.on('pageerror', lambda e, w=w: report['errors'].append(f'{w} pageerror: {e}'))
            await pg.goto(URL, timeout=120000, wait_until='domcontentloaded')
            await ready(pg)
            await pg.wait_for_timeout(8000)  # first 3D settle
            for hid, name in PAGES:
                await pg.evaluate(f"location.hash = '#/{hid}'")
                # wait hash and module host
                try:
                    await pg.wait_for_function(f"() => location.hash.startsWith('#/{hid}') && document.querySelector('#view .mod-host')", timeout=20000)
                except Exception as e:
                    report['errors'].append(f'{w} nav timeout {hid}: {e}')
                wait = 9000 if hid in ('cockpit', 'workshop') else 2500
                await pg.wait_for_timeout(wait)
                path = OUT / f'{hid}_{w}.png'
                await pg.screenshot(path=str(path), full_page=False)
                hits = await scan_demo(pg)
                if hits:
                    report['demoHits'].setdefault(f'{hid}_{w}', hits)
                print(f'SHOT {path.name} hits={len(hits)}')
                if hid == 'sales':
                    info = await check_wan(pg)
                    report['wan'][str(w)] = info
                    print('  WAN', info)
                    # crop KPI row
                    box = await pg.evaluate("""() => {
                      const row = document.querySelector('.bm-kpis');
                      if (!row) return null;
                      const r = row.getBoundingClientRect();
                      return {x: Math.max(0,r.x-8), y: Math.max(0,r.y-8), width: Math.min(innerWidth, r.width+16), height: r.height+16};
                    }""")
                    if box:
                        await pg.screenshot(path=str(OUT / f'sales_kpi_{w}.png'), clip=box)
                if hid == 'workshop' and w == 1920:
                    # open a device panel
                    clicked = await pg.evaluate("""() => {
                      const b = document.querySelector('.ws-list .dv[data-dev]');
                      if (b) { b.click(); return b.dataset.dev; }
                      return null;
                    }""")
                    await pg.wait_for_timeout(1500)
                    await pg.screenshot(path=str(OUT / f'workshop_panel_{w}.png'))
                    hits2 = await scan_demo(pg)
                    if hits2:
                        report['demoHits'].setdefault(f'workshop_panel_{w}', hits2)
                    print('  panel', clicked, 'hits', hits2)
            await pg.close()

        # file:// zip extract
        pg = await b.new_page(viewport={'width': 1920, 'height': 1080})
        ferrs = []
        pg.on('console', lambda m: ferrs.append(f'file console.{m.type}: {m.text}') if m.type == 'error' else None)
        pg.on('pageerror', lambda e: ferrs.append(f'file pageerror: {e}'))
        ok = False
        try:
            await pg.goto(FILE_URL, timeout=120000, wait_until='domcontentloaded')
            await ready(pg, 120000)
            await pg.wait_for_timeout(8000)
            await pg.screenshot(path=str(OUT / 'file_cockpit_1920.png'))
            title = await pg.title()
            ready_flag = await pg.evaluate("() => document.body.dataset.ready")
            has_canvas = await pg.evaluate("() => !!document.querySelector('canvas')")
            hits = await scan_demo(pg)
            ok = ready_flag == '1' and has_canvas
            report['file'] = {'ok': ok, 'title': title, 'ready': ready_flag, 'canvas': has_canvas, 'errors': ferrs, 'demoHits': hits}
            print('FILE', report['file'])
        except Exception as e:
            report['file'] = {'ok': False, 'error': str(e), 'errors': ferrs}
            print('FILE FAIL', e)
            try:
                await pg.screenshot(path=str(OUT / 'file_fail.png'))
            except Exception:
                pass
        await pg.close()
        await b.close()

    (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print('ERRORS', len(report['errors']))
    for e in report['errors'][:30]:
        print(' ', e)
    print('DEMO HITS', report['demoHits'])
    print('WAN', report['wan'])

asyncio.run(main())
