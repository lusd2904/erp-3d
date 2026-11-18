// 生产业务单据（销售订单→生产订单→用料清单→领/补/退料→汇报→入库/退库→出货）—— 全部为【演示数据】
// 同一生产订单号 / 生产批号 / 原料批号在各单据之间贯通
import { TODAY, rng, addDays, dateDiff, ymd6, customers, materials, materialByCode, bomByProduct, routingFor, teams, workcenters } from './base.js';

const R = rng(8613);
const pick = a => a[Math.floor(R() * a.length)];
const short = { '3.01.0001': 'PWR', '3.01.0002': 'CTL', '3.02.0001': 'MLC', '3.03.0001': 'XCP', '3.04.0001': 'IND' };
export const STATUS_FLOW = ['计划', '计划确认', '下达', '开工', '完工', '结案'];
const custBy = Object.fromEntries(customers.map(c => [c.code, c]));

// [生产订单号, 销售订单号, 客户, 产品, 数量, 产线, 计划开工, 计划完工, 业务状态, 完成比例, 单据类型, 来源/备注]
const spec = [
  ['MO2610-0031', 'SO2610-0012', 'C001', '3.01.0001', 3000, 'L1', '2026-10-12', '2026-10-15', '结案', 1],
  ['MO2610-0032', 'SO2610-0012', 'C001', '3.01.0002', 5000, 'L2', '2026-10-13', '2026-10-16', '结案', 1],
  ['MO2610-0035', 'SO2610-0015', 'C003', '3.02.0001', 4000000, 'L3', '2026-10-16', '2026-10-20', '结案', 1],
  ['MO2610-0038', 'SO2610-0016', 'C002', '3.03.0001', 240000, 'L3', '2026-10-20', '2026-10-23', '结案', 1],
  ['MO2610-0041', 'SO2610-0018', 'C005', '3.04.0001', 120000, 'L3', '2026-10-24', '2026-10-27', '结案', 1],
  ['MO2610-0043', 'SO2610-0019', 'C004', '3.01.0001', 2000, 'L2', '2026-10-27', '2026-10-29', '结案', 1],
  ['MO2610-0046', '—', 'C001', '3.01.0001', 45, 'L1', '2026-10-17', '2026-10-17', '结案', 1, '返工生产', 'MO2610-0031'],
  ['MO2611-0002', 'SO2610-0021', 'C006', '3.01.0002', 6000, 'L1', '2026-11-02', '2026-11-04', '完工', 1],
  ['MO2611-0003', 'SO2610-0021', 'C006', '3.01.0001', 1500, 'L2', '2026-11-03', '2026-11-05', '完工', 1],
  ['MO2611-0005', 'SO2611-0003', 'C001', '3.02.0001', 6000000, 'L3', '2026-11-04', '2026-11-08', '完工', 1],
  ['MO2611-0006', 'SO2611-0004', 'C003', '3.01.0001', 4000, 'L1', '2026-11-06', '2026-11-09', '完工', 1],
  ['MO2611-0008', 'SO2611-0005', 'C002', '3.03.0001', 300000, 'L3', '2026-11-07', '2026-11-11', '完工', 1],
  ['MO2611-0009', 'SO2611-0006', 'C001', '3.01.0001', 5000, 'L1', '2026-11-10', '2026-11-13', '开工', 0.62],
  ['MO2611-0010', 'SO2611-0006', 'C001', '3.01.0002', 8000, 'L2', '2026-11-10', '2026-11-14', '开工', 0.45],
  ['MO2611-0011', 'SO2611-0007', 'C003', '3.02.0001', 8000000, 'L3', '2026-11-09', '2026-11-14', '开工', 0.55],
  ['MO2611-0012', 'SO2611-0008', 'C005', '3.04.0001', 200000, 'L3', '2026-11-11', '2026-11-13', '开工', 0.3],
  ['MO2611-0019', '—', 'C003', '3.01.0001', 80, 'L1', '2026-11-11', '2026-11-12', '开工', 0.75, '返工生产', 'MO2611-0006'],
  ['MO2611-0013', 'SO2611-0009', 'C004', '3.01.0002', 3000, 'L1', '2026-11-13', '2026-11-14', '下达', 0],
  ['MO2611-0014', 'SO2611-0010', 'C002', '3.03.0001', 360000, 'L3', '2026-11-14', '2026-11-17', '下达', 0],
  ['MO2611-0015', 'SO2611-0010', 'C002', '3.01.0001', 3500, 'L2', '2026-11-15', '2026-11-18', '计划确认', 0],
  ['MO2611-0016', 'SO2611-0010', 'C002', '3.01.0001', 2500, 'L1', '2026-11-15', '2026-11-17', '计划确认', 0, '普通生产', 'MO2611-0015'],
  ['MO2611-0017', 'SO2611-0011', 'C006', '3.02.0001', 5000000, 'L3', '2026-11-16', '2026-11-19', '计划确认', 0],
  ['MO2611-0018', 'SO2611-0012', 'C001', '3.01.0002', 10000, 'L1', '2026-11-17', '2026-11-20', '计划', 0],
  ['MO2611-0020', 'SO2611-0013', 'C003', '3.01.0001', 3000, 'L2', '2026-11-19', '2026-11-21', '计划', 0],
  ['MO2611-0021', 'SO2611-0014', 'C005', '3.04.0001', 150000, 'L3', '2026-11-20', '2026-11-22', '计划', 0],
  ['MO2611-0022', 'SO2611-0013', 'C003', '3.03.0001', 180000, 'L3', '2026-11-21', '2026-11-24', '计划', 0],
];

