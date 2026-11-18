// 三维驾驶舱 / 设备面板使用的实时运行【演示数据】（固定种子生成 + 轻微抖动），非真实采集数据
import { devices, deviceById, lines } from '../data/plant.js';

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rng(20261112);
const r = (a, b, d = 0) => +(a + R() * (b - a)).toFixed(d);

const PRODUCTS = { L1: '电源管理板 PWR-3205', L2: '主控板 CTL-5210', L3: 'MLCC 0402 104K 编带' };
const WO = { L1: 'MO2611-0062', L2: 'MO2611-0065', L3: 'MO2611-0068' };
export const runtime = {
  DEMO: true,
  wo: WO, products: PRODUCTS,
  dev: {},
  alarms: [
    { lv: '一级', dev: 'L2-MNT1', msg: '吸嘴 N3 真空异常，连续抛料 12 次', time: '14:06', st: '未处置' },
    { lv: '二级', dev: 'L2-MNT1', msg: '供料器 F12 抛料率 3.8%，超过阈值 1.5%', time: '14:12', st: '未处置' },
    { lv: '二级', dev: 'L1-AOI', msg: '待料：上游缓存为空，AOI 进入待机', time: '13:52', st: '处置中' },
    { lv: '三级', dev: 'L3-TST2', msg: '计划保养：测试座清洁与校准', time: '13:30', st: '处置中' },
    { lv: '一级', dev: 'L2-MNT1', msg: 'Z 轴伺服过载报警，复位后恢复', time: '11:10', st: '已处置' },
    { lv: '三级', dev: 'L2-MNT1', msg: '0402 料盘剩余 500 pcs，请及时备料', time: '08:05', st: '已处置' },
    { lv: '二级', dev: 'L1-RFL', msg: '7 区温度偏离设定值 +3.2℃（已回调）', time: '11:18', st: '已处置' },
    { lv: '三级', dev: 'WH-STK2', msg: '货叉到位传感器响应慢，建议点检', time: '10:41', st: '已处置' },
    { lv: '三级', dev: 'AGV-03', msg: '电量 18%，返回充电区', time: '10:05', st: '已处置' },
  ],
  hours: Array.from({ length: 12 }, (_, i) => `${String(3 + i).padStart(2, '0')}:00`),
  output: { L1: [], L2: [], L3: [] },
  fpy7: { days: [], L1: [], L2: [], L3: [] },
  defects: [['少锡', 186], ['偏移', 142], ['立碑', 88], ['桥连', 71], ['缺件', 52], ['极性反', 23], ['异物', 17]],
};
for (let i = 0; i < 12; i++) { runtime.output.L1.push(r(820, 1040)); runtime.output.L2.push(i > 9 ? r(180, 320) : r(760, 980)); runtime.output.L3.push(r(30, 42) * 1000); }
for (let i = 6; i >= 0; i--) { const d = new Date(Date.UTC(2026, 10, 12 - i)); runtime.fpy7.days.push(`${d.getUTCMonth() + 1}/${d.getUTCDate()}`); runtime.fpy7.L1.push(r(98.2, 99.4, 2)); runtime.fpy7.L2.push(r(97.1, 98.8, 2)); runtime.fpy7.L3.push(r(99.2, 99.8, 2)); }

