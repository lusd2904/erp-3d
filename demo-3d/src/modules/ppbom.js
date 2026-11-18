// 生产用料清单（PPBOM）：子项用量/损耗/应发/已领/补料/退料/倒冲 —— 演示数据
import { page, kpis, filterBar, table, tag, bar, navLink, desc, fmt, bigStr, esc, match, axisStyle, tip, legend, getParams, el, steps } from './_ui.js';
import { ppboms, moByNo, materialByCode, pickDocs, STATUS_FLOW } from '../data/mock/index.js';

export const meta = { id: 'ppbom', title: '生产用料清单', group: '生产管理', icon: 'bom' };
const css = `.bm-ppbom .lay{display:grid;grid-template-columns:330px minmax(0,1fr);gap:12px;align-items:start}
.bm-ppbom .lst{display:flex;flex-direction:column;gap:6px;max-height:640px;overflow:auto;padding-right:2px}
.bm-ppbom .it{border:1px solid var(--bd);border-radius:8px;padding:8px 10px;cursor:pointer;background:#fff;transition:.15s}
.bm-ppbom .it:hover{border-color:#a9cbff}.bm-ppbom .it.on{border-color:var(--p);background:#f3f8ff;box-shadow:0 0 0 3px rgba(22,119,255,.08)}
.bm-ppbom .it .a{display:flex;justify-content:space-between;align-items:center;font-size:12.5px}.bm-ppbom .it .b{font-size:12px;color:var(--tx2);margin:3px 0 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bm-ppbom .ch{height:250px}`;
const dec = u => (u === '罐' || u === 'kg' || u === '片') ? 2 : 0;
const issued = l => l.issue === '倒冲' ? l.backflush : l.picked + l.supp - l.ret;
const pickedPct = l => Math.min(100, 100 * (l.issue === '倒冲' ? l.backflush : l.picked + l.supp - l.ret) / Math.max(1e-9, l.need));