const lineName = { L1: 'SMT线1', L2: 'SMT线2', L3: '编带/测试线' };
const l3Devices = { '3.02.0001': ['L3-TST1', 'L3-TAP1'], '3.03.0001': ['L3-TST1', 'L3-TAP1'], '3.04.0001': ['L3-TST2', 'L3-TAP2'] };
export function fieldsForLine(product, line) {
  const route = routingFor(product, line);
  const devices = line === 'L3' ? (l3Devices[product] || ['L3-TST1', 'L3-TAP1']) : route.ops.flatMap(o => o.devices);
  return { lineName: lineName[line], workshop: line === 'L3' ? '编测车间' : 'SMT车间', wc: line === 'L3' ? 'WC-TST' : `WC-SMT${line.slice(1)}`, routeNo: route.no, devices };
}
export const reworkBom = [{ code: '1.04.0001', qty: 1, loss: 0.02, issue: '直接领料', pos: 'U1 更换' }, { code: '1.02.0004', qty: 1, loss: 0.02, issue: '直接领料', pos: 'C33 补件' }, { code: '1.06.0001', qty: 0.0004, loss: 0.1, issue: '倒冲', pos: '补焊锡膏' }];

export const mos = spec.map(([no, so, cust, product, qty, line, ps, pe, status, pct, type = '普通生产', src = ''], i) => {
  const mat = materialByCode[product];
  const isPCBA = mat.group === 'PCBA';
  const seq = no.slice(-4);
  const done = Math.round(qty * pct);
  const yieldBad = type === '返工生产' ? 0.0 : isPCBA ? (no === 'MO2611-0006' ? 0.02 : 0.003 + R() * 0.006) : 0.008 + R() * 0.014;
  const bad = Math.round(done * yieldBad);
  const route = routingFor(product, line);
  const devices = line === 'L3' ? (no === 'MO2611-0014' || no === 'MO2611-0022' ? ['L3-TST1', 'L3-TAP2'] : l3Devices[product]) : type === '返工生产' ? [`${line}-AOI`] : route.ops.flatMap(o => o.devices);
  return {
    no, so, cust, custName: custBy[cust].short, product, productName: mat.name, spec: mat.spec, pkg: mat.pkg, unit: mat.unit, qty, line, lineName: lineName[line],
    workshop: line === 'L3' ? '编测车间' : 'SMT车间', wc: line === 'L3' ? 'WC-TST' : `WC-SMT${line.slice(1)}`, planStart: ps, planEnd: pe, status, type, src,
    splitFrom: no === 'MO2611-0016' ? 'MO2611-0015' : '', batch: `PB${ymd6(ps)}-${line}-${seq}`, snPrefix: isPCBA ? `${short[product]}${ymd6(ps)}${line}` : '',
    bomNo: type === '返工生产' ? '返工用料(手工)' : bomByProduct[product].no, bomVer: type === '返工生产' ? '—' : bomByProduct[product].ver, routeNo: route.no, devices,
    done, bad, good: done - bad, priority: cust === 'C003' || cust === 'C001' ? '高' : i % 3 ? '中' : '低', planner: pick(['刘计划', '马计划', '何计划']),
    createDate: addDays(ps, -6), releaseDate: ['下达', '开工', '完工', '结案'].includes(status) ? addDays(ps, -2) : '', closeDate: status === '结案' ? addDays(pe, 4) : '',
    isPCBA, inQty: 0, ngInQty: 0, shipQty: 0,
  };
});
// 拆分前原数量
mos.find(m => m.no === 'MO2611-0015').origQty = 6000;
export const moByNo = Object.fromEntries(mos.map(m => [m.no, m]));
// 主线故事：先固定最终不良数，再派生汇报、入库，保证各模块数量一致
moByNo['MO2610-0031'].bad = 45; moByNo['MO2610-0031'].good = moByNo['MO2610-0031'].done - 45;
moByNo['MO2611-0006'].bad = 80; moByNo['MO2611-0006'].good = moByNo['MO2611-0006'].done - 80;


