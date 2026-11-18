import asyncio, json, shutil, zipfile, re
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path('/workspace/erp-3d/screenshots/r6')
URL = 'http://127.0.0.1:8090/index.html'
ZIP = Path('/workspace/erp-3d/erp-3d-demo.zip')
DEMO_RE = re.compile(r'演示|非真实|虚构|DEMO|示例|仿')
PAGES = ['inventory', 'trace']  # sales/mo 1920 already done
ALL1366 = ['sales', 'mo', 'inventory', 'trace']

LAYOUT_JS = """() => {
  const vh = innerHeight;
  const vis = el => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {cls: String(el.className).slice(0,60), top:+r.top.toFixed(1), bottom:+r.bottom.toFixed(1), h:+r.height.toFixed(1),
      inView: r.top >= -1 && r.bottom <= vh + 1, cutBottom: r.bottom > vh + 1, cutTop: r.top < -1};
  };
  const pick = sel => vis(document.querySelector(sel));
  return {vw: innerWidth, vh, dock: pick('.bm-dock'),
    charts: [...document.querySelectorAll('.bm-dock .ch, .bm-dock .pie, .bm-dock .load, .bm-dock .gantt')].map(vis),
    lg: pick('.bm-inventory .lg'), rack: pick('.bm-inventory .rack'), stk: pick('.bm-inventory .stk'),
    detail: pick('.bm-trace .detail'), graph: pick('.bm-trace .graph')};
}"""

async def wait_app(pg):
    await pg.wait_for_function("() => document.body && document.body.dataset.ready === '1'", timeout=180000)

async def login(pg):
    await pg.wait_for_selector('.lg-card', timeout=20000)
    await pg.fill('input[name="account"]', 'zhang.gong')
    await pg.fill('input[name="password"]', '123456')
    await pg.click('button.lg-submit')
    await wait_app(pg)
    await pg.wait_for_timeout(5000)

async def scan(pg):
    text = await pg.evaluate("() => (document.title||'')+'\\n'+((document.body&&document.body.innerText)||'')")
    return [ln.strip() for ln in text.splitlines() if DEMO_RE.search(ln)]

async def shot(pg, name):
    await pg.screenshot(path=str(OUT / name), full_page=False)
    hits = await scan(pg)
    print('SHOT', name, 'hits', hits)
    return hits

async def main():
    report_path = OUT / 'report.json'
    report = json.loads(report_path.read_text()) if report_path.exists() else {'errors': [], 'demoHits': {}, 'layout': {}, 'file': {}}
    unpack = OUT / '_unpack'
    if not unpack.exists() or not list(unpack.rglob('index.html')):
        if unpack.exists(): shutil.rmtree(unpack)
        unpack.mkdir(parents=True)
        with zipfile.ZipFile(ZIP) as z: z.extractall(unpack)
    file_url = 'file://' + str(next(unpack.rglob('index.html')))

    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])

        ctx = await b.new_context(viewport={'width': 1920, 'height': 1080})
        await ctx.add_init_script("() => { try { localStorage.removeItem('erp-3d-session'); } catch(e) {} }")
        pg = await ctx.new_page()
        pg.on('console', lambda m: report['errors'].append(f'1920b console.{m.type}: {m.text}') if m.type == 'error' else None)
        pg.on('pageerror', lambda e: report['errors'].append(f'1920b pageerror: {e}'))
        await pg.goto(URL, timeout=120000, wait_until='domcontentloaded')
        await login(pg)
        for mid in PAGES:
            await pg.evaluate(f"location.hash='#/{mid}'")
            await pg.wait_for_timeout(2000)
            lay = await pg.evaluate(LAYOUT_JS)
            report['layout'][f'{mid}_1920'] = lay
            print('LAY', mid, '1920', json.dumps(lay, ensure_ascii=False))
            hits = await shot(pg, f'{mid}_1920.png')
            if hits: report['demoHits'][f'{mid}_1920'] = hits
        await ctx.close()

        ctx = await b.new_context(viewport={'width': 1366, 'height': 768})
        await ctx.add_init_script("() => { try { localStorage.removeItem('erp-3d-session'); } catch(e) {} }")
        pg = await ctx.new_page()
        pg.on('console', lambda m: report['errors'].append(f'1366 console.{m.type}: {m.text}') if m.type == 'error' else None)
        pg.on('pageerror', lambda e: report['errors'].append(f'1366 pageerror: {e}'))
        await pg.goto(URL, timeout=120000, wait_until='domcontentloaded')
        await login(pg)
        for mid in ALL1366:
            await pg.evaluate(f"location.hash='#/{mid}'")
            await pg.wait_for_timeout(2000)
            lay = await pg.evaluate(LAYOUT_JS)
            report['layout'][f'{mid}_1366'] = lay
            print('LAY', mid, '1366', json.dumps(lay, ensure_ascii=False))
            hits = await shot(pg, f'{mid}_1366.png')
            if hits: report['demoHits'][f'{mid}_1366'] = hits
        await ctx.close()

        ctx = await b.new_context(viewport={'width': 1920, 'height': 1080})
        await ctx.add_init_script("() => { try { localStorage.removeItem('erp-3d-session'); } catch(e) {} }")
        pg = await ctx.new_page()
        ferrs = []
        pg.on('console', lambda m: ferrs.append(f'file console.{m.type}: {m.text}') if m.type == 'error' else None)
        pg.on('pageerror', lambda e: ferrs.append(f'file pageerror: {e}'))
        try:
            await pg.goto(file_url, timeout=120000, wait_until='domcontentloaded')
            await login(pg)
            hash_ = await pg.evaluate('() => location.hash')
            canvas = await pg.evaluate("() => !!document.querySelector('canvas')")
            await shot(pg, 'file_workshop_1920.png')
            report['file'] = {'ok': bool(canvas and str(hash_).startswith('#/workshop')), 'hash': hash_, 'canvas': canvas, 'errors': ferrs}
            print('FILE', report['file'])
        except Exception as e:
            report['file'] = {'ok': False, 'error': str(e), 'errors': ferrs}
            print('FILE FAIL', e)
        await ctx.close()
        await b.close()

    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print('ERRORS', len(report.get('errors') or []))
    for e in (report.get('errors') or [])[:40]:
        print(' ', e)

asyncio.run(main())
