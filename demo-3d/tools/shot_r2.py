import asyncio, json, re
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path('/workspace/erp-3d/screenshots/r2')
OUT.mkdir(parents=True, exist_ok=True)
URL = 'http://127.0.0.1:8090/index.html'
FILE = 'file:///workspace/erp-3d/screenshots/r2/_unpack/erp-3d-demo/index.html'
DEMO_RE = re.compile(r'演示|非真实|虚构')

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

async def main():
    report = {'errors': [], 'demoHits': {}, 'factory': {}, 'popup': {}, 'file': {}, 'notes': []}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for w, h in [(1920, 1080), (1366, 768)]:
            errs = []
            ctx = await b.new_context(viewport={'width': w, 'height': h})
            # start logged out
            await ctx.add_init_script("() => { try { localStorage.removeItem('erp-3d-session'); } catch(e) {} }")
            pg = await ctx.new_page()
            pg.on('console', lambda m, w=w: report['errors'].append(f'{w} console.{m.type}: {m.text}') if m.type == 'error' else None)
            pg.on('pageerror', lambda e, w=w: report['errors'].append(f'{w} pageerror: {e}'))
            await pg.goto(URL, timeout=120000, wait_until='domcontentloaded')
            await wait_login(pg)
            await pg.wait_for_timeout(400)
            hits = await shot(pg, f'login_{w}.png')
            if hits: report['demoHits'][f'login_{w}'] = hits

            await login(pg)
            # should be workshop
            hash_ = await pg.evaluate('() => location.hash')
            report['notes'].append(f'{w} after login hash={hash_}')
            hits = await shot(pg, f'workshop_{w}.png')
            if hits: report['demoHits'][f'workshop_{w}'] = hits

            # factory report once
            if w == 1920:
                fr = await pg.evaluate('() => window.__erp && window.__erp.factoryReport')
                report['factory'] = fr
                print('FACTORY', fr)

            # open cockpit in new tab
            popup_ok = False
            try:
                await pg.wait_for_selector('#btn-cockpit', timeout=10000)
                async with ctx.expect_page(timeout=30000) as ev:
                    await pg.click('#btn-cockpit', force=True)
                pop = await ev.value
                pop.on('console', lambda m, w=w: report['errors'].append(f'{w} popup console.{m.type}: {m.text}') if m.type == 'error' else None)
                pop.on('pageerror', lambda e, w=w: report['errors'].append(f'{w} popup pageerror: {e}'))
                await wait_app(pop)
                await pop.wait_for_timeout(8000)
                title = await pop.title()
                stand = await pop.evaluate("() => document.body.classList.contains('standalone') && !!document.querySelector('.ck-banner') && !!document.querySelector('canvas')")
                report['popup'][str(w)] = {'ok': True, 'title': title, 'standalone': stand, 'url': pop.url}
                popup_ok = True
                hits = await shot(pop, f'cockpit_{w}.png')
                if hits: report['demoHits'][f'cockpit_{w}'] = hits
                # device panel in cockpit: click fault mounter via API
                await pop.evaluate("() => window.__erp && window.__erp.world && window.__erp.world.focusDevice('L2-MNT1')")
                await pop.wait_for_timeout(2500)
                hits = await shot(pop, f'cockpit_panel_{w}.png')
                if hits: report['demoHits'][f'cockpit_panel_{w}'] = hits
                await pop.close()
            except Exception as e:
                report['popup'][str(w)] = {'ok': False, 'error': str(e)}
                print('POPUP FAIL', w, e)
                try: await pg.screenshot(path=str(OUT / f'popup_fail_{w}.png'))
                except Exception: pass

            # device panel in workshop
            await pg.evaluate("() => { location.hash = '#/workshop'; }")
            await pg.wait_for_timeout(2000)
            await pg.evaluate("() => window.__erp && window.__erp.world && window.__erp.world.focusDevice('L2-MNT1')")
            await pg.wait_for_timeout(2500)
            hits = await shot(pg, f'panel_fault_{w}.png')
            if hits: report['demoHits'][f'panel_fault_{w}'] = hits

            # AGV charger close-up (close device panel first)
            await pg.evaluate("""() => {
              const close = document.querySelector('.ws-panel .dp-close, .ck-pop .dp-close');
              if (close) close.click();
              window.__erp.world.select(null);
              window.__erp.world.setView('AGV');
            }""")
            await pg.wait_for_timeout(2200)
            hits = await shot(pg, f'charger_{w}.png')
            if hits: report['demoHits'][f'charger_{w}'] = hits

            # 3 business pages
            if w == 1920:
                for hid in ('sales', 'mo', 'inventory'):
                    await pg.evaluate(f"location.hash = '#/{hid}'")
                    await pg.wait_for_timeout(2500)
                    hits = await shot(pg, f'{hid}_{w}.png')
                    if hits: report['demoHits'][f'{hid}_{w}'] = hits

            await ctx.close()

        # file:// zip extract
        ctx = await b.new_context(viewport={'width': 1920, 'height': 1080})
        await ctx.add_init_script("() => { try { localStorage.removeItem('erp-3d-session'); } catch(e) {} }")
        pg = await ctx.new_page()
        ferrs = []
        pg.on('console', lambda m: ferrs.append(f'file console.{m.type}: {m.text}') if m.type == 'error' else None)
        pg.on('pageerror', lambda e: ferrs.append(f'file pageerror: {e}'))
        try:
            await pg.goto(FILE, timeout=120000, wait_until='domcontentloaded')
            await wait_login(pg)
            await pg.wait_for_timeout(600)
            await shot(pg, 'file_login_1920.png')
            await login(pg)
            await pg.wait_for_timeout(2000)
            hash_ = await pg.evaluate('() => location.hash')
            canvas = await pg.evaluate("() => !!document.querySelector('canvas')")
            hits = await shot(pg, 'file_workshop_1920.png')
            report['file'] = {'ok': bool(canvas and str(hash_).startswith('#/workshop')), 'hash': hash_, 'canvas': canvas, 'errors': ferrs, 'demoHits': hits}
            print('FILE', report['file'])
        except Exception as e:
            report['file'] = {'ok': False, 'error': str(e), 'errors': ferrs}
            print('FILE FAIL', e)
            try: await pg.screenshot(path=str(OUT / 'file_fail.png'))
            except Exception: pass
        await ctx.close()
        await b.close()

    (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print('ERRORS', len(report['errors']))
    for e in report['errors'][:30]:
        print(' ', e)
    print('POPUP', report['popup'])
    print('FACTORY', report['factory'])
    print('DEMO', report['demoHits'])

asyncio.run(main())