// 生产订单变更单 / 拆分记录
export const moChanges = [
  { no: 'ECN2611-0004', mo: 'MO2611-0010', date: '2026-11-11', type: '数量变更', field: '生产数量', before: '7,000', after: '8,000', reason: '华锐通信追加订单 1,000 PCS', by: '马计划', status: '已审核' },
  { no: 'ECN2611-0005', mo: 'MO2611-0013', date: '2026-11-11', type: '日期变更', field: '计划开工', before: '2026-11-12', after: '2026-11-13', reason: 'SMT线1 被 MO2611-0009 占用延长', by: '刘计划', status: '已审核' },
  { no: 'ECN2611-0006', mo: 'MO2611-0016', date: '2026-11-12', type: '产线变更', field: '生产车间/产线', before: 'SMT线2', after: 'SMT线1', reason: 'L2-MNT1 故障，拆分后部分转线生产', by: '刘计划', status: '已审核' },
  { no: 'ECN2611-0003', mo: 'MO2611-0006', date: '2026-11-10', type: '用料变更', field: 'C33 替代料', before: '1.02.0004 22μF/25V', after: '1.02.0004 (另一批次)', reason: '原批次 IQC 拒收，改用合格批次', by: '何计划', status: '已审核' },
  { no: 'ECN2610-0009', mo: 'MO2610-0043', date: '2026-10-26', type: 'BOM版本变更', field: 'BOM版本', before: 'V2.0', after: 'V3.0', reason: '工程变更：MOS 换为 XN3060', by: '马计划', status: '已审核' },
];
export const moSplits = [
  { no: 'SPL2611-0002', src: 'MO2611-0015', srcQty: 6000, date: '2026-11-12', reason: 'L2 产能不足（L2-MNT1 故障），拆分 2,500 PCS 至 SMT线1', by: '刘计划', items: [{ mo: 'MO2611-0015', qty: 3500, line: 'L2' }, { mo: 'MO2611-0016', qty: 2500, line: 'L1' }] },
];

// ---------- 生产用料清单 PPBOM ----------
const packOf = mat => {
  if (mat.unit !== 'PCS') return 1;
  const mm = /(\d+)(K)?PCS\//.exec(mat.packing); if (!mm) return 1;
  if (/^(散料|周转盒|料管)/.test(mat.packing)) return 1;
  return +mm[1] * (mm[2] ? 1000 : 1);
};
export const roundQ = (mat, v) => mat.unit === 'kg' || mat.unit === '罐' ? Math.round(v * 100) / 100 : Math.ceil(v - 1e-9);
export const ppboms = mos.map(mo => {
  const items = mo.type === '返工生产' ? reworkBom : bomByProduct[mo.product].items;
  return {
    no: 'PPBOM' + mo.no.slice(2), mo: mo.no, product: mo.product, qty: mo.qty, status: mo.status === '结案' ? '已关闭' : '已审核',
    lines: items.map((it, k) => {
      const mat = materialByCode[it.code];
      const std = roundQ(mat, mo.qty * it.qty);
      const need = roundQ(mat, mo.qty * it.qty * (1 + it.loss));
      return { seq: k + 1, code: it.code, name: mat.name, spec: mat.spec, unit: mat.unit, unitQty: it.qty, loss: it.loss, issue: it.issue, pos: it.pos, std, need,
        wh: (it.code === '1.06.0001' || it.code === '1.06.0003') ? 'WH06' : 'WH01', picked: 0, supp: 0, ret: 0, backflush: 0, consumed: 0 };
    }),
  };
});
export const ppbomByMo = Object.fromEntries(ppboms.map(p => [p.mo, p]));

// ---------- 领料 / 补料 / 退料 ----------
const edgeWh = { L1: 'WH02', L2: 'WH03', L3: 'WH07' };
const started = mo => ['开工', '完工', '结案'].includes(mo.status);
const issues = []; // {no,type,date,mo,line,toWh,lines:[{code,qty,reason}],...}
let pSeq = 1, sSeq = 1, rSeq = 1;
const pickers = ['钱物料', '孙物料', '吴物料'];
mos.forEach(mo => {
  if (!started(mo)) return;
  const pp = ppbomByMo[mo.no];
  const ls = pp.lines.filter(l => l.issue === '直接领料').map(l => {
    const mat = materialByCode[l.code]; const pk = packOf(mat);
    const q = pk > 1 && mo.type !== '返工生产' ? Math.ceil(l.need / pk) * pk : roundQ(mat, l.need);
    l.picked = q; return { code: l.code, qty: q };
  });
  const date = addDays(mo.planStart, -1);
  issues.push({ no: `PL${ymd6(date).slice(0, 4)}-${String(pSeq++).padStart(4, '0')}`, type: '领料', bizType: mo.type === '返工生产' ? '返工领料' : '普通领料', date, mo: mo.no, line: mo.line, fromWh: 'WH01', toWh: edgeWh[mo.line], picker: pickers[pSeq % 3], status: '已审核', reason: '', lines: ls });
});
const suppSpec = [
  ['MO2611-0010', '2026-11-11', [['1.01.0001', 20000], ['1.02.0001', 20000]], 'L2-MNT1 吸嘴堵塞，0402 抛料率 1.8% 超标'],
  ['MO2611-0006', '2026-11-08', [['1.02.0001', 10000]], 'AOI 缺件返修补料'],
  ['MO2611-0011', '2026-11-11', [['2.01.0001', 120000]], '测试分选 DF 超差剔除，超定额损耗'],
  ['MO2610-0032', '2026-10-15', [['1.01.0003', 5000]], '换线首件调机损耗'],
  ['MO2611-0019', '2026-11-12', [['1.04.0001', 10]], '返修拆焊 IC 损坏补领'],
];
suppSpec.forEach(([no, date, ls, reason]) => {
  const mo = moByNo[no]; const pp = ppbomByMo[no];
  ls.forEach(([c, q]) => { const l = pp.lines.find(x => x.code === c); if (l) l.supp += q; });
  issues.push({ no: `PS${ymd6(date).slice(0, 4)}-${String(sSeq++).padStart(4, '0')}`, type: '补料', bizType: '超耗补料', date, mo: no, line: mo.line, fromWh: 'WH01', toWh: edgeWh[mo.line], picker: pickers[sSeq % 3], status: '已审核', reason, lines: ls.map(([code, qty]) => ({ code, qty })) });
});
// 实际耗用 & 倒冲
mos.forEach(mo => {
  const pp = ppbomByMo[mo.no]; const frac = mo.qty ? mo.done / mo.qty : 0;
  pp.lines.forEach(l => {
    const mat = materialByCode[l.code];
    const realLoss = l.loss * (0.55 + R() * 0.5) + (l.supp ? (l.supp / Math.max(1, l.std)) : 0);
    l.consumed = roundQ(mat, l.std * frac * (1 + realLoss));
    if (l.issue === '倒冲') { l.backflush = l.consumed; }
  });
});
mos.forEach(mo => {
  if (!['完工', '结案'].includes(mo.status)) return;
  const pp = ppbomByMo[mo.no];
  const ls = [];
  pp.lines.forEach(l => {
    if (l.issue !== '直接领料') return;
    const left = l.picked + l.supp - l.consumed;
    if (left > 0 && materialByCode[l.code].unit === 'PCS' && left >= 50) { l.ret = left; ls.push({ code: l.code, qty: left }); }
    else if (left < 0) l.consumed = l.picked + l.supp;
  });
  if (!ls.length) return;
  const date = addDays(mo.planEnd, 1) > TODAY ? TODAY : addDays(mo.planEnd, 1);
  issues.push({ no: `PR${ymd6(date).slice(0, 4)}-${String(rSeq++).padStart(4, '0')}`, type: '退料', bizType: '余料退库', date, mo: mo.no, line: mo.line, fromWh: edgeWh[mo.line], toWh: 'WH01', picker: pickers[rSeq % 3], status: '已审核', reason: '完工余料（整盘/尾数）退回原材料立体库', lines: ls });
});
// 开工中订单：已领未耗
mos.forEach(mo => { if (mo.status === '开工') ppbomByMo[mo.no].lines.forEach(l => { if (l.issue === '直接领料' && l.consumed > l.picked + l.supp) l.consumed = l.picked + l.supp; }); });

