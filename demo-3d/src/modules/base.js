// 基础资料：物料、BOM（多级）、工艺路线、工作中心、班组、仓库、客户/供应商 —— 演示数据
import { page, kpis, tabs, filterBar, table, tag, devLink, fmt, esc, match, getParams, el } from './_ui.js';
import { materials, materialByCode, boms, bomByProduct, routings, workcenters, teams, warehouses, customers, suppliers } from '../data/mock/index.js';
import { deviceById, STATUS } from '../data/plant.js';

export const meta = { id: 'base', title: '基础资料', group: '基础资料', icon: 'bom' };
const css = `.bm-base .lay{display:grid;grid-template-columns:300px minmax(0,1fr);gap:12px;align-items:start}
.bm-base .it{border:1px solid var(--bd);border-radius:8px;padding:9px 11px;cursor:pointer;margin-bottom:6px;background:#fff}.bm-base .it:hover{border-color:#a9cbff}.bm-base .it.on{border-color:var(--p);background:#f3f8ff}
.bm-base .it b{font-family:var(--mono);font-size:12.5px}.bm-base .it div{font-size:12px;color:var(--tx2);margin-top:2px}
.bm-base .tree{height:420px}
.bm-base .route{display:flex;align-items:stretch;gap:0;overflow-x:auto;padding:4px 2px 8px}
.bm-base .op{min-width:150px;flex:1;border:1px solid var(--bd);border-radius:10px;padding:10px 12px;background:linear-gradient(#fff,#f8fbff);position:relative}
.bm-base .op h4{margin:0 0 4px;font-size:13px;display:flex;gap:6px;align-items:center}.bm-base .op h4 i{font-style:normal;font-family:var(--mono);font-size:11px;color:#fff;background:var(--p);border-radius:4px;padding:0 5px}
.bm-base .op p{margin:3px 0;font-size:11.5px;color:var(--tx2)}.bm-base .arrow{display:grid;place-items:center;width:26px;color:#9fb3cc;font-size:18px;flex:none}
.bm-base .wcs{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.bm-base .wc{border:1px solid var(--bd);border-radius:10px;padding:12px 14px;background:#fff}.bm-base .wc h4{margin:0 0 6px;font-size:14px;display:flex;justify-content:space-between;align-items:center}
.bm-base .wc .d{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.bm-base .oee{height:6px;border-radius:3px;background:#edf1f7;overflow:hidden;margin-top:6px}.bm-base .oee b{display:block;height:100%;background:linear-gradient(90deg,#16b364,#5fd39a)}`;
const supN = Object.fromEntries(suppliers.map(s => [s.code, s.short]));
const devTag = d => { const x = deviceById[d]; const s = x ? x.status : 'idle'; return `${devLink(d, `${d}`)}<span class="bm-tag ${{ run: 'success', idle: 'warning', fault: 'danger', maint: 'info' }[s]}" style="margin-left:-3px">${STATUS[s] ? STATUS[s].label : s}</span>`; };

