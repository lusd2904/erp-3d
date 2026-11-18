// 质量检验：IQC 来料 / IPQC 过程（首件、巡检、AOI、测试分选）/ OQC 出货 —— 全部为【演示数据】
import { TODAY, rng, addDays, ymd6, materialByCode, suppliers } from './base.js';
import { mos, lots, inDocs, reports } from './production.js';

const R = rng(5150);
const supName = Object.fromEntries(suppliers.map(s => [s.code, s.short]));
const sampleSize = n => n <= 1200 ? 80 : n <= 3200 ? 125 : n <= 10000 ? 200 : n <= 35000 ? 315 : n <= 150000 ? 500 : n <= 500000 ? 800 : 1250; // GB/T 2828.1 一般检验水平II 一次抽样
const inspectors = ['周雅琴', '韩品检', '冯品检', '曹品检'];

const iqcItems = (mat, bad) => {
  const g = mat.group;
  const base = [{ item: '外观/标签', std: '无破损、标签与实物一致、RoHS 标识', val: '符合', ok: true }, { item: '包装', std: mat.packing, val: '符合', ok: true }];
  if (g === '电阻') base.push({ item: '阻值', std: mat.spec.split(' ')[1] + ' ' + mat.spec.split(' ')[2], val: `偏差 ${(R() * 0.6).toFixed(2)}%`, ok: true });
  if (g === '电容') base.push({ item: '容值/损耗角', std: mat.spec.split(' ').slice(1, 3).join(' ') + ' DF≤2.5%', val: bad ? '容值 -24.6% 超差' : `容值偏差 ${(R() * 6 - 3).toFixed(1)}% DF ${(R() * 1.5 + 0.5).toFixed(2)}%`, ok: !bad });
  if (g === '电感') base.push({ item: '感值/DCR', std: mat.spec.split(' ')[1] + ' ±20%', val: `${(R() * 10 - 5).toFixed(1)}%`, ok: true });
  if (g === 'IC' || g === '分立器件') base.push({ item: 'MSL 湿敏/真空包装', std: (mat.msl || '') + ' HIC 湿度卡 <10%', val: '5%', ok: true }, { item: '电性能抽测', std: '规格书', val: '符合', ok: true });
  if (g === 'PCB') { const thick = (mat.spec.match(/(\d+(?:\.\d+)?)mm/) || [, '1.6'])[1]; base.push({ item: '板厚/阻抗', std: mat.spec.split(' ')[2], val: `${thick}mm / 50.6Ω`, ok: true }, { item: '可焊性', std: '浸锡≥95%', val: '98%', ok: true }); }
  if (g === '辅料' || g === '封装材料') base.push({ item: '有效期/冷链', std: mat.shelf || '—', val: '温度记录完整', ok: true });
  if (g === '包材') base.push({ item: '尺寸/剥离力', std: 'EIA-481', val: '0.32N', ok: true });
  base.push({ item: '可焊性/RoHS', std: 'XRF 抽测 Pb<1000ppm', val: 'ND', ok: true });
  return base;
};
let s1 = 1;
export const iqc = lots.filter(l => !l.code.startsWith('2.')).map(l => {
  const mat = materialByCode[l.code];
  const rej = l.iqc === '拒收', pend = l.iqc === '待检', con = l.iqc === '让步接收';
  const n = sampleSize(l.inQty * (mat.unit === 'PCS' ? 1 : 1));
  const defects = rej ? 9 : con ? 2 : (R() < 0.15 ? 1 : 0);
  return { no: `IQC${ymd6(l.recvDate).slice(0, 4)}-${String(s1++).padStart(4, '0')}`, date: l.recvDate, lotNo: l.lotNo, code: l.code, name: mat.name, spec: mat.spec, supplier: supName[l.supplier] || l.supplier,
    qty: l.inQty, unit: mat.unit, aql: 'AQL 0.65', sample: pend ? 0 : Math.min(n, l.inQty), defects: pend ? 0 : defects, result: l.iqc, inspector: inspectors[s1 % 4],
    items: iqcItems(mat, rej).map(x => pend ? { ...x, val: '待检', ok: null } : x), note: rej ? '容值超差，整批拒收退供应商，已开 SCAR-2611-003' : con ? '外箱轻微压痕，功能正常，经 MRB 让步接收' : '' };
}).sort((a, b) => a.date < b.date ? 1 : -1);
lots.forEach(l => { const q = iqc.find(x => x.lotNo === l.lotNo); if (q) l.iqcNo = q.no; });