// ---------- 原料批次 & 先进先出分配 ----------
const H_OVERRIDE = { '1.02.0004': 15000, '1.04.0002': 4200, '1.07.0001': 6000, '2.01.0001': 3200000, '2.02.0001': 380000, '1.06.0003': 32, '1.07.0005': 620, '1.03.0002': 14000 };
const plannedNeed = {};
mos.filter(m => !started(m)).forEach(m => ppbomByMo[m.no].lines.forEach(l => { plannedNeed[l.code] = (plannedNeed[l.code] || 0) + l.need; }));
mos.filter(m => m.status === '开工').forEach(m => ppbomByMo[m.no].lines.forEach(l => { if (l.issue === '倒冲') plannedNeed[l.code] = (plannedNeed[l.code] || 0) + Math.max(0, l.need - l.backflush); }));

export const lots = [];
export const bfLots = {}; // 倒冲批次 moNo -> [{code, lots}]
const suppOf = mat => mat.sup === '—' ? (mat.src || '自制') : mat.sup;
const binUsed = new Set();
const takeBin = (rows) => { for (let t = 0; t < 2000; t++) { const r = rows[Math.floor(R() * rows.length)], c = 1 + Math.floor(R() * 12), l = 1 + Math.floor(R() * 6); const id = `WH-A-${String(r).padStart(2, '0')}-${String(c).padStart(2, '0')}-${String(l).padStart(2, '0')}`; if (!binUsed.has(id)) { binUsed.add(id); return id; } } return 'WH-A-01-01-01'; };
const events = {}; // code -> [{date, qty(+consume), ref}]
issues.forEach(d => d.lines.forEach(l => { (events[l.code] = events[l.code] || []).push({ date: d.date, qty: d.type === '退料' ? -l.qty : l.qty, d, l }); }));
mos.forEach(mo => ppbomByMo[mo.no].lines.forEach(l => { if (l.backflush > 0) (events[l.code] = events[l.code] || []).push({ date: mo.status === '开工' ? TODAY : mo.planEnd, qty: l.backflush, bf: mo.no }); }));
const RECV = ['2026-09-26', '2026-10-18', '2026-11-04'];
const lotNo = (code, d, k) => `${code.startsWith('2.') ? 'SB' : 'RB'}${ymd6(d)}-${code.replace(/\./g, '').slice(1)}${'ABCD'[k]}`;
materials.filter(m => m.cat !== '产成品').forEach(mat => {
  const ev = (events[mat.code] || []).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.qty < 0 ? 1 : -1));
  const H = H_OVERRIDE[mat.code] ?? Math.max(mat.safety * (1.4 + R() * 0.9), (plannedNeed[mat.code] || 0) * 1.25);
  const pk = packOf(mat);
  const seg = [0, 0, 0];
  ev.forEach(e => { const k = e.date < RECV[1] ? 0 : e.date < RECV[2] ? 1 : 2; seg[k] += e.qty; });
  seg[2] += H;
  const myLots = [];
  seg.forEach((q, k) => {
    if (q <= 0 && !(k === 2)) return;
    let size = Math.max(q, 0) * (k < 2 ? 1.0 : 1);
    size = pk > 1 ? Math.ceil(size / pk) * pk : roundQ(mat, size);
    if (size <= 0) return;
    const d = addDays(RECV[k], Math.floor(R() * 3));
    const isRaw = !mat.code.startsWith('2.');
    const lot = { lotNo: lotNo(mat.code, d, k), code: mat.code, name: mat.name, spec: mat.spec, unit: mat.unit, supplier: suppOf(mat), recvDate: d, inQty: size, qty: size,
      wh: mat.code === '1.06.0001' || mat.code === '1.06.0003' ? 'WH06' : 'WH01', bin: mat.code === '1.06.0001' || mat.code === '1.06.0003' ? '' : takeBin([1, 2]), dateCode: `${d.slice(2, 4)}${String(Math.ceil(dateDiff(d, '2026-01-01') / 7) + 1).padStart(2, '0')}`,
      iqc: isRaw ? '合格' : '免检(自制)', status: '正常', reel: pk > 1 ? `${Math.round(size / pk)} 盘` : '' };
    myLots.push(lot); lots.push(lot);
  });
  // FIFO 分配：只从收货日期不晚于领用/倒冲日期的批次出库；退料按该订单已领批次的可退余额分摊
  ev.forEach(e => {
    if (e.qty < 0) {
      const issued = [];
      issues.filter(d => d.mo === e.d.mo && (d.type === '领料' || d.type === '补料')).forEach(d => d.lines.filter(x => x.code === mat.code).forEach(x => (x.lots || []).forEach(t => issued.push(t))));
      const remain = {}; issued.forEach(t => { remain[t.lotNo] = (remain[t.lotNo] || 0) + t.qty; });
      const already = {};
      issues.filter(d => d.mo === e.d.mo && d.type === '退料' && d.no !== e.d.no).forEach(d => d.lines.filter(x => x.code === mat.code).forEach(x => (x.lots || []).forEach(t => { already[t.lotNo] = (already[t.lotNo] || 0) + t.qty; })));
      let need = -e.qty; const used = [];
      const order = [...new Set(issued.map(t => t.lotNo))].reverse();
      for (const lotNo of order) {
        if (need <= 0) break;
        const lot = myLots.find(x => x.lotNo === lotNo); if (!lot) continue;
        const take = Math.min(need, Math.max(0, (remain[lotNo] || 0) - (already[lotNo] || 0)));
        if (take <= 0) continue;
        lot.qty = Math.round((lot.qty + take) * 100) / 100; need = Math.round((need - take) * 100) / 100;
        used.push({ lotNo, qty: take, bin: lot.bin });
      }
      if (need > 0) {
        const lot = myLots.filter(x => x.recvDate <= e.date).slice(-1)[0] || myLots[0];
        if (lot) { lot.qty = Math.round((lot.qty + need) * 100) / 100; used.push({ lotNo: lot.lotNo, qty: need, bin: lot.bin }); }
      }
      if (e.l) e.l.lots = used; return;
    }
    let need = e.qty; const used = [];
    const eligible = myLots.filter(lot => lot.recvDate <= e.date);
    for (const lot of eligible) { if (need <= 0) break; if (lot.qty <= 0) continue; const t = Math.min(lot.qty, need); lot.qty = Math.round((lot.qty - t) * 100) / 100; need = Math.round((need - t) * 100) / 100; used.push({ lotNo: lot.lotNo, qty: Math.round(t * 100) / 100, bin: lot.bin }); }
    if (need > 0) {
      let last = eligible.slice(-1)[0];
      if (!last) {
        const d0 = '2026-09-20';
        last = { lotNo: `${mat.code.startsWith('2.') ? 'SB' : 'RB'}${ymd6(d0)}-${mat.code.replace(/\./g, '').slice(1)}O`, code: mat.code, name: mat.name, spec: mat.spec, unit: mat.unit, supplier: suppOf(mat), recvDate: d0, inQty: 0, qty: 0, wh: mat.code === '1.06.0001' || mat.code === '1.06.0003' ? 'WH06' : 'WH01', bin: '', dateCode: '2638', iqc: !mat.code.startsWith('2.') ? '合格' : '免检(自制)', status: '正常', reel: '' };
        myLots.unshift(last); lots.push(last);
      }
      last.inQty = Math.round((last.inQty + need) * 100) / 100;
      used.push({ lotNo: last.lotNo, qty: Math.round(need * 100) / 100, bin: last.bin });
    }
    if (e.l) e.l.lots = used; else if (e.bf) { (bfLots[e.bf] = bfLots[e.bf] || []).push({ code: mat.code, lots: used }); }
  });
});
// 特殊批次：IQC 拒收、待检
lots.push({ lotNo: 'RB261109-020004D', code: '1.02.0004', name: '贴片电容MLCC', spec: '1206 22μF 25V X5R ±20%', unit: 'PCS', supplier: 'V001', recvDate: '2026-11-09', inQty: 20000, qty: 20000, wh: 'WH05', bin: '', dateCode: '2645', iqc: '拒收', status: '冻结-待退供', reel: '10 盘' });
lots.push({ lotNo: 'RB261112-040002D', code: '1.04.0002', name: '32位MCU', spec: 'XM32F030C8T6 48MHz 64KB', unit: 'PCS', supplier: 'V002', recvDate: '2026-11-12', inQty: 2500, qty: 2500, wh: 'WH01', bin: takeBin([1, 2]), dateCode: '2644', iqc: '待检', status: '待检', reel: '10 盘' });
lots.push({ lotNo: 'RB261110-020003D', code: '1.02.0003', name: '贴片电容MLCC', spec: '0805 10μF 25V X5R ±10%', unit: 'PCS', supplier: 'V001', recvDate: '2026-11-10', inQty: 40000, qty: 40000, wh: 'WH01', bin: takeBin([1, 2]), dateCode: '2643', iqc: '让步接收', status: '正常', reel: '10 盘' });
lots.forEach(l => { l.qty = Math.round(l.qty * 100) / 100; });
export const lotByNo = Object.fromEntries(lots.map(l => [l.lotNo, l]));

