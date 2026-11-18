// 生产汇报：产线、生产订单、完成数、累计数、人时/机时、停线原因（设备故障/欠料等） —— 演示数据
import { page, kpis, filterBar, table, drawer, tag, bar, navLink, devLink, desc, fmt, esc, match, axisStyle, tip, legend, getParams, el, steps } from './_ui.js';
import { reports, moByNo, TODAY, addDays, reportTypes } from '../data/mock/index.js';
import { deviceById } from '../data/plant.js';

export const meta = { id: 'prodreport', title: '生产汇报', group: '生产管理', icon: 'report' };
const css = `.bm-prodreport .row3{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr) minmax(0,1fr);gap:12px}.bm-prodreport .ch{height:240px}
.bm-prodreport .alert{display:flex;gap:10px;align-items:center;padding:9px 14px;border-radius:10px;background:#fff5f4;border:1px solid #fcc9c5;color:#b42318;font-size:12.5px}`;
const STOP_COL = { 设备故障: '#f04438', 欠料停线: '#f5a623', 换线调机: '#2e90fa', 来料不良: '#7a5af8', 品质异常: '#ee46bc', 正常汇报: '#16b364' };
const kq = r => r.unit === 'PCS' && r.planQty >= 100000 ? `${fmt(r.qty / 1000, 1)}K` : fmt(r.qty);

