// 完工入库 / 退库：检验合格后入成品立体库；不合格品入不良品仓并转返工 —— 演示数据
import { page, kpis, tabs, filterBar, table, drawer, tag, navLink, binLink, desc, fmt, esc, match, axisStyle, tip, legend, getParams, el, steps } from './_ui.js';
import { inDocs, retDocs, moByNo, mos, oqc, warehouses, TODAY, addDays } from '../data/mock/index.js';

export const meta = { id: 'instock', title: '完工入库/退库', group: '生产管理', icon: 'stock' };
const css = `.bm-instock .row2{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:12px}.bm-instock .ch{height:240px}
.bm-instock .rw{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.bm-instock .rw>div{border:1px solid var(--bd);border-radius:8px;padding:10px 12px;background:#fbfcfe}
.bm-instock .rw b{font-size:18px;font-family:var(--mono)}.bm-instock .rw span{display:block;font-size:12px;color:var(--tx3)}`;
const whN = Object.fromEntries(warehouses.map(w => [w.code, w.name]));
const qStr = d => d.qty >= 100000 ? `${fmt(d.qty / 1e4, 1)}万` : fmt(d.qty);

export function mount(container, ctx, extra) {
  const P = page(container, ctx, { id: 'instock', icon: 'instock', title: '生产入库 / 退库', crumb: ['生产制造', '生产管理', '生产入库单'], desc: '汇报 → OQC → 入库 → 立体库上架；不合格品入库与返工', styleId: 'bm-css-instock', css });
  const params = getParams(ctx, extra);
  const ok = inDocs.filter(d => d.type === '合格品入库'), ng = inDocs.filter(d => d.type === '不合格品入库');
  P.body.insertAdjacentHTML('beforeend', kpis([
    { label: '生产入库单', value: inDocs.length, unit: '张', icon: 'instock', sub: `本月 ${inDocs.filter(d => d.date >= '2026-11-01').length} 张` },
    { label: 'PCBA 合格入库', value: fmt(ok.filter(d => moByNo[d.mo].isPCBA).reduce((a, d) => a + d.qty, 0)), unit: 'PCS', icon: 'check', color: '#16b364', sub: 'SMT 线 1/2' },
    { label: '元件合格入库', value: fmt(ok.filter(d => !moByNo[d.mo].isPCBA).reduce((a, d) => a + d.qty, 0) / 1e4, 0), unit: '万PCS', icon: 'box', color: '#0fb5c9', sub: 'MLCC / IC / 电感' },
    { label: '不合格品入库', value: fmt(ng.reduce((a, d) => a + d.qty, 0)), unit: 'PCS', icon: 'warn', color: '#f04438', sub: `${ng.length} 张 · 已转返工订单` },
    { label: '生产退库', value: retDocs.length, unit: '张', icon: 'pick', color: '#f5a623', sub: '标签错误 / 烘烤复检' },
    { label: 'OQC 批合格率', value: (100 * oqc.filter(x => x.result === '合格').length / Math.max(1, oqc.filter(x => x.result !== '检验中').length)).toFixed(1), unit: '%', icon: 'quality', color: '#7a5af8', sub: `检验中 ${oqc.filter(x => x.result === '检验中').length} 批` },
  ]));
  const card = el('<div class="bm-card bm-fill"></div>'); P.body.appendChild(card);
  const st = { tab: 'in', q: '' };
  const tb = tabs([{ key: 'in', label: '生产入库单', count: inDocs.length }, { key: 'ng', label: '不合格品 / 返工', count: ng.length }, { key: 'ret', label: '生产退库单', count: retDocs.length }], 'in', k => { st.tab = k; apply(); });
  card.appendChild(tb);
  const fb = filterBar([{ key: 'q', type: 'search', placeholder: '单号 / 生产订单 / 批号 / 产品' }], v => { Object.assign(st, v); apply(); });
  card.appendChild(fb);
  const colsIn = [
    { title: '入库单号', render: d => `<a class="bm-link">${d.no}</a>` }, { title: '日期', key: 'date', num: true, sort: true }, { title: '入库类型', render: d => tag(d.type) },
    { title: '生产订单', render: d => `${navLink('mo', d.mo, d.mo)}${moByNo[d.mo].type === '返工生产' ? ' ' + tag('返工', 'purple') : ''}` }, { title: '产品', render: d => `${esc(d.productName)}<div class="mut" style="font-size:11.5px">${esc(d.spec)}</div>` },
    { title: '生产批号', render: d => navLink('trace', d.batch, d.batch) }, { title: '数量', align: 'r', num: true, render: d => `${qStr(d)} <span class="mut">${d.unit}</span>`, sort: true, sortVal: d => d.qty },
    { title: '仓库', render: d => whN[d.wh] }, { title: '库位', render: d => binLink(d.bin) },
    { title: 'OQC', render: d => d.oqc ? `<span class="bm-mono" style="font-size:12px">${d.oqc}</span> ${tag(d.oqcResult)}` : '<span class="mut">—</span>' },
    { title: '仓管员', key: 'keeper' }, { title: '状态', render: d => tag(d.status) },
  ];
  const colsRet = [
    { title: '退库单号', render: d => `<a class="bm-link">${d.no}</a>` }, { title: '日期', key: 'date', num: true }, { title: '生产订单', render: d => navLink('mo', d.mo, d.mo) }, { title: '产品', render: d => esc(d.productName) },
    { title: '批号', render: d => navLink('trace', d.batch, d.batch) }, { title: '退库数量', align: 'r', num: true, render: d => `-${fmt(d.qty)}` }, { title: '源入库单', key: 'srcIn' }, { title: '原库位', render: d => binLink(d.bin) },
    { title: '调出 → 调入', render: d => `${whN[d.from]} → ${whN[d.to]}` }, { title: '退库原因', cls: 'wrap', render: d => esc(d.reason) }, { title: '状态', render: d => tag(d.status) },
  ];
  const wrap = el('<div class="bm-grow"></div>'); card.appendChild(wrap);
  let t;
  function apply() {
    wrap.innerHTML = '';
    const list = (st.tab === 'ret' ? retDocs : st.tab === 'ng' ? ng : inDocs).slice().sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : a.no < b.no ? 1 : -1);
    const rows = list.filter(d => match(d, st.q, ['no', 'mo', 'batch', 'productName']));
    t = table({ fill: true, rowKey: 'no', pageSize: 10, rows, columns: st.tab === 'ret' ? colsRet : colsIn, onRow: d => open(d) });
    wrap.appendChild(t); fb.setCount(`共 <b>${rows.length}</b> 张`);
    if (st.tab === 'ng') wrap.appendChild(el(`<div class="bm-note warn" style="margin-top:10px">不合格品处理流程：AOI/功能测试判定不良 → <b>不合格品入库</b>（不良品仓 WH05）→ 生成<b>返工生产订单</b>（单据类型=返工生产）→ 返工领料（更换 IC/补件）→ 返修 + AOI 复检 → 合格品入库。当前返工订单：${mos.filter(m => m.type === '返工生产').map(m => `${navLink('mo', m.no, m.no)} ${tag(m.status)}`).join('　')}</div>`));
  }
  apply();
  const row = el('<div class="row2 bm-dock"><div class="bm-card"><div class="bm-ct">近 14 天入库趋势<span class="ex">PCBA(PCS) / 元件(万PCS)</span></div><div class="ch c1"></div></div><div class="bm-card"><div class="bm-ct">入库产品结构<span class="ex">按入库金额</span></div><div class="ch c2"></div></div></div>');
  P.body.appendChild(row);
  const d14 = Array.from({ length: 14 }, (_, i) => addDays(TODAY, i - 13));
  P.chart(row.querySelector('.c1'), { tooltip: tip(), legend: legend(), grid: { left: 48, right: 48, top: 30, bottom: 22 }, xAxis: { type: 'category', data: d14.map(d => d.slice(5)), ...axisStyle },
    yAxis: [{ type: 'value', name: 'PCS', ...axisStyle }, { type: 'value', name: '万PCS', ...axisStyle, splitLine: { show: false } }],
    series: [{ name: 'PCBA 入库', type: 'bar', barWidth: 12, itemStyle: { color: '#1677ff', borderRadius: [3, 3, 0, 0] }, data: d14.map(d => ok.filter(x => x.date === d && moByNo[x.mo].isPCBA).reduce((a, x) => a + x.qty, 0)) },
      { name: '元件入库', type: 'line', yAxisIndex: 1, smooth: false, symbolSize: 6, itemStyle: { color: '#0fb5c9' }, areaStyle: { color: 'rgba(15,181,201,.1)' }, data: d14.map(d => +(ok.filter(x => x.date === d && !moByNo[x.mo].isPCBA).reduce((a, x) => a + x.qty, 0) / 1e4).toFixed(1)) },
      { name: '不合格品', type: 'bar', barWidth: 12, itemStyle: { color: '#f04438' }, data: d14.map(d => ng.filter(x => x.date === d).reduce((a, x) => a + x.qty, 0)) }] });
  const prodAmt = {}; ok.forEach(d => { const m = moByNo[d.mo]; const price = { '3.01.0001': 46.5, '3.01.0002': 22.8, '3.02.0001': 0.0062, '3.03.0001': 0.45, '3.04.0001': 0.29 }[d.product]; prodAmt[m.productName] = (prodAmt[m.productName] || 0) + d.qty * price; });
  P.chart(row.querySelector('.c2'), { tooltip: { trigger: 'item', valueFormatter: v => fmt(v, 0) + ' 元' }, series: [{ type: 'pie', radius: ['38%', '66%'], center: ['50%', '52%'], roseType: 'radius', itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 4 }, label: { fontSize: 11, formatter: p => `${p.name}\n${(p.value / 1e4).toFixed(1)}万` }, data: Object.entries(prodAmt).map(([name, value]) => ({ name, value: Math.round(value) })) }] });

  function open(d) {
    const m = moByNo[d.mo]; const isRet = !d.type; const q = oqc.find(x => x.no === d.oqc);
    const rw = d.type === '不合格品入库' ? mos.find(x => x.src === d.mo && x.type === '返工生产') : null;
    const ngStep = !rw ? 2 : rw.status === '结案' ? 5 : rw.status === '完工' ? 4 : ['开工', '下达'].includes(rw.status) ? 3 : 2;
    const body = `${steps(isRet ? ['退库申请', '审核', '立体库出库', '调入线边/复检', '重新入库'] : d.type === '不合格品入库' ? ['AOI判定不良', '不合格品入库', '生成返工订单', '返修复检', '合格品入库'] : ['生产汇报', 'OQC检验', '入库单审核', '堆垛机上架', '可出货'], isRet ? 3 : d.type === '不合格品入库' ? ngStep : d.status === '已审核' ? 5 : 2)}
      ${isRet ? `<div class="bm-note warn">退库原因：${esc(d.reason)}</div>` : ''}
      ${d.type === '不合格品入库' ? `<div class="bm-note err">不合格品 ${fmt(d.qty)} PCS 入不良品仓，已生成返工订单 ${mos.filter(x => x.src === d.mo && x.type === '返工生产').map(x => navLink('mo', x.no, x.no)).join('、') || '—'}</div>` : ''}
      ${desc([['单据日期', d.date], ['生产订单', navLink('mo', d.mo, d.mo)], ['单据类型', m.type], ['产品', esc(d.productName)], ['规格', esc(d.spec)], ['数量', `${fmt(d.qty)} ${d.unit}`], ['生产批号', navLink('trace', d.batch, d.batch)], ['仓库', isRet ? `${whN[d.from]} → ${whN[d.to]}` : whN[d.wh]], ['库位', binLink(d.bin)], ['产线', m.lineName], ['仓管员', d.keeper || '李仓管'], ['状态', tag(d.status)]])}
      ${q ? `<div class="bm-sec">OQC 出货检验</div>${desc([['检验单', q.no], ['抽样标准', `${q.aql} · GB/T 2828.1`], ['样本量', fmt(q.sample)], ['不良数', q.defects], ['检验员', q.inspector], ['结论', tag(q.result)]])}<div style="display:flex;gap:6px;flex-wrap:wrap">${q.items.map(i => q.result === '检验中' ? tag(i, 'default') : tag(i + ' ✓', 'success')).join('')}</div>` : ''}`;
    drawer(P, { width: 860, title: `${d.no} ${d.type ? tag(d.type) : tag('生产退库', 'warning')} ${tag(d.status)}`, sub: `${d.productName} · ${d.batch}`, body,
      footer: d.bin ? `<button class="bm-btn" data-f="trace">批次追溯</button><button class="bm-btn pri" data-f="bin">三维定位库位 ${d.bin}</button>` : '<button class="bm-btn" data-f="trace">批次追溯</button>',
      onFooter: f => { if (f === 'bin') { if (ctx && ctx.locateBin) ctx.locateBin(d.bin); P.toast(`三维定位库位 ${d.bin}`); } else if (ctx && ctx.navigate) ctx.navigate('trace', { id: d.batch }); } });
  }
  const pid = params.id; const hit = pid && [...inDocs, ...retDocs].find(d => d.no === pid); if (hit) P.timeout(() => open(hit), 60);
  return () => P.destroy();
}
