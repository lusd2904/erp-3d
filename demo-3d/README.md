# 芯程电子 · 电子元器件生产管理 ERP（三维可视化 V1.0）

> ⚠️ 本系统所有客户、订单、物料、库存、设备运行数据均为**模拟数据**，不代表任何真实企业。

## 打开方式
1. **直接双击** `index.html`（file:// 下自动加载打包产物 `dist/app.js`，无需联网）。
2. 或在本目录起一个静态服务：`python3 -m http.server 8090`，浏览器访问 `http://127.0.0.1:8090/`
   （http 下使用原生 ES modules + importmap 加载 `src/`，便于迭代；加 `?bundle=1` 可强制使用打包产物）。

## 目录
- `index.html` 入口；`dist/app.js` 打包产物（`node build.mjs` 生成，依赖 esbuild）
- `src/app/` 外壳、路由、三维驾驶舱 `cockpit.js`、三维车间 `workshop.js`、设备面板、ECharts 浅色主题 `erpLight`
- `src/three/` 三维：`world.js`（渲染/灯光/相机/拾取/动画/库位定位）、`building.js`（厂房/园区）、`layout.js`（产线布局）、
  `smt.js` `backend.js` `warehouse.js` `agv.js`（内置精细设备模型）、`factory.js`（优先使用 `devices/<type>.js` 外包模型，失败回退内置）
- `src/data/plant.js` 共享工厂主数据（设备/产线/库位 ID）；`src/data/mock/` 业务模拟数据；`src/modules/` 业务模块
- `vendor/` 本地 Three.js r160 / ECharts 5.5（不依赖外网 CDN）