const TYPE_PARAMS = {
  printer: () => [['印刷速度', r(40, 60) + ' mm/s'], ['刮刀压力', r(6, 9, 1) + ' kg'], ['钢网擦拭', '每 5 板'], ['锡膏剩余', r(55, 85) + ' %']],
  spi: () => [['检测板数', r(900, 1300)], ['锡膏体积均值', r(95, 108, 1) + ' %'], ['不良板数', r(2, 9)], ['CPK', r(1.4, 1.9, 2)]],
  mounter: () => [['贴装速度', r(42, 78) + 'k CPH'], ['抛料率', r(0.03, 0.12, 2) + ' %'], ['供料器在线', r(60, 96) + ' 站'], ['吸嘴状态', '正常']],
  reflow: () => [['链速', r(72, 85) + ' cm/min'], ['氧含量', r(400, 900) + ' ppm'], ['峰值温度', r(244, 249) + ' ℃'], ['冷却速率', r(2.5, 3.6, 1) + ' ℃/s']],
  aoi: () => [['检测板数', r(900, 1300)], ['不良点数', r(8, 30)], ['误判率', r(0.5, 1.6, 2) + ' %'], ['检测节拍', r(16, 22) + ' s/板']],
  tester: () => [['UPH', r(38, 52) + 'k'], ['测试良率', r(99.1, 99.8, 2) + ' %'], ['在线测试工位', '6/6'], ['分 BIN', '4+4+1']],
  taper: () => [['编带速度', r(9, 14) + 'k/h'], ['当前卷盘', r(3, 9) + '/10'], ['封合温度', r(150, 175) + ' ℃'], ['CCD 不良', r(0, 6)]],
  asrs: () => [['库位总数', '288'], ['库位利用率', r(78, 88) + ' %'], ['今日入库', r(60, 110) + ' 托'], ['今日出库', r(70, 120) + ' 托']],
  stacker: () => [['行走速度', '160 m/min'], ['今日作业', r(80, 140) + ' 次'], ['当前任务', '出库 → 1#输送线'], ['平均周期', r(78, 96) + ' s']],
  agv: () => [['电量', r(42, 96) + ' %'], ['今日任务', r(28, 60) + ' 单'], ['当前任务', ['仓库→L1 送料', 'L2→成品区', '待命'][r(0, 2)]], ['行驶速度', '1.2 m/s']],
  charger: () => [['输出电压', '48.2 V'], ['输出电流', r(0, 28, 1) + ' A'], ['今日充电', r(6, 14) + ' 次'], ['桩体温度', r(28, 36, 1) + ' ℃']],
  reelcab: () => [['料位总数', '60'], ['在库料盘', r(38, 54) + ' 盘'], ['今日出库', r(80, 160) + ' 盘'], ['今日入库', r(60, 120) + ' 盘']],
  esdbench: () => [['台面温度', r(22, 26, 1) + ' ℃'], ['接地电阻', r(0.4, 1.8, 1) + ' Ω'], ['今日作业', r(12, 28) + ' 单'], ['离子风机', '开启']],
  loader: () => [['料盒层数', '50'], ['当前层', r(4, 18)], ['上板节拍', r(6, 10) + ' s'], ['SMEMA', '就绪']],
  conveyor: () => [['输送速度', r(12, 18) + ' m/min'], ['板宽', '250 mm'], ['今日过板', r(800, 1600)]],
};

for (const d of devices) {
  const run = d.status === 'run';
  const base = d.type === 'tester' || d.type === 'taper' ? r(28000, 46000) : d.type === 'agv' || d.type === 'stacker' || d.type === 'asrs' ? r(60, 140) : r(6200, 9800);
  runtime.dev[d.id] = {
    wo: WO[d.line] || (d.line === 'AGV' ? '物料配送任务' : '仓储作业'),
    product: PRODUCTS[d.line] || '—',
    output: base,
    yield: d.type === 'agv' || d.type === 'stacker' || d.type === 'asrs' || d.type === 'reelcab' || d.type === 'esdbench' || d.type === 'charger' || d.type === 'loader' ? null : r(97.5, 99.8, 2),
    oee: d.status === 'fault' ? r(52, 64, 1) : d.status === 'maint' ? r(60, 70, 1) : run ? r(80, 91, 1) : r(68, 78, 1),
    runHours: r(6.5, 9.8, 1),
    temp: d.type === 'reflow' ? null : r(28, 41, 1),
    params: (TYPE_PARAMS[d.type] || (() => []))(),
    mtbf: r(160, 420) + ' h',
    lastMaint: `2026-11-0${r(1, 9)}`,
  };
}
// SMT2 贴片机1 故障停线故事（与生产订单 MO2611-0010 一致）
{
  const x = runtime.dev['L2-MNT1'];
  if (x) {
    x.oee = 70.7; x.yield = 98.5; x.avail = 78.0; x.perf = 92.0;
    x.params = [['贴装速度', '0 k CPH'], ['抛料率', '1.80 %'], ['供料器在线', '88 站'], ['吸嘴状态', 'N3 真空异常']];
    x.fault = { since: '14:06', minutes: 45, text: '吸嘴 N3 真空异常，连续抛料 12 次', tech: '李工' };
  }
  const ch2 = runtime.dev['CH-02'];
  if (ch2) { ch2.params = [['输出电压', '48.2 V'], ['输出电流', '25.0 A'], ['今日充电', '9 次'], ['桩体温度', '33.1 ℃']]; ch2.yield = null; }
  const ch1 = runtime.dev['CH-01'];
  if (ch1) { ch1.params = [['输出电压', '48.0 V'], ['输出电流', '0.0 A'], ['今日充电', '7 次'], ['桩体温度', '29.4 ℃']]; ch1.yield = null; }
}

