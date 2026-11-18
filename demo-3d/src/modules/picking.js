// 生产领料 / 补料 / 退料：按用料清单领料，批次先进先出，库位可三维定位 —— 演示数据
import { page, kpis, tabs, filterBar, table, drawer, tag, navLink, binLink, desc, fmt, esc, match, axisStyle, tip, legend, getParams, el, steps } from './_ui.js';
import { pickDocs, moByNo, materialByCode, warehouses, TODAY, addDays } from '../data/mock/index.js';

export const meta = { id: 'picking', title: '领料/退料/补料', group: '生产管理', icon: 'pick' };
const css = `.bm-picking .row2{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:12px}.bm-picking .ch{height:240px}`;
const whN = Object.fromEntries(warehouses.map(w => [w.code, w.name]));
const amount = d => d.lines.reduce((a, l) => a + l.qty * materialByCode[l.code].price, 0);

export function mount(container, ctx, extra) {
  const P = page(container, ctx, { id: 'picking', icon: 'pick', title: '生产领料 / 补料 / 退料', crumb: ['生产制造', '生产管理', '生产领料'], desc: '原材料立体库 → 线边仓，AGV 配送', styleId: 'bm-css-picking', css });
  const params = getParams(ctx, extra);
  P.action('<button class="bm-btn">成套领料</button>', () => P.toast('已按已下达订单生成成套领料申请'));
  const c = t => pickDocs.filter(d => d.type === t);
  const suppAmt = c('补料').reduce((a, d) => a + amount(d), 0);
  P.body.insertAdjacentHTML('beforeend', kpis([
    { label: '领料单', value: c('领料').length, unit: '张', icon: 'pick', sub: `物料行 ${c('领料').reduce((a, d) => a + d.lines.length, 0)} 行` },
    { label: '补料单', value: c('补料').length, unit: '张', icon: 'warn', color: '#f5a623', sub: `补料金额 ${fmt(suppAmt, 0)} 元` },
    { label: '退料单', value: c('退料').length, unit: '张', icon: 'instock', color: '#0fb5c9', sub: '完工余料退回立体库' },
    { label: '领料金额', value: fmt(c('领料').reduce((a, d) => a + amount(d), 0) / 1e4, 1), unit: '万元', icon: 'report', color: '#16b364', sub: '10-11 月累计' },
    { label: '今日待配送', value: pickDocs.filter(d => d.date === TODAY).length, unit: '张', icon: 'clock', color: '#7a5af8', sub: 'AGV-01 / AGV-02 执行中' },
  ]));
  const card = el('<div class="bm-card bm-fill"></div>'); P.body.appendChild(card);
  const st = { tab: params.type || 'all', q: '', line: '' };
  card.appendChild(tabs([{ key: 'all', label: '全部单据', count: pickDocs.length }, { key: '领料', label: '生产领料单', count: c('领料').length }, { key: '补料', label: '生产补料单', count: c('补料').length }, { key: '退料', label: '生产退料单', count: c('退料').length }], st.tab, k => { st.tab = k; apply(); }));
  const fb = filterBar([{ key: 'q', type: 'search', placeholder: '单号 / 生产订单 / 物料 / 批号' }, { key: 'line', type: 'select', label: '产线', options: [{ v: 'L1', l: 'SMT线1' }, { v: 'L2', l: 'SMT线2' }, { v: 'L3', l: '编带/测试线' }] }], v => { Object.assign(st, v); apply(); });
  card.appendChild(fb);
  const t = table({ fill: true, rowKey: 'no', pageSize: 10, onRow: d => open(d), columns: [
    { title: '单据编号', render: d => `<a class="bm-link">${d.no}</a>`, sort: true, sortVal: d => d.no },
    { title: '单据类型', render: d => tag(d.type) }, { title: '业务类型', key: 'bizType' },
    { title: '日期', key: 'date', num: true, sort: true },
    { title: '生产订单', render: d => navLink('mo', d.mo, d.mo) },
    { title: '产品', render: d => esc(moByNo[d.mo].productName) },
    { title: '产线', render: d => moByNo[d.mo].lineName },
    { title: '物料行', align: 'r', num: true, render: d => d.lines.length },
    { title: '金额(元)', align: 'r', num: true, render: d => fmt(amount(d), 2), sort: true, sortVal: amount },
    { title: '发料仓 → 收料仓', render: d => `${whN[d.fromWh]} → ${whN[d.toWh]}` },
    { title: '经办', key: 'picker' },
    { title: '原因', cls: 'wrap', render: d => d.reason ? `<span style="color:${d.type === '补料' ? '#c47f00' : 'inherit'}">${esc(d.reason)}</span>` : '<span class="mut">按用料清单</span>' },
    { title: '状态', render: d => tag(d.status) },
  ] });
  card.appendChild(t);
  function apply() {
    const rows = pickDocs.filter(d => (st.tab === 'all' || d.type === st.tab) && (!st.line || d.line === st.line) && (match(d, st.q, ['no', 'mo', 'reason']) || d.lines.some(l => match(l, st.q, ['code', 'name', 'spec']) || (l.lots || []).some(x => match(x, st.q, ['lotNo'])))));
    t.setRows(rows); fb.setCount(`共 <b>${rows.length}</b> 张`);
  }
  apply();
  const row = el('<div class="row2 bm-dock"><div class="bm-card"><div class="bm-ct">近 14 天领/补/退料单据<span class="ex">按单据日期</span></div><div class="ch c1"></div></div><div class="bm-card"><div class="bm-ct">补料金额构成<span class="ex">超耗原因</span></div><div class="ch c2"></div></div></div>');
  P.body.appendChild(row);
  const days = Array.from({ length: 14 }, (_, i) => addDays(TODAY, i - 13));
  P.chart(row.querySelector('.c1'), { tooltip: tip(), legend: legend(), grid: { left: 30, right: 10, top: 30, bottom: 22 }, xAxis: { type: 'category', data: days.map(d => d.slice(5)), ...axisStyle }, yAxis: { type: 'value', minInterval: 1, ...axisStyle },
    series: [['领料', '#1677ff'], ['补料', '#f5a623'], ['退料', '#0fb5c9']].map(([k, col]) => ({ name: k, type: 'bar', stack: 'a', barWidth: 14, itemStyle: { color: col }, data: days.map(d => pickDocs.filter(x => x.type === k && x.date === d).length) })) });
  P.chart(row.querySelector('.c2'), { tooltip: { trigger: 'item', valueFormatter: v => fmt(v, 2) + ' 元' }, series: [{ type: 'pie', radius: ['40%', '68%'], center: ['50%', '52%'], itemStyle: { borderColor: '#fff', borderWidth: 2 }, label: { fontSize: 11, formatter: p => `${p.name}\n${fmt(p.value, 0)} 元` },
    data: c('补料').map(d => ({ name: `${/抛料/.test(d.reason) ? '贴片抛料超标' : /DF|测试/.test(d.reason) ? '测试分选超损耗' : /AOI/.test(d.reason) ? 'AOI缺件返修' : /换线/.test(d.reason) ? '换线调机损耗' : '返修IC损坏'}(${d.mo.slice(2)})`, value: +amount(d).toFixed(2) })) }] });

  function open(d) {
    const m = moByNo[d.mo];
    const flat = d.lines.flatMap(l => (l.lots && l.lots.length ? l.lots : [{ lotNo: '—', qty: l.qty, bin: '' }]).map((x, i) => ({ ...l, lot: x, first: i === 0, n: l.lots ? l.lots.length : 1 })));
    const body = el(`<div style="display:flex;flex-direction:column;gap:12px">${steps(d.type === '退料' ? ['线边清点', '退料申请', '质检确认', '立体库入库', '过账'] : ['领料申请', '审核', '立体库出库', 'AGV 配送', '线边签收'], 5)}
      ${d.reason ? `<div class="bm-note ${d.type === '补料' ? 'warn' : ''}">${d.type}原因：${esc(d.reason)}</div>` : ''}
      ${desc([['单据类型', tag(d.type)], ['业务类型', d.bizType], ['日期', d.date], ['生产订单', navLink('mo', d.mo, d.mo)], ['产品', esc(m.productName)], ['产线', m.lineName], ['发料仓', whN[d.fromWh]], ['收料仓', whN[d.toWh]], ['经办人', d.picker]])}
      <div class="bm-sec">物料明细（按批次先进先出拣选，点击库位在三维立体库中定位）</div><div class="tw"></div></div>`);
    body.querySelector('.tw').appendChild(table({ pageSize: 0, foot: rows => ['合计', '', '', '', '', fmt(d.lines.reduce((a, l) => a + l.qty * materialByCode[l.code].price, 0), 2), ''], columns: [
      { title: '物料', render: r => r.first ? `<div>${esc(r.name)}</div><div class="mut" style="font-size:11.5px">${r.code} · ${esc(r.spec)}</div>` : '<span class="mut">〃</span>' },
      { title: '批号', render: r => r.lot.lotNo === '—' ? '—' : navLink('trace', r.lot.lotNo, r.lot.lotNo) },
      { title: '库位', render: r => binLink(r.lot.bin) },
      { title: '数量', align: 'r', num: true, render: r => fmt(r.lot.qty, r.unit === 'kg' || r.unit === '罐' ? 2 : 0) },
      { title: '单位', key: 'unit' },
      { title: '金额(元)', align: 'r', num: true, render: r => fmt(r.lot.qty * materialByCode[r.code].price, 2) },
      { title: '包装', render: r => esc(materialByCode[r.code].packing) } ], rows: flat }));
    drawer(P, { width: 920, title: `${d.no} ${tag(d.type)} ${tag(d.status)}`, sub: `${m.no} · ${m.productName}`, body, footer: '<button class="bm-btn" data-f="print">打印拣货单</button><button class="bm-btn pri" data-f="agv">呼叫 AGV 配送</button>',
      onFooter: f => { if (f === 'agv') { if (ctx && ctx.focusDevice) ctx.focusDevice('AGV-01'); P.toast('已呼叫 AGV-01 配送'); } else P.toast('拣货单已发送打印'); } });
  }
  const pid = params.id; const hit = pid && pickDocs.find(d => d.no === pid); if (hit) { t.select(pid); P.timeout(() => open(hit), 60); }
  return () => P.destroy();
}
