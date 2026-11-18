// 生产订单：计划→计划确认→下达→开工→完工→结案，含变更/拆分/返工 —— 演示数据
import { page, kpis, tabs, filterBar, table, drawer, steps, desc, tag, bar, devLink, binLink, navLink, fmt, bigStr, esc, match, ICON, axisStyle, tip, legend, getParams, el } from './_ui.js';
import { mos, moByNo, ppboms, ppbomByMo, pickDocs, reports, inDocs, retDocs, moChanges, moSplits, STATUS_FLOW, TODAY, addDays, materialByCode, warehouses, routings, fieldsForLine, roundQ, soByNo } from '../data/mock/index.js';
import { deviceById } from '../data/plant.js';

export const meta = { id: 'mo', title: '生产订单', group: '生产管理', icon: 'plan' };
const css = `
.bm-mo .lay2{display:grid;grid-template-columns:280px minmax(0,1fr) 300px;gap:12px}
.bm-mo .gantt{height:236px}
.bm-mo .acts2{display:flex;gap:8px;flex-wrap:wrap}
.bm-mo .form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:end;background:#f7f9fc;border:1px dashed var(--bd2);border-radius:8px;padding:10px}
.bm-mo .form label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--tx2)}
`;
const NEXT = { 计划: '计划确认', 计划确认: '下达', 下达: '开工', 开工: '完工', 完工: '结案' };
const ACT_LABEL = { 计划: '计划确认', 计划确认: '下达', 下达: '开工', 开工: '完工', 完工: '结案' };

