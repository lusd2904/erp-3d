import asyncio, json, shutil, zipfile, re
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path('/workspace/erp-3d/screenshots/r5')
OUT.mkdir(parents=True, exist_ok=True)
URL = 'http://127.0.0.1:8090/index.html'
ZIP = Path('/workspace/erp-3d/erp-3d-demo.zip')
DEMO_RE = re.compile(r'演示|非真实|虚构')
MODULES = ['base','sales','mo','ppbom','kitting','picking','prodreport','instock','inventory','quality','trace','reports']

LAYOUT_JS = """() => {
  const search = document.querySelector('.search');
  const inp = document.querySelector('#g-search');
  const bar = document.querySelector('.ws-bar');
  const meas = el => { if(!el) return null; const r=el.getBoundingClientRect(); return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),bottom:+r.bottom.toFixed(1)}; };
  let phFit = null;
  if (inp) {
    const cs = getComputedStyle(inp);
    const c = document.createElement('canvas').getContext('2d');
    c.font = cs.font;
    const tw = c.measureText(inp.placeholder).width;
    phFit = {placeholder: inp.placeholder, textW:+tw.toFixed(1), inputW: inp.clientWidth, fits: tw <= inp.clientWidth - 2};
  }
  const barInfo = bar && meas(bar);
  if (bar) barInfo.wrap = bar.getBoundingClientRect().height > 46;
  const overflow = [...document.querySelectorAll('.content, .mod-host, .topbar, .ws-bar')].filter(el => el.scrollWidth > el.clientWidth + 4).map(el => ({cls:String(el.className).slice(0,40), sw:el.scrollWidth, cw:el.clientWidth}));
  return {vw: innerWidth, vh: innerHeight, search: meas(search), phFit, bar: barInfo, overflow};
}"""

async def wait_app(pg):
    await pg.wait_for_function("() => document.body && document.body.dataset.ready === '1'", timeout=180000)

async def login(pg):
    await pg.wait_for_selector('.lg-card', timeout=20000)
    await pg.fill('input[name="account"]', 'zhang.gong')
    await pg.fill('input[name="password"]', '123456')
    await pg.click('button.lg-submit')
    await wait_app(pg)
    await pg.wait_for_timeout(6500)

async def scan(pg):
    text = await pg.evaluate("() => (document.title||'')+'\\n'+((document.body&&document.body.innerText)||'')")
    return [ln.strip() for ln in text.splitlines() if DEMO_RE.search(ln)]

async def shot(pg, name):
    await pg.screenshot(path=str(OUT / name), full_page=False)
    hits = await scan(pg)
    print('SHOT', name, 'hits', hits)
    return hits

async def cockpit(ctx, pg, w, report):
    try:
        await pg.wait_for_selector('#btn-cockpit', timeout=8000)
        async with ctx.expect_page(timeout=25000) as ev:
            await pg.click('#btn-cockpit', force=True)
        pop = await ev.value
        pop.on('console', lambda m, w=w: report['errors'].append(f'{w} ck console.{m.type}: {m.text}') if m.type == 'error' else None)
        await wait_app(pop)
        await pop.wait_for_timeout(6500)
        await pop.evaluate("() => window.__erp?.world?.setView('hall')")
        await pop.wait_for_timeout(2000)
        await shot(pop, f'cockpit_{w}.png')
        await pop.close()
    except Exception as e:
        print('POPUP fail', w, e)
        pg2 = await ctx.new_page()
        await pg2.goto(URL + '#/cockpit?standalone=1', timeout=120000, wait_until='domcontentloaded')
        await wait_app(pg2)
        await pg2.wait_for_timeout(6500)
        await shot(pg2, f'cockpit_{w}.png')
        await pg2.close()

async def main():
    report = {'errors': [], 'demoHits': {}, 'layout': {}, 'file': {}}
    unpack = OUT / '_unpack'
    if unpack.exists():
        shutil.rmtree(unpack)
    unpack.mkdir(parents=True)
    with zipfile.ZipFile(ZIP) as z:
        z.extractall(unpack)
    file_url = 'file://' + str(next(unpack.rglob('index.html')))

    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])

        ctx = await b.new_context(viewport={'width': 1920, 'height': 1080})
        await ctx.add_init_script("() => { try { localStorage.removeItem('erp-3d-session'); } catch(e) {} }")
        pg = await ctx.new_page()
        pg.on('console', lambda m: report['errors'].append(f'1920 console.{m.type}: {m.text}') if m.type == 'error' else None)
        pg.on('pageerror', lambda e: report['errors'].append(f'1920 pageerror: {e}'))
        await pg.goto(URL, timeout=120000, wait_until='domcontentloaded')
        await login(pg)
        await pg.evaluate("() => { location.hash='#/workshop'; window.__erp?.world?.setView('hall'); }")
        await pg.wait_for_timeout(2500)
        await shot(pg, 'workshop_hall_1920.png')
        report['layout']['1920'] = await pg.evaluate(LAYOUT_JS)
        print('L1920', report['layout']['1920'])
        for vn in ('L1', 'L2', 'L3', 'WH', 'QA', 'campus'):
            await pg.evaluate(f"() => window.__erp.world.setView('{vn}')")
            await pg.wait_for_timeout(2400)
            await shot(pg, f'view_{vn}.png')
        await cockpit(ctx, pg, 1920, report)
        await ctx.close()

        ctx = await b.new_context(viewport={'width': 1366, 'height': 768})
        await ctx.add_init_script("() => { try { localStorage.removeItem('erp-3d-session'); } catch(e) {} }")
        pg = await ctx.new_page()
        pg.on('console', lambda m: report['errors'].append(f'1366 console.{m.type}: {m.text}') if m.type == 'error' else None)
        pg.on('pageerror', lambda e: report['errors'].append(f'1366 pageerror: {e}'))
        await pg.goto(URL, timeout=120000, wait_until='domcontentloaded')
        await login(pg)
        await pg.evaluate("() => { location.hash='#/workshop'; window.__erp?.world?.setView('hall'); }")
        await pg.wait_for_timeout(2500)
        await shot(pg, 'workshop_hall_1366.png')
        report['layout']['1366'] = await pg.evaluate(LAYOUT_JS)
        print('L1366', json.dumps(report['layout']['1366'], ensure_ascii=False))
        await cockpit(ctx, pg, 1366, report)
        for mid in MODULES:
            await pg.evaluate(f"location.hash='#/{mid}'")
            await pg.wait_for_timeout(1600)
            lay = await pg.evaluate(LAYOUT_JS)
            report['layout'][mid] = {'phFit': lay.get('phFit'), 'overflow': lay.get('overflow')}
            print('MOD', mid, report['layout'][mid])
            hits = await shot(pg, f'mod_{mid}_1366.png')
            if hits:
                report['demoHits'][mid] = hits
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

    (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print('ERRORS', len(report['errors']))
    for e in report['errors'][:40]:
        print(' ', e)

asyncio.run(main())