// AOI 不良类型（SMT）与测试分选不良（L3）
export const AOI_TYPES = ['少锡', '连锡', '偏移', '立碑', '缺件', '极性反', '虚焊', '锡珠', '异物'];
const AOI_W = [0.24, 0.2, 0.15, 0.1, 0.09, 0.05, 0.08, 0.06, 0.03];
const SORT_TYPES = { '3.02.0001': ['容值超差', 'DF超差', '绝缘电阻低', '外观崩瓷', '端头不良'], '3.03.0001': ['开短路', 'Vout超差', '静态电流超差', '印字不良', '引脚共面'], '3.04.0001': ['感值超差', 'DCR超差', '外观破损', '电极氧化'] };
const posPool = ['C12', 'C7', 'R3', 'U1', 'Q2', 'L1', 'C33', 'R14', 'C21', 'RS1', 'C5', 'R9'];
export const aoiRecords = []; export const sortRecords = []; export const ipqc = [];
let s2 = 1, s3 = 1;
mos.filter(m => m.done > 0).forEach(mo => {
  const days = reports.filter(r => r.mo === mo.no);
  if (mo.isPCBA) {
    const rate = mo.no === 'MO2611-0006' ? 0.032 : mo.type === '返工生产' ? 0.05 : 0.006 + R() * 0.006;
    const total = Math.round(mo.done * rate);
    AOI_TYPES.forEach((t, k) => {
      let w = AOI_W[k]; if (mo.no === 'MO2611-0006' && t === '连锡') w = 0.55; if (mo.line === 'L2' && (t === '偏移' || t === '缺件') && mo.status === '开工') w *= 2.6;
      const c = Math.round(total * w * (0.7 + R() * 0.6)); if (!c) return;
      aoiRecords.push({ mo: mo.no, line: mo.line, device: `${mo.line}-AOI`, date: days.length ? days[Math.floor(R() * days.length)].date : mo.planStart, type: t, count: c, pos: posPool[Math.floor(R() * posPool.length)], falseCall: Math.round(c * (0.08 + R() * 0.14)), repaired: Math.round(c * 0.92) });
    });
  } else {
    const types = SORT_TYPES[mo.product];
    const w = types.map((_, k) => ([0.38, 0.27, 0.17, 0.11, 0.07][k] || 0.07) * (0.8 + R() * 0.4));
    const sw = w.reduce((a, b) => a + b, 0);
    let left = mo.bad;
    types.forEach((t, k) => { const c = k === types.length - 1 ? left : Math.round(mo.bad * w[k] / sw); left -= c; if (c) sortRecords.push({ mo: mo.no, line: 'L3', device: mo.devices[0], type: t, count: c, bin: `BIN${k + 2}` }); });
  }
  ipqc.push({ no: `IPQC${ymd6(mo.planStart).slice(0, 4)}-${String(s2++).padStart(4, '0')}`, type: '首件检验', date: mo.planStart, mo: mo.no, line: mo.line, device: mo.devices[0], product: mo.productName, spec: mo.spec,
    items: mo.isPCBA ? ['钢网/锡膏型号核对', '首件 BOM 位号核对(LCR 实测)', '炉温曲线 PROFILE', 'AOI 程序版本', '极性/方向'] : ['测试程序版本', '分档标准', '编带方向/极性', '剥离力测试', '标签/LOT 核对'], result: '合格', inspector: inspectors[s2 % 4] });
  [...new Set(days.map(d => d.date))].forEach(d => {
    const bad = (mo.no === 'MO2611-0006' && d === '2026-11-07') || (mo.no === 'MO2611-0010' && d === '2026-11-11');
    ipqc.push({ no: `IPQC${ymd6(d).slice(0, 4)}-${String(s2++).padStart(4, '0')}`, type: '巡检', date: d, mo: mo.no, line: mo.line, device: bad && mo.no === 'MO2611-0010' ? 'L2-MNT1' : mo.devices[Math.floor(R() * mo.devices.length)], product: mo.productName, spec: mo.spec,
      items: mo.isPCBA ? ['锡膏回温/搅拌记录', 'SPI 体积 CPK', '炉温实测', '静电/温湿度'] : ['分选机校准', '编带外观', '湿度柜记录'], result: bad ? '不合格' : '合格', inspector: inspectors[s2 % 4],
      note: bad ? (mo.no === 'MO2611-0006' ? '连锡集中于 U1 引脚，已调整钢网擦拭频率并开 8D' : 'L2-MNT1 抛料率 1.8% 超标，通知设备维修') : '' });
  });
});
ipqc.sort((a, b) => a.date < b.date ? 1 : -1);