export const pickDocs = issues.sort((a, b) => a.date < b.date ? 1 : -1).map(d => ({ ...d, lines: d.lines.map(l => ({ ...l, ...pickMat(l.code) })) }));
function pickMat(code) { const m = materialByCode[code]; return { name: m.name, spec: m.spec, unit: m.unit }; }

// 在途采购 / 前段在制（齐套分析用）
export const inTransit = [
  { no: 'PO2611-0018', code: '1.02.0004', qty: 40000, eta: '2026-11-16', src: '晶瓷电子', type: '采购在途' },
  { no: 'PO2611-0021', code: '1.04.0002', qty: 6000, eta: '2026-11-18', src: '东岳半导体', type: '采购在途' },
  { no: 'PO2611-0022', code: '1.07.0001', qty: 30000, eta: '2026-11-14', src: '瑞丰包材', type: '采购在途' },
  { no: 'PO2611-0024', code: '1.06.0003', qty: 50, eta: '2026-11-15', src: '蓝鲸锡材', type: '采购在途' },
  { no: 'FE2611-0031', code: '2.01.0001', qty: 3000000, eta: '2026-11-17', src: '前段烧结车间', type: '自制在制' },
  { no: 'PK2611-0012', code: '2.02.0001', qty: 200000, eta: '2026-11-20', src: '封装车间', type: '自制在制' },
];

