// 共享工厂主数据（线A维护，线B只读引用）—— 全部为【演示数据】，非真实工厂信息
export const DEMO = true;
export const factory = {
  name: '芯程电子元器件制造基地',
  short: '芯程电子',
  address: '芯程园区 · 智造大道 88 号',
};
export const STATUS = {
  run:   { label: '运行', color: '#16b364' },
  idle:  { label: '待机', color: '#fb923c' },
  fault: { label: '故障', color: '#f04438' },
  maint: { label: '保养', color: '#2e90fa' },
};
export const lines = [
  { id: 'L1', name: 'SMT线1', type: 'smt', desc: '印刷→SPI→贴片×2→回流焊→AOI' },
  { id: 'L2', name: 'SMT线2', type: 'smt', desc: '印刷→SPI→贴片×2→回流焊→AOI' },
  { id: 'L3', name: '编带/测试线', type: 'backend', desc: '测试分选×2 → 编带×2' },
  { id: 'WH', name: '立体仓库', type: 'warehouse', desc: '4排×12列×6层，双巷道堆垛机' },
  { id: 'MAT', name: '物料区', type: 'storage', desc: '智能料塔 2 台 · 仓库靠近 SMT 一侧' },
  { id: 'QA', name: '品质检验', type: 'quality', desc: '防静电工作台 · 质检室' },
  { id: 'AGV', name: 'AGV物流', type: 'logistics', desc: '4台潜伏式AGV环线配送 · 2座自动充电桩' },
];
// type 对应三维模型：printer / spi / mounter / reflow / aoi / tester / taper / asrs / stacker / agv / charger / reelcab / esdbench / loader
const d = (id, line, type, name, model, vendor, status, extra = {}) => ({ id, line, type, name, model, vendor, status, ...extra });
export const devices = [
  d('L1-LDR',  'L1', 'loader',  'SMT1 上板机', 'NTM710 单料盒上板机', '芯程装备', 'run'),
  d('L1-PRN',  'L1', 'printer', 'SMT1 锡膏印刷机', 'NeoPrint P3', '芯程装备', 'run'),
  d('L1-SPI',  'L1', 'spi',     'SMT1 锡膏检测SPI', 'Vision3D S8', '芯程装备', 'run'),
  d('L1-MNT1', 'L1', 'mounter', 'SMT1 贴片机1', 'XNT-M3×4', '芯程装备', 'run'),
  d('L1-MNT2', 'L1', 'mounter', 'SMT1 贴片机2', 'XNT-M6×2', '芯程装备', 'run'),
  d('L1-RFL',  'L1', 'reflow',  'SMT1 回流焊炉', 'HR-1810 十温区氮气炉', '芯程装备', 'run'),
  d('L1-AOI',  'L1', 'aoi',     'SMT1 AOI检测', 'Zen-3D AOI', '芯程装备', 'idle'),
  d('L1-ULD',  'L1', 'loader',  'SMT1 下板机', 'NTM710 单料盒下板机', '芯程装备', 'run', { unload: true }),
  d('L2-LDR',  'L2', 'loader',  'SMT2 上板机', 'NTM710 单料盒上板机', '芯程装备', 'run'),
  d('L2-PRN',  'L2', 'printer', 'SMT2 锡膏印刷机', 'NeoPrint P3', '芯程装备', 'run'),
  d('L2-SPI',  'L2', 'spi',     'SMT2 锡膏检测SPI', 'Vision3D S8', '芯程装备', 'run'),
  d('L2-MNT1', 'L2', 'mounter', 'SMT2 贴片机1', 'YS-24X', '芯程装备', 'fault'),
  d('L2-MNT2', 'L2', 'mounter', 'SMT2 贴片机2', 'XNT-M3×4', '芯程装备', 'run'),
  d('L2-RFL',  'L2', 'reflow',  'SMT2 回流焊炉', 'HR-1810 十温区氮气炉', '芯程装备', 'run'),
  d('L2-AOI',  'L2', 'aoi',     'SMT2 AOI检测', 'Zen-3D AOI', '芯程装备', 'run'),
  d('L2-ULD',  'L2', 'loader',  'SMT2 下板机', 'NTM710 单料盒下板机', '芯程装备', 'run', { unload: true }),
  d('L3-TST1', 'L3', 'tester',  '测试分选机1', 'TH-962 转塔测试分选机', '芯程装备', 'run'),
  d('L3-TST2', 'L3', 'tester',  '测试分选机2', 'TH-962 转塔测试分选机', '芯程装备', 'maint'),
  d('L3-TAP1', 'L3', 'taper',   '编带机1', 'TR-020S 转塔式编带机', '芯程装备', 'run'),
  d('L3-TAP2', 'L3', 'taper',   '编带机2', 'TR-020S 转塔式编带机', '芯程装备', 'idle'),
  d('WH-ASRS', 'WH', 'asrs',    '立体仓库货架', 'AS/RS 4×12×6 托盘库', '芯程装备', 'run'),
  d('WH-STK1', 'WH', 'stacker', '1#巷道堆垛机', 'SC-12 单立柱堆垛机', '芯程装备', 'run'),
  d('WH-STK2', 'WH', 'stacker', '2#巷道堆垛机', 'SC-12 单立柱堆垛机', '芯程装备', 'run'),
  d('AGV-01',  'AGV', 'agv',    'AGV-01 潜伏式小车', 'LT-600 激光导航AGV', '芯程装备', 'run'),
  d('AGV-02',  'AGV', 'agv',    'AGV-02 潜伏式小车', 'LT-600 激光导航AGV', '芯程装备', 'run'),
  d('AGV-03',  'AGV', 'agv',    'AGV-03 潜伏式小车', 'LT-600 激光导航AGV', '芯程装备', 'idle'),
  d('AGV-04',  'AGV', 'agv',    'AGV-04 潜伏式小车', 'LT-600 激光导航AGV', '芯程装备', 'run'),
  d('CH-01',   'AGV', 'charger', '1# AGV 充电桩', 'AC-48V 自动充电桩', '芯程装备', 'run'),
  d('CH-02',   'AGV', 'charger', '2# AGV 充电桩', 'AC-48V 自动充电桩', '芯程装备', 'run'),
  d('RC-01',   'MAT', 'reelcab', '1# 智能料塔', 'SMD-Tower 200', '芯程装备', 'run'),
  d('RC-02',   'MAT', 'reelcab', '2# 智能料塔', 'SMD-Tower 200', '芯程装备', 'run'),
  d('QA-ESD1', 'QA', 'esdbench', '1# 防静电工作台', 'ESD-1600 防静电工作台', '芯程装备', 'run'),
  d('QA-ESD2', 'QA', 'esdbench', '2# 防静电工作台', 'ESD-1600 防静电工作台', '芯程装备', 'idle'),
];
export const deviceById = Object.fromEntries(devices.map(x => [x.id, x]));
// 立体仓库：4排(01-04) × 12列 × 6层；巷道1服务01/02排，巷道2服务03/04排
export const warehouse = { rows: 4, cols: 12, levels: 6, aisles: [{ id: 'WH-STK1', rows: ['01', '02'] }, { id: 'WH-STK2', rows: ['03', '04'] }] };
const p2 = n => String(n).padStart(2, '0');
export const binId = (row, col, level) => `WH-A-${p2(row)}-${p2(col)}-${p2(level)}`;
export const parseBin = id => { const m = /^WH-A-(\d\d)-(\d\d)-(\d\d)$/.exec(id || ''); if (!m) return null; const row = +m[1], col = +m[2], level = +m[3]; if (row < 1 || row > warehouse.rows || col < 1 || col > warehouse.cols || level < 1 || level > warehouse.levels) return null; return { row, col, level }; };
// 智能料塔料位：RC-柜号-槽位（槽位 01–60）
export const parseRcBin = id => { const m = /^RC-(\d\d)-(\d\d)$/.exec(id || ''); if (!m) return null; const cab = +m[1], slot = +m[2]; if (cab < 1 || cab > 2 || slot < 1 || slot > 60) return null; return { cab, slot, id: `RC-${m[1]}` }; };
export const allBins = () => { const a = []; for (let r = 1; r <= 4; r++) for (let c = 1; c <= 12; c++) for (let l = 1; l <= 6; l++) a.push(binId(r, c, l)); return a; };
export default { DEMO, factory, STATUS, lines, devices, deviceById, warehouse, binId, parseBin, parseRcBin, allBins };
