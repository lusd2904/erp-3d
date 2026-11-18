// 销售订单：接单 → 审核 → 投放生产 → 出货 → 关闭 —— 演示数据
import { page, kpis, filterBar, table, drawer, steps, desc, tag, bar, navLink, fmt, bigStr, esc, match, axisStyle, tip, legend, getParams, el } from './_ui.js';
import { salesOrders, soByNo, moByNo, shipments, customers, TODAY, addDays, dateDiff } from '../data/mock/index.js';

export const meta = { id: 'sales', title: '销售订单', group: '销售与计划', icon: 'order' };
const css = `.bm-sales .row3{display:grid;grid-template-columns:1.1fr 1.3fr 1fr;gap:12px}.bm-sales .ch{height:230px}`;
const FLOW = ['接单', '审核', '投放生产', '出货', '关闭'];
const flowIdx = s => ({ 已审核: 1, 生产中: 2, 部分出货: 3, 已关闭: 5 }[s] ?? 1);

export function mount(container, ctx, extra) {
  const P = page(container, ctx, { id: 'sales', icon: 'sales', title: '销售订单', crumb: ['供应链', '销售管理', '销售订单'], desc: '客户订单驱动生产订单投放与出货', styleId: 'bm-css-sales', css });
  const params = getParams(ctx, extra);
  P.action('<button class="bm-btn">MRP 运算</button>', () => P.toast('MRP 运算完成：建议投放生产订单 2 单、采购申请 3 单'));
  const amt = salesOrders.reduce((a, s) => a + s.amount, 0);
  const open = salesOrders.filter(s => s.status !== '已关闭');
  P.body.insertAdjacentHTML('beforeend', kpis([
    { label: '销售订单', value: salesOrders.length, unit: '单', icon: 'sales', sub: `客户 ${new Set(salesOrders.map(s => s.cust)).size} 家 · 10-11 月` },
    { label: '订单金额（含税）', value: bigStr(amt, 2).replace('万', ''), unit: '万元', icon: 'report', color: '#0fb5c9', sub: `未关闭 ${bigStr(open.reduce((a, s) => a + s.amount, 0), 1)}元` },
    { label: '生产中', value: salesOrders.filter(s => s.status === '生产中').length, unit: '单', icon: 'mo', color: '#f5a623', sub: `已审核待投产 ${salesOrders.filter(s => s.status === '已审核').length} 单` },
    { label: '部分出货', value: salesOrders.filter(s => s.status === '部分出货').length, unit: '单', icon: 'box', color: '#16b364', sub: `出货单 ${shipments.length} 张` },
    { label: '交期风险', value: salesOrders.filter(s => s.risk).length, unit: '单', icon: 'warn', color: '#f04438', sub: '3 天内到期且尚未全部出货' },
    { label: '准时交付率', value: '96.4', unit: '%', icon: 'check', color: '#7a5af8', sub: '近 30 天 · <span class="up">▲1.2%</span>' },
  ]));
  const card = el('<div class="bm-card bm-fill"></div>'); P.body.appendChild(card);
  const st = { q: '', status: '', cust: '' };
  const fb = filterBar([
    { key: 'q', type: 'search', placeholder: '订单号 / 客户 / 产品' },
    { key: 'status', type: 'seg', options: [{ v: '', l: '全部' }, '已审核', '生产中', '部分出货', '已关闭'], value: '' },
    { key: 'cust', type: 'select', label: '客户', options: customers.map(c => ({ v: c.code, l: c.short })) },
  ], v => { Object.assign(st, v); apply(); });
  card.appendChild(fb);
  const t = table({ fill: true, rowKey: 'no', pageSize: 10, onRow: r => openSo(r), columns: [
    { title: '销售订单号', render: r => `<a class="bm-link">${r.no}</a>`, sort: true, sortVal: r => r.no },
    { title: '客户', render: r => `${esc(r.custName)} <span class="mut">${r.cust}</span>` },
    { title: '订单日期', key: 'date', num: true, sort: true },
    { title: '产品明细', cls: 'wrap', width: 250, render: r => r.lines.map(l => `<div>${esc(l.name)} <span class="mut">${esc(l.spec)}</span></div>`).join('') },
    { title: '数量', align: 'r', num: true, render: r => r.lines.map(l => `<div>${fmt(l.qty)} ${l.unit}</div>`).join('') },
    { title: '金额(元)', align: 'r', num: true, render: r => fmt(r.amount, 2), sort: true, sortVal: r => r.amount },
    { title: '交货日期', num: true, render: r => `${r.delivery}${r.risk ? ' ' + tag('交期紧') : ''}`, sort: true, sortVal: r => r.delivery },
    { title: '出货进度', render: r => bar(100 * r.shipped / r.qty) },
    { title: '关联生产订单', cls: 'wrap', render: r => r.lines.flatMap(l => l.mos).map(n => navLink('mo', n, n)).join(' ') },
    { title: '状态', render: r => tag(r.status, null, true) },
    { title: '业务员', key: 'sales' },
  ] });
  card.appendChild(t);
  function apply() { const rows = salesOrders.filter(s => (!st.status || s.status === st.status) && (!st.cust || s.cust === st.cust) && (match(s, st.q, ['no', 'custName']) || s.lines.some(l => match(l, st.q, ['name', 'spec', 'product'])))); t.setRows(rows); fb.setCount(`共 <b>${rows.length}</b> 单 · 金额 <b>${bigStr(rows.reduce((a, s) => a + s.amount, 0), 1)}</b> 元`); }
  apply();

  const row = el('<div class="row3 bm-dock"><div class="bm-card"><div class="bm-ct">客户订单金额<span class="ex">万元</span></div><div class="ch c1"></div></div><div class="bm-card"><div class="bm-ct">接单 / 出货趋势<span class="ex">按周 · 千片（元件数量按 1/50 折算以便同轴）</span></div><div class="ch c2"></div></div><div class="bm-card"><div class="bm-ct">未来 14 天交付计划</div><div class="ch c3"></div></div></div>');
  P.body.appendChild(row);
  const byC = customers.map(c => ({ n: c.short, v: salesOrders.filter(s => s.cust === c.code).reduce((a, s) => a + s.amount, 0) / 1e4 })).sort((a, b) => a.v - b.v);
  P.chart(row.querySelector('.c1'), { tooltip: tip({ valueFormatter: v => v.toFixed(2) + ' 万元' }), grid: { left: 80, right: 40, top: 8, bottom: 20 }, xAxis: { type: 'value', ...axisStyle }, yAxis: { type: 'category', data: byC.map(x => x.n), ...axisStyle },
    series: [{ type: 'bar', barWidth: 12, data: byC.map(x => +x.v.toFixed(2)), itemStyle: { borderRadius: [0, 6, 6, 0], color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#8fbefc' }, { offset: 1, color: '#1677ff' }] } }, label: { show: true, position: 'right', fontSize: 11, color: '#56637a', formatter: p => p.value.toFixed(1) } }] });
  const weeks = ['10-05', '10-12', '10-19', '10-26', '11-02', '11-09'];
  const wk = d => { const md = d.slice(5); let k = 0; weeks.forEach((w, i) => { if (md >= w) k = i; }); return k; };
  const kq = (l) => l.unit === 'PCS' && l.qty > 100000 ? l.qty / 1000 / 50 : l.qty / 1000;
  const recv = weeks.map(() => 0), ship = weeks.map(() => 0);
  salesOrders.forEach(s => s.lines.forEach(l => { recv[wk(s.date)] += kq(l); }));
  shipments.forEach(d => { ship[wk(d.date)] += d.qty > 100000 ? d.qty / 1000 / 50 : d.qty / 1000; });
  P.chart(row.querySelector('.c2'), { tooltip: tip(), legend: legend(), grid: { left: 40, right: 12, top: 30, bottom: 22 }, xAxis: { type: 'category', data: weeks.map(w => w + '周'), ...axisStyle }, yAxis: { type: 'value', ...axisStyle },
    series: [{ name: '接单', type: 'bar', barWidth: 14, itemStyle: { borderRadius: [4, 4, 0, 0], color: '#1677ff' }, data: recv.map(v => +v.toFixed(1)) }, { name: '出货', type: 'line', smooth: true, symbolSize: 6, itemStyle: { color: '#16b364' }, areaStyle: { color: 'rgba(22,179,100,.10)' }, data: ship.map(v => +v.toFixed(1)) }] });
  const days = Array.from({ length: 14 }, (_, i) => addDays(TODAY, i));
  const due = days.map(d => salesOrders.filter(s => s.status !== '已关闭').flatMap(s => s.lines).filter(l => l.delivery === d).length);
  P.chart(row.querySelector('.c3'), { tooltip: tip(), grid: { left: 30, right: 10, top: 14, bottom: 22 }, xAxis: { type: 'category', data: days.map(d => d.slice(5)), ...axisStyle }, yAxis: { type: 'value', minInterval: 1, ...axisStyle },
    series: [{ type: 'bar', name: '到期订单行', barWidth: 10, data: due.map((v, i) => ({ value: v, itemStyle: { color: i < 3 ? '#f04438' : '#0fb5c9', borderRadius: [3, 3, 0, 0] } })) }] });

  function openSo(s) {
    const dns = shipments.filter(d => d.so === s.no);
    const body = `${steps(FLOW, flowIdx(s.status))}
      ${s.risk ? `<div class="bm-note err">交期预警：交货日期 3 天内。${s.lines.flatMap(l => l.mos).every(n => ['完工', '结案'].includes(moByNo[n].status)) ? (s.shipped >= s.qty ? '相关生产订单已完工并出货。' : '相关生产订单已完工，待出货。') : '相关生产订单尚未全部完工，请关注生产进度。'}</div>` : ''}
      ${desc([['客户', `${esc(s.custName)}（${s.cust}）`], ['订单日期', s.date], ['业务员', s.sales], ['币别', '人民币 CNY'], ['税率', '13%'], ['价税合计', `<b>${fmt(s.amount, 2)}</b> 元`], ['交货方式', '送货上门'], ['收货地址', '客户工厂'], ['单据状态', tag(s.status)]])}
      <div class="bm-sec">订单明细</div><div class="tw1"></div><div class="bm-sec">出货记录</div><div class="tw2"></div>`;
    const D = drawer(P, { width: 1000, title: `${s.no} ${tag(s.status, null, true)}`, sub: `${s.custName} · 共 ${s.lines.length} 行`, body, footer: '<button class="bm-btn" data-f="close">关闭</button><button class="bm-btn pri" data-f="dn">下推出货通知</button>',
      onFooter: (f, close) => { if (f === 'close') close(); else P.toast(`已生成出货通知单：${s.no}`); } });
    D.body.querySelector('.tw1').appendChild(table({ pageSize: 0, columns: [
      { title: '产品', render: l => `<div>${esc(l.name)}</div><div class="mut" style="font-size:11.5px">${l.product} · ${esc(l.spec)}</div>` }, { title: '数量', align: 'r', num: true, render: l => `${fmt(l.qty)} ${l.unit}` },
      { title: '含税单价', align: 'r', num: true, render: l => fmt(l.price, l.price < 1 ? 4 : 2) }, { title: '金额', align: 'r', num: true, render: l => fmt(l.amount, 2) }, { title: '交货日期', key: 'delivery', num: true },
      { title: '已出货', align: 'r', num: true, render: l => fmt(l.shipped) }, { title: '出货进度', render: l => bar(100 * l.shipped / l.qty) },
      { title: '生产订单 / 状态', render: l => l.mos.map(n => `${navLink('mo', n, n)} ${tag(moByNo[n].status)}`).join('<br>') } ], rows: s.lines }));
    D.body.querySelector('.tw2').appendChild(dns.length ? table({ pageSize: 0, columns: [{ title: '出货单号', key: 'no' }, { title: '日期', key: 'date', num: true }, { title: '产品', render: d => esc(d.productName) }, { title: '批号', render: d => navLink('trace', d.batch, d.batch) }, { title: '数量', align: 'r', num: true, render: d => fmt(d.qty) }, { title: '承运商', key: 'carrier' }, { title: '运单号', key: 'track', num: true }, { title: '状态', render: d => tag(d.status, 'success') }], rows: dns }) : el('<div class="bm-empty">暂无出货记录</div>'));
  }
  const pid = params.id || params.so;
  if (pid && soByNo[pid]) { t.select(pid); P.timeout(() => openSo(soByNo[pid]), 60); }
  return () => P.destroy();
}
