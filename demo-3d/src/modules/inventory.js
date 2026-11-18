// 仓储库存：物料汇总/批次明细、安全库存预警、立体库库位图（点击调用 ctx.locateBin） —— 演示数据
import { page, kpis, tabs, filterBar, table, drawer, tag, bar, navLink, binLink, desc, fmt, esc, match, axisStyle, tip, legend, getParams, el } from './_ui.js';
import { inventory, stockLots, binMap, pickDocs, inTransit, warehouses, materialByCode, suppliers } from '../data/mock/index.js';
import { warehouse as WH } from '../data/plant.js';

export const meta = { id: 'inventory', title: '仓储库存', group: '仓储物流', icon: 'stock' };
const css = `.bm-inventory .lay{display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:12px;align-items:stretch;flex:1;min-height:0}
.bm-inventory .lay>.main{min-height:0;display:flex;flex-direction:column;overflow:hidden}
.bm-inventory .side{min-height:0;display:flex;flex-direction:column;gap:10px;overflow:hidden}
.bm-inventory .rk{flex:none}
.bm-inventory .rack{display:grid;grid-template-columns:22px repeat(12,minmax(0,1fr));gap:3px;font-size:10px;color:var(--tx3);flex:none}
.bm-inventory .rack .lv{display:grid;place-items:center;font-family:var(--mono)}
.bm-inventory .cell{height:22px;border-radius:3px;background:#f1f4f8;border:1px solid #e3e8f0;cursor:pointer;transition:transform .12s, box-shadow .12s;position:relative}
.bm-inventory .cell:hover{transform:scale(1.12);box-shadow:0 2px 8px rgba(31,58,105,.25);z-index:2}
.bm-inventory .cell.raw{background:#cfe3ff;border-color:#9cc3fb}.bm-inventory .cell.semi{background:#c9f0f5;border-color:#8bdbe6}.bm-inventory .cell.fg{background:#c8f0da;border-color:#86d9ad}
.bm-inventory .cell.warn{background:#ffe3b3;border-color:#f5b54a}.bm-inventory .cell.frz{background:#ffd3cf;border-color:#f39a92}.bm-inventory .cell.sel{outline:2px solid var(--p);outline-offset:1px}
.bm-inventory .rk-lg{display:flex;gap:6px 10px;flex-wrap:wrap;font-size:11.5px;color:var(--tx2);margin-top:8px;flex:none}.bm-inventory .rk-lg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}
.bm-inventory .binfo{margin-top:8px;font-size:12px;min-height:48px;flex:none}
.bm-inventory .stk{flex:1;min-height:132px;display:flex;flex-direction:column;overflow:hidden}
.bm-inventory .ch{flex:1;min-height:120px;height:auto}`;
const whN = Object.fromEntries(warehouses.map(w => [w.code, w.name]));
const supN = Object.fromEntries(suppliers.map(s => [s.code, s.short]));
const LV = { 缺货: 'danger', 低于安全库存: 'warning', 超储: 'purple', 正常: 'success' };
const dec = u => (u === '罐' || u === 'kg' || u === '片') ? 2 : 0;

