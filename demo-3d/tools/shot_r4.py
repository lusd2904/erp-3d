import asyncio, json, re, shutil, zipfile
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path('/workspace/erp-3d/screenshots/r4')
OUT.mkdir(parents=True, exist_ok=True)
URL = 'http://127.0.0.1:8090/index.html'
ZIP = Path('/workspace/erp-3d/erp-3d-demo.zip')
DEMO_RE = re.compile(r'演示|非真实|虚构')
FILE = None

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
    await pg.wait_for_timeout(7000)

async def shot(pg, name):
    path = OUT / name
    await pg.screenshot(path=str(path), full_page=False)
    hits = await scan(pg)
    print(f'SHOT {name} hits={hits}')
    return hits

INFO_JS = """() => {
  const w = window.__erp && window.__erp.world;
  const plant = window.__erp && window.__erp.plant;
  const THREE = window.THREE;
  const fr = window.__erp && window.__erp.factoryReport;
  const pos = {};
  const boxes = {};
  if (w && w.devices) {
    for (const [id, g] of Object.entries(w.devices)) {
      pos[id] = { x:+g.position.x.toFixed(3), y:+g.position.y.toFixed(3), z:+g.position.z.toFixed(3),
                  ry:+g.rotation.y.toFixed(4), ext:!!g.userData.external, size:g.userData.size||null };
    }
  }
  const lines = w && w.lines ? Object.fromEntries(Object.entries(w.lines).map(([k,v]) => [k, {x0:v.x0, x1:v.x1, z:v.z, y:v.y, segs:v.segs}])) : null;
  // measure conveyor / neighbors world boxes (exclude statusRing, pcb)
  const measure = (obj) => {
    const box = new (w.devices['L1-PRN'].constructor === obj.constructor ? obj.constructor : Object);
    return null;
  };
  const convs = [];
  if (w && w.scene) {
    w.scene.traverse(o => {
      if (o.userData && (String(o.name||'').includes('-CV-') || (o.userData.size && o.parent===w.scene && /CV-/.test(o.name||'')))) {
        // skip
      }
    });
    const list = [];
    w.scene.children.forEach(ch => {
      const n = ch.name || ch.userData.deviceId || '';
      if (/CV-|conveyor/i.test(n) || (ch.userData && ch.userData.size && !ch.userData.deviceId && Math.abs((ch.userData.size.w||0)-1)<0.05 && Math.abs(ch.position.z+10.5)<0.2)) {
        list.push(ch);
      }
    });
  }
  return { factory: fr, pos, lines, hash: location.hash, title: document.title };
}"""

# more robust measure after login
MEAS_JS = """() => {
  const w = window.__erp.world;
  const scene = w.scene;
  const THREE = w.camera.constructor; // not THREE
  // Use world Box3 via captured objects
  function boxOf(g, skip = true) {
    const min = [Infinity,Infinity,Infinity], max = [-Infinity,-Infinity,-Infinity];
    g.updateMatrixWorld(true);
    g.traverse(o => {
      if (!o.isMesh) return;
      const n = (o.name||'') + (o.parent && o.parent.name || '');
      if (skip && (n.includes('statusRing') || o.parent?.name === 'statusRing' || o.name === 'pcb' || o.userData.on)) return;
      const b = o.geometry && o.geometry.boundingBox;
      // fallback: world positions of bounding sphere is hard; use Box3 from three via setFromObject-like
    });
    return null;
  }
  // Access THREE from the renderer
  const _v = { ok: false };
  return _v;
}"""

