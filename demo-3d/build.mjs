// 打包：src/app/main.js → dist/app.js（IIFE，可 file:// 双击打开）。用法：node build.mjs
import * as esbuild from 'esbuild';
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
import fs from 'node:fs';
// 生成外部设备模型清单（避免运行时请求不存在的文件产生 404）
const devDir = path.join(root, 'src/three/devices');
const types = fs.existsSync(devDir) ? fs.readdirSync(devDir).filter(f => /^[a-z]+\.js$/.test(f)).map(f => f.slice(0, -3)) : [];
fs.writeFileSync(path.join(root, 'src/three/deviceManifest.js'), `// 自动生成（node build.mjs）：src/three/devices/ 下可用的外部设备模型\nexport const DEVICE_FILES = ${JSON.stringify(types)};\n`);
console.log('device modules:', types.join(', ') || '(none)');
await esbuild.build({
  entryPoints: [path.join(root, 'src/app/main.js')], bundle: true, format: 'iife', outfile: path.join(root, 'dist/app.js'),
  target: ['chrome100', 'safari15', 'firefox100'], minify: true, sourcemap: false, legalComments: 'none', logLevel: 'info',
  alias: { three: path.join(root, 'vendor/three/three.module.js'), echarts: path.join(root, 'vendor/echarts/echarts.esm.min.js') },
  plugins: [{ name: 'addons', setup(b) { b.onResolve({ filter: /^three\/addons\// }, a => ({ path: path.join(root, 'vendor/three/addons', a.path.slice('three/addons/'.length)) })); } }],
});
