# 打包交付 zip：python3 tools/pack.py（先运行 node build.mjs）
import zipfile, os
R = '/workspace/erp-3d'; OUT = f'{R}/erp-3d-demo.zip'
items = ['index.html', 'README.md', 'build.mjs', 'package.json', 'dist', 'src', 'vendor', 'assets', 'docs/CONTRACT.md', 'docs/DEVICE-SPEC.md']
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for it in items:
        p = os.path.join(R, it)
        if os.path.isfile(p): z.write(p, 'erp-3d-demo/' + it)
        else:
            for d, _, fs in os.walk(p):
                for f in fs: fp = os.path.join(d, f); z.write(fp, 'erp-3d-demo/' + os.path.relpath(fp, R))
print(OUT, os.path.getsize(OUT))