export function mount(container, ctx, extra) {
  const P = page(container, ctx, { id: 'prodreport', icon: 'report', title: '生产汇报', crumb: ['生产制造', '生产管理', '生产汇报单'], desc: '按班次汇报完成数、工时与异常停线', styleId: 'bm-css-prodreport', css });
  const params = getParams(ctx, extra);
  P.action('<button class="bm-btn pri">新增汇报单</button>', () => P.toast('请在车间终端扫码报工，自动生成汇报单'));
  const today = reports.filter(r => r.date === TODAY), week = reports.filter(r => r.date > addDays(TODAY, -7));
  const pcba = today.filter(r => r.line !== 'L3').reduce((a, r) => a + r.qty, 0), chips = today.filter(r => r.line === 'L3').reduce((a, r) => a + r.qty, 0);
  const stops = week.filter(r => r.stopMin && r.stopType !== '正常汇报');
  P.body.insertAdjacentHTML('beforeend', kpis([
    { label: '今日 PCBA 完成', value: fmt(pcba), unit: 'PCS', icon: 'report', sub: `SMT线1/2 · 汇报 ${today.filter(r => r.line !== 'L3').length} 单` },
    { label: '今日元件完成', value: fmt(chips / 1e4, 1), unit: '万PCS', icon: 'box', color: '#0fb5c9', sub: `编带/测试线 · ${today.filter(r => r.line === 'L3').length} 单` },
    { label: '近7天人时', value: fmt(week.reduce((a, r) => a + r.manHours, 0), 0), unit: 'h', icon: 'clock', color: '#16b364', sub: `机时 ${fmt(week.reduce((a, r) => a + r.machHours, 0), 0)} h` },
    { label: '近7天停线', value: fmt(stops.reduce((a, r) => a + r.stopMin, 0)), unit: 'min', icon: 'warn', color: '#f04438', sub: `${stops.length} 次 · 设备故障 ${stops.filter(r => r.stopType === '设备故障').length} 次` },
    { label: '汇报良率', value: (100 * week.reduce((a, r) => a + r.good, 0) / Math.max(1, week.reduce((a, r) => a + r.qty, 0))).toFixed(2), unit: '%', icon: 'check', color: '#7a5af8', sub: '近7天 · 合格数/完成数（含未审核）' },
  ]));
  const live = today.filter(r => r.stopType === '设备故障');
  if (live.length) P.body.appendChild(el(`<div class="alert"><b>今日异常</b>${live.map(r => `${r.line} ${esc(r.stopDesc)}（停线 ${r.stopMin} min） ${devLink(r.device)}`).join('　')}</div>`));
  const card = el('<div class="bm-card bm-fill"></div>'); P.body.appendChild(card);
  const st = { q: '', line: '', type: '' };
  const fb = filterBar([{ key: 'q', type: 'search', placeholder: '汇报单 / 生产订单 / 班组' }, { key: 'line', type: 'seg', options: [{ v: '', l: '全部产线' }, { v: 'L1', l: 'SMT线1' }, { v: 'L2', l: 'SMT线2' }, { v: 'L3', l: '编带/测试线' }], value: '' }, { key: 'type', type: 'select', label: '汇报类型', options: reportTypes }], v => { Object.assign(st, v); apply(); });
  card.appendChild(fb);
  const t = table({ fill: true, rowKey: 'no', pageSize: 10, onRow: r => open(r), columns: [
    { title: '汇报单号', render: r => `<a class="bm-link">${r.no}</a>` }, { title: '日期', key: 'date', num: true, sort: true }, { title: '班次', render: r => tag(r.shift, r.shift === '白班' ? 'info' : 'purple') },
    { title: '产线', render: r => moByNo[r.mo].lineName }, { title: '班组', key: 'team' },
    { title: '生产订单', render: r => navLink('mo', r.mo, r.mo) }, { title: '产品', render: r => esc(r.productName) },
    { title: '完成数', align: 'r', num: true, render: r => kq(r), sort: true, sortVal: r => r.qty }, { title: '不良', align: 'r', num: true, render: r => r.bad ? `<span class="em">${fmt(r.bad)}</span>` : '0' },
    { title: '累计 / 计划', render: r => bar(100 * r.cum / r.planQty) },
    { title: '人时', align: 'r', num: true, key: 'manHours', render: r => r.manHours.toFixed(1) }, { title: '机时', align: 'r', num: true, render: r => r.machHours.toFixed(1) },
    { title: '停线', render: r => r.stopMin ? `${tag(r.stopType, r.stopType === '正常汇报' ? 'default' : null)} <span class="bm-mono">${r.stopMin}′</span>` : '<span class="mut">—</span>', sort: true, sortVal: r => r.stopMin },
    { title: '设备', render: r => r.device ? devLink(r.device) : '<span class="mut">—</span>' }, { title: '状态', render: r => tag(r.status) },
  ] });
  card.appendChild(t);
  function apply() { const rows = reports.filter(r => (!st.line || r.line === st.line) && (!st.type || r.reportType === st.type) && match(r, st.q, ['no', 'mo', 'team', 'productName'])); t.setRows(rows); fb.setCount(`共 <b>${rows.length}</b> 单`); }
  apply();
  const row = el('<div class="row3 bm-dock"><div class="bm-card"><div class="bm-ct">停线原因分布<span class="ex">近 14 天 · 分钟</span></div><div class="ch c1"></div></div><div class="bm-card"><div class="bm-ct">每日停线时长<span class="ex">按原因堆叠</span></div><div class="ch c2"></div></div><div class="bm-card"><div class="bm-ct">产线工时与效率<span class="ex">近 7 天</span></div><div class="ch c3"></div></div></div>');
  P.body.appendChild(row);
  const d14 = Array.from({ length: 14 }, (_, i) => addDays(TODAY, i - 13));
  const rs14 = reports.filter(r => r.date >= d14[0] && r.stopMin);
  const types = ['设备故障', '欠料停线', '换线调机', '来料不良', '品质异常', '正常汇报'];
  const lab = t => t === '正常汇报' ? '其它短停' : t;
  P.chart(row.querySelector('.c1'), { tooltip: { trigger: 'item', valueFormatter: v => v + ' min' }, series: [{ type: 'pie', radius: ['40%', '64%'], center: ['50%', '52%'], itemStyle: { borderColor: '#fff', borderWidth: 2 }, label: { fontSize: 11, formatter: '{b}\n{c}′' },
    data: types.map(t => ({ name: lab(t), value: rs14.filter(r => r.stopType === t).reduce((a, r) => a + r.stopMin, 0), itemStyle: { color: STOP_COL[t] === '#16b364' ? '#94a3b8' : STOP_COL[t] } })).filter(x => x.value) }] });
  P.chart(row.querySelector('.c2'), { tooltip: tip({ valueFormatter: v => v + ' min' }), legend: legend(), grid: { left: 36, right: 10, top: 30, bottom: 22 }, xAxis: { type: 'category', data: d14.map(d => d.slice(5)), ...axisStyle }, yAxis: { type: 'value', ...axisStyle },
    series: types.map(t => ({ name: lab(t), type: 'bar', stack: 's', barWidth: 14, itemStyle: { color: STOP_COL[t] === '#16b364' ? '#cbd5e1' : STOP_COL[t] }, data: d14.map(d => rs14.filter(r => r.date === d && r.stopType === t).reduce((a, r) => a + r.stopMin, 0)) })) });
  const L = ['L1', 'L2', 'L3'];
  const w7 = reports.filter(r => r.date > addDays(TODAY, -7));
  P.chart(row.querySelector('.c3'), { tooltip: tip(), legend: legend(), grid: { left: 40, right: 40, top: 30, bottom: 22 }, xAxis: { type: 'category', data: ['SMT线1', 'SMT线2', '编带/测试线'], ...axisStyle }, yAxis: [{ type: 'value', name: 'h', ...axisStyle }, { type: 'value', name: '稼动%', max: 100, ...axisStyle, splitLine: { show: false } }],
    series: [{ name: '人时', type: 'bar', barWidth: 16, itemStyle: { color: '#1677ff', borderRadius: [3, 3, 0, 0] }, data: L.map(l => +w7.filter(r => r.line === l).reduce((a, r) => a + r.manHours, 0).toFixed(0)) },
      { name: '机时', type: 'bar', barWidth: 16, itemStyle: { color: '#0fb5c9', borderRadius: [3, 3, 0, 0] }, data: L.map(l => +w7.filter(r => r.line === l).reduce((a, r) => a + r.machHours, 0).toFixed(0)) },
      { name: '时间稼动率', type: 'line', yAxisIndex: 1, symbolSize: 7, itemStyle: { color: '#f5a623' }, data: L.map(l => { const rs = w7.filter(r => r.line === l); const slots = [...new Set(rs.map(r => r.date + '|' + r.shift))]; let tot = 0, stop = 0; slots.forEach(s => { const recs = rs.filter(r => r.date + '|' + r.shift === s); const onlyRw = recs.every(r => moByNo[r.mo].type === '返工生产'); tot += onlyRw ? 360 : 660; stop += Math.max(0, ...recs.map(r => r.stopMin)); }); return tot ? +(100 * (tot - stop) / tot).toFixed(1) : 0; }) }] });

  function open(r) {
    const m = moByNo[r.mo]; const dev = r.device && deviceById[r.device];
    const body = `${steps(['开工', '报工', '质检确认', '审核', '下推入库'], r.status === '已审核' ? 4 : 1)}
      ${r.stopMin && r.stopType !== '正常汇报' ? `<div class="bm-note ${r.stopType === '设备故障' ? 'err' : 'warn'}"><b>${r.stopType}</b> · 停线 ${r.stopMin} 分钟：${esc(r.stopDesc)} ${r.device ? devLink(r.device, `在三维中查看 ${r.device}`) : ''}</div>` : ''}
      ${desc([['汇报日期', r.date], ['班次', r.shift], ['产线', m.lineName], ['班组', `${esc(r.team)}（组长 ${r.leader}）`], ['生产订单', navLink('mo', r.mo, r.mo)], ['产品', esc(r.productName)],
        ['本次完成', `<b>${fmt(r.qty)}</b> ${r.unit}`], ['合格 / 不良', `${fmt(r.good)} / <span style="color:#f04438">${fmt(r.bad)}</span>`], ['累计完成', `${fmt(r.cum)} / ${fmt(r.planQty)}`],
        ['人时', `${r.manHours} h`], ['机时', `${r.machHours} h`], ['停线时长', `${r.stopMin} min`], ['汇报类型', tag(r.reportType)], ['相关设备', r.device ? devLink(r.device) : '—'], ['设备状态', dev ? tag({ run: '运行', idle: '待机', fault: '故障', maint: '保养' }[dev.status], { run: 'success', idle: 'warning', fault: 'danger', maint: 'info' }[dev.status]) : '—']])}
      <div class="bm-sec">订单进度</div>${bar(100 * r.cum / r.planQty)}
      <div class="bm-sec">工序设备（点击定位）</div><div style="display:flex;gap:6px;flex-wrap:wrap">${m.devices.map(d => devLink(d)).join('')}</div>`;
    drawer(P, { width: 820, title: `${r.no} ${tag(r.status)} ${r.stopType !== '正常汇报' ? tag(r.stopType) : ''}`, sub: `${r.date} ${r.shift} · ${m.lineName}`, body });
  }
  const pid = params.id; const hit = pid && reports.find(r => r.no === pid); if (hit) P.timeout(() => open(hit), 60);
  return () => P.destroy();
}
