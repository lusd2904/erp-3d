# 电子元器件ERP 三维 demo —— 多线协作约定（由主助手维护）

## 分工
- 线A（三维与外壳）：index.html、src/app/（外壳、路由、顶栏、左侧导航、浅色主题 CSS）、src/three/（厂区/车间场景、设备建模、动画、拾取）、三维主面板（驾驶舱：三维居中，四周指标/图表卡片）。
- 线B（业务模块）：src/modules/*.js 及 src/data/mock/*.js，按金蝶生产管理主线：销售订单、物料与BOM、生产订单（下达/变更/拆分）、生产用料清单、齐套分析、领料/退料/补料、生产汇报、完工入库/退库、仓储库存、质量检验（IQC/IPQC/OQC、AOI不良Pareto）、追溯、查询报表。
- UI设计 bot：出浅色界面设计图与设备参考图，放 docs/design/。
- 主助手：核验、整合、对比参考页。

## 模块接口（线B实现，线A加载）
每个模块文件 src/modules/<id>.js：
  export const meta = { id, title, group, icon };   // group: 业务分组名
  export function mount(container, ctx) { ...; return () => {/* 卸载清理 */} }
注册表 src/modules/index.js：export default [ ...各模块 ];（线B维护）
ctx 由线A提供：
  ctx.focusDevice(deviceId)   // 在三维中飞到并高亮设备
  ctx.locateBin(binId)        // 在三维立体仓库高亮库位
  ctx.echarts                 // ECharts 实例工厂（浅色主题已注册，名 'erpLight'）
  ctx.navigate(moduleId, params)
  ctx.toast(msg)

## 共享 ID（两条线都用这些，勿改名）
产线：L1(SMT线1) L2(SMT线2) L3(编带/测试线)
设备：
  L1-PRN 锡膏印刷机 · L1-SPI 锡膏检测 · L1-MNT1 贴片机1 · L1-MNT2 贴片机2 · L1-RFL 回流焊 · L1-AOI AOI检测
  L2-PRN · L2-SPI · L2-MNT1 · L2-MNT2 · L2-RFL · L2-AOI
  L3-TST1 测试分选机1 · L3-TST2 测试分选机2 · L3-TAP1 编带机1 · L3-TAP2 编带机2
  WH-ASRS 立体仓库 · WH-STK1 堆垛机1 · WH-STK2 堆垛机2 · AGV-01..AGV-04
库位：WH-A-<排01-04>-<列01-12>-<层01-06>，例 WH-A-02-07-03
设备状态枚举：run 运行 / idle 待机 / fault 故障 / maint 保养
共享设备/产线清单写在 src/data/plant.js（线A创建，线B只读引用）。

## 规范
- 浅色风格；中文字体栈 'PingFang SC','Microsoft YaHei','Noto Sans CJK SC',sans-serif。
- 所有数据标注「演示数据」。
- 原生 ES modules，three/echarts 从 vendor/ 本地引入，不依赖外网 CDN。
- 文件只放 /workspace/erp-3d/ 下，不用 /tmp。不改 reference/。
