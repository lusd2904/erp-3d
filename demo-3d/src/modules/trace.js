// 质量追溯：批次 / 序列号 / 生产订单 / 原料批次 → 原料批次→领料→生产订单→设备→检验→入库→出货 追溯链 —— 演示数据
import { page, tabs, table, tag, navLink, devLink, binLink, desc, fmt, esc, getParams, el, ICON } from './_ui.js';
import { resolve, chain, traceSamples, moByNo, materialByCode, iqc, suppliers, customers } from '../data/mock/index.js';
import { deviceById } from '../data/plant.js';

export const meta = { id: 'trace', title: '质量追溯', group: '质量管理', icon: 'trace' };
const css = `.bm-trace .q{display:flex;gap:8px;align-items:center;flex-wrap:nowrap;overflow-x:auto;min-width:0}
.bm-trace .q .bm-in{width:320px;height:32px;font-size:13px;font-family:var(--mono)}
.bm-trace .q .bm-btn{height:32px;padding:0 14px}
.bm-trace .q .bm-search,.bm-trace .q .bm-btn,.bm-trace .q>span{flex:none;white-space:nowrap}.bm-trace .chips{display:flex;gap:6px;align-items:center;flex:1;min-width:0;overflow-x:auto;flex-wrap:nowrap}.bm-trace .chip{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:14px;background:#f2f6fc;border:1px solid #dfe7f3;font-size:11.5px;color:var(--tx2);cursor:pointer;white-space:nowrap;flex:none}
.bm-trace .chip:hover{border-color:var(--p);color:var(--p)}.bm-trace .chip b{font-family:var(--mono);font-weight:500;color:var(--tx)}
.bm-trace .qcard{padding:8px 12px;flex:none}
.bm-trace .sum{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}
.bm-trace .sum>div{background:#f8fafd;border:1px solid var(--bd);border-radius:8px;padding:5px 10px;min-width:0}
.bm-trace .sum span{display:block;font-size:11px;color:var(--tx3)}.bm-trace .sum b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bm-trace .cols{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));text-align:center;font-size:12px;color:var(--tx2);font-weight:600;margin-bottom:-4px}
.bm-trace .cols div{padding:5px 0;border-radius:6px;background:linear-gradient(#f5f8fd,#eef3fa);margin:0 6px}
.bm-trace .graph{width:100%;flex:none}
.bm-trace .bm-body{overflow:auto}
.bm-trace .bm-body>.out.bm-out{flex:0 0 auto;min-height:0;height:auto;overflow:visible;display:flex;flex-direction:column;gap:10px}
.bm-trace .gcard{flex:none;display:flex;flex-direction:column}
.bm-trace .sumcard{flex:none}.bm-trace .sumcard .bm-ct{margin-bottom:6px}
.bm-trace .detail{flex:none;height:292px;min-height:248px;max-height:292px;display:flex;flex-direction:column;overflow:hidden}
.bm-trace .detail .bm-grow,.bm-trace .detail .bm-tw{flex:1;min-height:0;overflow:auto}
@media (max-height:900px){
  .bm-trace .bm-crumb{display:none}
  .bm-trace .qcard{padding:4px 10px}
  .bm-trace .bm-body>.out.bm-out{gap:8px}
  .bm-trace .sum{gap:6px}
  .bm-trace .sum>div{padding:2px 8px}
  .bm-trace .sumcard .bm-ct{display:none}
  .bm-trace .gcard .bm-ct{padding-bottom:4px}
  .bm-trace .gcard .bm-ct .ex{display:none}
  .bm-trace .cols div{padding:2px 0;margin:0 4px}
  .bm-trace .detail{height:200px;min-height:188px;max-height:200px}
}`;
const CAT = [['原料批次', '#1677ff'], ['领料单', '#0fb5c9'], ['生产订单', '#7a5af8'], ['设备', '#16b364'], ['检验', '#f5a623'], ['入库', '#2e90fa'], ['出货/客户', '#ee46bc']];
const supN = Object.fromEntries(suppliers.map(s => [s.code, s.short]));
const custN = Object.fromEntries(customers.map(c => [c.code, c.name]));
const PRI = ['IC', '分立器件', 'PCB', '晶圆', '电感', '电容', '电阻', '辅料', '半成品', 'MLCC', 'IC封测', '包材'];

