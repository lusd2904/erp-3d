// 查询报表：生产订单执行明细/汇总、生产领料差异汇总、生产入库月报 —— 演示数据
import { page, tabs, filterBar, table, tag, bar, navLink, fmt, esc, match, axisStyle, tip, legend, getParams, el, ICON } from './_ui.js';
import { mos, ppbomByMo, inDocs, materialByCode, TODAY } from '../data/mock/index.js';

export const meta = { id: 'reports', title: '查询报表', group: '查询报表', icon: 'report' };
const css = `.bm-reports .ch{height:260px}.bm-reports .hint{font-size:12px;color:var(--tx3);margin:-2px 0 8px}`;
const RPT = [
  { key: 'detail', label: '生产订单执行明细表', hint: '逐单展示计划/完工/合格/入库及完工率、入库率，反映订单执行进度与偏差' },
  { key: 'summary', label: '生产订单执行汇总表', hint: '按产品 × 产线汇总订单数、计划数、完工数、入库数与达成率' },
  { key: 'diff', label: '生产领料差异汇总表', hint: '实发数 = 领料 + 补料 − 退料（含倒冲）；差异 = 实发 − 按完工数折算的标准用量；仅统计完工/结案订单（在制订单线边余料不计差异）' },
  { key: 'month', label: '生产入库月报表', hint: '按产品统计 10 月 / 11 月（截至今日）合格品、不合格品入库数量与金额；入库金额为合格品毛入库（不含退库）' },
];
const PRICE = { '3.01.0001': 46.5, '3.01.0002': 22.8, '3.02.0001': 0.0062, '3.03.0001': 0.45, '3.04.0001': 0.29 };
const qty = (n, isBig) => !n ? '<span class="mut">—</span>' : isBig ? `${fmt(n / 1e4, 1)}万` : fmt(n);