async def collect_layout(pg):
    return await pg.evaluate("""() => {
      const w = window.__erp.world;
      const fr = window.__erp.factoryReport;
      const lines = Object.fromEntries(Object.entries(w.lines||{}).map(([k,v]) => [k, {x0:v.x0, x1:v.x1, z:v.z, y:v.y, segs:v.segs}]));
      const pos = {};
      for (const [id,g] of Object.entries(w.devices||{})) {
        pos[id] = {x:+g.position.x.toFixed(3), y:+g.position.y.toFixed(3), z:+g.position.z.toFixed(3),
                   ry:+g.rotation.y.toFixed(4), ext:!!g.userData.external, size:g.userData.size||null,
                   type: (window.__erp.plant.deviceById[id]||{}).type };
      }
      // Measure world AABB of scene children near the SMT lines, excluding statusRing/pcb
      const items = [];
      const Box3 = w.selBox ? w.selBox.box.constructor : null;
      function aabb(obj) {
        let minx=Infinity,miny=Infinity,minz=Infinity,maxx=-Infinity,maxy=-Infinity,maxz=-Infinity, meshes=0;
        obj.updateMatrixWorld(true);
        obj.traverse(o => {
          if (!o.isMesh || !o.geometry) return;
          let p = o.parent;
          let skip = false;
          while (p) { if (p.name === 'statusRing') { skip = true; break; } p = p.parent; }
          if (skip || o.name === 'pcb' || o.name === 'pcbs') return;
          // compute world bbox from geometry
          const geo = o.geometry;
          if (!geo.boundingBox) geo.computeBoundingBox();
          const b = geo.boundingBox;
          if (!b) return;
          const corners = [
            [b.min.x,b.min.y,b.min.z],[b.min.x,b.min.y,b.max.z],[b.min.x,b.max.y,b.min.z],[b.min.x,b.max.y,b.max.z],
            [b.max.x,b.min.y,b.min.z],[b.max.x,b.min.y,b.max.z],[b.max.x,b.max.y,b.min.z],[b.max.x,b.max.y,b.max.z]
          ];
          const e = o.matrixWorld.elements;
          for (const c of corners) {
            const x = e[0]*c[0]+e[4]*c[1]+e[8]*c[2]+e[12];
            const y = e[1]*c[0]+e[5]*c[1]+e[9]*c[2]+e[13];
            const z = e[2]*c[0]+e[6]*c[1]+e[10]*c[2]+e[14];
            if (x<minx)minx=x; if (y<miny)miny=y; if (z<minz)minz=z;
            if (x>maxx)maxx=x; if (y>maxy)maxy=y; if (z>maxz)maxz=z;
          }
          meshes++;
        });
        if (meshes===0) return null;
        return {min:[+minx.toFixed(3),+miny.toFixed(3),+minz.toFixed(3)], max:[+maxx.toFixed(3),+maxy.toFixed(3),+maxz.toFixed(3)], meshes};
      }
      const lineObjs = [];
      for (const ch of w.scene.children) {
        const z = ch.position.z;
        if (Math.abs(z + 10.5) < 0.15 || Math.abs(z + 5.5) < 0.15) {
          const id = ch.name || ch.userData.deviceId || ('anon@'+ch.position.x.toFixed(2));
          const b = aabb(ch);
          if (b) lineObjs.push({id, x:+ch.position.x.toFixed(3), z:+ch.position.z.toFixed(3), size:ch.userData.size||null, box:b});
        }
      }
      lineObjs.sort((a,b)=>a.z-b.z || a.x-b.x);
      return {factory:fr, lines, pos, lineObjs};
    }""")