export function mount(container, ctx, extra) {
  const P = page(container, ctx, { id: 'inventory', icon: 'stock', title: '仓储库存', crumb: ['供应链', '库存管理', '即时库存'], desc: '立体库 WH-A：4 排 × 12 列 × 6 层，双巷道堆垛机', styleId: 'bm-css-inventory', css });
  const params = getParams(ctx, extra);
  P.action('<button class="bm-btn">库存盘点</button>', () => P.toast('已生成 11 月循环盘点任务 3 项'));
  const amt = inventory.reduce((a, x) => a + x.amount, 0) + stockLots.filter(x => x.kind === '产成品').reduce((a, x) => a + x.amount, 0) * 0;
  const used = Object.keys(binMap).length, total = WH.rows * WH.cols * WH.levels;
  const warn = inventory.filter(x => x.level === '低于安全库存' || x.level === '缺货');
  P.body.insertAdjacentHTML('beforeend', kpis([
    { label: '库存金额', value: fmt(amt / 1e4, 1), unit: '万元', icon: 'report', sub: `批次 ${stockLots.length} 个` },
    { label: '在库物料', value: inventory.filter(x => x.qty > 0).length, unit: 'SKU', icon: 'box', color: '#0fb5c9', sub: '原材料 / 半成品 / 产成品' },
    { label: '安全库存预警', value: warn.length, unit: '项', icon: 'warn', color: '#f04438', sub: warn.slice(0, 2).map(x => x.spec.split(' ').slice(0, 2).join(' ')).join('、') },
    { label: '冻结 / 待检批次', value: stockLots.filter(x => ['冻结-待退供', '待检', '待返工', '待上架'].includes(x.status)).length, unit: '批', icon: 'quality', color: '#f5a623', sub: 'IQC 拒收 / 待检 / 待返工 / 待上架' },
    { label: '立体库库位占用', value: (100 * used / total).toFixed(1), unit: '%', icon: 'stock', color: '#16b364', sub: `${used} / ${total} 库位` },
    { label: '在途采购', value: inTransit.length, unit: '单', icon: 'clock', color: '#7a5af8', sub: '含前段自制在制' },
  ]));
  const lay = el('<div class="lay bm-split"><div class="bm-card main"></div><div class="side"><div class="bm-card rk"><div class="bm-ct">立体库库位图<span class="ex">点击库位 → 三维定位</span></div><div class="segw"></div><div class="rack"></div><div class="rk-lg"><span><i style="background:#cfe3ff"></i>原材料</span><span><i style="background:#c9f0f5"></i>半成品</span><span><i style="background:#c8f0da"></i>产成品</span><span><i style="background:#ffe3b3"></i>低于安全库存</span><span><i style="background:#ffd3cf"></i>冻结/待检</span><span><i style="background:#f1f4f8;border:1px solid #e3e8f0"></i>空</span></div><div class="binfo bm-note">将鼠标移到库位上查看存放物料。</div></div><div class="bm-card stk"><div class="bm-ct">库存结构<span class="ex">按物料分组金额</span></div><div class="ch c1"></div></div></div></div>');
  P.body.appendChild(lay);
  const main = lay.querySelector('.main');
  const st = { tab: params.tab || 'all', q: '', wh: '' };
  const cnt = f => inventory.filter(f).length;
  main.appendChild(tabs([{ key: 'all', label: '全部', count: inventory.length }, { key: '原材料', label: '原材料', count: cnt(x => x.cat === '原材料') }, { key: '半成品', label: '半成品', count: cnt(x => x.cat === '半成品') }, { key: '产成品', label: '产成品', count: cnt(x => x.cat === '产成品') }, { key: 'warn', label: '预警', count: warn.length }], st.tab, k => { st.tab = k; apply(); }));
  const fb = filterBar([{ key: 'q', type: 'search', placeholder: '物料编码 / 名称 / 规格 / 封装' }, { key: 'wh', type: 'select', label: '仓库', options: warehouses.map(w => ({ v: w.code, l: w.name })) }], v => { Object.assign(st, v); apply(); });
  main.appendChild(fb);
  const t = table({ fill: true, rowKey: 'code', pageSize: 12, onRow: r => open(r), columns: [
    { title: '物料编码', render: r => `<span class="bm-mono">${r.code}</span>`, sort: true, sortVal: r => r.code },
    { title: '物料名称 / 规格', render: r => `<div>${esc(r.name)} ${tag(r.cat, r.cat === '原材料' ? 'info' : r.cat === '半成品' ? 'cyan' : 'success')}</div><div class="mut" style="font-size:11.5px">${esc(r.spec)} · ${r.lots} 批</div>` },
    { title: '可用库存', align: 'r', num: true, render: r => `${fmt(r.qty, dec(r.unit))} <span class="mut">${r.unit}</span><div class="mut" style="font-size:11.5px">${r.pending ? '待上架 ' + fmt(r.pending) + ' · ' : ''}安全 ${fmt(r.safety)}</div>`, sort: true, sortVal: r => r.qty },
    { title: '库存/安全', render: r => bar(Math.min(100, 100 * r.qty / Math.max(1, r.safety)), r.qty < r.safety ? 'er' : 'ok'), sort: true, sortVal: r => r.qty / Math.max(1, r.safety) },
    { title: '在途', align: 'r', num: true, render: r => r.transit ? fmt(r.transit) : '<span class="mut">—</span>' },
    
    { title: '主库位', render: r => r.bin ? binLink(r.bin) : `<span class="mut">${whN[r.wh] || '—'}</span>` },
    { title: '金额(元)', align: 'r', num: true, render: r => fmt(r.amount, 0), sort: true, sortVal: r => r.amount },
    { title: '状态', render: r => tag(r.level.replace('低于安全库存', '低于安全'), LV[r.level]) },
  ] });
  main.appendChild(t);
  function apply() {
    const rows = inventory.filter(x => (st.tab === 'all' || (st.tab === 'warn' ? warn.includes(x) : x.cat === st.tab)) && (!st.wh || stockLots.some(l => l.code === x.code && l.wh === st.wh)) && match(x, st.q, ['code', 'name', 'spec', 'pkg'])).map(x => { if (!st.wh) return x; const ls = stockLots.filter(l => l.code === x.code && l.wh === st.wh); const qty = ls.filter(l => l.status === '正常').reduce((a, l) => a + l.qty, 0); const pending = ls.filter(l => l.status === '待上架').reduce((a, l) => a + l.qty, 0); return { ...x, qty, pending, frozen: ls.filter(l => !['正常', '待上架'].includes(l.status)).reduce((a, l) => a + l.qty, 0), amount: qty * x.price, lots: ls.length, bin: (ls.filter(l => l.bin).sort((a, b) => b.qty - a.qty)[0] || {}).bin || '', wh: st.wh }; });
    t.setRows(rows); fb.setCount(`共 <b>${rows.length}</b> 项`);
  }
  apply();
  // 库位图
  let row = 1; let selBin = '';
  const segw = lay.querySelector('.segw');
  segw.innerHTML = `<div class="bm-seg" style="margin-bottom:8px">${[1, 2, 3, 4].map(r => `<span data-r="${r}" class="${r === 1 ? 'on' : ''}">${String(r).padStart(2, '0')}排·${r <= 2 ? '原料' : '成品'}</span>`).join('')}</div>`;
  segw.addEventListener('click', e => { const s = e.target.closest('span[data-r]'); if (!s) return; row = +s.dataset.r; segw.querySelectorAll('span').forEach(x => x.classList.toggle('on', x === s)); drawRack(); });
  const rack = lay.querySelector('.rack'), info = lay.querySelector('.binfo');
  const id = (r, c, l) => `WH-A-${String(r).padStart(2, '0')}-${String(c).padStart(2, '0')}-${String(l).padStart(2, '0')}`;
  const clsOf = b => { const ls = binMap[b]; if (!ls) return ''; const x = ls[0]; if (['冻结-待退供', '待检', '待返工'].includes(x.status)) return 'frz'; const iv = inventory.find(i => i.code === x.code); if (iv && iv.qty < iv.safety) return 'warn'; return x.kind === '原材料' ? 'raw' : x.kind === '半成品' ? 'semi' : 'fg'; };
  function drawRack() {
    let h = '<div></div>' + Array.from({ length: 12 }, (_, c) => `<div class="lv">${String(c + 1).padStart(2, '0')}</div>`).join('');
    for (let l = WH.levels; l >= 1; l--) { h += `<div class="lv">L${l}</div>`; for (let c = 1; c <= 12; c++) { const b = id(row, c, l); h += `<div class="cell ${clsOf(b)} ${b === selBin ? 'sel' : ''}" data-bin-cell="${b}"></div>`; } }
    rack.innerHTML = h;
  }
  const showInfo = b => { const ls = binMap[b]; info.innerHTML = `<b class="bm-mono">${b}</b> ${ls ? '' : tag('空库位', 'default')}<br>${ls ? ls.map(x => `${esc(x.name)} ${esc(x.spec)}<br><span class="mut" style="color:#8a96a8">批号 ${x.lotNo} · ${fmt(x.qty, dec(x.unit))} ${x.unit} · ${x.status}</span>`).join('<br>') : '<span style="color:#8a96a8">点击可在三维立体库中高亮该库位</span>'}`; };
  rack.addEventListener('mouseover', e => { const c = e.target.closest('[data-bin-cell]'); if (c) showInfo(c.dataset.binCell); });
  rack.addEventListener('click', e => { const c = e.target.closest('[data-bin-cell]'); if (!c) return; selBin = c.dataset.binCell; drawRack(); showInfo(selBin); if (ctx && ctx.locateBin) ctx.locateBin(selBin); P.toast(`三维定位库位 ${selBin}`); });
  drawRack();
  const grp = {}; inventory.forEach(x => { grp[x.group] = (grp[x.group] || 0) + x.amount; });
  P.chart(lay.querySelector('.c1'), { tooltip: { trigger: 'item', valueFormatter: v => fmt(v, 0) + ' 元' }, legend: { type: 'scroll', orient: 'vertical', right: 0, top: 'middle', itemWidth: 10, itemHeight: 8, textStyle: { fontSize: 11, color: '#56637a' } },
    series: [{ type: 'pie', radius: ['45%', '72%'], center: ['36%', '50%'], itemStyle: { borderColor: '#fff', borderWidth: 2 }, label: { show: false }, data: Object.entries(grp).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value: Math.round(value) })) }] });

  function open(r) {
    const ls = stockLots.filter(x => x.code === r.code);
    const mv = pickDocs.filter(d => d.lines.some(l => l.code === r.code)).slice(0, 12);
    const tr = inTransit.filter(x => x.code === r.code);
    const m = materialByCode[r.code];
    const body = el(`<div style="display:flex;flex-direction:column;gap:12px">${r.qty < r.safety ? `<div class="bm-note err">可用库存 ${fmt(r.qty, dec(r.unit))} ${r.unit} 低于安全库存 ${fmt(r.safety)}，${tr.length ? `在途 ${tr.map(x => `${x.no} ${fmt(x.qty)}（${x.eta} 到）`).join('、')}` : '暂无在途，请采购补货'}。</div>` : ''}
      ${desc([['物料编码', r.code], ['名称', esc(r.name)], ['规格型号', esc(r.spec)], ['封装', r.pkg], ['包装', esc(m.packing)], ['MSL', m.msl], ['单位', r.unit], ['标准单价', fmt(m.price, m.price < 1 ? 4 : 2)], ['供应商', supN[m.sup] || m.src || '自制'], ['可用库存', fmt(r.qty, dec(r.unit))], ['冻结/待检', fmt(r.frozen)], ['待上架', r.pending ? fmt(r.pending, dec(r.unit)) : '0'], ['安全库存', fmt(r.safety)]])}
      <div class="bm-sec">批次库存（先进先出）</div><div class="t1"></div><div class="bm-sec">近期领/补/退料单</div><div class="t2"></div></div>`);
    body.querySelector('.t1').appendChild(table({ pageSize: 0, maxHeight: 260, columns: [
      { title: '批号', render: x => navLink('trace', x.lotNo, x.lotNo) }, { title: '仓库', render: x => x.whName }, { title: '库位', render: x => binLink(x.bin) }, { title: '数量', align: 'r', num: true, render: x => fmt(x.qty, dec(x.unit)) },
      { title: '入库日期', key: 'recvDate', num: true }, { title: '库龄(天)', align: 'r', num: true, key: 'age' }, { title: 'D/C', key: 'dateCode', num: true }, { title: '供应商', render: x => supN[x.supplier] || x.supplier },
      { title: '检验', render: x => tag(x.iqc, x.iqc === 'OQC合格' ? 'success' : x.iqc === 'AOI不良' ? 'danger' : null) }, { title: '状态', render: x => tag(x.status) } ], rows: ls }));
    body.querySelector('.t2').appendChild(mv.length ? table({ pageSize: 0, maxHeight: 240, columns: [{ title: '单据', render: d => navLink('picking', d.no, d.no) }, { title: '类型', render: d => tag(d.type) }, { title: '日期', key: 'date', num: true }, { title: '生产订单', render: d => navLink('mo', d.mo, d.mo) }, { title: '数量', align: 'r', num: true, render: d => (d.type === '退料' ? '+' : '-') + fmt(d.lines.find(l => l.code === r.code).qty, dec(r.unit)) }], rows: mv }) : el('<div class="bm-empty">暂无领退料记录</div>'));
    drawer(P, { width: 940, title: `${r.code} ${esc(r.name)} ${tag(r.level, LV[r.level])}`, sub: `${r.spec}`, body, footer: r.bin ? `<button class="bm-btn pri" data-f="bin">三维定位主库位 ${r.bin}</button>` : '', onFooter: f => { if (f === 'bin') { if (ctx && ctx.locateBin) ctx.locateBin(r.bin); P.toast(`三维定位库位 ${r.bin}`); } } });
  }
  const pid = params.id || params.code; const hit = pid && inventory.find(x => x.code === pid); if (hit) P.timeout(() => open(hit), 60);
  return () => P.destroy();
}