export function mount(container, ctx, extra) {
  const P = page(container, ctx, { id: 'mo', icon: 'mo', title: '生产订单', crumb: ['生产制造', '生产管理', '生产订单'], desc: '全生命周期：计划 → 下达 → 开工 → 完工 → 结案', styleId: 'bm-css-mo', css });
  const params = getParams(ctx, extra);
  P.action(`<button class="bm-btn">${ICON.export}导出</button>`, () => P.toast('已生成导出文件'));
  P.action(`<button class="bm-btn pri">${ICON.plus}新增生产订单</button>`, () => P.toast('请从销售订单或 MRP 投放生成生产订单'));
  const kp = el('<div></div>'); P.body.appendChild(kp);
  const renderKpi = () => {
    const c = s => mos.filter(m => m.status === s).length;
    const nov = mos.filter(m => m.planEnd >= '2026-11-01' && ['完工', '结案'].includes(m.status));
    const late = mos.filter(m => m.status === '开工' && m.planEnd <= addDays(TODAY, 1) && m.done / m.qty < 0.7);
    kp.innerHTML = kpis([
      { label: '生产订单总数', value: mos.length, unit: '单', icon: 'mo', sub: `本月新建 ${mos.filter(m => m.createDate >= '2026-11-01').length} 单` },
      { label: '在制（开工）', value: c('开工'), unit: '单', icon: 'clock', color: '#f5a623', sub: `涉及产线 ${new Set(mos.filter(m => m.status === '开工').map(m => m.line)).size} 条` },
      { label: '待下达', value: c('计划') + c('计划确认'), unit: '单', icon: 'kit', color: '#0fb5c9', sub: `已下达待开工 ${c('下达')} 单` },
      { label: '本月完工', value: nov.length, unit: '单', icon: 'check', color: '#16b364', sub: `完工入库率 ${(100 * nov.reduce((a, m) => a + m.inQty + m.shipQty * 0, 0) / Math.max(1, nov.reduce((a, m) => a + m.qty, 0))).toFixed(1)}%` },
      { label: '返工订单', value: mos.filter(m => m.type === '返工生产').length, unit: '单', icon: 'warn', color: '#7a5af8', sub: '来源：AOI 不合格品入库' },
      { label: '进度预警', value: late.length, unit: '单', icon: 'warn', color: '#f04438', sub: late.map(m => m.no).join('、') || '无' },
    ]);
  };
  renderKpi();

  const card = el('<div class="bm-card bm-fill"></div>');
  P.body.appendChild(card);
  const lay = el('<div class="lay2 bm-dock"><div class="bm-card"><div class="bm-ct">订单状态分布<span class="ex">按业务状态</span></div><div class="pie" style="height:236px"></div></div><div class="gwrap" style="min-width:0;display:flex"></div><div class="bm-card"><div class="bm-ct">产线负荷<span class="ex">在制 / 已下达 / 计划</span></div><div class="load" style="height:236px"></div></div></div>');
  const pid = params.id || params.mo || '';
  let st = { tab: params.status || 'all', q: '', line: '', type: '' };
  const counts = () => [{ key: 'all', label: '全部', count: mos.length }, ...STATUS_FLOW.map(s => ({ key: s, label: s, count: mos.filter(m => m.status === s).length }))];
  let tb = tabs(counts(), st.tab, k => { st.tab = k; apply(); });
  card.appendChild(tb);
  const fb = filterBar([
    { key: 'q', type: 'search', placeholder: '订单号 / 产品 / 批号 / 销售订单', value: st.q },
    { key: 'line', type: 'select', label: '产线', options: [{ v: 'L1', l: 'SMT线1' }, { v: 'L2', l: 'SMT线2' }, { v: 'L3', l: '编带/测试线' }] },
    { key: 'type', type: 'seg', options: [{ v: '', l: '全部类型' }, { v: '普通生产', l: '普通生产' }, { v: '返工生产', l: '返工生产' }], value: '' },
  ], v => { Object.assign(st, v); apply(); });
  card.appendChild(fb);
  const cols = [
    { title: '生产订单号', render: r => `<a class="bm-link">${r.no}</a>${r.splitFrom ? ' <span class="bm-tag cyan" style="line-height:16px">拆</span>' : ''}`, sort: true, sortVal: r => r.no },
    { title: '单据类型', render: r => tag(r.type) },
    { title: '产品', render: r => `<div>${esc(r.productName)}</div><div class="mut" style="font-size:11.5px">${r.product} · ${esc(r.spec)}</div>` },
    { title: '生产数量', align: 'r', num: true, render: r => `${fmt(r.qty)} <span class="mut">${r.unit}</span>`, sort: true, sortVal: r => r.qty },
    { title: '产线', render: r => r.lineName },
    { title: '计划开工', key: 'planStart', num: true, sort: true },
    { title: '计划完工', key: 'planEnd', num: true, sort: true },
    { title: '业务状态', render: r => tag(r.status, null, true) },
    { title: '完工进度', render: r => bar(100 * r.done / r.qty), sort: true, sortVal: r => r.done / r.qty },
    { title: '入库数', align: 'r', num: true, render: r => fmt(r.inQty) },
    { title: '销售订单', render: r => r.so === '—' ? `<span class="mut">源 ${r.src}</span>` : navLink('sales', r.so, r.so) },
    { title: '生产批号', render: r => `<span class="bm-mono">${r.batch}</span>` },
      ];
  const t = table({ fill: true, columns: cols, rows: [], pageSize: 10, rowKey: 'no', onRow: r => open(r) });
  card.appendChild(t);
  function apply() {
    const rows = mos.slice().sort((a, b) => a.planStart < b.planStart ? 1 : -1).filter(m => (st.tab === 'all' || m.status === st.tab) && (!st.line || m.line === st.line) && (!st.type || m.type === st.type) && match(m, st.q, ['no', 'productName', 'product', 'spec', 'batch', 'so', 'custName']));
    t.setRows(rows); fb.setCount(`筛选结果 <b>${rows.length}</b> 单`);
  }
  apply();
  const refreshAll = () => { const nt = tabs(counts(), st.tab, k => { st.tab = k; apply(); }); tb.replaceWith(nt); tb = nt; apply(); renderKpi(); drawCharts(); };

  // 图表
  let pieC = null, loadC = null;
  function drawCharts() {
    if (!pieC) { pieC = P.chart(lay.querySelector('.pie'), {}); loadC = P.chart(lay.querySelector('.load'), {}); }
    const col = { 计划: '#94a3b8', 计划确认: '#0fb5c9', 下达: '#2e90fa', 开工: '#f5a623', 完工: '#16b364', 结案: '#7a5af8' };
    pieC && pieC.setOption({ tooltip: { trigger: 'item' }, legend: { bottom: 0, left: 'center', itemWidth: 10, itemHeight: 8, itemGap: 8, textStyle: { fontSize: 11, color: '#56637a' } },
      series: [{ type: 'pie', radius: ['48%', '72%'], center: ['50%', '42%'], label: { show: true, position: 'center', formatter: () => `{a|${mos.length}}\n{b|生产订单}`, rich: { a: { fontSize: 22, fontWeight: 700, color: '#1f2a3d' }, b: { fontSize: 11, color: '#8a96a8' } } }, emphasis: { scale: true, label: { show: true } },
        itemStyle: { borderColor: '#fff', borderWidth: 2 }, data: STATUS_FLOW.map(s => ({ name: s, value: mos.filter(m => m.status === s).length, itemStyle: { color: col[s] } })) }] });
    const lines = ['L1', 'L2', 'L3'];
    loadC && loadC.setOption({ tooltip: tip(), grid: { left: 72, right: 14, top: 26, bottom: 22 }, legend: legend(), xAxis: { type: 'value', name: '订单数', nameTextStyle: { fontSize: 10, color: '#8a96a8' }, minInterval: 1, ...axisStyle }, yAxis: { type: 'category', data: ['SMT线1', 'SMT线2', '编带/测试线'], ...axisStyle, axisLabel: { ...axisStyle.axisLabel, interval: 0 } },
      series: [{ name: '在制', type: 'bar', stack: 'a', barWidth: 14, itemStyle: { color: '#f5a623', borderRadius: [0, 0, 0, 0] }, data: lines.map(L => mos.filter(m => m.line === L && m.status === '开工').length) },
        { name: '已下达', type: 'bar', stack: 'a', itemStyle: { color: '#2e90fa' }, data: lines.map(L => mos.filter(m => m.line === L && m.status === '下达').length) },
        { name: '计划', type: 'bar', stack: 'a', itemStyle: { color: '#cbd5e1', borderRadius: [0, 4, 4, 0] }, data: lines.map(L => mos.filter(m => m.line === L && ['计划', '计划确认'].includes(m.status)).length) }] });
  }

  // 甘特
  const g = el(`<div class="bm-card"><div class="bm-ct">生产排程甘特图<span class="ex" style="gap:4px">${Object.entries({ 计划: '#cbd5e1', 计划确认: '#7fd3df', 下达: '#8fbefc', 开工: '#f5a623', 完工: '#5fd39a', 结案: '#b9a6fb' }).map(([k, c]) => `<i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${c}"></i>${k}`).join(' ')} <i style="display:inline-block;width:10px;height:10px;border-radius:2px;border:1.5px solid #7a5af8"></i>返工 · 底部深色细条=完工进度 · 点击条形查看订单</span></div><div class="gantt"></div></div>`);
  g.style.flex = '1'; lay.querySelector('.gwrap').appendChild(g); P.body.appendChild(lay);
  const lanes = ['L1', 'L2', 'L3'];
  const rowsG = []; const laneRows = {};
  mos.filter(m => m.planEnd >= '2026-10-27').sort((a, b) => a.planStart < b.planStart ? -1 : 1).forEach(m => { const L = m.line; laneRows[L] = laneRows[L] || []; let k = laneRows[L].findIndex(end => end < m.planStart); if (k < 0) { k = laneRows[L].length; laneRows[L].push(''); } laneRows[L][k] = m.planEnd; rowsG.push({ m, L, k }); });
  const yCats = []; lanes.forEach(L => (laneRows[L] || []).forEach((_, k) => yCats.push(`${L}|${k}`)));
  const colS = { 计划: '#cbd5e1', 计划确认: '#7fd3df', 下达: '#8fbefc', 开工: '#f5a623', 完工: '#5fd39a', 结案: '#b9a6fb' };
  const ts = d => new Date(d + 'T00:00:00').getTime();
  const gc = P.chart(g.querySelector('.gantt'), {
    tooltip: { formatter: p => { const m = p.data.m; return `<b>${m.no}</b> ${m.type === '返工生产' ? '(返工)' : ''}<br/>${m.productName} ${fmt(m.qty)} ${m.unit}<br/>${m.planStart} → ${m.planEnd}<br/>状态：${m.status} · 进度 ${(100 * m.done / m.qty).toFixed(0)}%`; } },
    grid: { left: 90, right: 16, top: 22, bottom: 26 },
    xAxis: { type: 'time', min: ts('2026-10-27'), max: ts('2026-11-26'), ...axisStyle, axisLabel: { ...axisStyle.axisLabel, formatter: '{MM}-{dd}' }, splitLine: { show: true, lineStyle: { color: '#f0f3f8' } } },
    yAxis: { type: 'category', data: yCats, inverse: true, ...axisStyle, axisLabel: { ...axisStyle.axisLabel, interval: 0, fontWeight: 600, color: '#1f2a3d', formatter: v => { const [L, k] = v.split('|'); return k === '0' ? { L1: 'SMT线1', L2: 'SMT线2', L3: '编带/测试线' }[L] : ''; } }, splitLine: { show: false } },
    series: [{ type: 'custom', clip: true, renderItem: (params, api) => {
      const y = api.value(0), s = api.coord([api.value(1), y]), e = api.coord([api.value(2), y]); const h = api.size([0, 1])[1] * 0.62; const d = rowsG[params.dataIndex]; const w = Math.max(4, e[0] - s[0]);
      const pctW = w * Math.min(1, d.m.done / d.m.qty);
      return { type: 'group', children: [
        { type: 'rect', shape: { x: s[0], y: s[1] - h / 2, width: w, height: h, r: 4 }, style: { fill: colS[d.m.status], stroke: d.m.type === '返工生产' ? '#7a5af8' : 'transparent', lineWidth: 1.5 } },
        { type: 'rect', shape: { x: s[0], y: s[1] + h / 2 - 3, width: pctW, height: 3, r: 1.5 }, style: { fill: 'rgba(31,42,61,.45)' } },
        { type: 'text', style: { text: w > 70 ? d.m.no.slice(2) : '', x: s[0] + 6, y: s[1] - 1, fill: '#1f2a3d', fontSize: 11, verticalAlign: 'middle' } } ] };
    }, encode: { x: [1, 2], y: 0 }, data: rowsG.map(d => ({ value: [`${d.L}|${d.k}`, ts(d.m.planStart), ts(d.m.planEnd) + 86400000 - 1], m: d.m })),
      markLine: { silent: true, symbol: 'none', lineStyle: { color: '#f04438', type: 'solid', width: 1.5 }, label: { formatter: '今日 11-12', position: 'start', color: '#f04438', fontSize: 11 }, data: [{ xAxis: ts(TODAY) + 14.5 * 3600000 }] } }],
  });
  gc && gc.on('click', p => p.data && p.data.m && open(p.data.m));
  drawCharts();

  // ----- 订单详情抽屉 -----
  function open(m) {
    const curIdx = STATUS_FLOW.indexOf(m.status);
    const dates = [m.createDate, m.createDate, m.releaseDate || '', ['开工', '完工', '结案'].includes(m.status) ? m.planStart : '', ['完工', '结案'].includes(m.status) ? m.planEnd : '', m.closeDate || ''];
    const pp = ppbomByMo[m.no];
    const ps = pickDocs.filter(d => d.mo === m.no); const rp = reports.filter(r => r.mo === m.no); const ins = inDocs.filter(d => d.mo === m.no); const rts = retDocs.filter(d => d.mo === m.no);
    const chg = moChanges.filter(c => c.mo === m.no); const spl = moSplits.filter(s => s.src === m.no || s.items.some(i => i.mo === m.no));
    const route = routings.find(r => r.no === m.routeNo);
    const body = el('<div style="display:flex;flex-direction:column;gap:12px"></div>');
    body.innerHTML = `${steps(STATUS_FLOW, m.status === '结案' ? 6 : curIdx, { dates })}
      ${m.type === '返工生产' ? `<div class="bm-note warn">返工生产订单：来源 ${navLink('mo', m.src, m.src)} 的 AOI 不合格品（不合格品入库 → 返工领料 → 返修/复检 → 合格品入库）。</div>` : ''}
      ${m.splitFrom ? splitNote(m) : ''}
      ${desc([['产品编码', m.product], ['产品名称', esc(m.productName)], ['规格型号', esc(m.spec)], ['生产数量', `${fmt(m.qty)} ${m.unit}`], ['已完工', `${fmt(m.done)} ${m.unit}`], ['合格/不良', `${fmt(m.good)} / <span style="color:#f04438">${fmt(m.bad)}</span>`],
        ['生产车间', m.workshop], ['产线', m.lineName], ['工作中心', m.wc], ['计划开工', m.planStart], ['计划完工', m.planEnd], ['生产批号', `<span class="bm-mono">${m.batch}</span>`],
        ['BOM版本', `${m.bomNo}`], ['工艺路线', m.routeNo], ['销售订单', m.so === '—' ? '—' : navLink('sales', m.so, m.so)], ['客户', m.custName], ['计划员', m.planner], ['序列号段', m.snPrefix ? `<span class="bm-mono">${m.snPrefix}00001~${String(m.qty).padStart(5, '0')}</span>` : '—']])}
      <div class="bm-sec">工艺路线与设备（点击设备在三维中定位）</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">${(m.type === '返工生产' ? [{ seq: 10, name: '返修/AOI复检', devices: m.devices }] : route.ops).map(o => `<span class="bm-tag default" style="height:26px">${o.seq} ${esc(o.name)}</span>${(o.devices.filter(d => m.devices.includes(d))).map(d => devLink(d, `${d}${deviceById[d] ? ' · ' + tag(deviceById[d].status === 'run' ? '运行' : deviceById[d].status === 'fault' ? '故障' : deviceById[d].status === 'maint' ? '保养' : '待机', { run: 'success', fault: 'danger', maint: 'info', idle: 'warning' }[deviceById[d].status]).replace(/<[^>]+>/g, '') : ''}`)).join('')}<span class="mut" style="color:#c0c8d4">›</span>`).join('')}</div>
      <div class="sub-tabs"></div><div class="sub-body"></div>`;
    const subs = [
      { key: 'pp', label: '生产用料清单', count: pp.lines.length }, { key: 'pick', label: '领/补/退料', count: ps.length }, { key: 'rp', label: '生产汇报', count: rp.length },
      { key: 'in', label: '入库/退库', count: ins.length + rts.length }, { key: 'chg', label: '变更/拆分', count: chg.length + spl.length } ];
    const sb = body.querySelector('.sub-body');
    const showSub = k => {
      sb.innerHTML = '';
      if (k === 'pp') sb.appendChild(table({ pageSize: 0, maxHeight: 300, columns: [
        { title: '#', key: 'seq', align: 'c' }, { title: '子项物料', render: l => `<div>${esc(l.name)}</div><div class="mut" style="font-size:11.5px">${l.code} · ${esc(l.spec)}</div>` }, { title: '位号', key: 'pos' },
        { title: '单位用量', align: 'r', num: true, render: l => fmt(l.unitQty, l.unitQty % 1 ? 4 : 0) }, { title: '损耗率', align: 'r', num: true, render: l => (l.loss * 100).toFixed(1) + '%' },
        { title: '应发数量', align: 'r', num: true, render: l => fmt(l.need, l.unit === '罐' || l.unit === 'kg' ? 2 : 0) }, { title: '发料方式', render: l => tag(l.issue, l.issue === '倒冲' ? 'cyan' : 'default') },
        { title: '已领', align: 'r', num: true, render: l => fmt(l.issue === '倒冲' ? l.backflush : l.picked, l.unit === '罐' || l.unit === 'kg' ? 2 : 0) }, { title: '补料', align: 'r', num: true, render: l => l.supp ? `<span class="em">${fmt(l.supp)}</span>` : '—' }, { title: '退料', align: 'r', num: true, render: l => l.ret ? fmt(l.ret) : '—' } ], rows: pp.lines }));
      if (k === 'pick') sb.appendChild(table({ pageSize: 0, maxHeight: 300, columns: [{ title: '单据编号', render: d => navLink('picking', d.no, d.no) }, { title: '类型', render: d => tag(d.type) }, { title: '日期', key: 'date', num: true }, { title: '物料行数', align: 'r', num: true, render: d => d.lines.length }, { title: '调出→调入', render: d => `${d.fromWh} → ${d.toWh}` }, { title: '原因', render: d => esc(d.reason || '按用料清单领料'), cls: 'wrap' }], rows: ps }));
      if (k === 'rp') sb.appendChild(table({ pageSize: 0, maxHeight: 300, columns: [{ title: '汇报单号', key: 'no' }, { title: '日期', key: 'date', num: true }, { title: '班次', key: 'shift' }, { title: '班组', key: 'team' }, { title: '完成数', align: 'r', num: true, render: r => fmt(r.qty) }, { title: '不良', align: 'r', num: true, render: r => fmt(r.bad) }, { title: '累计', align: 'r', num: true, render: r => fmt(r.cum) }, { title: '人时/机时', align: 'r', num: true, render: r => `${r.manHours} / ${r.machHours}` }, { title: '停线', render: r => r.stopMin ? `${tag(r.stopType)} ${r.stopMin}min` : tag('正常汇报') }, { title: '设备', render: r => r.device ? devLink(r.device) : '—' }], rows: rp }));
      if (k === 'in') sb.appendChild(table({ pageSize: 0, maxHeight: 300, columns: [{ title: '单据编号', render: d => navLink('instock', d.no, d.no) }, { title: '类型', render: d => tag(d.type || '退库', d.type ? null : 'warning') }, { title: '日期', key: 'date', num: true }, { title: '数量', align: 'r', num: true, render: d => (d.type ? '' : '-') + fmt(d.qty) }, { title: '仓库', render: d => d.wh || `${d.from}→${d.to}` }, { title: '库位', render: d => binLink(d.bin) }, { title: '备注', render: d => esc(d.note || d.reason || ''), cls: 'wrap' }], rows: [...ins, ...rts] }));
      if (k === 'chg') { sb.innerHTML = (chg.length || spl.length) ? `<div class="bm-tl">${chg.map(c => `<div><span class="t">${c.date}</span> ${tag(c.type, 'info')} <b>${c.no}</b> ${esc(c.field)}：${esc(c.before)} → <b>${esc(c.after)}</b> ${tag(c.status)}<div class="mut" style="color:#8a96a8">${esc(c.reason)} · ${c.by}</div></div>`).join('')}${spl.map(s => `<div><span class="t">${s.date}</span> ${tag('订单拆分', 'cyan')} <b>${s.no}</b> ${s.src}（${fmt(s.srcQty)}）→ ${s.items.map(i => `${i.mo} ${fmt(i.qty)}@${i.line}`).join('，')}<div style="color:#8a96a8">${esc(s.reason)}</div></div>`).join('')}</div>` : '<div class="bm-empty">暂无变更/拆分记录</div>'; }
    };
    body.querySelector('.sub-tabs').replaceWith(tabs(subs, 'pp', showSub)); showSub('pp');
    const nx = NEXT[m.status];
    const canSplit = ['计划', '计划确认', '下达'].includes(m.status);
    const D = drawer(P, { width: 900, title: `${m.no} ${tag(m.status, null, true)} ${tag(m.type)} ${m.priority === '高' ? tag('优先级 高', 'danger') : ''}`, sub: `${m.productName} · ${m.spec} · ${m.lineName}`, body,
      footer: `${canSplit ? '<button class="bm-btn" data-f="split">订单拆分</button><button class="bm-btn" data-f="change">订单变更</button>' : ''}<button class="bm-btn" data-f="trace">${ICON.trace}追溯</button>${nx ? `<button class="bm-btn pri" data-f="next">执行：${ACT_LABEL[m.status]}</button>` : '<button class="bm-btn" disabled>已结案</button>'}`,
      onFooter: (f, close) => {
        if (f === 'next') {
          const to = NEXT[m.status];
          if (to === '完工' && m.done < m.qty && !confirm(`${m.no} 完工进度 ${((100 * m.done / m.qty) || 0).toFixed(0)}%，确认强制完工？`)) return;
          if (to === '结案' && inDocs.some(d => d.mo === m.no && d.status === '待审核')) { P.toast('存在未审核入库，不能结案'); return; }
          const from = m.status; m.status = to; if (m.status === '下达') m.releaseDate = TODAY; if (m.status === '结案') m.closeDate = TODAY; P.toast(`${m.no}：${from} → ${m.status}`); close(); refreshAll(); P.timeout(() => open(m), 260);
        }
        if (f === 'trace') { if (ctx && ctx.navigate) ctx.navigate('trace', { id: m.batch }); }
        if (f === 'split' || f === 'change') showForm(f);
      } });
    function showForm(kind) {
      D.body.querySelector('.form')?.remove();
      const fm = el(kind === 'split'
        ? `<div class="form"><label>拆出数量（${m.unit}）<input class="bm-in" type="number" value="${Math.round(m.qty / 2)}" min="1" max="${m.qty - 1}"></label><label>拆至产线<select class="bm-sel">${['L1', 'L2', 'L3'].filter(L => (m.line === 'L3') === (L === 'L3')).map(L => `<option ${L !== m.line ? 'selected' : ''}>${L}</option>`).join('')}</select></label><div style="display:flex;gap:8px"><button class="bm-btn pri" data-ok>确认拆分</button><button class="bm-btn" data-cancel>取消</button></div></div>`
        : `<div class="form"><label>变更项<select class="bm-sel"><option>计划完工</option><option>生产数量</option><option>计划开工</option></select></label><label>变更后<input class="bm-in" value="${addDays(m.planEnd, 1)}"></label><div style="display:flex;gap:8px"><button class="bm-btn pri" data-ok>提交变更单</button><button class="bm-btn" data-cancel>取消</button></div></div>`);
      D.body.prepend(fm);
      fm.querySelector('[data-cancel]').onclick = () => fm.remove();
      fm.querySelector('[data-ok]').onclick = () => {
        if (kind === 'split') {
          const q = Math.floor(+fm.querySelector('input').value); const L = fm.querySelector('select').value;
          if (!(q > 0 && q < m.qty)) { P.toast('拆出数量需大于 0 且小于原数量'); return; }
          const no = `MO2611-${String(Math.max(...mos.filter(x => x.no.startsWith('MO2611')).map(x => +x.no.slice(-4))) + 1).padStart(4, '0')}`;
          const lf = fieldsForLine(m.product, L);
          const root = m.isPCBA ? ((L === m.line ? m.snPrefix : m.snPrefix.replace(m.line, L)) || '').replace(/-MO\d+$/, '') : '';
          const snPrefix = root ? `${root}-MO${no.slice(-4)}` : '';
          const n = { ...m, no, qty: q, line: L, ...lf, splitFrom: m.no, batch: m.batch.replace(m.line, L).replace(/\d{4}$/, no.slice(-4)), done: 0, good: 0, bad: 0, inQty: 0, ngInQty: 0, shipQty: 0, snPrefix, releaseDate: '', closeDate: '', status: m.status };
          moSplits.unshift({ no: `SPL2611-${String(moSplits.length + 3).padStart(4, '0')}`, src: m.no, srcQty: m.qty, date: TODAY, reason: '手工拆分', by: '当前用户', items: [{ mo: m.no, qty: m.qty - q, line: m.line }, { mo: no, qty: q, line: L }] });
          m.qty -= q; mos.push(n);
          if (m.so && m.so !== '—' && soByNo[m.so]) { const ln = soByNo[m.so].lines.find(l => l.product === m.product); if (ln && !ln.mos.includes(no)) ln.mos.push(no); }
          const rescale = pp => pp.lines.forEach(l => { const mat = materialByCode[l.code]; const mm = pp.mo === no ? n : m; l.std = roundQ(mat, mm.qty * l.unitQty); l.need = roundQ(mat, mm.qty * l.unitQty * (1 + l.loss)); });
          moByNo[no] = n; ppbomByMo[no] = { ...ppbomByMo[m.no], no: 'PPBOM' + no.slice(2), mo: no, qty: q, lines: ppbomByMo[m.no].lines.map(l => ({ ...l, picked: 0, supp: 0, ret: 0, backflush: 0, consumed: 0 })) }; ppbomByMo[m.no].qty = m.qty; rescale(ppbomByMo[m.no]); rescale(ppbomByMo[no]); ppboms.push(ppbomByMo[no]);
          P.toast(`已拆分：${m.no} 剩 ${fmt(m.qty)}，新订单 ${no} ${fmt(q)}`);
        } else {
          const field = fm.querySelector('select').value; const v = fm.querySelector('input').value;
          moChanges.unshift({ no: `ECN2611-${String(moChanges.length + 5).padStart(4, '0')}`, mo: m.no, date: TODAY, type: field === '生产数量' ? '数量变更' : '日期变更', field, before: field === '生产数量' ? fmt(m.qty) : field === '计划开工' ? m.planStart : m.planEnd, after: v, reason: '手工变更', by: '当前用户', status: '审核中' });
          P.toast(`已提交生产订单变更单（${field}），待审核`);
        }
        D.close(); refreshAll(); P.timeout(() => open(m), 260);
      };
    }
  }
  if (pid && moByNo[pid]) { t.select(pid); P.timeout(() => open(moByNo[pid]), 60); }
  function splitNote(m) {
    const s = moSplits.find(x => x.items.some(i => i.mo === m.no));
    const it = s && s.items.find(i => i.mo === m.no);
    const line = it ? { L1: 'SMT线1', L2: 'SMT线2', L3: '编带/测试线' }[it.line] : m.lineName;
    const srcQty = s ? s.srcQty : (m.origQty || m.qty);
    const q = it ? it.qty : m.qty;
    return `<div class="bm-note">由 ${navLink('mo', m.splitFrom, m.splitFrom)} 拆分生成（原数量 ${fmt(srcQty)} ${m.unit}，拆出 ${fmt(q)} ${m.unit} 至 ${line}）。</div>`;
  }
  return () => P.destroy();
}