async def main():
    report = {'errors': [], 'demoHits': {}, 'factory': {}, 'layout': {}, 'file': {}, 'notes': []}
    # unpack zip for file://
    unpack = OUT / '_unpack'
    if unpack.exists():
        shutil.rmtree(unpack)
    unpack.mkdir(parents=True)
    with zipfile.ZipFile(ZIP) as z:
        z.extractall(unpack)
    hits = list(unpack.rglob('index.html'))
    file_url = f'file://{hits[0]}' if hits else None
    report['notes'].append('file url ' + str(file_url))

    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])

        # 1920 first: login + workshop + views + modules + panel + cockpit
        for w, h in [(1920, 1080), (1366, 768)]:
            ctx = await b.new_context(viewport={'width': w, 'height': h})
            await ctx.add_init_script("() => { try { localStorage.removeItem('erp-3d-session'); } catch(e) {} }")
            pg = await ctx.new_page()
            pg.on('console', lambda m, w=w: report['errors'].append(f'{w} console.{m.type}: {m.text}') if m.type == 'error' else None)
            pg.on('pageerror', lambda e, w=w: report['errors'].append(f'{w} pageerror: {e}'))
            await pg.goto(URL, timeout=120000, wait_until='domcontentloaded')
            await wait_login(pg)
            await pg.wait_for_timeout(500)
            hits = await shot(pg, f'login_{w}.png')
            if hits: report['demoHits'][f'login_{w}'] = hits

            await login(pg)
            await pg.evaluate("() => { location.hash = '#/workshop'; window.__erp?.world?.setView('hall'); }")
            await pg.wait_for_timeout(2500)
            hits = await shot(pg, f'workshop_hall_{w}.png')
            if hits: report['demoHits'][f'workshop_hall_{w}'] = hits

            if w == 1920:
                info = await collect_layout(pg)
                report['layout'] = info
                report['factory'] = info.get('factory')
                print('FACTORY', info.get('factory'))
                print('LINES', info.get('lines'))
                for id_ in ('L1-LDR','L1-PRN','L1-SPI','L1-MNT1','L1-MNT2','L1-RFL','L1-AOI','L1-ULD',
                            'L2-SPI'):
                    print('POS', id_, (info.get('pos') or {}).get(id_))
                # print line objects around conveyors
                for o in info.get('lineObjs') or []:
                    if abs(o['z']+10.5)<0.2:
                        print('L1OBJ', o['id'], 'x', o['x'], 'boxX', o['box']['min'][0], '..', o['box']['max'][0], 'size', o['size'])

                # SMT L1 / L2
                await pg.evaluate("() => window.__erp.world.setView('L1')")
                await pg.wait_for_timeout(2500)
                hits = await shot(pg, 'view_L1.png')
                if hits: report['demoHits']['view_L1'] = hits

                await pg.evaluate("() => window.__erp.world.setView('L2')")
                await pg.wait_for_timeout(2500)
                hits = await shot(pg, 'view_L2.png')
                if hits: report['demoHits']['view_L2'] = hits

                # extras for view check
                for vn in ('L3','WH','MAT','QA','AGV','campus'):
                    await pg.evaluate(f"() => window.__erp.world.setView('{vn}')")
                    await pg.wait_for_timeout(1800)
                    await shot(pg, f'view_{vn}.png')

                # SPI close-up
                await pg.evaluate("() => window.__erp.world.focusDevice('L1-SPI')")
                await pg.wait_for_timeout(2500)
                # close panel if it covers too much? keep for a moment then close for clean close-up
                await pg.evaluate("""() => {
                  const c = document.querySelector('.ws-panel .dp-close');
                  if (c) c.click();
                  window.__erp.world.select('L1-SPI', {fly:false});
                }""")
                await pg.wait_for_timeout(400)
                hits = await shot(pg, 'spi_close.png')
                if hits: report['demoHits']['spi_close'] = hits

                # conveyor close-up between MNT2 and RFL
                await pg.evaluate("""() => {
                  const w = window.__erp.world;
                  const rfl = w.devices['L1-RFL'], mnt = w.devices['L1-MNT2'];
                  const x = (mnt.position.x + rfl.position.x) / 2;
                  const z = rfl.position.z;
                  w.select(null);
                  w.flyTo([x + 1.2, 2.6, z + 3.4], [x, 0.7, z]);
                }""")
                await pg.wait_for_timeout(2200)
                await shot(pg, 'conveyor_joint.png')

                # device panel
                await pg.evaluate("() => window.__erp.world.focusDevice('L2-MNT1')")
                await pg.wait_for_timeout(2500)
                hits = await shot(pg, 'panel_fault.png')
                if hits: report['demoHits']['panel_fault'] = hits

                # business pages
                for hid, fn in (('sales','sales.png'),('mo','mo.png'),('inventory','inventory.png'),('trace','trace.png')):
                    await pg.evaluate(f"location.hash = '#/{hid}'")
                    await pg.wait_for_timeout(2000)
                    hits = await shot(pg, fn)
                    if hits: report['demoHits'][hid] = hits

            # standalone cockpit
            try:
                await pg.evaluate("() => { location.hash = '#/workshop'; }")
                await pg.wait_for_timeout(800)
                await pg.wait_for_selector('#btn-cockpit', timeout=10000)
                async with ctx.expect_page(timeout=30000) as ev:
                    await pg.click('#btn-cockpit', force=True)
                pop = await ev.value
                pop.on('console', lambda m, w=w: report['errors'].append(f'{w} popup console.{m.type}: {m.text}') if m.type == 'error' else None)
                pop.on('pageerror', lambda e, w=w: report['errors'].append(f'{w} popup pageerror: {e}'))
                await wait_app(pop)
                await pop.wait_for_timeout(7000)
                await pop.evaluate("() => window.__erp?.world?.setView('hall')")
                await pop.wait_for_timeout(2000)
                hits = await shot(pop, f'cockpit_{w}.png')
                if hits: report['demoHits'][f'cockpit_{w}'] = hits
                await pop.close()
            except Exception as e:
                report['notes'].append(f'popup fail {w}: {e}')
                print('POPUP FAIL', w, e)
                pg2 = await ctx.new_page()
                pg2.on('console', lambda m, w=w: report['errors'].append(f'{w} ck console.{m.type}: {m.text}') if m.type == 'error' else None)
                await pg2.goto(URL + '#/cockpit?standalone=1', timeout=120000, wait_until='domcontentloaded')
                await wait_app(pg2)
                await pg2.wait_for_timeout(7000)
                await shot(pg2, f'cockpit_{w}.png')
                await pg2.close()

            await ctx.close()

        # file://
        ctx = await b.new_context(viewport={'width': 1920, 'height': 1080})
        await ctx.add_init_script("() => { try { localStorage.removeItem('erp-3d-session'); } catch(e) {} }")
        pg = await ctx.new_page()
        ferrs = []
        pg.on('console', lambda m: ferrs.append(f'file console.{m.type}: {m.text}') if m.type == 'error' else None)
        pg.on('pageerror', lambda e: ferrs.append(f'file pageerror: {e}'))
        try:
            await pg.goto(file_url, timeout=120000, wait_until='domcontentloaded')
            await login(pg)
            await pg.wait_for_timeout(2000)
            hash_ = await pg.evaluate('() => location.hash')
            canvas = await pg.evaluate("() => !!document.querySelector('canvas')")
            fr = await pg.evaluate('() => window.__erp && window.__erp.factoryReport')
            hits = await shot(pg, 'file_workshop_1920.png')
            report['file'] = {'ok': bool(canvas and str(hash_).startswith('#/workshop')), 'hash': hash_, 'canvas': canvas, 'errors': ferrs, 'demoHits': hits, 'factory': fr}
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
    for e in report['errors'][:40]:
        print(' ', e)
    print('DEMO', report['demoHits'])

asyncio.run(main())