// ---------- 生产汇报 ----------
export const reports = [];
const evt = {
  'MO2611-0010|2026-11-11|白班': ['设备故障', 95, 'L2-MNT1', 'L2-MNT1 吸嘴堵塞/真空异常，停机更换吸嘴'],
  'MO2611-0010|2026-11-12|白班': ['设备故障', 48, 'L2-MNT1', 'L2-MNT1 飞达报警 (Feeder 12)，待维修'],
  'MO2611-0011|2026-11-10|夜班': ['欠料停线', 60, 'L3-TAP1', '8mm 纸质载带欠料，等待仓库调拨'],
  'MO2611-0012|2026-11-12|白班': ['设备故障', 120, 'L3-TST2', 'L3-TST2 计划外保养：测试夹具接触不良'],
  'MO2611-0006|2026-11-07|白班': ['品质异常', 35, 'L1-AOI', 'AOI 连锡集中报警，调整钢网擦拭频率'],
  'MO2611-0003|2026-11-03|白班': ['来料不良', 30, 'L2-PRN', 'PCB 沉金面氧化，更换批次'],
  'MO2610-0035|2026-10-17|夜班': ['欠料停线', 45, 'L3-TAP1', '盖带欠料'],
  'MO2610-0032|2026-10-14|白班': ['设备故障', 40, 'L2-RFL', '回流焊炉 7 温区超温报警'],
};
let rpSeq = 1;
const teamsOf = { L1: ['T-S1A', 'T-S1B'], L2: ['T-S2A', 'T-S2B'], L3: ['T-L3A', 'T-L3B'] };
mos.filter(started).forEach(mo => {
  const end = mo.planEnd < TODAY ? mo.planEnd : TODAY;
  const slots = [];
  for (let d = mo.planStart; d <= end; d = addDays(d, 1)) { slots.push([d, '白班']); if (!(d === TODAY)) slots.push([d, '夜班']); }
  if (mo.type === '返工生产') slots.splice(1);
  const w = slots.map(() => 0.75 + R() * 0.5); const sw = w.reduce((a, b) => a + b, 0);
  let left = mo.done, leftBad = mo.bad, cum = 0;
  slots.forEach(([d, sh], k) => {
    const last = k === slots.length - 1;
    const q = last ? left : Math.round(mo.done * w[k] / sw); left -= q;
    const bd = last ? leftBad : Math.min(leftBad, Math.round(mo.bad * w[k] / sw)); leftBad -= bd;
    cum += q;
    const ev = evt[`${mo.no}|${d}|${sh}`];
    const team = teams.find(t => t.code === teamsOf[mo.line][sh === '白班' ? 0 : 1]);
    const stop = ev ? ev[1] : (k === 0 ? 30 + Math.floor(R() * 20) : (R() < 0.18 ? 10 + Math.floor(R() * 20) : 0));
    const hours = mo.type === '返工生产' ? 6 : 11;
    reports.push({
      no: `RP${ymd6(d)}-${String(rpSeq++).padStart(4, '0')}`, date: d, shift: sh, mo: mo.no, product: mo.product, productName: mo.productName, spec: mo.spec, unit: mo.unit, line: mo.line, team: team.name, leader: team.leader,
      qty: q, good: q - bd, bad: bd, cum, planQty: mo.qty, manHours: +(team.members * hours * (0.92 + R() * 0.08)).toFixed(1), machHours: +(mo.devices.length * (hours - stop / 60) * (0.85 + R() * 0.1)).toFixed(1),
      stopMin: stop, stopType: ev ? ev[0] : stop ? (k === 0 ? '换线调机' : '正常汇报') : '正常汇报', device: ev ? ev[2] : '', stopDesc: ev ? ev[3] : (k === 0 && stop ? '换线首件确认' : ''),
      reportType: ev ? ev[0] : '正常汇报', status: d === TODAY ? '已保存' : '已审核',
    });
  });
});
reports.sort((a, b) => { const ka = a.date + (a.shift === '白班' ? '0' : '1'), kb = b.date + (b.shift === '白班' ? '0' : '1'); return ka < kb ? 1 : ka > kb ? -1 : 0; });