export function deviceDetail(id, status) {
  const d = deviceById[id]; const x = runtime.dev[id] || {};
  const seed = [...id].reduce((s, c) => s + c.charCodeAt(0), 0);
  const rr = rng(20261112 + seed);
  const rnd = (a, b, k = 1) => +(a + rr() * (b - a)).toFixed(k);
  const oee = x.oee ?? 82;
  const avail = x.avail ?? (status === 'fault' ? rnd(70, 82, 1) : status === 'idle' ? rnd(75, 86, 1) : rnd(86, 96, 1));
  const perf = x.perf ?? (status === 'fault' ? rnd(80, 92, 1) : rnd(90, 98, 1));
  const yld = x.yield ?? (d && (d.type === 'agv' || d.type === 'stacker' || d.type === 'asrs' || d.type === 'charger') ? null : rnd(97.5, 99.6, 1));
  const target = 80;
  const fault = x.fault || (status === 'fault' ? { since: '14:06', minutes: 45, text: (runtime.alarms.find(a => a.dev === id) || {}).msg || '设备故障停机', tech: '李工' } : null);
  // 近 24 小时状态带：按 24 段小时
  const segs = [];
  let cursor = 0;
  if (id === 'L2-MNT1') {
    segs.push({ st: 'run', h: 14.1 }, { st: 'idle', h: 1.8 }, { st: 'fault', h: 1.5 }, { st: 'maint', h: 2.0 }, { st: 'run', h: 2.6 }, { st: 'fault', h: 2.0 });
  } else {
    const mix = status === 'run' ? [['run', 18], ['idle', 4], ['maint', 2]] : status === 'fault' ? [['run', 14], ['idle', 2], ['fault', 6], ['maint', 2]] : status === 'maint' ? [['run', 12], ['maint', 8], ['idle', 4]] : [['run', 10], ['idle', 12], ['maint', 2]];
    mix.forEach(([st, h]) => segs.push({ st, h }));
  }
  const hours = [];
  for (let i = 0; i <= 24; i += 4) hours.push(String((15 + i) % 24).padStart(2, '0') + ':00');
  hours[hours.length - 1] = '现在';
  const sumH = segs.reduce((s, a) => s + a.h, 0);
  const alarms = runtime.alarms.filter(a => a.dev === id).map(a => ({
    time: a.time, lv: a.lv === '一级' ? '严重' : a.lv === '二级' ? '警告' : '提示', msg: a.msg, st: a.st,
  }));
  const maint = id === 'L2-MNT1' || (d && d.type === 'mounter') ? [
    { name: '日常点检', cycle: '每日', next: '下次 11-13 08:00', st: '待执行', tone: 'info' },
    { name: '吸嘴清洗与真空检测', cycle: '每周', next: '下次 11-14 08:00', st: '建议提前', tone: 'warning' },
    { name: '贴装精度校准', cycle: '每季度', next: '下次 12-05 08:00', st: '已排期', tone: 'default' },
  ] : [
    { name: '日常点检', cycle: '每日', next: '下次 11-13 08:00', st: status === 'maint' ? '执行中' : '待执行', tone: status === 'maint' ? 'info' : 'info' },
    { name: '润滑与紧固', cycle: '每周', next: '下次 11-16 08:00', st: '已排期', tone: 'default' },
    { name: '精度校准', cycle: '每季度', next: '下次 12-20 08:00', st: '已排期', tone: 'default' },
  ];
  return { oee, avail, perf, yld, target, fault, segs, sumH, hours, alarms, maint, lastMaint: x.lastMaint || '11-12 08:00' };
}

export function lineKpi(L) {
  const ds = devices.filter(d => d.line === L);
  const out = (runtime.output[L] || []).reduce((a, b) => a + b, 0);
  const run = ds.filter(d => d.status === 'run').length;
  return { out, run, total: ds.length, fault: ds.filter(d => d.status === 'fault').length, oee: +(ds.reduce((s, d) => s + runtime.dev[d.id].oee, 0) / ds.length).toFixed(1), fpy: runtime.fpy7[L]?.[6] };
}
export function kpis() {
  const total = runtime.output.L1.concat(runtime.output.L2).reduce((a, b) => a + b, 0);
  const run = devices.filter(d => d.status === 'run').length;
  return {
    boards: total, chips: runtime.output.L3.reduce((a, b) => a + b, 0),
    yield: 98.62, oee: 84.3, wip: 7, runRate: +(run / devices.length * 100).toFixed(1), stockWarn: 6, alarms: runtime.alarms.filter(a => a.st === '未处置').length,
  };
}
export function openAlarmCount() { return runtime.alarms.filter(a => a.st === '未处置').length; }
export function jitter() { for (const d of devices) { const x = runtime.dev[d.id]; if (d.status === 'run') x.output += Math.round((d.type === 'tester' || d.type === 'taper' ? 12 : 1) * (1 + R() * 2)); } }
export { deviceById, lines };
