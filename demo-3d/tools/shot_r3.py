import asyncio, json, re, shutil, zipfile, subprocess
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path('/workspace/erp-3d/screenshots/r3')
OUT.mkdir(parents=True, exist_ok=True)
URL = 'http://127.0.0.1:8090/index.html'
UNPACK = OUT / '_unpack' / 'erp-3d-demo'
FILE = f'file://{UNPACK}/index.html'
DEMO_RE = re.compile(r'演示|非真实|虚构')
ZIP = Path('/workspace/erp-3d/erp-3d-demo.zip')

async def wait_login(pg, ms=20000):
    await pg.wait_for_selector('.lg-card', timeout=ms)

async def wait_app(pg, ms=180000):
    await pg.wait_for_function("() => document.body && document.body.dataset.ready === '1'", timeout=ms)

async def scan(pg):
    text = await pg.evaluate("() => (document.title||'') + '\\n' + ((document.body&&document.body.innerText)||'')")
    return [ln.strip() for ln in text.splitlines() if DEMO_RE.search(ln)]

async def login(pg):
    await wait_login(pg)
    await pg.fill('input[name="account"]', 'zhang.gong')
    await pg.fill('input[name="password"]', '123456')
    await pg.click('button.lg-submit')
    await wait_app(pg)
    await pg.wait_for_timeout(8000)

async def shot(pg, name):
    path = OUT / name
    await pg.screenshot(path=str(path), full_page=False)
    hits = await scan(pg)
    print(f'SHOT {name} hits={hits}')
    return hits

INFO_JS = """() => {
  const w = window.__erp && window.__erp.world;
  const plant = window.__erp && window.__erp.plant;
  const fr = window.__erp && window.__erp.factoryReport;
  const devs = (plant && plant.devices) || [];
  const status = {};
  for (const d of devs) status[d.status] = (status[d.status] || 0) + 1;
  const pos = {};
  if (w && w.devices) {
    const v = new (window.THREE || Object)();
    for (const [id, g] of Object.entries(w.devices)) {
      pos[id] = {
        x: +g.position.x.toFixed(3), y: +g.position.y.toFixed(3), z: +g.position.z.toFixed(3),
        ry: +g.rotation.y.toFixed(4),
        type: g.userData.type || (plant.deviceById[id] && plant.deviceById[id].type),
        ext: !!g.userData.external,
        size: g.userData.size || null,
        parent: !!(g.parent)
      };
    }
  }
  const box = w && w.asrsBox ? {min:[+w.asrsBox.min.x.toFixed(3),+w.asrsBox.min.y.toFixed(3),+w.asrsBox.min.z.toFixed(3)], max:[+w.asrsBox.max.x.toFixed(3),+w.asrsBox.max.y.toFixed(3),+w.asrsBox.max.z.toFixed(3)]} : null;
  const lines = w && w.lines ? Object.fromEntries(Object.entries(w.lines).map(([k,v]) => [k, {x0:v.x0, x1:v.x1, z:v.z, segs:v.segs}])) : null;
  const list = [...document.querySelectorAll('.ws-dev, .ws-item, [data-dev]')].map(el => el.dataset.dev || el.dataset.id || el.textContent.slice(0,40));
  const pie = document.querySelector('.ck-pie, #ck-status, [data-card=\"status\"]');
  return {
    factory: fr, status, count: devs.length,
    devices: devs.map(d => ({id:d.id, type:d.type, line:d.line, status:d.status, name:d.name})),
    pos, asrsBox: box, lines,
    hash: location.hash,
    listSample: list.slice(0, 40),
    title: document.title
  };
}"""

async def collect(pg):
    try:
        return await pg.evaluate(INFO_JS)
    except Exception as e:
        return {'error': str(e)}

