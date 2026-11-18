// 追溯：原料批次→领料→生产订单→设备→检验→入库→出货（正向/反向）—— 【演示数据】
import { materialByCode } from './base.js';
import { mos, moByNo, pickDocs, bfLots, lotByNo, reports, inDocs, retDocs, shipments, salesOrders } from './production.js';
import { iqc, ipqc, oqc, aoiRecords, sortRecords } from './quality.js';

export const traceSamples = [
  { q: 'PB261106-L1-0006', label: '成品批次 · PCBA 电源板（含返工）' },
  { q: 'PWR261110L100368', label: 'PCBA 序列号' },
  { q: 'PB261107-L3-0008', label: '成品批次 · XCP3406 IC' },
  { q: 'MO2611-0010', label: '生产订单 · L2 故障停线' },
  { q: 'RB261104-010001C', label: '原料批次（反向追溯）' },
];

export function resolve(q) {
  q = String(Array.isArray(q) ? (q[0] || '') : (q || '')).trim().toUpperCase();
  if (!q) return null;
  if (moByNo[q]) return { kind: '生产订单', key: q, mos: [q] };
  const byBatch = mos.find(m => m.batch === q); if (byBatch) return { kind: '生产批次', key: q, mos: [byBatch.no] };
  const sn = mos.find(m => m.snPrefix && q.startsWith(m.snPrefix) && /^\d{5}$/.test(q.slice(m.snPrefix.length)));
  if (sn) { const n = +q.slice(sn.snPrefix.length); if (n >= 1 && n <= sn.done) return { kind: '产品序列号', key: q, mos: [sn.no], snNo: n }; return { kind: '产品序列号', key: q, mos: [], err: `序列号流水 ${n} 超出该订单已完工数量 ${sn.done}` }; }
  const lot = lotByNo[q];
  if (lot) { const used = new Set(); pickDocs.forEach(d => d.lines.forEach(l => (l.lots || []).forEach(x => { if (x.lotNo === q && d.type !== '退料') used.add(d.mo); }))); Object.entries(bfLots).forEach(([mo, arr]) => arr.forEach(a => a.lots.forEach(x => { if (x.lotNo === q) used.add(mo); }))); return { kind: '原料批次', key: q, mos: [...used], lot }; }
  const dn = shipments.find(s => s.no === q); if (dn) return { kind: '出货单', key: q, mos: [dn.mo] };
  return null;
}

export function chain(moNo) {
  const mo = moByNo[moNo];
  const picks = pickDocs.filter(d => d.mo === moNo);
  const lotMap = {};
  picks.forEach(d => d.lines.forEach(l => (l.lots || []).forEach(x => { const k = x.lotNo; lotMap[k] = lotMap[k] || { lotNo: k, code: l.code, qty: 0, docs: new Set() }; lotMap[k].qty += d.type === '退料' ? -x.qty : x.qty; lotMap[k].docs.add(d.no); })));
  (bfLots[moNo] || []).forEach(a => a.lots.forEach(x => { lotMap[x.lotNo] = lotMap[x.lotNo] || { lotNo: x.lotNo, code: a.code, qty: 0, docs: new Set(['倒冲']) }; lotMap[x.lotNo].qty += x.qty; }));
  const rawLots = Object.values(lotMap).map(x => { const lot = lotByNo[x.lotNo]; const m = materialByCode[x.code]; const q = iqc.find(i => i.lotNo === x.lotNo); return { ...x, docs: [...x.docs], name: m.name, spec: m.spec, unit: m.unit, supplier: lot ? lot.supplier : '', iqc: q ? q.no : '自制免检', iqcResult: q ? q.result : '免检', recvDate: lot ? lot.recvDate : '' }; });
  const rework = mos.filter(m => m.src === moNo && m.type === '返工生产');
  const src = mo.type === '返工生产' ? moByNo[mo.src] : null;
  return {
    mo, rawLots, picks, devices: mo.devices, reports: reports.filter(r => r.mo === moNo),
    inspections: [...ipqc.filter(x => x.mo === moNo).map(x => ({ no: x.no, kind: x.type, result: x.result, date: x.date, device: x.device })), ...oqc.filter(x => x.mo === moNo).map(x => ({ no: x.no, kind: 'OQC出货检验', result: x.result, date: x.date }))],
    aoi: aoiRecords.filter(a => a.mo === moNo), sort: sortRecords.filter(a => a.mo === moNo),
    inDocs: inDocs.filter(d => d.mo === moNo), retDocs: retDocs.filter(d => d.mo === moNo), shipments: shipments.filter(s => s.mo === moNo),
    so: salesOrders.find(s => s.no === mo.so) || null, rework, src,
  };
}
