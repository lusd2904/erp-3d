// 质量检验：IQC 来料 / IPQC 过程（首件、巡检）/ AOI 不良 Pareto / 测试分选 / OQC 出货 —— 演示数据
import { page, kpis, tabs, filterBar, table, drawer, tag, navLink, devLink, desc, fmt, esc, match, axisStyle, tip, legend, getParams, el } from './_ui.js';
import { iqc, ipqc, oqc, aoiRecords, sortRecords, aoiPareto, fpyTrend, qualityKpi, moByNo, suppliers } from '../data/mock/index.js';

export const meta = { id: 'quality', title: '质量检验', group: '质量管理', icon: 'quality' };
const css = `.bm-quality .row3{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1.1fr) minmax(0,1fr);gap:12px}.bm-quality .ch{height:250px}`;

export function mount(container, ctx, extra) {
  const P = page(container, ctx, { id: 'quality', icon: 'quality', title: '质量检验', crumb: ['质量管理', '检验管理', '检验单'], desc: 'IQC → IPQC/AOI → OQC 全流程，GB/T 2828.1 抽样', styleId: 'bm-css-quality', css });
  const params = getParams(ctx, extra);
  const K = qualityKpi();
  P.body.insertAdjacentHTML('beforeend', kpis([
    { label: 'IQC 批合格率', value: K.iqcRate.toFixed(1), unit: '%', icon: 'quality', sub: `${K.iqcLots} 批 · 拒收 ${K.iqcRej} 批` },
    { label: 'AOI 直通率 FPY', value: K.aoiFpy.toFixed(2), unit: '%', icon: 'check', color: '#16b364', sub: `真实不良 ${fmt(K.aoiNg)} 点` },
    { label: 'AOI 误判率', value: K.falseCall.toFixed(1), unit: '%', icon: 'warn', color: '#f5a623', sub: '目标 ≤ 20%' },
    { label: 'IPQC 合格率', value: K.ipqcRate.toFixed(1), unit: '%', icon: 'mo', color: '#0fb5c9', sub: `首件+巡检 ${ipqc.length} 次` },
    { label: 'OQC 批合格率', value: K.oqcRate.toFixed(1), unit: '%', icon: 'instock', color: '#7a5af8', sub: `${K.oqcLots} 批` },
    { label: '测试分选不良', value: fmt(sortRecords.reduce((a, r) => a + r.count, 0) / 1e4, 1), unit: '万PCS', icon: 'box', color: '#f04438', sub: '编带/测试线 · 已剔除报废' },
  ]));
  // 图表
  const row = el('<div class="row3 bm-dock"><div class="bm-card"><div class="bm-ct">AOI 不良 Pareto<span class="ex"><div class="bm-seg sg"><span data-v="" class="on">全部</span><span data-v="L1">SMT线1</span><span data-v="L2">SMT线2</span></div></span></div><div class="ch c1"></div></div><div class="bm-card"><div class="bm-ct">近 10 天直通率 FPY<span class="ex">按产线 · %</span></div><div class="ch c2"></div></div><div class="bm-card"><div class="bm-ct">供应商来料质量<span class="ex">IQC 批次</span></div><div class="ch c3"></div></div></div>');
  P.body.appendChild(row);
  const c1 = P.chart(row.querySelector('.c1'), {});
  const drawPareto = L => {
    const d = aoiPareto(L ? r => r.line === L : undefined);
    c1 && c1.setOption({ tooltip: tip(), legend: legend(), grid: { left: 40, right: 40, top: 30, bottom: 22 }, xAxis: { type: 'category', data: d.map(x => x.type), ...axisStyle, axisLabel: { ...axisStyle.axisLabel, interval: 0 } },
      yAxis: [{ type: 'value', name: '点数', ...axisStyle }, { type: 'value', max: 100, ...axisStyle, splitLine: { show: false }, axisLabel: { ...axisStyle.axisLabel, formatter: '{value}%' } }],
      series: [{ name: '不良点数', type: 'bar', barWidth: '55%', data: d.map((x, i) => ({ value: x.count, itemStyle: { color: x.cum <= 0.8 || i === 0 ? '#f04438' : '#fca5a0', borderRadius: [4, 4, 0, 0] } })) },
        { name: '累计占比', type: 'line', yAxisIndex: 1, symbolSize: 6, itemStyle: { color: '#1677ff' }, data: d.map(x => +(x.cum * 100).toFixed(1)), markLine: { silent: true, symbol: 'none', lineStyle: { color: '#f5a623', type: 'dashed' }, label: { formatter: '80%', position: 'insideStartTop', color: '#c47f00', fontSize: 10 }, data: [{ yAxis: 80 }] } }] }, true);
  };
  drawPareto('');
  row.querySelector('.sg').addEventListener('click', e => { const s = e.target.closest('span'); if (!s) return; row.querySelectorAll('.sg span').forEach(x => x.classList.toggle('on', x === s)); drawPareto(s.dataset.v); });
  const f = fpyTrend();
  P.chart(row.querySelector('.c2'), { tooltip: tip({ valueFormatter: v => v == null ? '—' : v + '%' }), legend: legend(), grid: { left: 42, right: 12, top: 30, bottom: 22 }, xAxis: { type: 'category', data: f.days.map(d => d.slice(5)), boundaryGap: false, ...axisStyle }, yAxis: { type: 'value', min: 95, max: 100, ...axisStyle },
    series: f.series.map((s, i) => ({ name: { L1: 'SMT线1', L2: 'SMT线2', L3: '编带/测试线' }[s.line], type: 'line', smooth: true, connectNulls: true, symbolSize: 5, data: s.data, itemStyle: { color: ['#1677ff', '#f5a623', '#16b364'][i] }, ...(i === 0 ? { markLine: { silent: true, symbol: 'none', lineStyle: { color: '#f04438', type: 'dashed' }, label: { formatter: '目标 98%', position: 'insideEndBottom', fontSize: 10, color: '#f04438' }, data: [{ yAxis: 98 }] } } : {}) })) });
  const sup = suppliers.filter(s => iqc.some(x => x.supplier === s.short));
  P.chart(row.querySelector('.c3'), { tooltip: tip(), legend: legend(), grid: { left: 70, right: 14, top: 30, bottom: 20 }, xAxis: { type: 'value', minInterval: 1, ...axisStyle }, yAxis: { type: 'category', data: sup.map(s => s.short), ...axisStyle },
    series: [['合格', '#16b364'], ['让步接收', '#f5a623'], ['拒收', '#f04438'], ['待检', '#2e90fa']].map(([k, c]) => ({ name: k, type: 'bar', stack: 'a', barWidth: 12, itemStyle: { color: c }, data: sup.map(s => iqc.filter(x => x.supplier === s.short && x.result === k).length) })) });

  const card = el('<div class="bm-card bm-fill"></div>'); P.body.appendChild(card);
  const aoiByMo = Object.values(aoiRecords.reduce((m, r) => { const k = r.mo; m[k] = m[k] || { mo: r.mo, line: r.line, device: r.device, count: 0, fc: 0, rep: 0, types: {} }; m[k].count += r.count; m[k].fc += r.falseCall; m[k].rep += r.repaired; m[k].types[r.type] = (m[k].types[r.type] || 0) + r.count; return m; }, {}));
  const sortByMo = Object.values(sortRecords.reduce((m, r) => { m[r.mo] = m[r.mo] || { mo: r.mo, device: r.device, count: 0, types: {} }; m[r.mo].count += r.count; m[r.mo].types[r.type] = r.count; return m; }, {}));
  const TABS = { iqc: 'IQC 来料检验', ipqc: 'IPQC 首件/巡检', aoi: 'AOI 检测', sort: '测试分选', oqc: 'OQC 出货检验' };
  const st = { tab: TABS[params.tab] ? params.tab : 'iqc', q: '', r: '' };
  card.appendChild(tabs(Object.entries(TABS).map(([key, label]) => ({ key, label, count: { iqc: iqc.length, ipqc: ipqc.length, aoi: aoiByMo.length, sort: sortByMo.length, oqc: oqc.length }[key] })), st.tab, k => { st.tab = k; apply(); }));
  const fb = filterBar([{ key: 'q', type: 'search', placeholder: '检验单 / 批号 / 物料 / 生产订单' }, { key: 'r', type: 'select', label: '结论', options: ['合格', '不合格', '拒收', '让步接收', '待检', '检验中'] }], v => { Object.assign(st, v); apply(); });
  card.appendChild(fb);
  const wrap = el('<div class="bm-grow"></div>'); card.appendChild(wrap);
  const moCell = n => `${navLink('mo', n, n)}<div class="mut" style="font-size:11.5px">${esc(moByNo[n].productName)}</div>`;
  const COLS = {
    iqc: [{ title: '检验单号', render: r => `<a class="bm-link">${r.no}</a>` }, { title: '日期', key: 'date', num: true, sort: true }, { title: '来料批号', render: r => navLink('trace', r.lotNo, r.lotNo) },
      { title: '物料', render: r => `${esc(r.name)}<div class="mut" style="font-size:11.5px">${r.code} · ${esc(r.spec)}</div>` }, { title: '供应商', key: 'supplier' }, { title: '来料数', align: 'r', num: true, render: r => `${fmt(r.qty)} ${r.unit}` },
      { title: '抽样', render: r => `${r.aql} · n=${r.sample}` }, { title: '不良', align: 'r', num: true, render: r => r.defects ? `<span class="em">${r.defects}</span>` : '0' }, { title: '检验员', key: 'inspector' }, { title: '结论', render: r => tag(r.result, null, true) }],
    ipqc: [{ title: '检验单号', render: r => `<a class="bm-link">${r.no}</a>` }, { title: '日期', key: 'date', num: true, sort: true }, { title: '类型', render: r => tag(r.type, r.type === '首件检验' ? 'info' : 'cyan') }, { title: '生产订单', render: r => moCell(r.mo) },
      { title: '产线', render: r => moByNo[r.mo].lineName }, { title: '设备', render: r => devLink(r.device) }, { title: '检验项目', cls: 'wrap', render: r => r.items.join('、') }, { title: '检验员', key: 'inspector' }, { title: '结论', render: r => tag(r.result, null, true) }],
    aoi: [{ title: '生产订单', render: r => moCell(r.mo) }, { title: 'AOI 设备', render: r => devLink(r.device) }, { title: '检出点数', align: 'r', num: true, render: r => fmt(r.count), sort: true, sortVal: r => r.count },
      { title: '误判', align: 'r', num: true, render: r => fmt(r.fc) }, { title: '真实不良', align: 'r', num: true, render: r => `<span class="em">${fmt(r.count - r.fc)}</span>` }, { title: '维修OK', align: 'r', num: true, render: r => fmt(r.rep) },
      { title: '主要不良', cls: 'wrap', render: r => Object.entries(r.types).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => tag(`${k} ${v}`, 'danger')).join(' ') }, { title: '直通率', align: 'r', num: true, render: r => (100 * (1 - (r.count - r.fc) / Math.max(1, moByNo[r.mo].done))).toFixed(2) + '%' }],
    sort: [{ title: '生产订单', render: r => moCell(r.mo) }, { title: '分选设备', render: r => devLink(r.device) }, { title: '投入', align: 'r', num: true, render: r => fmt(moByNo[r.mo].done) }, { title: '不良剔除', align: 'r', num: true, render: r => `<span class="em">${fmt(r.count)}</span>` },
      { title: '良率', align: 'r', num: true, render: r => (100 * (1 - r.count / Math.max(1, moByNo[r.mo].done))).toFixed(2) + '%' }, { title: '不良分档', cls: 'wrap', render: r => Object.entries(r.types).map(([k, v]) => tag(`${k} ${fmt(v)}`, 'warning')).join(' ') }],
    oqc: [{ title: '检验单号', render: r => `<a class="bm-link">${r.no}</a>` }, { title: '日期', key: 'date', num: true, sort: true }, { title: '入库单', render: r => navLink('instock', r.inDoc, r.inDoc) }, { title: '生产批号', render: r => navLink('trace', r.batch, r.batch) },
      { title: '产品', render: r => esc(r.product) }, { title: '批量', align: 'r', num: true, render: r => fmt(r.qty) }, { title: '抽样', render: r => `${r.aql} · n=${r.sample}` }, { title: '不良', align: 'r', num: true, key: 'defects' }, { title: '检验员', key: 'inspector' }, { title: '结论', render: r => tag(r.result, null, true) }],
  };
  function apply() {
    const src = { iqc, ipqc, aoi: aoiByMo, sort: sortByMo, oqc }[st.tab] || iqc;
    const rows = src.filter(r => (!st.r || r.result == null || r.result === st.r) && match({ ...r, pn: moByNo[r.mo]?.productName }, st.q, ['no', 'lotNo', 'name', 'code', 'mo', 'batch', 'product', 'pn', 'supplier']));
    wrap.innerHTML = ''; wrap.appendChild(table({ fill: true, rows, pageSize: 10, rowKey: 'no', columns: COLS[st.tab], onRow: r => open(st.tab, r) })); fb.setCount(`共 <b>${rows.length}</b> 条`);
  }
  apply();
  function open(kind, r) {
    if (kind === 'iqc') {
      const body = el(`<div style="display:flex;flex-direction:column;gap:12px">${r.note ? `<div class="bm-note ${r.result === '拒收' ? 'err' : 'warn'}">${esc(r.note)}</div>` : ''}${desc([['来料批号', navLink('trace', r.lotNo, r.lotNo)], ['物料', esc(r.name)], ['规格', esc(r.spec)], ['供应商', r.supplier], ['来料数量', `${fmt(r.qty)} ${r.unit}`], ['收料日期', r.date], ['抽样方案', `${r.aql} · 一般检验水平 II`], ['样本量', r.sample], ['不良数', r.defects]])}<div class="bm-sec">检验项目</div><div class="tw"></div></div>`);
      body.querySelector('.tw').appendChild(table({ pageSize: 0, columns: [{ title: '检验项目', key: 'item' }, { title: '标准/要求', cls: 'wrap', render: x => esc(x.std) }, { title: '实测', render: x => esc(x.val) }, { title: '判定', render: x => x.ok == null ? tag('待检') : x.ok ? tag('合格') : tag('不合格') }], rows: r.items }));
      drawer(P, { width: 820, title: `${r.no} ${tag(r.result, null, true)}`, sub: `IQC 来料检验 · ${r.inspector}`, body, footer: r.result === '待检' ? '<button class="bm-btn danger" data-f="rej">判定拒收</button><button class="bm-btn pri" data-f="ok">判定合格</button>' : '',
        onFooter: (f, close) => { r.result = f === 'ok' ? '合格' : '拒收'; r.items.forEach(x => { x.ok = f === 'ok'; x.val = f === 'ok' ? '符合' : x.val; }); P.toast(`${r.no} 判定为 ${r.result}`); close(); apply(); } });
    } else if (kind === 'aoi' || kind === 'sort') {
      const m = moByNo[r.mo];
      const body = el(`<div style="display:flex;flex-direction:column;gap:12px">${desc([['生产订单', navLink('mo', m.no, m.no)], ['产品', esc(m.productName)], ['产线', m.lineName], ['设备', devLink(r.device)], ['完工数', fmt(m.done)], ['生产批号', navLink('trace', m.batch, m.batch)]])}<div class="bm-sec">不良分布</div><div class="ch" style="height:260px"></div>${kind === 'aoi' ? '<div class="bm-sec">不良明细（位号）</div><div class="tw"></div>' : ''}</div>`);
      const D = drawer(P, { width: 820, title: `${m.no} ${kind === 'aoi' ? 'AOI 检测记录' : '测试分选记录'}`, sub: `${m.productName}`, body });
      const ent = Object.entries(r.types).sort((a, b) => b[1] - a[1]);
      (() => P.chart(D.body.querySelector('.ch'), { tooltip: tip(), grid: { left: 40, right: 10, top: 14, bottom: 24 }, xAxis: { type: 'category', data: ent.map(e => e[0]), ...axisStyle, axisLabel: { ...axisStyle.axisLabel, interval: 0 } }, yAxis: { type: 'value', ...axisStyle }, series: [{ type: 'bar', barWidth: '50%', itemStyle: { color: kind === 'aoi' ? '#f04438' : '#f5a623', borderRadius: [4, 4, 0, 0] }, data: ent.map(e => e[1]), label: { show: true, position: 'top', fontSize: 11 } }] }))();
      if (kind === 'aoi') D.body.querySelector('.tw').appendChild(table({ pageSize: 0, maxHeight: 240, columns: [{ title: '日期', key: 'date', num: true }, { title: '不良类型', render: x => tag(x.type, 'danger') }, { title: '位号', key: 'pos' }, { title: '检出', align: 'r', num: true, key: 'count' }, { title: '误判', align: 'r', num: true, key: 'falseCall' }, { title: '维修OK', align: 'r', num: true, key: 'repaired' }, { title: '设备', render: x => devLink(x.device) }], rows: aoiRecords.filter(x => x.mo === r.mo) }));
    } else {
      const m = moByNo[r.mo];
      const body = `${r.note ? `<div class="bm-note err">${esc(r.note)}</div>` : ''}${desc([['检验单', r.no], ['日期', r.date], ['生产订单', navLink('mo', r.mo, r.mo)], ['产品', esc(m.productName)], ['产线', m.lineName], [kind === 'oqc' ? '批号' : '设备', kind === 'oqc' ? navLink('trace', r.batch, r.batch) : devLink(r.device)], ['检验员', r.inspector], ['结论', tag(r.result)], [kind === 'oqc' ? '抽样' : '类型', kind === 'oqc' ? `${r.aql} n=${r.sample}` : r.type]])}
        <div class="bm-sec">检验项目</div><div style="display:flex;gap:6px;flex-wrap:wrap">${r.items.map(i => r.result === '检验中' ? tag(i, 'default') : tag(i + (r.result === '不合格' ? '' : ' ✓'), r.result === '不合格' ? 'warning' : 'success')).join('')}</div>`;
      drawer(P, { width: 780, title: `${r.no} ${tag(r.result, null, true)}`, sub: `${kind === 'oqc' ? 'OQC 出货检验' : 'IPQC ' + r.type}`, body });
    }
  }
  return () => P.destroy();
}