export const oqc = inDocs.filter(d => d.oqc).map(d => {
  const n = sampleSize(d.qty);
  return { no: d.oqc, date: d.date, inDoc: d.no, mo: d.mo, batch: d.batch, product: d.productName, spec: d.spec, qty: d.qty, unit: d.unit, aql: d.unit === 'PCS' && d.qty > 100000 ? 'AQL 0.4' : 'AQL 0.65', sample: Math.min(n, d.qty), defects: R() < 0.2 ? 1 : 0,
    items: ['外观', '电性能复测', '包装/标签', '可靠性(按批抽)'], result: d.status === '待审核' ? '检验中' : '合格', inspector: inspectors[Math.floor(R() * 4)] };
}).sort((a, b) => a.date < b.date ? 1 : -1);
inDocs.forEach(d => { const q = oqc.find(x => x.no === d.oqc); d.oqcResult = q ? q.result : '—'; });

// 质量 KPI
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
export function aoiPareto(filter = () => true) {
  const m = {}; aoiRecords.filter(filter).forEach(r => { m[r.type] = (m[r.type] || 0) + r.count; });
  const arr = Object.entries(m).sort((a, b) => b[1] - a[1]); const tot = sum(arr, x => x[1]); let c = 0;
  return arr.map(([type, count]) => { c += count; return { type, count, cum: tot ? c / tot : 0 }; });
}
export function fpyTrend() {
  const days = []; for (let i = 9; i >= 0; i--) days.push(addDays(TODAY, -i));
  const lines = ['L1', 'L2', 'L3'];
  return { days, series: lines.map(L => ({ line: L, data: days.map(d => { const rs = reports.filter(r => r.line === L && r.date === d); const q = sum(rs, r => r.qty); if (!q) return null; const aoi = L === 'L3' ? 0 : sum(aoiRecords.filter(a => a.line === L && a.date === d), a => a.count - a.falseCall); return +(100 * (1 - (sum(rs, r => r.bad) + aoi * 0.3) / q)).toFixed(2); }) })) };
}
export const qualityKpi = () => {
  const done = iqc.filter(x => x.result !== '待检');
  const smtDone = sum(mos.filter(m => m.isPCBA), m => m.done); const aoiNg = sum(aoiRecords, a => a.count - a.falseCall);
  return {
    iqcRate: 100 * done.filter(x => x.result === '合格' || x.result === '让步接收').length / done.length,
    iqcLots: done.length, iqcRej: done.filter(x => x.result === '拒收').length,
    aoiFpy: 100 * (1 - aoiNg / smtDone), aoiNg, falseCall: 100 * sum(aoiRecords, a => a.falseCall) / Math.max(1, sum(aoiRecords, a => a.count)),
    ipqcRate: 100 * ipqc.filter(x => x.result === '合格').length / ipqc.length,
    oqcRate: 100 * oqc.filter(x => x.result === '合格').length / Math.max(1, oqc.filter(x => x.result !== '检验中').length), oqcLots: oqc.length,
  };
};
