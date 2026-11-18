// 生产齐套分析：按计划开工顺序/优先级对未开工订单分配可用库存，输出缺料与预计齐套日期 —— 演示数据
import { page, kpis, filterBar, table, drawer, tag, bar, navLink, binLink, desc, fmt, esc, axisStyle, tip, legend, getParams, el, ICON } from './_ui.js';
import { runKitting, inventory, materialByCode } from '../data/mock/index.js';

export const meta = { id: 'kitting', title: '齐套分析', group: '生产管理', icon: 'task' };
const css = `.bm-kitting .row2{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:12px}.bm-kitting .ch{height:250px}
.bm-kitting .run{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:linear-gradient(90deg,#eef6ff,#f2fbfc);border:1px solid #d6e6ff;font-size:12.5px;color:var(--tx2)}
.bm-kitting .run b{color:var(--tx)}`;
const dec = u => (u === '罐' || u === 'kg' || u === '片') ? 2 : 0;

export function mount(container, ctx, extra) {
  const P = page(container, ctx, { id: 'kitting', icon: 'kit', title: '生产齐套分析', crumb: ['生产制造', '生产管理', '生产齐套分析'], desc: '投放前齐套/缺料分析，投放后欠料跟踪', styleId: 'bm-css-kitting', css });
  const params = getParams(ctx, extra);
  let order = 'date'; let res = runKitting(order);
  const kp = el('<div></div>'); P.body.appendChild(kp);
  const run = el(`<div class="run">${ICON.kit.replace('<svg', '<svg style="width:18px;height:18px;color:#1677ff"')}<span>分析范围：<b>计划 / 计划确认 / 下达</b> 状态生产订单；可用库存 = 状态为「正常」的在库（不含待检、冻结、待上架、不良品）− 在制订单倒冲预留；在途按计划开工顺序跨订单扣减，数量不足则显示「在途不足/待采购」</span><span style="flex:1"></span><span>分配顺序</span><div class="bm-seg"><span data-v="date" class="on">按计划开工日</span><span data-v="priority">按优先级</span></div><button class="bm-btn pri sm" data-run>重新运行分析</button></div>`);
  P.body.appendChild(run);
  const card = el('<div class="bm-card bm-fill"><div class="bm-ct">订单齐套结果<span class="ex">点击行查看子项缺料明细</span></div></div>'); P.body.appendChild(card);
  const st = { s: '' };
  const fb = filterBar([{ key: 's', type: 'seg', options: [{ v: '', l: '全部' }, '齐套', '部分齐套', '缺料'], value: '' }], v => { st.s = v.s; apply(); });
  card.appendChild(fb);
  const t = table({ fill: true, pageSize: 0, rowKey: 'no', onRow: r => open(r.k), columns: [
    { title: '生产订单', render: r => `<a class="bm-link">${r.k.mo.no}</a>` },
    { title: '产品', render: r => `${esc(r.k.mo.productName)}<div class="mut" style="font-size:11.5px">${esc(r.k.mo.spec)}</div>` },
    { title: '数量', align: 'r', num: true, render: r => `${fmt(r.k.mo.qty)} ${r.k.mo.unit}<div class="mut" style="font-size:11.5px">${r.k.mo.lineName}</div>` },
    { title: '计划开工', num: true, render: r => r.k.mo.planStart },
    { title: '优先 / 状态', render: r => `${tag(r.k.mo.priority)} ${tag(r.k.mo.status)}` },
    { title: '齐套率(子项)', render: r => bar(r.k.rate, r.k.rate >= 100 ? 'ok' : r.k.rate < 80 ? 'er' : 'wn') },
    { title: '可齐套套数', align: 'r', num: true, render: r => `${fmt(r.k.sets)}<span class="mut"> / ${fmt(r.k.mo.qty)}</span>` },
    { title: '缺料子项', cls: 'wrap', render: r => r.k.shortLines.map(l => `<span class="bm-tag danger" style="margin:1px" title="${esc(l.name + ' ' + l.spec)}">${esc(l.spec.split(' ').slice(0, 2).join(' '))}</span>`).join('') || '<span class="mut">—</span>' },
    { title: '预计齐套', num: true, render: r => r.k.kitDate === '已齐套' ? tag('已齐套', 'success') : /待采购|在途不足/.test(r.k.kitDate) ? tag(r.k.kitDate, 'danger') : `<span style="color:#c47f00">${r.k.kitDate}</span>` },
    { title: '齐套状态', render: r => tag(r.k.status, null, true) },
    { title: '操作', render: r => r.k.status !== '齐套' ? '<button class="bm-btn sm" data-act="po">催料</button>' : r.k.mo.status === '计划' ? '<button class="bm-btn sm" data-act="confirm">计划确认</button>' : r.k.mo.status === '计划确认' ? '<button class="bm-btn sm" data-act="release">下达</button>' : '<span class="mut">已下达</span>' },
  ], onAction: (a, r) => { if (a === 'confirm') { r.k.mo.status = '计划确认'; P.toast(`${r.k.mo.no} 已计划确认`); apply(); } else if (a === 'release') { r.k.mo.status = '下达'; P.toast(`${r.k.mo.no} 齐套，已提交下达`); apply(); } else P.toast(`已向采购/前段推送催料：${r.k.shortLines.map(l => l.code).join('、')}`); } });
  card.appendChild(t);
  const row = el('<div class="row2 bm-dock"><div class="bm-card"><div class="bm-ct">缺料物料 Top<span class="ex">缺口占需求比例 · 标注预计到料</span></div><div class="ch c1"></div></div><div class="bm-card"><div class="bm-ct">齐套状态分布</div><div class="ch c2"></div></div></div>');
  P.body.appendChild(row);
  let c1 = null, c2 = null;
  function apply() {
    const all = res.map((k, i) => ({ k, i, no: k.mo.no }));
    const rows = all.filter(r => !st.s || r.k.status === st.s);
    t.setRows(rows); fb.setCount(`共 ${rows.length} 单`);
    const cnt = s => res.filter(k => k.status === s).length;
    const shortMat = {}; res.forEach(k => k.shortLines.forEach(l => { const x = shortMat[l.code] = shortMat[l.code] || { code: l.code, short: 0, need: 0, eta: l.eta, unit: l.unit }; x.short += l.short; x.need += l.need; }));
    const sm = Object.values(shortMat).sort((a, b) => b.short / b.need - a.short / a.need);
    kp.innerHTML = kpis([
      { label: '待分析订单', value: res.length, unit: '单', icon: 'mo', sub: '计划/计划确认/下达' },
      { label: '完全齐套', value: cnt('齐套'), unit: '单', icon: 'check', color: '#16b364', sub: '可立即下达/开工' },
      { label: '部分齐套', value: cnt('部分齐套'), unit: '单', icon: 'kit', color: '#f5a623', sub: '可分批开工' },
      { label: '缺料订单', value: cnt('缺料'), unit: '单', icon: 'warn', color: '#f04438', sub: '关键料缺口' },
      { label: '缺料物料', value: sm.length, unit: '种', icon: 'box', color: '#7a5af8', sub: sm.slice(0, 2).map(x => materialByCode[x.code].name.replace('贴片', '')).join('、') },
      { label: '最晚齐套日', value: res.map(k => k.kitDate).filter(d => /^\d/.test(d)).sort().slice(-1)[0]?.slice(5) || '—', unit: '', icon: 'clock', color: '#0fb5c9', sub: '依据在途到料日期' },
    ]);
    if (!c1) { c1 = P.chart(row.querySelector('.c1'), {}); c2 = P.chart(row.querySelector('.c2'), {}); }
    c1 && c1.setOption({ tooltip: tip({ formatter: ps => { const x = sm[ps[0].dataIndex]; return `${materialByCode[x.code].name} ${materialByCode[x.code].spec}<br/>缺口 ${fmt(x.short, dec(x.unit))} ${x.unit} / 需求 ${fmt(x.need, dec(x.unit))}<br/>预计到料：${x.eta || '无在途'}`; } }), grid: { left: 150, right: 70, top: 6, bottom: 20 },
      xAxis: { type: 'value', max: 100, ...axisStyle, axisLabel: { ...axisStyle.axisLabel, formatter: '{value}%' } }, yAxis: { type: 'category', inverse: true, data: sm.map(x => `${materialByCode[x.code].name.replace('贴片', '')} ${materialByCode[x.code].spec.split(' ').slice(0, 2).join(' ')}`), ...axisStyle, axisLabel: { ...axisStyle.axisLabel, width: 140, overflow: 'truncate' } },
      series: [{ type: 'bar', barWidth: 12, data: sm.map(x => ({ value: +(100 * x.short / x.need).toFixed(1), itemStyle: { color: x.eta ? '#f5a623' : '#f04438', borderRadius: [0, 6, 6, 0] } })), label: { show: true, position: 'right', fontSize: 11, color: '#56637a', formatter: p => `${p.value}% · ${sm[p.dataIndex].eta ? sm[p.dataIndex].eta.slice(5) + '到' : '无在途'}` } }] }, true);
    c2 && c2.setOption({ tooltip: { trigger: 'item' }, legend: legend({ top: 'bottom', right: 'center' }), series: [{ type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'], itemStyle: { borderColor: '#fff', borderWidth: 2 },
      label: { formatter: '{b}\n{c} 单', fontSize: 11 }, data: [{ name: '齐套', value: cnt('齐套'), itemStyle: { color: '#16b364' } }, { name: '部分齐套', value: cnt('部分齐套'), itemStyle: { color: '#f5a623' } }, { name: '缺料', value: cnt('缺料'), itemStyle: { color: '#f04438' } }] }] }, true);
  }
  run.addEventListener('click', e => {
    const s = e.target.closest('.bm-seg span'); if (s) { order = s.dataset.v; run.querySelectorAll('.bm-seg span').forEach(x => x.classList.toggle('on', x === s)); }
    if (s || e.target.closest('[data-run]')) { res = runKitting(order); apply(); P.toast(`齐套分析完成（${order === 'date' ? '按计划开工日' : '按优先级'}分配）`); }
  });
  apply();
  function open(k) {
    const m = k.mo;
    const body = el(`<div style="display:flex;flex-direction:column;gap:12px">${k.status === '齐套' ? '<div class="bm-note ok">全部子项可用库存满足，订单可下达/开工。</div>' : `<div class="bm-note ${k.status === '缺料' ? 'err' : 'warn'}">缺料子项 ${k.shortLines.length} 项，当前可齐套 ${fmt(k.sets)} / ${fmt(m.qty)} ${m.unit}；预计齐套日期：${k.kitDate}。</div>`}
      ${desc([['生产订单', navLink('mo', m.no, m.no)], ['产品', esc(m.productName)], ['数量', `${fmt(m.qty)} ${m.unit}`], ['产线', m.lineName], ['计划开工', m.planStart], ['齐套率', `${k.rate.toFixed(0)}%`]])}<div class="tw"></div></div>`);
    body.querySelector('.tw').appendChild(table({ pageSize: 0, columns: [
      { title: '子项物料', render: l => `<div>${esc(l.name)}</div><div class="mut" style="font-size:11.5px">${l.code} · ${esc(l.spec)}</div>` },
      { title: '应发', align: 'r', num: true, render: l => fmt(l.need, dec(l.unit)) }, { title: '分配前可用', align: 'r', num: true, render: l => fmt(l.before, dec(l.unit)) },
      { title: '本单分配', align: 'r', num: true, render: l => fmt(l.alloc, dec(l.unit)) }, { title: '缺口', align: 'r', num: true, render: l => l.short > 0 ? `<span class="em">${fmt(l.short, dec(l.unit))}</span>` : '<span class="mut">0</span>' },
      { title: '单位', key: 'unit' }, { title: '在途/在制', cls: 'wrap', render: l => l.transit.map(x => `${x.no} ${fmt(x.qty)} · ${x.eta.slice(5)}到`).join('<br>') || '<span class="mut">—</span>' },
      { title: '主库位', render: l => { const iv = inventory.find(i => i.code === l.code); return binLink(iv && iv.bin); } },
      { title: '状态', render: l => l.short > 0 ? tag('缺料') : tag('齐套') } ], rows: k.lines }));
    drawer(P, { width: 1000, title: `${m.no} 齐套明细 ${tag(k.status, null, true)}`, sub: `${m.productName} · ${m.spec}`, body });
  }
  const pid = params.id || params.mo; const hit = pid && res.find(k => k.mo.no === pid); if (hit) P.timeout(() => open(hit), 60);
  return () => P.destroy();
}