export function mount(container, ctx, extra) {
  const P = page(container, ctx, { id: 'reports', icon: 'table', title: '查询报表', crumb: ['生产制造', '生产管理', '查询报表'], desc: '对应金蝶生产管理标准报表', styleId: 'bm-css-reports', css });
  const params = getParams(ctx, extra);
  P.action(`<button class="bm-btn">${ICON.export}导出 Excel</button>`, () => P.toast(`已导出「${RPT.find(r => r.key === st.rpt).label}」`));
  P.action('<button class="bm-btn">打印</button>', () => P.toast('已发送打印'));
  const st = { rpt: RPT.some(r => r.key === params.report) ? params.report : 'detail', period: '', line: '', q: '' };
  const card = el('<div class="bm-card bm-fill"></div>'); P.body.appendChild(card);
  card.appendChild(tabs(RPT.map(r => ({ key: r.key, label: r.label })), st.rpt, k => { st.rpt = k; render(); }));
  const hint = el('<div class="hint"></div>'); card.appendChild(hint);
  const fb = filterBar([{ key: 'period', type: 'seg', options: [{ v: '', l: '全部期间' }, { v: '2026-10', l: '2026年10月' }, { v: '2026-11', l: '2026年11月' }], value: '' }, { key: 'line', type: 'select', label: '产线', options: [{ v: 'L1', l: 'SMT线1' }, { v: 'L2', l: 'SMT线2' }, { v: 'L3', l: '编带/测试线' }] }, { key: 'q', type: 'search', placeholder: '订单 / 产品 / 物料' }], v => { Object.assign(st, v); render(); });
  card.appendChild(fb);
  const tw = el('<div class="bm-grow"></div>'); card.appendChild(tw);
  const cc = el('<div class="bm-card bm-dock"><div class="bm-ct ct"></div><div class="ch"></div></div>'); P.body.appendChild(cc);
  const chart = P.chart(cc.querySelector('.ch'), {});
  const inPeriod = d => !st.period || d.startsWith(st.period);
  const moF = () => mos.filter(m => (!st.line || m.line === st.line) && (inPeriod(m.planStart) || inPeriod(m.planEnd)) && match(m, st.q, ['no', 'productName', 'spec']));
  function render() {
    hint.textContent = RPT.find(r => r.key === st.rpt).hint; tw.innerHTML = '';
    let t, opt, title;
    if (st.rpt === 'detail') {
      const rows = moF().sort((a, b) => a.no < b.no ? 1 : -1);
      t = table({ fill: true, rows, pageSize: 12, columns: [
        { title: '生产订单', render: m => navLink('mo', m.no, m.no) }, { title: '类型', render: m => tag(m.type) }, { title: '产品', render: m => `${esc(m.productName)} <span class="mut">${esc(m.spec)}</span>` }, { title: '产线', render: m => m.lineName },
        { title: '计划开工', key: 'planStart', num: true }, { title: '计划完工', key: 'planEnd', num: true }, { title: '计划数', align: 'r', num: true, render: m => fmt(m.qty) }, { title: '完工数', align: 'r', num: true, render: m => fmt(m.done) },
        { title: '合格数', align: 'r', num: true, render: m => fmt(m.good) }, { title: '不良数', align: 'r', num: true, render: m => m.bad ? `<span class="em">${fmt(m.bad)}</span>` : '0' }, { title: '入库数', align: 'r', num: true, render: m => fmt(m.inQty) },
        { title: '未入库', align: 'r', num: true, render: m => fmt(Math.max(0, m.good - m.inQty)) }, { title: '完工率', render: m => bar(100 * m.done / m.qty) }, { title: '入库率', align: 'r', num: true, render: m => (100 * m.inQty / m.qty).toFixed(1) + '%' }, { title: '状态', render: m => tag(m.status) }],
        foot: r => ['合计', `${r.length} 单`, '', '', '', '', '', '', '', fmt(r.reduce((a, m) => a + m.bad, 0)), '', '', '', '', ''] });
      title = '订单完工率 / 入库率'; const top = rows.filter(m => m.done > 0).slice(0, 16).reverse();
      opt = { tooltip: tip({ valueFormatter: v => v + '%' }), legend: legend(), grid: { left: 40, right: 10, top: 30, bottom: 40 }, xAxis: { type: 'category', data: top.map(m => m.no.slice(2)), ...axisStyle, axisLabel: { ...axisStyle.axisLabel, rotate: 30 } }, yAxis: { type: 'value', max: 100, ...axisStyle },
        series: [{ name: '完工率', type: 'bar', barWidth: 10, itemStyle: { color: '#1677ff', borderRadius: [3, 3, 0, 0] }, data: top.map(m => +(100 * m.done / m.qty).toFixed(1)) }, { name: '入库率', type: 'bar', barWidth: 10, itemStyle: { color: '#16b364', borderRadius: [3, 3, 0, 0] }, data: top.map(m => +(100 * m.inQty / m.qty).toFixed(1)) }] };
    } else if (st.rpt === 'summary') {
      const g = {}; moF().forEach(m => { const k = m.product + '|' + m.line; const x = g[k] = g[k] || { product: m.product, name: m.productName, spec: m.spec, line: m.lineName, n: 0, qty: 0, done: 0, good: 0, inQty: 0, rw: 0, big: m.qty >= 100000 }; x.n++; x.qty += m.qty; x.done += m.done; x.good += m.good; x.inQty += m.inQty; if (m.type === '返工生产') x.rw++; });
      const rows = Object.values(g);
      t = table({ rows, pageSize: 0, columns: [{ title: '产品编码', key: 'product' }, { title: '产品', render: x => `${esc(x.name)} <span class="mut">${esc(x.spec)}</span>` }, { title: '产线', key: 'line' }, { title: '订单数', align: 'r', num: true, key: 'n' }, { title: '其中返工', align: 'r', num: true, key: 'rw' },
        { title: '计划数', align: 'r', num: true, render: x => qty(x.qty, x.big) }, { title: '完工数', align: 'r', num: true, render: x => qty(x.done, x.big) }, { title: '合格率', align: 'r', num: true, render: x => x.done ? (100 * x.good / x.done).toFixed(2) + '%' : '—' }, { title: '入库数', align: 'r', num: true, render: x => qty(x.inQty, x.big) }, { title: '达成率', render: x => bar(100 * x.done / x.qty) }],
        foot: r => ['合计', '', '', r.reduce((a, x) => a + x.n, 0), r.reduce((a, x) => a + x.rw, 0), '', '', '', '', ''] });
      title = '产品 × 产线 达成率';
      opt = { tooltip: tip({ valueFormatter: v => v + '%' }), grid: { left: 180, right: 50, top: 10, bottom: 20 }, xAxis: { type: 'value', max: 100, ...axisStyle }, yAxis: { type: 'category', data: rows.map(x => `${x.name}·${x.line}`), ...axisStyle },
        series: [{ type: 'bar', barWidth: 12, itemStyle: { color: '#1677ff', borderRadius: [0, 6, 6, 0] }, label: { show: true, position: 'right', formatter: '{c}%', fontSize: 11 }, data: rows.map(x => +(100 * x.done / x.qty).toFixed(1)) }] };
    } else if (st.rpt === 'diff') {
      const g = {};
      mos.filter(m => (!st.line || m.line === st.line) && (inPeriod(m.planStart) || inPeriod(m.planEnd)) && ['完工', '结案'].includes(m.status)).forEach(m => ppbomByMo[m.no].lines.forEach(l => { const iss = l.issue === '倒冲' ? l.backflush : l.picked + l.supp - l.ret; const std = l.std * (m.done / m.qty); const x = g[l.code] = g[l.code] || { code: l.code, name: l.name, spec: l.spec, unit: l.unit, std: 0, picked: 0, supp: 0, ret: 0, bf: 0, iss: 0, mos: 0 }; x.std += std; x.picked += l.issue === '倒冲' ? 0 : l.picked; x.supp += l.supp; x.ret += l.ret; x.bf += l.issue === '倒冲' ? l.backflush : 0; x.iss += iss; x.mos++; }));
      const rows = Object.values(g).map(x => ({ ...x, diff: x.iss - x.std, rate: x.std ? 100 * (x.iss - x.std) / x.std : 0, amt: (x.iss - x.std) * materialByCode[x.code].price })).filter(x => match(x, st.q, ['code', 'name', 'spec']) || !st.q).sort((a, b) => b.amt - a.amt);
      const d2 = u => (u === 'kg' || u === '罐' || u === '片') ? 2 : 0;
      t = table({ fill: true, rows, pageSize: 12, columns: [{ title: '物料编码', key: 'code' }, { title: '物料', render: x => `${esc(x.name)} <span class="mut">${esc(x.spec)}</span>` }, { title: '订单数', align: 'r', num: true, key: 'mos' }, { title: '标准用量', align: 'r', num: true, render: x => fmt(x.std, d2(x.unit)) },
        { title: '领料', align: 'r', num: true, render: x => fmt(x.picked, d2(x.unit)) }, { title: '补料', align: 'r', num: true, render: x => x.supp ? fmt(x.supp) : '—' }, { title: '退料', align: 'r', num: true, render: x => x.ret ? fmt(x.ret) : '—' }, { title: '倒冲', align: 'r', num: true, render: x => x.bf ? fmt(x.bf, d2(x.unit)) : '—' },
        { title: '实发', align: 'r', num: true, render: x => fmt(x.iss, d2(x.unit)) }, { title: '差异', align: 'r', num: true, render: x => `<span class="${x.rate > 1 ? 'em' : ''}">${x.diff > 0 ? '+' : ''}${fmt(x.diff, d2(x.unit))}</span>` }, { title: '差异率', align: 'r', num: true, render: x => `<span class="${x.rate > 1 ? 'em' : ''}">${x.rate.toFixed(2)}%</span>`, sort: true, sortVal: x => x.rate },
        { title: '差异金额(元)', align: 'r', num: true, render: x => fmt(x.amt, 2), sort: true, sortVal: x => x.amt }, { title: '判定', render: x => x.rate > 1.5 ? tag('超耗', 'danger') : x.rate > 0.8 ? tag('关注', 'warning') : tag('正常', 'success') }],
        foot: r => ['合计', '', '', '', '', '', '', '', '', '', '', fmt(r.reduce((a, x) => a + x.amt, 0), 2), ''] });
      title = '领料差异率 Top 12（%）'; const top = rows.slice().sort((a, b) => b.rate - a.rate).slice(0, 12);
      opt = { tooltip: tip({ valueFormatter: v => v + '%' }), grid: { left: 40, right: 10, top: 20, bottom: 54 }, xAxis: { type: 'category', data: top.map(x => x.spec.split(' ').slice(0, 2).join(' ')), ...axisStyle, axisLabel: { ...axisStyle.axisLabel, rotate: 28, interval: 0 } }, yAxis: { type: 'value', ...axisStyle },
        series: [{ type: 'bar', barWidth: 16, data: top.map(x => ({ value: +x.rate.toFixed(2), itemStyle: { color: x.rate > 1.5 ? '#f04438' : x.rate > 0.8 ? '#f5a623' : '#16b364', borderRadius: [3, 3, 0, 0] } })), markLine: { silent: true, symbol: 'none', lineStyle: { color: '#f04438', type: 'dashed' }, label: { formatter: '超耗线 1.5%', fontSize: 10 }, data: [{ yAxis: 1.5 }] } }] };
    } else {
      const months = st.period ? [st.period] : ['2026-10', '2026-11'];
      const ds = inDocs.filter(d => (!st.line || d.line === st.line) && months.some(mm => d.date.startsWith(mm)) && match(d, st.q, ['productName', 'mo', 'batch']));
      const g = {}; ds.forEach(d => { const k = d.product; const x = g[k] = g[k] || { product: k, name: d.productName, spec: d.spec, unit: d.unit, big: !['3.01.0001', '3.01.0002'].includes(k) }; months.forEach(mm => { x[mm + 'ok'] = x[mm + 'ok'] || 0; x[mm + 'ng'] = x[mm + 'ng'] || 0; }); const mm = d.date.slice(0, 7); x[mm + (d.type === '合格品入库' ? 'ok' : 'ng')] += d.qty; });
      const rows = Object.values(g).map(x => ({ ...x, amt: months.reduce((a, mm) => a + (x[mm + 'ok'] || 0), 0) * PRICE[x.product] }));
      const cols = [{ title: '产品编码', key: 'product' }, { title: '产品', render: x => `${esc(x.name)} <span class="mut">${esc(x.spec)}</span>` }];
      months.forEach(mm => { cols.push({ title: `${mm.slice(5)}月 合格入库`, align: 'r', num: true, render: x => qty(x[mm + 'ok'] || 0, x.big) }, { title: `${mm.slice(5)}月 不合格`, align: 'r', num: true, render: x => x[mm + 'ng'] ? `<span class="em">${fmt(x[mm + 'ng'])}</span>` : '—' }); });
      cols.push({ title: '入库金额(元)', align: 'r', num: true, render: x => fmt(x.amt, 2) }, { title: '单位', key: 'unit' });
      t = table({ rows, pageSize: 0, columns: cols, foot: r => ['合计', '', ...months.flatMap(() => ['', '']), fmt(r.reduce((a, x) => a + x.amt, 0), 2), ''] });
      title = '月度入库金额（万元）';
      opt = { tooltip: tip(), legend: legend(), grid: { left: 50, right: 10, top: 30, bottom: 22 }, xAxis: { type: 'category', data: rows.map(x => x.name), ...axisStyle, axisLabel: { ...axisStyle.axisLabel, interval: 0 } }, yAxis: { type: 'value', ...axisStyle },
        series: months.map((mm, i) => ({ name: `${mm.slice(5)}月${mm === '2026-11' ? '（截至' + TODAY.slice(5) + '）' : ''}`, type: 'bar', barWidth: 18, itemStyle: { color: ['#8fbefc', '#1677ff'][i] || '#1677ff', borderRadius: [3, 3, 0, 0] }, data: rows.map(x => +((x[mm + 'ok'] || 0) * PRICE[x.product] / 1e4).toFixed(2)) })) };
    }
    tw.appendChild(t); fb.setCount(''); cc.querySelector('.ct').textContent = title;
    chart && chart.setOption(opt, true);
  }
  render();
  return () => P.destroy();
}