// ---------- 生产入库 / 退库 ----------
export const inDocs = [];
let inSeq = 1, oqcSeq = 1;
const fgBin = () => takeBin([3, 4]);
const pushIn = (mo, date, qty, kind) => {
  const bin = kind === '不合格品入库' ? '' : fgBin();
  const doc = { no: `IN${ymd6(date).slice(0, 4)}-${String(inSeq++).padStart(4, '0')}`, date, type: kind, mo: mo.no, product: mo.product, productName: mo.productName, spec: mo.spec, unit: mo.unit, batch: mo.batch, qty,
    wh: kind === '不合格品入库' ? 'WH05' : 'WH04', bin, oqc: kind === '不合格品入库' ? '' : `OQC${ymd6(date).slice(0, 4)}-${String(oqcSeq++).padStart(4, '0')}`, keeper: kind === '不合格品入库' ? '周品管' : '李仓管', status: date === TODAY ? '待审核' : '已审核', line: mo.line,
    note: kind === '不合格品入库' ? 'AOI 判定不良，待返工' : mo.type === '返工生产' ? '返工合格品入库' : '' };
  inDocs.push(doc); if (kind === '不合格品入库') mo.ngInQty += qty; else mo.inQty += qty; return doc;
};
mos.filter(started).forEach(mo => {
  if (mo.no === 'MO2611-0006') { pushIn(mo, '2026-11-08', 2000, '合格品入库'); pushIn(mo, '2026-11-10', mo.good - 2000 - 80 + mo.bad, '合格品入库'); pushIn(mo, '2026-11-10', 80, '不合格品入库'); return; }
  if (mo.no === 'MO2610-0031') { pushIn(mo, '2026-10-16', mo.good - 45 + mo.bad, '合格品入库'); pushIn(mo, '2026-10-16', 45, '不合格品入库'); return; }
  if (mo.status === '开工') { if (mo.done / mo.qty > 0.4) pushIn(mo, TODAY, Math.floor(mo.good * 0.6 / 100) * 100 || mo.good, '合格品入库'); else if (mo.type === '返工生产') pushIn(mo, TODAY, mo.good, '合格品入库'); return; }
  if (mo.qty >= 1000000 || mo.qty >= 5000) { const half = Math.round(mo.good * 0.5 / 1000) * 1000; pushIn(mo, addDays(mo.planEnd, -1), half, '合格品入库'); pushIn(mo, addDays(mo.planEnd, 1) > TODAY ? TODAY : addDays(mo.planEnd, 1), mo.good - half, '合格品入库'); }
  else pushIn(mo, addDays(mo.planEnd, 1) > TODAY ? TODAY : addDays(mo.planEnd, 1), mo.good, '合格品入库');
});
export const retDocs = [
  { no: 'RT2611-0001', date: '2026-11-06', mo: 'MO2611-0002', product: '3.01.0002', qty: 30, unit: 'PCS', reason: '入库抽检发现外箱批次标签错误，退回线边重贴', from: 'WH04', to: 'WH02', status: '已审核', srcIn: '' },
  { no: 'RT2611-0002', date: '2026-11-11', mo: 'MO2611-0008', product: '3.03.0001', qty: 3000, unit: 'PCS', reason: 'MSL3 烘烤记录缺失，退库复烤后重新入库', from: 'WH04', to: 'WH07', status: '已审核', srcIn: '' },
];
retDocs.forEach(r => { const mo = moByNo[r.mo]; r.batch = mo.batch; r.productName = mo.productName; r.spec = mo.spec; const src = inDocs.find(d => d.mo === r.mo && d.type === '合格品入库'); r.srcIn = src.no; r.bin = src.bin; mo.inQty -= r.qty; });

