// 仓储库存（批次级 + 物料汇总级）、库位占用、齐套分析 —— 【演示数据】
import { materials, materialByCode, warehouses, TODAY, dateDiff } from './base.js';
import { lots, fgStock, mos, ppbomByMo, inTransit, moByNo } from './production.js';

const whName = Object.fromEntries(warehouses.map(w => [w.code, w.name]));
// 批次级库存（原材料/半成品批次 + 成品/不良品批次）
export const stockLots = [
  ...lots.filter(l => l.qty > 0).map(l => ({ lotNo: l.lotNo, code: l.code, qty: l.qty, wh: l.wh, whName: whName[l.wh], bin: l.bin, recvDate: l.recvDate, supplier: l.supplier, dateCode: l.dateCode, iqc: l.iqc, status: l.status, kind: materialByCode[l.code].cat })),
  ...fgStock.map(f => ({ lotNo: f.lotNo, code: f.code, qty: f.qty, wh: f.wh, whName: whName[f.wh], bin: f.bin, recvDate: f.recvDate, supplier: '自制', dateCode: '', iqc: f.kind === '合格品' ? 'OQC合格' : 'AOI不良', status: f.status, kind: '产成品', mo: f.mo, inDoc: f.inDoc })),
].map(x => { const m = materialByCode[x.code]; return { ...x, name: m.name, spec: m.spec, unit: m.unit, pkg: m.pkg, amount: x.qty * m.price, age: dateDiff(TODAY, x.recvDate) }; });

// 部分贴片物料存放在智能料塔（RC-柜号-槽位），点击库位可联动 highlightSlot
{
  const samples = ['RC-01-08', 'RC-01-21', 'RC-02-05'];
  let i = 0;
  for (const x of stockLots) {
    if (i >= samples.length) break;
    if (x.bin && x.status === '正常' && /电容|电阻|电感/.test(x.name || '')) { x.bin = samples[i++]; }
  }
}

const usable = x => x.status === '正常';
// 物料汇总级库存（外壳 stockAlerts 读取：name/spec/qty/safety/bin）
export const inventory = materials.map(m => {
  const ls = stockLots.filter(x => x.code === m.code);
  const qty = ls.filter(usable).reduce((a, x) => a + x.qty, 0);
  const frozen = ls.filter(x => !usable(x) && x.status !== '待上架').reduce((a, x) => a + x.qty, 0);
  const pending = ls.filter(x => x.status === '待上架').reduce((a, x) => a + x.qty, 0);
  const main = ls.filter(x => x.bin).sort((a, b) => b.qty - a.qty)[0];
  const transit = inTransit.filter(t => t.code === m.code).reduce((a, t) => a + t.qty, 0);
  const ratio = m.safety ? qty / m.safety : 9;
  return { code: m.code, name: m.name, spec: m.spec, pkg: m.pkg, cat: m.cat, group: m.group, unit: m.unit, qty: Math.round(qty * 100) / 100, frozen, pending, safety: m.safety, transit, bin: main ? main.bin : '', wh: main ? main.wh : (ls[0] ? ls[0].wh : ''), lots: ls.length,
    amount: qty * m.price, price: m.price, level: qty <= 0 ? '缺货' : ratio < 1 ? '低于安全库存' : ratio > 6 ? '超储' : '正常', oldest: ls.length ? Math.max(...ls.map(x => x.age)) : 0 };
}).filter(x => x.lots > 0 || x.cat !== '产成品');

// 库位占用（WH-A 4排×12列×6层）
export const binMap = {};
stockLots.forEach(x => { if (x.bin) (binMap[x.bin] = binMap[x.bin] || []).push(x); });

// 齐套分析：按计划开工顺序（或优先级）对未开工订单逐单分配可用库存
export function runKitting(order = 'date') {
  const avail = {};
  stockLots.filter(x => usable(x) && x.kind !== '产成品').forEach(x => { avail[x.code] = (avail[x.code] || 0) + x.qty; });
  const transitPool = {};
  inTransit.slice().sort((a, b) => a.eta < b.eta ? -1 : a.eta > b.eta ? 1 : a.no < b.no ? -1 : 1).forEach(t => { (transitPool[t.code] = transitPool[t.code] || []).push({ ...t, remain: t.qty }); });
  mos.filter(m => m.status === '开工').forEach(m => ppbomByMo[m.no].lines.forEach(l => { if (l.issue === '倒冲') avail[l.code] = (avail[l.code] || 0) - Math.max(0, l.need - l.backflush); }));
  const pr = { 高: 0, 中: 1, 低: 2 };
  const list = mos.filter(m => ['计划', '计划确认', '下达'].includes(m.status)).sort((a, b) => order === 'priority' ? (pr[a.priority] - pr[b.priority]) || (a.planStart < b.planStart ? -1 : 1) : (a.planStart < b.planStart ? -1 : a.planStart > b.planStart ? 1 : a.no < b.no ? -1 : 1));
  return list.map(m => {
    const lines = ppbomByMo[m.no].lines.map(l => {
      const before = Math.max(0, avail[l.code] || 0);
      const alloc = Math.min(before, l.need); avail[l.code] = (avail[l.code] || 0) - alloc;
      const short = Math.max(0, Math.round((l.need - alloc) * 100) / 100);
      const tr = transitPool[l.code] || [];
      let rest = short, eta = '', used = [];
      for (const t of tr) {
        if (rest <= 0) break;
        const take = Math.min(t.remain, rest);
        if (take <= 0) continue;
        t.remain = Math.round((t.remain - take) * 100) / 100;
        rest = Math.round((rest - take) * 100) / 100;
        used.push({ ...t, take });
        eta = t.eta;
      }
      return { ...l, before, alloc, short, transit: inTransit.filter(t => t.code === l.code), transitUsed: used, eta: short > 0 && rest <= 0 ? eta : '' };
    });
    const ok = lines.filter(l => l.short <= 0).length;
    const sets = Math.min(m.qty, ...lines.map(l => Math.floor(l.alloc / (l.unitQty * (1 + l.loss)) + 1e-6)));
    const shortLines = lines.filter(l => l.short > 0);
    const noEta = shortLines.some(l => !l.eta);
    return { mo: m, lines, rate: 100 * ok / lines.length, sets, status: !shortLines.length ? '齐套' : sets > 0 ? '部分齐套' : '缺料', shortLines,
      kitDate: !shortLines.length ? '已齐套' : noEta ? '在途不足/待采购' : shortLines.map(l => l.eta).sort().slice(-1)[0] };
  });
}
