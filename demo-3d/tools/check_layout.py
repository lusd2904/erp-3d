# 真外壳中业务模块布局检查（1366/1600）：python3 -u tools/check_layout.py [prefix]
import asyncio, sys, json
from playwright.async_api import async_playwright
URL = 'http://127.0.0.1:8090/index.html'
PFX = sys.argv[1] if len(sys.argv) > 1 else 'L'
OUT = '/workspace/erp-3d/screenshots/shell'
JS = r"""() => {
 const v = document.querySelector('#view').getBoundingClientRect(); const out = [];
 document.querySelectorAll('#view *').forEach(e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
   let p = e.parentElement, clipped = false; while (p && p.id !== 'view') { const cs = getComputedStyle(p); if (cs.overflowX !== 'visible' || cs.overflowY!=='visible') { const pr = p.getBoundingClientRect(); if (r.right > pr.right + 1 || r.bottom > pr.bottom + 1) { if (p.scrollWidth > p.clientWidth + 1 || p.scrollHeight > p.clientHeight + 1) { if (cs.overflowX === 'hidden' && r.right > pr.right + 1) clipped = 'x-hidden'; else if (cs.overflowY === 'hidden' && r.bottom > pr.bottom + 1) clipped = 'y-hidden'; } } } p = p.parentElement; }
   if ((r.right > v.right + 1) || clipped) out.push([e.tagName + '.' + (e.className && e.className.baseVal === undefined ? e.className : ''), Math.round(r.left), Math.round(r.right), Math.round(r.bottom), clipped || 'over-view', (e.textContent||'').trim().slice(0, 20)]); });
 const pg = [...document.querySelectorAll('#view .bm-pg, #view [class*=pager], #view [class*=pagin]')].map(e => { const r = e.getBoundingClientRect(); return [e.className, Math.round(r.bottom), Math.round(v.bottom)]; });
 const tw = [...document.querySelectorAll('#view .bm-tw')].map(e => { const r = e.getBoundingClientRect(); return [e.scrollWidth, e.clientWidth, Math.round(r.right), Math.round(r.bottom)]; });
 return { over: out.slice(0, 12), n: out.length, pg, tw, view: [Math.round(v.right), Math.round(v.bottom)], docScroll: [document.querySelector('#view').scrollHeight, document.querySelector('#view').clientHeight] };
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(ignore_default_args=['--hide-scrollbars'], args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        errs = []
        for W, H in [(1366, 768), (1600, 900)]:
            pg = await b.new_page(viewport={'width': W, 'height': H})
            pg.on('console', lambda m: errs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
            pg.on('pageerror', lambda e: errs.append(f'[pageerror] {e}'))
            await pg.goto(URL + '#/sales'); await pg.wait_for_selector('body[data-ready="1"]', timeout=120000)
            ids = await pg.evaluate("window.__erp.state.modules.map(m=>m.meta.id)")
            for mid in ids:
                await pg.evaluate(f"window.__erp.navigate('{mid}')"); await pg.wait_for_timeout(900)
                r = await pg.evaluate(JS)
                print(W, mid, json.dumps(r, ensure_ascii=False))
                if mid in ('sales', 'mo', 'inventory', 'quality'): await pg.screenshot(path=f'{OUT}/{PFX}_{mid}_{W}.png', timeout=150000)
            await pg.close()
        print('ERRORS', len(errs)); [print('  ', e) for e in errs[:30]]
        await b.close()
asyncio.run(main())