// ---------- 销售订单 & 出货 ----------
const soMap = {};
mos.filter(m => m.so !== '—').forEach(m => {
  const so = soMap[m.so] = soMap[m.so] || { no: m.so, cust: m.cust, custName: m.custName, date: addDays(m.createDate, -3), sales: pick(['郭销售', '唐销售', '徐销售']), lines: [], currency: 'CNY' };
  let ln = so.lines.find(l => l.product === m.product);
  if (!ln) { ln = { product: m.product, name: m.productName, spec: m.spec, unit: m.unit, qty: 0, price: +(materialByCode[m.product].price * (1.18 + R() * 0.12)).toFixed(m.isPCBA ? 2 : 4), delivery: addDays(m.planEnd, 3), mos: [] }; so.lines.push(ln); }
  ln.qty += m.qty; ln.mos.push(m.no);
});
export const shipments = [];
let dnSeq = 1;
mos.filter(m => m.so !== '—' && ['完工', '结案'].includes(m.status)).forEach(m => {
  const so = soMap[m.so];
  const ratio = m.status === '结案' ? 1 : (m.no === 'MO2611-0008' ? 0 : 0.5);
  if (!ratio) return;
  const q = ratio === 1 ? m.inQty : (m.isPCBA ? Math.floor(m.inQty * ratio / 50) * 50 : Math.floor(m.inQty * ratio / 4000) * 4000);
  const date = ratio === 1 ? addDays(m.planEnd, 3) : addDays(m.planEnd, 2) > TODAY ? TODAY : addDays(m.planEnd, 2);
  shipments.push({ no: `DN${ymd6(date).slice(0, 4)}-${String(dnSeq++).padStart(4, '0')}`, date, so: so.no, cust: so.cust, custName: so.custName, mo: m.no, batch: m.batch, product: m.product, productName: m.productName, spec: m.spec, unit: m.unit, qty: q,
    carrier: pick(['顺丰速运', '德邦物流', '客户自提']), track: 'SF' + Math.floor(1e11 + R() * 9e11), status: '已签收' });
  m.shipQty += q;
});
export const salesOrders = Object.values(soMap).map(so => {
  const qty = so.lines.reduce((a, l) => a + l.qty, 0); const amount = so.lines.reduce((a, l) => a + l.qty * l.price, 0);
  const shipped = shipments.filter(s => s.so === so.no).reduce((a, s) => a + s.qty, 0);
  so.lines.forEach(l => { l.shipped = shipments.filter(s => s.so === so.no && s.product === l.product).reduce((a, s) => a + s.qty, 0); l.amount = l.qty * l.price; });
  const allMoClosed = so.lines.every(l => l.mos.every(n => moByNo[n].status === '结案'));
  const status = allMoClosed && shipped >= qty ? '已关闭' : shipped > 0 ? '部分出货' : so.lines.some(l => l.mos.some(n => started(moByNo[n]))) ? '生产中' : '已审核';
  const delivery = so.lines.map(l => l.delivery).sort()[0];
  return { ...so, qty, amount, shipped, status, delivery, risk: status !== '已关闭' && dateDiff(delivery, TODAY) <= 3 ? '交期紧' : '' };
}).sort((a, b) => a.no < b.no ? 1 : -1);
export const soByNo = Object.fromEntries(salesOrders.map(s => [s.no, s]));

// 出货挂到对应的合格入库单（按日期与剩余数量分摊）
(() => {
  const left = {};
  inDocs.filter(d => d.type === '合格品入库').forEach(d => { left[d.no] = d.qty; });
  retDocs.forEach(r => { if (left[r.srcIn] != null) left[r.srcIn] -= r.qty; });
  const insOf = mo => inDocs.filter(d => d.mo === mo && d.type === '合格品入库').sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.no < b.no ? -1 : 1);
  shipments.forEach(s => {
    let need = s.qty;
    for (const d of insOf(s.mo)) {
      if (need <= 0) break;
      const take = Math.min(Math.max(0, left[d.no] || 0), need);
      if (!take) continue;
      if (!s.srcIn) s.srcIn = d.no;
      left[d.no] -= take; need -= take;
    }
  });
})();

// ---------- 成品/不良品库存 ----------
export const fgStock = [];
inDocs.forEach(d => {
  const mo = moByNo[d.mo];
  let qty = d.qty;
  const shipped = shipments.filter(s => s.mo === d.mo).reduce((a, s) => a + s.qty, 0);
  const prior = inDocs.filter(x => x.mo === d.mo && x.type === d.type && x.no < d.no).reduce((a, x) => a + x.qty, 0);
  if (d.type === '合格品入库') qty = Math.max(0, d.qty - Math.max(0, shipped - prior));
  const rt = retDocs.filter(r => r.srcIn === d.no).reduce((a, r) => a + r.qty, 0); qty -= rt;
  if (d.type === '不合格品入库' && moByNo[mo.no === 'MO2611-0006' ? 'MO2611-0019' : 'MO2610-0046']) { const rw = mo.no === 'MO2611-0006' ? moByNo['MO2611-0019'] : moByNo['MO2610-0046']; qty = Math.max(0, d.qty - (rw.status === '结案' ? d.qty : 60)); }
  if (qty <= 0) return;
  fgStock.push({ lotNo: d.batch, code: d.product, name: d.productName, spec: d.spec, unit: d.unit, qty, wh: d.wh, bin: d.bin, inDoc: d.no, mo: d.mo, recvDate: d.date, kind: d.type === '不合格品入库' ? '不合格品' : '合格品', status: d.type === '不合格品入库' ? '待返工' : d.status === '待审核' ? '待上架' : '正常' });
});

export const DOC_SUMMARY = () => ({ mos: mos.length, picks: pickDocs.length, reports: reports.length, inDocs: inDocs.length, lots: lots.length, shipments: shipments.length, so: salesOrders.length });
export { packOf, workcenters };