export function mount(container, ctx, extra) {
  const P = page(container, ctx, { id: 'base', icon: 'base', title: '基础资料', crumb: ['生产制造', '工程数据', '基础资料'], desc: '物料 · BOM · 工艺路线 · 工作中心 · 班组 · 仓库', styleId: 'bm-css-base', css });
  const params = getParams(ctx, extra);
  P.body.insertAdjacentHTML('beforeend', kpis([
    { label: '物料', value: materials.length, unit: '个', icon: 'box', sub: `原材料 ${materials.filter(m => m.cat === '原材料').length} · 半成品 ${materials.filter(m => m.cat === '半成品').length} · 产成品 ${materials.filter(m => m.cat === '产成品').length}` },
    { label: '物料清单 BOM', value: boms.length, unit: '个', icon: 'bom', color: '#0fb5c9', sub: '含 IC 封装半成品多级 BOM' },
    { label: '工艺路线', value: routings.length, unit: '条', icon: 'pick', color: '#16b364', sub: 'SMT ×2 / 片式元件 / IC 测试' },
    { label: '工作中心', value: workcenters.length, unit: '个', icon: 'stock', color: '#f5a623', sub: `关联设备 ${workcenters.reduce((a, w) => a + w.devices.length, 0)} 台` },
    { label: '班组', value: teams.length, unit: '个', icon: 'mo', color: '#7a5af8', sub: `在岗 ${teams.reduce((a, t) => a + t.members, 0)} 人` },
  ]));
  const card = el('<div class="bm-card"></div>'); P.body.appendChild(card);
  const body = el('<div></div>');
  const T = [['mat', '物料'], ['bom', '物料清单 BOM'], ['route', '工艺路线'], ['wc', '工作中心'], ['team', '班组'], ['wh', '仓库'], ['partner', '客户 / 供应商']];
  const initTab = T.some(([key]) => key === params.tab) ? params.tab : 'mat';
  card.appendChild(tabs(T.map(([key, label]) => ({ key, label })), initTab, k => show(k)));
  card.appendChild(body);
  function show(k) {
    body.innerHTML = '';
    if (k === 'mat') {
      const st = { q: '', cat: '', g: '' };
      const fb = filterBar([{ key: 'q', type: 'search', placeholder: '编码 / 名称 / 规格 / 封装' }, { key: 'cat', type: 'seg', options: [{ v: '', l: '全部' }, '原材料', '半成品', '产成品'], value: '' }, { key: 'g', type: 'select', label: '物料分组', options: [...new Set(materials.map(m => m.group))] }], v => { Object.assign(st, v); ap(); });
      const t = table({ pageSize: 12, columns: [{ title: '物料编码', render: m => `<span class="bm-mono">${m.code}</span>`, sort: true, sortVal: m => m.code }, { title: '物料名称', key: 'name' }, { title: '规格型号', render: m => esc(m.spec) }, { title: '封装/尺寸', key: 'pkg' },
        { title: '属性', render: m => tag(m.cat === '原材料' ? '外购' : '自制', m.cat === '原材料' ? 'info' : 'success') }, { title: '分组', key: 'group' }, { title: '单位', key: 'unit' }, { title: '包装/料盘', render: m => esc(m.packing) }, { title: 'MSL', render: m => m.msl === '—' ? '<span class="mut">—</span>' : tag(m.msl, 'warning') },
        { title: '安全库存', align: 'r', num: true, render: m => fmt(m.safety) }, { title: '标准单价', align: 'r', num: true, render: m => fmt(m.price, m.price < 1 ? 4 : 2) }, { title: '默认供应商', render: m => supN[m.sup] || m.src || '自制' }, { title: '批号管理', render: () => tag('启用', 'success') }] });
      const ap = () => { const rows = materials.filter(m => (!st.cat || m.cat === st.cat) && (!st.g || m.group === st.g) && match(m, st.q, ['code', 'name', 'spec', 'pkg'])); t.setRows(rows); fb.setCount(`共 <b>${rows.length}</b> 个`); };
      body.append(fb, t); ap();
    }
    if (k === 'bom') {
      const lay = el('<div class="lay"><div class="lst"></div><div class="rt" style="display:flex;flex-direction:column;gap:12px;min-width:0"></div></div>'); body.appendChild(lay);
      let cur = (params.bom && boms.some(b => b.no === params.bom)) ? params.bom : boms[0].no;
      const drawL = () => { lay.querySelector('.lst').innerHTML = boms.map(b => { const m = materialByCode[b.product]; return `<div class="it ${b.no === cur ? 'on' : ''}" data-no="${b.no}"><b>${b.no}</b> ${tag(b.status)}<div>${esc(m.name)} · ${esc(m.spec)}</div><div>版本 ${b.ver} · 生效 ${b.eff} · 子项 ${b.items.length}</div></div>`; }).join(''); };
      const drawR = () => {
        const b = boms.find(x => x.no === cur) || boms[0]; const m = materialByCode[b.product]; const rt = lay.querySelector('.rt'); rt.innerHTML = '';
        const expand = (prod, lvl, mult) => (bomByProduct[prod] ? bomByProduct[prod].items : []).flatMap(it => { const mm = materialByCode[it.code]; const row = { lvl, ...it, mm, qtyAcc: mult * it.qty }; return [row, ...(bomByProduct[it.code] ? expand(it.code, lvl + 1, mult * it.qty) : [])]; });
        const rows = expand(b.product, 1, 1);
        const tr = el('<div class="bm-card" style="box-shadow:none"><div class="bm-ct">BOM 结构树<span class="ex">节点悬停查看用量</span></div><div class="tree"></div></div>'); rt.appendChild(tr);
        const node = (prod, depth) => ({ name: `${materialByCode[prod].name}\n${materialByCode[prod].spec.split(' ').slice(0, 2).join(' ')}`, children: depth < 3 && bomByProduct[prod] ? bomByProduct[prod].items.map(it => ({ ...node(it.code, depth + 1), value: it.qty })) : undefined, itemStyle: { color: prod.startsWith('3.') ? '#7a5af8' : prod.startsWith('2.') ? '#0fb5c9' : '#1677ff' } });
        P.chart(tr.querySelector('.tree'), { tooltip: { formatter: p => `${p.name.replace('\n', ' ')}${p.value != null ? `<br/>单位用量：${p.value}` : ''}` }, series: [{ type: 'tree', data: [node(b.product, 0)], left: 120, right: 170, top: 10, bottom: 10, symbolSize: 9, orient: 'LR', initialTreeDepth: 3, expandAndCollapse: true,
          label: { position: 'left', verticalAlign: 'middle', align: 'right', fontSize: 10.5, color: '#1f2a3d', lineHeight: 13 }, leaves: { label: { position: 'right', align: 'left' } }, lineStyle: { color: '#c5d3e6', curveness: 0.5 } }] });
        const tc = el(`<div class="bm-card" style="box-shadow:none"><div class="bm-ct">子项明细（多级展开）<span class="ex">${m.name} · ${b.ver}</span></div></div>`);
        tc.appendChild(table({ pageSize: 0, maxHeight: 360, columns: [{ title: '层级', render: r => `<span class="bm-mono">${'·'.repeat(r.lvl - 1)}${r.lvl}</span>` }, { title: '子项编码', render: r => `<span class="bm-mono">${r.code}</span>` }, { title: '名称', render: r => `${'　'.repeat(r.lvl - 1)}${esc(r.mm.name)}` }, { title: '规格', render: r => esc(r.mm.spec) },
          { title: '用量(分子/分母)', align: 'r', num: true, render: r => r.qty < 0.01 ? `1/${fmt(1 / r.qty, 0)}` : fmt(r.qty, r.qty % 1 ? 4 : 0) }, { title: '损耗率', align: 'r', num: true, render: r => (r.loss * 100).toFixed(1) + '%' }, { title: '发料方式', render: r => tag(r.issue, r.issue === '倒冲' ? 'cyan' : 'default') }, { title: '位号/说明', key: 'pos' }, { title: '属性', render: r => tag(r.mm.cat === '原材料' ? '外购' : '自制', r.mm.cat === '原材料' ? 'info' : 'success') }], rows }));
        rt.appendChild(tc);
      };
      lay.querySelector('.lst').addEventListener('click', e => { const it = e.target.closest('.it'); if (!it) return; cur = it.dataset.no; drawL(); drawR(); });
      drawL(); drawR();
    }
    if (k === 'route') {
      routings.forEach(r => body.appendChild(el(`<div class="bm-card" style="box-shadow:none;margin-bottom:12px"><div class="bm-ct">${r.no} · ${esc(r.name)}<span class="ex">适用：${r.products.map(p => materialByCode[p].name + ' ' + materialByCode[p].spec.split(' ')[0]).join('、')}</span></div><div class="route">${r.ops.map((o, i) => `${i ? '<div class="arrow">➜</div>' : ''}<div class="op"><h4><i>${o.seq}</i>${esc(o.name)}</h4><p>工作中心 ${o.wc}</p><p>标准工时 ${esc(o.std)}</p>${o.ctrl ? `<p>控制点 ${esc(o.ctrl)}</p>` : ''}<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">${o.devices.map(d => devLink(d)).join('') || '<span class="mut" style="font-size:11px;color:#8a96a8">人工工位</span>'}</div></div>`).join('')}</div></div>`)));
    }
    if (k === 'wc') {
      body.appendChild(el(`<div class="wcs">${workcenters.map(w => `<div class="wc"><h4><span>${w.name} <span class="bm-mono" style="font-size:12px;color:#8a96a8">${w.code}</span></span>${tag(w.dept, 'default')}</h4><div style="font-size:12px;color:#56637a">产线 ${w.line} · 产能 ${w.capacity}${w.cph ? ` · 理论 CPH ${fmt(w.cph)}` : ''}</div><div style="font-size:12px;color:#56637a;margin-top:6px">OEE ${(w.oee * 100).toFixed(0)}%</div><div class="oee"><b style="width:${w.oee * 100}%"></b></div><div class="d">${w.devices.map(devTag).join('')}</div></div>`).join('')}</div>`));
    }
    if (k === 'team') body.appendChild(table({ pageSize: 0, rows: teams, columns: [{ title: '班组编码', key: 'code' }, { title: '班组名称', key: 'name' }, { title: '工作中心', key: 'wc' }, { title: '组长', key: 'leader' }, { title: '人数', align: 'r', num: true, key: 'members' }, { title: '班次时间', key: 'shift' }, { title: '标准日工时(h)', align: 'r', num: true, render: t => (t.members * 11).toFixed(0) }, { title: '状态', render: () => tag('启用', 'success') }] }));
    if (k === 'wh') body.appendChild(table({ pageSize: 0, rows: warehouses, columns: [{ title: '仓库编码', key: 'code' }, { title: '仓库名称', key: 'name' }, { title: '类型', render: w => tag(w.type, /立体/.test(w.type) ? 'info' : 'default') }, { title: '区域/库位', key: 'area' }, { title: '仓管员', key: 'keeper' }, { title: '环境要求', key: 'temp' }, { title: '库位管理', render: w => /立体/.test(w.type) ? tag('启用 WH-A-排-列-层', 'success') : tag('不启用', 'default') }] }));
    if (k === 'partner') {
      body.appendChild(el('<div class="bm-sec" style="margin:4px 0 8px">客户</div>'));
      body.appendChild(table({ pageSize: 0, rows: customers, columns: [{ title: '客户编码', key: 'code' }, { title: '客户名称', key: 'name' }, { title: '简称', key: 'short' }, { title: '地区', key: 'region' }, { title: '信用等级', render: c => tag(c.level, c.level === 'A' ? 'success' : 'info') }] }));
      body.appendChild(el('<div class="bm-sec" style="margin:14px 0 8px">供应商</div>'));
      body.appendChild(table({ pageSize: 0, rows: suppliers, columns: [{ title: '供应商编码', key: 'code' }, { title: '供应商名称', key: 'name' }, { title: '简称', key: 'short' }, { title: '供货类别', key: 'cat' }, { title: '状态', render: () => tag('合格供方', 'success') }] }));
    }
  }
  show(initTab);
  return () => P.destroy();
}