export function mount(container, ctx, extra) {
  const P = page(container, ctx, { id: 'ppbom', icon: 'bom', title: '生产用料清单', crumb: ['生产制造', '生产管理', '生产用料清单'], desc: '生产订单审核后由 BOM 展开生成，支持变更单', styleId: 'bm-css-ppbom', css });
  const params = getParams(ctx, extra);
  P.action('<button class="bm-btn">用料清单变更单</button>', () => P.toast('已基于当前用料清单生成变更单草稿'));
  const allLines = ppboms.flatMap(p => p.lines.map(l => ({ ...l, mo: p.mo })));
  const amt = allLines.reduce((a, l) => a + l.need * materialByCode[l.code].price, 0);
  const amtIssued = allLines.reduce((a, l) => a + Math.min(l.need, l.issue === '倒冲' ? l.backflush : l.picked + l.supp) * materialByCode[l.code].price, 0);
  P.body.insertAdjacentHTML('beforeend', kpis([
    { label: '用料清单', value: ppboms.length, unit: '张', icon: 'bom', sub: `子项行 ${allLines.length} 行` },
    { label: '应发金额', value: bigStr(amt, 1).replace('万', ''), unit: amt >= 1e4 ? '万元' : '元', icon: 'report', color: '#0fb5c9', sub: '按标准单价折算' },
    { label: '领料完成率', value: (100 * amtIssued / amt).toFixed(1), unit: '%', icon: 'pick', color: '#16b364', sub: '按金额 · 含倒冲' },
    { label: '超耗补料行', value: allLines.filter(l => l.supp > 0).length, unit: '行', icon: 'warn', color: '#f04438', sub: '需关注贴片抛料/测试损耗' },
    { label: '倒冲子项', value: allLines.filter(l => l.issue === '倒冲').length, unit: '行', icon: 'kit', color: '#7a5af8', sub: '锡膏 / 载带 / 盖带 / 塑封料' },
  ]));
  const lay = el('<div class="lay"><div class="bm-card"><div class="bm-ct">用料清单列表<span class="ex">按计划开工倒序</span></div><div class="fb"></div><div class="lst"></div></div><div class="right" style="display:flex;flex-direction:column;gap:12px;min-width:0"></div></div>');
  P.body.appendChild(lay);
  const lst = lay.querySelector('.lst'), right = lay.querySelector('.right');
  const st = { q: '', s: '' }; let cur = null;
  const fb = filterBar([{ key: 'q', type: 'search', placeholder: '订单号 / 产品' }, { key: 's', type: 'select', label: '', options: STATUS_FLOW }], v => { Object.assign(st, v); renderList(); });
  fb.querySelector('.bm-search .bm-in').style.width = '150px'; fb.querySelector('[data-reset]').remove();
  lay.querySelector('.fb').appendChild(fb);
  const sorted = () => ppboms.slice().sort((a, b) => moByNo[a.mo].planStart < moByNo[b.mo].planStart ? 1 : -1);
  function renderList() {
    const rows = sorted().filter(p => { const m = moByNo[p.mo]; return (!st.s || m.status === st.s) && match({ ...m, pp: p.no }, st.q, ['no', 'productName', 'spec', 'pp']); });
    fb.setCount(`${rows.length} 张`);
    lst.innerHTML = rows.map(p => { const m = moByNo[p.mo]; const pc = p.lines.reduce((a, l) => a + pickedPct(l), 0) / p.lines.length;
      return `<div class="it ${cur === p.no ? 'on' : ''}" data-no="${p.no}"><div class="a"><b class="bm-mono">${p.no}</b>${tag(m.status)}</div><div class="b">${esc(m.productName)} · ${fmt(m.qty)} ${m.unit} · ${m.lineName}</div>${bar(pc)}</div>`; }).join('') || '<div class="bm-empty">无匹配</div>';
  }
  lst.addEventListener('click', e => { const it = e.target.closest('.it'); if (it) show(it.dataset.no); });
  let chartInst = null;
  function show(no) {
    cur = no; renderList();
    const p = ppboms.find(x => x.no === no); const m = moByNo[p.mo];
    const pk = pickDocs.filter(d => d.mo === m.no);
    right.innerHTML = '';
    const head = el(`<div class="bm-card"><div class="bm-ct">${p.no} <span style="font-weight:400">${tag(p.status)} ${tag(m.type)}</span><span class="ex">${navLink('mo', m.no, '查看生产订单 ' + m.no)}</span></div>
      ${desc([['生产订单', navLink('mo', m.no, m.no)], ['产品', `${esc(m.productName)} <span class="mut">${m.product}</span>`], ['规格', esc(m.spec)], ['生产数量', `${fmt(m.qty)} ${m.unit}`], ['已完工', `${fmt(m.done)} ${m.unit}`], ['BOM', m.bomNo], ['产线', m.lineName], ['领/补/退料单', `${pk.filter(d => d.type === '领料').length} / ${pk.filter(d => d.type === '补料').length} / ${pk.filter(d => d.type === '退料').length}`], ['订单状态', tag(m.status)]], 3)}</div>`);
    right.appendChild(head);
    const card = el('<div class="bm-card"><div class="bm-ct">子项明细<span class="ex">实发 = 领料 + 补料 − 退料；倒冲按汇报数自动扣减</span></div></div>');
    card.appendChild(table({ pageSize: 0, maxHeight: 360, rowKey: 'seq', columns: [
      { title: '#', key: 'seq', align: 'c' },
      { title: '子项物料', render: l => `<div>${esc(l.name)} <span class="mut">(${l.unit})</span></div><div class="mut" style="font-size:11.5px">${l.code} · ${esc(l.spec)}</div>` },
      { title: '位号/说明', key: 'pos' },
      { title: '单位用量', align: 'r', num: true, render: l => { const s = fmt(l.unitQty, l.unitQty % 1 ? 6 : 0); return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s; } },
      { title: '损耗率', align: 'r', num: true, render: l => (l.loss * 100).toFixed(1) + '%' },
      { title: '标准用量', align: 'r', num: true, render: l => fmt(l.std, dec(l.unit)) },
      { title: '应发数量', align: 'r', num: true, render: l => fmt(l.need, dec(l.unit)) },
      { title: '发料方式', render: l => tag(l.issue, l.issue === '倒冲' ? 'cyan' : 'default') },
      { title: '已领', align: 'r', num: true, render: l => fmt(l.issue === '倒冲' ? l.backflush : l.picked, dec(l.unit)) },
      { title: '补料', align: 'r', num: true, render: l => l.supp ? `<span class="em">+${fmt(l.supp)}</span>` : '<span class="mut">—</span>' },
      { title: '退料', align: 'r', num: true, render: l => l.ret ? `-${fmt(l.ret)}` : '<span class="mut">—</span>' },
      { title: '实发', align: 'r', num: true, render: l => fmt(issued(l), dec(l.unit)) },
      { title: '领料进度', render: l => bar(pickedPct(l)) },
    ], rows: p.lines }));
    right.appendChild(card);
    const cc = el('<div class="bm-card"><div class="bm-ct">应发 vs 实发 对比<span class="ex">按应发数归一化（%）· 超 100% 为超领/补料</span></div><div class="ch"></div></div>');
    right.appendChild(cc);
    const names = p.lines.map(l => `${l.name.replace('贴片', '').replace('MLCC', '')}\n${l.spec.split(' ').slice(0, 2).join(' ')}`);
    P.chart(cc.querySelector('.ch'), { tooltip: tip({ valueFormatter: v => v + '%' }), legend: legend(), grid: { left: 52, right: 10, top: 30, bottom: 50 },
      xAxis: { type: 'category', data: names, ...axisStyle, axisLabel: { ...axisStyle.axisLabel, interval: 0, fontSize: 10, lineHeight: 12 } }, yAxis: { type: 'value', ...axisStyle, axisLabel: { ...axisStyle.axisLabel, formatter: '{value}%' } },
      series: [{ name: '应发', type: 'bar', barWidth: 10, itemStyle: { color: '#cfe0fb', borderRadius: [3, 3, 0, 0] }, data: p.lines.map(() => 100) },
        { name: '实发', type: 'bar', barWidth: 10, itemStyle: { color: '#1677ff', borderRadius: [3, 3, 0, 0] }, data: p.lines.map(l => +(100 * issued(l) / l.need).toFixed(1)) },
        { name: '标准耗用', type: 'line', symbol: 'circle', symbolSize: 6, itemStyle: { color: '#f5a623' }, lineStyle: { width: 0 }, data: p.lines.map(l => +(100 * l.std / l.need * (m.done / m.qty)).toFixed(1)) }] });
  }
  renderList();
  const pid = params.id || params.mo;
  const first = (pid && ppboms.find(p => p.mo === pid || p.no === pid)) || sorted().find(p => moByNo[p.mo].status === '开工' && moByNo[p.mo].type === '普通生产' && moByNo[p.mo].isPCBA) || sorted()[0];
  show(first.no);
  return () => P.destroy();
}
