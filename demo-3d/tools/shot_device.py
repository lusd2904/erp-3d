# 用法: python3 tools/shot_device.py <type> [status]   需本地服务 http://127.0.0.1:8090 指向 /workspace/erp-3d
import sys, os
from playwright.sync_api import sync_playwright
t = sys.argv[1]; st = sys.argv[2] if len(sys.argv) > 2 else 'run'
out = '/workspace/erp-3d/screenshots/devices'; os.makedirs(out, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for v in ['iso', 'front', 'top']:
        pg = b.new_page(viewport={'width': 1280, 'height': 800}); logs = []
        pg.on('console', lambda m: m.type in ('error', 'warning') and ('GPU stall' not in m.text) and logs.append(f'{m.type}: {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'pageerror: {e}'))
        pg.goto(f'http://127.0.0.1:8090/tools/device-preview.html?type={t}&view={v}&status={st}')
        pg.wait_for_function('window.__ready === true', timeout=60000); pg.wait_for_timeout(1500)
        f = f'{out}/{t}-{v}.png'; pg.screenshot(path=f)
        print(f, 'meshes=', pg.evaluate('window.__meshes'), 'errors=', logs or 0)
    b.close()