async def main():
    report = {'errors': [], 'demoHits': {}, 'factory': {}, 'info': {}, 'file': {}, 'notes': []}
    if ZIP.exists():
        if (OUT / '_unpack').exists():
            shutil.rmtree(OUT / '_unpack')
        (OUT / '_unpack').mkdir(parents=True)
        with zipfile.ZipFile(ZIP) as z:
            z.extractall(OUT / '_unpack')
        # zip may contain erp-3d-demo/ or files at root
        root = OUT / '_unpack'
        if not (root / 'erp-3d-demo' / 'index.html').exists():
            # find index.html
            hits = list(root.rglob('index.html'))
            report['notes'].append('unpack index at ' + (str(hits[0]) if hits else 'MISSING'))
            if hits:
                global FILE, UNPACK
                UNPACK = hits[0].parent
                FILE = f'file://{UNPACK}/index.html'

    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for w, h in [(1920, 1080), (1366, 768)]:
            ctx = await b.new_context(viewport={'width': w, 'height': h})
            await ctx.add_init_script("() => { try { localStorage.removeItem('erp-3d-session'); } catch(e) {} }")
            pg = await ctx.new_page()
            pg.on('console', lambda m, w=w: report['errors'].append(f'{w} console.{m.type}: {m.text}') if m.type == 'error' else None)
            pg.on('pageerror', lambda e, w=w: report['errors'].append(f'{w} pageerror: {e}'))
            await pg.goto(URL, timeout=120000, wait_until='domcontentloaded')
            await login(pg)

            # workshop hall
            await pg.evaluate("() => { location.hash = '#/workshop'; window.__erp?.world?.setView('hall'); }")
            await pg.wait_for_timeout(2500)
            hits = await shot(pg, f'workshop_hall_{w}.png')
            if hits: report['demoHits'][f'workshop_hall_{w}'] = hits

            if w == 1920:
                info = await collect(pg)
                report['info'] = info
                report['factory'] = info.get('factory')
                print('FACTORY', info.get('factory'))
                print('STATUS', info.get('status'), 'count', info.get('count'))
                print('LINES', info.get('lines'))
                print('ASRS', info.get('asrsBox'))
                for id_ in ('RC-01','RC-02','QA-ESD1','QA-ESD2','L1-LDR','L1-ULD','L2-LDR','L2-ULD','L1-PRN','L1-RFL'):
                    print('POS', id_, (info.get('pos') or {}).get(id_))

            # standalone cockpit via new tab
            try:
                await pg.wait_for_selector('#btn-cockpit', timeout=10000)
                async with ctx.expect_page(timeout=30000) as ev:
                    await pg.click('#btn-cockpit', force=True)
                pop = await ev.value
                pop.on('console', lambda m, w=w: report['errors'].append(f'{w} popup console.{m.type}: {m.text}') if m.type == 'error' else None)
                pop.on('pageerror', lambda e, w=w: report['errors'].append(f'{w} popup pageerror: {e}'))
                await wait_app(pop)
                await pop.wait_for_timeout(8000)
                await pop.evaluate("() => window.__erp?.world?.setView('hall')")
                await pop.wait_for_timeout(2000)
                hits = await shot(pop, f'cockpit_{w}.png')
                if hits: report['demoHits'][f'cockpit_{w}'] = hits
                if w == 1920:
                    st = await pop.evaluate("""() => {
                      const cards = [...document.querySelectorAll('.ck-card, .ck-kpi, [class*=status]')].map(el => el.innerText.slice(0, 200));
                      return {title: document.title, standalone: document.body.classList.contains('standalone'), cards};
                    }""")
                    report['notes'].append({'cockpit': st})
                await pop.close()
            except Exception as e:
                report['notes'].append(f'popup fail {w}: {e}')
                print('POPUP FAIL', w, e)
                # fallback direct hash
                pg2 = await ctx.new_page()
                pg2.on('console', lambda m, w=w: report['errors'].append(f'{w} ck console.{m.type}: {m.text}') if m.type == 'error' else None)
                await pg2.goto(URL + '#/cockpit?standalone=1', timeout=120000, wait_until='domcontentloaded')
                await wait_app(pg2)
                await pg2.wait_for_timeout(8000)
                await shot(pg2, f'cockpit_{w}.png')
                await pg2.close()

            if w == 1920:
                # reelcab close-up
                await pg.evaluate("() => { window.__erp.world.select(null); window.__erp.world.setView('MAT'); }")
                await pg.wait_for_timeout(2500)
                hits = await shot(pg, 'reelcab_close.png')
                if hits: report['demoHits']['reelcab_close'] = hits

                # highlight slot check
                await pg.evaluate("() => window.__erp.world.locateBin('RC-01-08')")
                await pg.wait_for_timeout(2200)
                hits = await shot(pg, 'reelcab_slot.png')
                if hits: report['demoHits']['reelcab_slot'] = hits
                await pg.evaluate("() => { window.__erp.world.clearBin(); window.__erp.world.select(null); }")

                # QA benches
                await pg.evaluate("() => window.__erp.world.setView('QA')")
                await pg.wait_for_timeout(2500)
                hits = await shot(pg, 'qa_esdbench.png')
                if hits: report['demoHits']['qa_esdbench'] = hits

                # printer + reflow line
                await pg.evaluate("() => window.__erp.world.setView('L1')")
                await pg.wait_for_timeout(2500)
                hits = await shot(pg, 'line_printer_reflow.png')
                if hits: report['demoHits']['line_printer_reflow'] = hits

            if w == 1366:
                await pg.evaluate("() => { location.hash = '#/workshop'; window.__erp.world.focusDevice('L2-MNT1'); }")
                await pg.wait_for_timeout(2500)
                # confirm panel visible + scroll area
                panel = await pg.evaluate("""() => {
                  const p = document.querySelector('.ws-panel');
                  if (!p || p.hidden) return {ok:false};
                  const r = p.getBoundingClientRect();
                  const act = document.querySelector('.ws-panel .dp-actions');
                  const sc = document.querySelector('.ws-panel .dp-scroll');
                  const ar = act && act.getBoundingClientRect();
                  const sr = sc && sc.getBoundingClientRect();
                  return {ok:true, panel:{y:r.y,h:r.height,bottom:r.bottom}, actions: ar && {y:ar.y,bottom:ar.bottom,h:ar.height}, scroll: sr && {y:sr.y,h:sr.height,bottom:sr.bottom,scrollH:sc.scrollHeight, clientH:sc.clientHeight}, vh: window.innerHeight};
                }""")
                report['notes'].append({'panel1366': panel})
                print('PANEL1366', panel)
                hits = await shot(pg, 'panel_1366.png')
                if hits: report['demoHits']['panel_1366'] = hits

            await ctx.close()

        # file://
        ctx = await b.new_context(viewport={'width': 1920, 'height': 1080})
        await ctx.add_init_script("() => { try { localStorage.removeItem('erp-3d-session'); } catch(e) {} }")
        pg = await ctx.new_page()
        ferrs = []
        pg.on('console', lambda m: ferrs.append(f'file console.{m.type}: {m.text}') if m.type == 'error' else None)
        pg.on('pageerror', lambda e: ferrs.append(f'file pageerror: {e}'))
        try:
            await pg.goto(FILE, timeout=120000, wait_until='domcontentloaded')
            await login(pg)
            await pg.wait_for_timeout(2000)
            hash_ = await pg.evaluate('() => location.hash')
            canvas = await pg.evaluate("() => !!document.querySelector('canvas')")
            hits = await shot(pg, 'file_workshop_1920.png')
            report['file'] = {'ok': bool(canvas and str(hash_).startswith('#/workshop')), 'hash': hash_, 'canvas': canvas, 'errors': ferrs, 'demoHits': hits, 'url': FILE}
            print('FILE', report['file'])
        except Exception as e:
            report['file'] = {'ok': False, 'error': str(e), 'errors': ferrs, 'url': FILE}
            print('FILE FAIL', e)
            try: await pg.screenshot(path=str(OUT / 'file_fail.png'))
            except Exception: pass
        await ctx.close()
        await b.close()

    (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print('ERRORS', len(report['errors']))
    for e in report['errors'][:40]:
        print(' ', e)
    print('DEMO', report['demoHits'])
    print('FILE', report['file'])

asyncio.run(main())