export function mount(container, ctx, extra) {
  const P = page(container, ctx, { id: 'trace', icon: 'trace', title: '质量追溯', crumb: ['质量管理', '追溯管理', '批次/序列号追溯'], desc: '正向追溯（成品→原料）与反向追溯（原料→成品/客户）', styleId: 'bm-css-trace', css });
  const params = getParams(ctx, extra);
  const qc = el(`<div class="bm-card qcard"><div class="q"><div class="bm-search">${ICON.search}<input class="bm-in" placeholder="输入 生产批号 / 序列号 / 生产订单 / 原料批号 / 出货单"></div><button class="bm-btn pri" data-go>${ICON.trace}追溯查询</button><span style="font-size:12px;color:#8a96a8">输入批号，如</span><span class="chips">${traceSamples.map(s => `<span class="chip" data-q="${s.q}"><b>${s.q}</b>${esc(s.label)}</span>`).join('')}</span></div></div>`);
  P.body.appendChild(qc);
  const input = qc.querySelector('input');
  const out = el('<div class="out bm-out"></div>'); P.body.appendChild(out);
  const go = q => { input.value = q; run(q); };
  qc.addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) go(c.dataset.q); if (e.target.closest('[data-go]')) run(input.value); });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') run(input.value); });
  let graph = null;
  function run(q) {
    const r = resolve(q);
    out.innerHTML = '';
    if (graph && graph.__bmDestroy) graph.__bmDestroy(); else if (graph) { try { graph.dispose(); } catch (e) { /* */ } } graph = null;
    if (!r || !r.mos.length) { out.appendChild(el(`<div class="bm-card"><div class="bm-empty">${r && r.err ? esc(r.err) : `未找到「${esc(q)}」的追溯记录。请输入批号，如 ${esc(traceSamples[0]?.q || "")}。`}</div></div>`)); return; }
    const reverse = r.kind === '原料批次';
    const chains = r.mos.map(chain);
    const c0 = chains[0]; const m = c0.mo;
    // 概要
    let snInfo = '';
    if (r.snNo) { const rp = c0.reports.slice().sort((a, b) => a.cum - b.cum).find(x => x.cum >= r.snNo) || c0.reports[0]; snInfo = `序列号流水 ${r.snNo} · 生产于 ${rp.date} ${rp.shift}（${rp.team}）`; }
    const sum = reverse
      ? [['追溯类型', tag('反向追溯 · 原料批次', 'purple')], ['原料批号', `<span class="bm-mono">${r.key}</span>`], ['物料', `${esc(r.lot.name)} ${esc(r.lot.spec)}`], ['供应商', supN[r.lot.supplier] || r.lot.supplier], ['影响生产订单', `${r.mos.length} 单`], ['影响客户', [...new Set(chains.map(c => c.mo.custName))].join('、')]]
      : [['追溯类型', tag(`正向追溯 · ${r.kind}`, 'info')], ['追溯对象', `<span class="bm-mono">${r.key}</span>`], ['产品', `${esc(m.productName)} <span class="mut">${esc(m.spec)}</span>`], ['生产订单 / 批号', `${m.no} / ${m.batch}`], ['客户', m.custName], ['状态', `${tag(m.status)} ${m.type === '返工生产' ? tag('返工', 'purple') : ''}`]];
    out.appendChild(el(`<div class="bm-card sumcard"><div class="bm-ct">追溯概要<span class="ex">${snInfo || ""}</span></div><div class="sum">${sum.map(([k, v]) => `<div><span>${k}</span><b title="${esc(String(v).replace(/<[^>]+>/g, ''))}">${v}</b></div>`).join('')}</div></div>`));
    // 图
    const gcard = el(`<div class="bm-card gcard"><div class="bm-ct">追溯链路图<span class="ex">点击设备节点 → 三维定位；点击库位入库节点 → 定位库位；点击订单/单据 → 跳转</span></div><div class="cols">${CAT.map(c => `<div style="color:${c[1]}">${c[0]}</div>`).join('')}</div><div class="graph"></div></div>`);
    out.appendChild(gcard);
    const dc = el('<div class="bm-card detail"></div>'); out.appendChild(dc);
    const cols = CAT.map(() => []); const links = []; const seen = new Set();
    const add = (col, id, name, sub, data = {}) => { if (seen.has(id)) return id; seen.add(id); cols[col].push({ id, name, sub, ...data }); return id; };
    const link = (a, b, warn) => { if (a && b && !links.some(l => l.source === a && l.target === b)) links.push({ source: a, target: b, warn }); };
    chains.forEach(c => {
      const mo = c.mo;
      let lotsShown = c.rawLots.slice().sort((a, b) => PRI.indexOf(materialByCode[a.code].group) - PRI.indexOf(materialByCode[b.code].group));
      if (reverse) lotsShown = lotsShown.filter(l => l.lotNo === r.key);
      const more = lotsShown.length - 7; lotsShown = lotsShown.slice(0, 7);
      const moId = add(2, 'mo:' + mo.no, mo.no, `${mo.productName} ${fmt(mo.qty)}`, { kind: 'mo', key: mo.no, warn: mo.type === '返工生产' });
      const picksUsed = new Set();
      lotsShown.forEach(l => {
        const q = l.iqcResult; const lid = add(0, 'lot:' + l.lotNo, l.lotNo, `${l.name.replace('贴片', '')} ${l.spec.split(' ').slice(0, 2).join(' ')}`, { kind: 'lot', key: l.lotNo, warn: q === '让步接收' || q === '拒收' });
        l.docs.forEach(dn => { if (dn === '倒冲') { link(lid, moId); return; } const pd = c.picks.find(p => p.no === dn); if (!pd) return; const pid = add(1, 'pk:' + dn, dn, `${pd.type} · ${pd.date.slice(5)}`, { kind: 'pick', key: dn, warn: pd.type === '补料' }); picksUsed.add(pid); link(lid, pid); link(pid, moId); });
      });
      if (more > 0) { const id = add(0, 'more:' + mo.no, `+${more} 个原料批次`, '见下方明细表', { kind: 'none' }); link(id, moId); }
      if (!reverse) c.picks.filter(p => p.type !== '退料').forEach(pd => { const pid = add(1, 'pk:' + pd.no, pd.no, `${pd.type} · ${pd.date.slice(5)}`, { kind: 'pick', key: pd.no, warn: pd.type === '补料' }); link(pid, moId); });
      if (c.src) { const sid = add(2, 'mo:' + c.src.no, c.src.no, `源订单 · AOI 不良转返工`, { kind: 'mo', key: c.src.no }); link(sid, moId, true); }
      // 设备
      const devs = reverse ? [] : mo.devices;
      const insp = {};
      if (!reverse) {
        const ip = c.inspections.filter(x => x.kind !== 'OQC出货检验');
        if (ip.length) insp.ipqc = add(4, 'ipqc:' + mo.no, `IPQC ${ip.length} 次`, `首件+巡检 · ${ip.filter(x => x.result !== '合格').length ? '有不合格' : '全部合格'}`, { kind: 'none', warn: ip.some(x => x.result !== '合格') });
        if (c.aoi.length) { const n = c.aoi.reduce((a, x) => a + x.count - x.falseCall, 0); insp.aoi = add(4, 'aoi:' + mo.no, `AOI 不良 ${n} 点`, `直通率 ${(100 * (1 - n / Math.max(1, mo.done))).toFixed(2)}%`, { kind: 'quality', warn: n / Math.max(1, mo.done) > 0.01 }); }
        if (c.sort.length) { const n = c.sort.reduce((a, x) => a + x.count, 0); insp.sort = add(4, 'sort:' + mo.no, `测试分选剔除 ${fmt(n)}`, `良率 ${(100 * (1 - n / Math.max(1, mo.done))).toFixed(2)}%`, { kind: 'quality' }); }
        const oq = c.inspections.filter(x => x.kind === 'OQC出货检验');
        oq.forEach(o => { insp['oqc' + o.no] = add(4, 'oqc:' + o.no, o.no, `OQC ${o.result}`, { kind: 'none' }); });
      }
      devs.forEach(d => { const dv = deviceById[d]; const id = add(3, 'dev:' + d, d, dv ? `${dv.name.replace(/^SMT\d /, '')} · ${{ run: '运行', idle: '待机', fault: '故障', maint: '保养' }[dv.status]}` : '', { kind: 'dev', key: d, warn: dv && (dv.status === 'fault' || dv.status === 'maint') }); link(moId, id);
        const tgt = /AOI/.test(d) ? insp.aoi : /TST/.test(d) ? insp.sort : insp.ipqc; link(id, tgt || insp.ipqc); });
      c.inDocs.forEach(d => { const id = add(5, 'in:' + d.no, d.no, `${d.type === '不合格品入库' ? '不合格品' : '合格品'} ${fmt(d.qty)} · ${d.bin || '不良品仓'}`, { kind: 'in', key: d.no, bin: d.bin, warn: d.type === '不合格品入库' });
        if (reverse) link(moId, id); else { const o = d.oqc && insp['oqc' + d.oqc]; if (o) link(o, id); else link(insp.aoi || insp.sort || insp.ipqc || moId, id, d.type === '不合格品入库'); }
        if (d.type === '不合格品入库') c.rework.forEach(rw => { const rid = add(2, 'mo:' + rw.no, rw.no, `返工订单 ${fmt(rw.qty)}`, { kind: 'mo', key: rw.no, warn: true }); link(id, rid, true); }); });
      c.retDocs.forEach(d => { const id = add(5, 'rt:' + d.no, d.no, `退库 -${fmt(d.qty)}`, { kind: 'none', warn: true }); const src = c.inDocs.find(x => x.no === d.srcIn); link(src ? 'in:' + src.no : moId, id, true); });
      c.shipments.forEach(s => { const id = add(6, 'dn:' + s.no, s.no, `出货 ${fmt(s.qty)} · ${s.date.slice(5)}`, { kind: 'none' }); const src = c.inDocs.find(x => x.no === s.srcIn) || c.inDocs.find(x => x.type === '合格品入库'); link(src ? 'in:' + src.no : moId, id); const cid = add(6, 'cu:' + s.cust, s.custName, `客户 ${s.cust}`, { kind: 'none' }); link(id, cid); });
      if (!c.shipments.length && mo.cust) { const cid = add(6, 'cu:' + mo.cust, mo.custName, mo.status === '结案' || mo.status === '完工' ? '待出货' : '在制 · 未出货', { kind: 'none' }); link(c.inDocs.length ? 'in:' + c.inDocs[0].no : moId, cid); }
    });
    const gEl = gcard.querySelector('.graph');
    const maxN = Math.max(1, ...cols.map(cl => cl.length));
    const short = (window.innerHeight || 1080) <= 900;
    const H = Math.max(300, maxN * (short ? 46 : 50) + 44);
    gEl.style.height = H + 'px';
    const W = gEl.clientWidth || 1200; const nodeW = Math.min(170, W / 7 - 16); const colW = (W - nodeW - 8) / 6;
    const nodes = []; cols.forEach((cl, ci) => cl.forEach((n, k) => nodes.push({ ...n, x: ci * colW, y: (k + 0.5) * ((H - 44) / cl.length), cat: ci })));
    graph = P.chart(gEl, {
      tooltip: { formatter: p => p.dataType === 'node' ? `<b>${esc(p.data.name)}</b><br/>${esc(p.data.sub || '')}${p.data.kind === 'dev' ? '<br/><span style="color:#16b364">点击在三维中定位</span>' : p.data.bin ? '<br/><span style="color:#2e90fa">点击定位库位</span>' : ''}` : '' },
      series: [{ type: 'graph', layout: 'none', roam: false, nodeScaleRatio: 0, left: nodeW / 2 + 4, right: nodeW / 2 + 4, top: 22, bottom: 22, edgeSymbol: ['none', 'arrow'], edgeSymbolSize: 6,
        data: nodes.map(n => ({ ...n, symbol: 'roundRect', symbolSize: [nodeW, 40], itemStyle: { color: n.warn ? '#fff7f6' : '#fff', borderColor: n.warn ? '#f04438' : CAT[n.cat][1], borderWidth: n.kind === 'mo' && n.key === (c0.mo.no) ? 2.4 : 1.3, shadowBlur: 6, shadowColor: 'rgba(31,58,105,.10)' },
          label: { show: true, position: 'inside', formatter: () => `{t|${n.name}}\n{s|${String(n.sub || '').slice(0, 22)}}`, rich: { t: { fontSize: 11.5, fontWeight: 600, color: n.warn ? '#d92d20' : '#1f2a3d', fontFamily: 'Roboto Mono,Consolas,monospace', lineHeight: 15 }, s: { fontSize: 10, color: '#8a96a8', lineHeight: 13 } } },
          emphasis: { itemStyle: { borderWidth: 2.5, shadowBlur: 12 } }, cursor: n.kind === 'none' ? 'default' : 'pointer' })),
        links: links.map(l => ({ ...l, lineStyle: { color: l.warn ? '#f04438' : '#b8c6db', width: 1.2, curveness: 0.12, type: l.warn ? 'dashed' : 'solid' } })),
      }],
    });
    graph && graph.on('click', p => {
      if (p.dataType !== 'node') return; const n = p.data;
      if (n.kind === 'dev') { if (ctx && ctx.focusDevice) ctx.focusDevice(n.key); P.toast(`三维定位设备 ${n.key}`); }
      else if (n.kind === 'in' && n.bin) { if (ctx && ctx.locateBin) ctx.locateBin(n.bin); P.toast(`三维定位库位 ${n.bin}`); }
      else if (n.kind === 'mo' && ctx && ctx.navigate) ctx.navigate('mo', { id: n.key });
      else if (n.kind === 'pick' && ctx && ctx.navigate) ctx.navigate('picking', { id: n.key });
      else if (n.kind === 'lot' && n.key !== r.key) go(n.key);
      else if (n.kind === 'quality' && ctx && ctx.navigate) ctx.navigate('quality', { tab: 'aoi' });
    });
    // 明细
    const allLots = chains.flatMap(c => c.rawLots.map(l => ({ ...l, mo: c.mo.no }))).filter(l => !reverse || l.lotNo === r.key);
    const views = {
      lots: () => table({ fill: true, pageSize: 8, columns: [{ title: '原料批号', render: l => `<a class="bm-link" data-lot="${l.lotNo}">${l.lotNo}</a>` }, { title: '物料', render: l => `${esc(l.name)} <span class="mut">${esc(l.spec)}</span>` }, { title: '供应商', render: l => supN[l.supplier] || l.supplier }, { title: '收料日期', key: 'recvDate', num: true }, { title: 'IQC', render: l => l.iqc.startsWith('IQC') ? `${l.iqc} ${tag(l.iqcResult)}` : tag('免检') }, { title: '净领用', align: 'r', num: true, render: l => `${fmt(l.qty, l.unit === 'kg' || l.unit === '罐' ? 2 : 0)} ${l.unit}` }, { title: '领料/倒冲', render: l => l.docs.join('、') }, { title: '生产订单', render: l => navLink('mo', l.mo, l.mo) }], rows: allLots }),
      proc: () => table({ fill: true, pageSize: 8, columns: [{ title: '汇报单', key: 'no' }, { title: '日期', key: 'date', num: true }, { title: '班次', key: 'shift' }, { title: '班组', key: 'team' }, { title: '生产订单', render: x => navLink('mo', x.mo, x.mo) }, { title: '完成', align: 'r', num: true, render: x => fmt(x.qty) }, { title: '累计', align: 'r', num: true, render: x => fmt(x.cum) }, { title: '停线', render: x => x.stopType !== '正常汇报' ? `${tag(x.stopType)} ${x.stopMin}′` : '—' }, { title: '设备', render: x => x.device ? devLink(x.device) : '—' }], rows: chains.flatMap(c => c.reports) }),
      qc: () => table({ fill: true, pageSize: 8, columns: [{ title: '检验单', key: 'no' }, { title: '类型', render: x => tag(x.kind, 'info') }, { title: '日期', key: 'date', num: true }, { title: '设备', render: x => x.device ? devLink(x.device) : '—' }, { title: '结论', render: x => tag(x.result) }], rows: chains.flatMap(c => c.inspections) }),
      out: () => table({ fill: true, pageSize: 8, columns: [{ title: '单据', key: 'no' }, { title: '类型', render: x => tag(x.type || '出货', x.type ? null : 'cyan') }, { title: '日期', key: 'date', num: true }, { title: '数量', align: 'r', num: true, render: x => (x.type === '退库' ? '-' : '') + fmt(x.qty) }, { title: '库位/客户', render: x => x.bin !== undefined ? binLink(x.bin) : esc(custN[x.cust] || x.custName || '') }, { title: '批号', render: x => `<span class="bm-mono">${x.batch}</span>` }], rows: chains.flatMap(c => [...c.inDocs, ...c.retDocs.map(d => ({ ...d, type: '退库' })), ...c.shipments]) }),
    };
    const box = el('<div class="bm-grow"></div>');
    dc.appendChild(tabs([{ key: 'lots', label: '原料批次', count: allLots.length }, { key: 'proc', label: '生产过程', count: chains.reduce((a, c) => a + c.reports.length, 0) }, { key: 'qc', label: '质量记录', count: chains.reduce((a, c) => a + c.inspections.length, 0) }, { key: 'out', label: '入库与出货', count: chains.reduce((a, c) => a + c.inDocs.length + c.retDocs.length + c.shipments.length, 0) }], 'lots', k => { box.innerHTML = ''; box.appendChild(views[k]()); }));
    dc.appendChild(box); box.appendChild(views.lots());
    box.addEventListener('click', e => { const a = e.target.closest('[data-lot]'); if (a) go(a.dataset.lot); });
  }
  const rawId = params.id || params.batch || params.sn || traceSamples[0].q;
  go(Array.isArray(rawId) ? (rawId[0] || traceSamples[0].q) : rawId);
  return () => P.destroy();
}
