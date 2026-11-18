// 三维车间：全屏三维 + 设备树 + 视角工具条 + 设备详情面板 + 库位定位
import { devices, lines, STATUS, parseBin, parseRcBin } from '../data/plant.js';
import { renderDevicePanel } from './devicePanel.js';
import { VIEWS } from '../three/world.js';
import { icon } from './icons.js';

export const meta = { id: 'workshop', title: '三维车间', group: '可视化', icon: 'cube' };
export function mount(el, ctx) {
  const { world } = ctx;
  const groups = lines.map(l => ({ ...l, devs: devices.filter(d => d.line === l.id) }));
  el.innerHTML = `
  <div class="ws">
    <div class="ws-stage"></div>
    <aside class="ws-tree card glass">
      <h4 class="card-title">设备列表<span class="extra">${devices.length} 台</span></h4>
      <div class="ws-filter">${[['all', '全部']].concat(Object.entries(STATUS).map(([k, v]) => [k, v.label])).map(([k, n]) => `<button class="chip ${k === 'all' ? 'on' : ''}" data-f="${k}">${k !== 'all' ? `<i class="dot dot-${k}"></i>` : ''}${n}<em>${k === 'all' ? devices.length : devices.filter(d => world.getStatus(d.id) === k).length}</em></button>`).join('')}</div>
      <div class="ws-list">${groups.map(g => `<div class="grp"><div class="grp-h" data-view="${g.id === 'AGV' ? 'hall' : g.id}"><b>${g.name}</b><span>${g.desc}</span></div>${g.devs.map(d => `<button class="dv" data-dev="${d.id}" data-st="${world.getStatus(d.id)}"><i class="dot dot-${world.getStatus(d.id)}"></i><span>${d.name}</span><em class="st-${world.getStatus(d.id)}">${STATUS[world.getStatus(d.id)].label}</em></button>`).join('')}</div>`).join('')}</div>
    </aside>
    <div class="ws-bar card glass">
      <div class="ws-views">
        ${Object.entries(VIEWS).map(([k, v]) => `<button class="vbtn ${k === 'hall' ? 'on' : ''}" data-view="${k}">${v.name}</button>`).join('')}
      </div>
      <span class="sep"></span>
      <div class="ws-acts">
        <button class="vbtn on" data-act="labels">设备标签</button><button class="vbtn on" data-act="flow">PCB 流动</button><button class="vbtn" data-act="rotate">自动巡航</button>
      </div>
      <span class="ws-bin">
        <button class="vbtn ws-bin-btn" data-act="bintoggle" title="库位定位">${icon('target', 16)}<span class="ws-bin-txt">库位定位</span></button>
        <div class="ws-bin-pop" hidden>
          <input class="input input-sm" id="ws-bin" placeholder="WH-A-02-07-03 / RC-01-08" value="${ctx.params?.bin || ''}"/>
          <button class="btn btn-sm btn-primary" data-act="bin">定位</button>
        </div>
      </span>
    </div>
    <aside class="ws-panel card glass" hidden></aside>
    <div class="ws-banner" hidden></div>
    <div class="ws-legend card glass">${Object.entries(STATUS).map(([k, v]) => `<span><i class="dot dot-${k}"></i>${v.label}</span>`).join('')}<span class="tip">左键旋转 · 右键平移 · 滚轮缩放 · 单击设备查看详情</span></div>
  </div>`;
  const stage = el.querySelector('.ws-stage'), panel = el.querySelector('.ws-panel'), banner = el.querySelector('.ws-banner');
  stage.dataset.blockers = '.ws-tree,.ws-bar,.ws-panel,.ws-banner,.ws-legend';
  world.mount(stage); world.setView(ctx.params?.view || 'hall', true);
  let cleanupPanel = null;
  const onSel = id => {
    cleanupPanel?.(); cleanupPanel = null;
    el.querySelectorAll('.dv').forEach(b => b.classList.toggle('active', b.dataset.dev === id));
    if (!id) { panel.hidden = true; return; }
    panel.hidden = false; cleanupPanel = renderDevicePanel(panel, id, { world, ctx, onClose: () => world.select(null) });
  };
  const offSel = world.on('select', onSel);
  const offSt = world.on('status', id => {
    refreshTree();
    if (id && world.selected === id && !panel.hidden) {
      cleanupPanel?.();
      cleanupPanel = renderDevicePanel(panel, id, { world, ctx, onClose: () => world.select(null) });
    }
  });
  function refreshTree() {
    el.querySelectorAll('.dv').forEach(b => { const s = world.getStatus(b.dataset.dev); b.dataset.st = s; b.querySelector('.dot').className = 'dot dot-' + s; const em = b.querySelector('em'); em.className = 'st-' + s; em.textContent = STATUS[s].label; });
    el.querySelectorAll('.ws-filter .chip').forEach(c => { const k = c.dataset.f; c.querySelector('em').textContent = k === 'all' ? devices.length : devices.filter(d => world.getStatus(d.id) === k).length; });
  }
  const setViewBtn = k => el.querySelectorAll('.ws-bar .vbtn[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === k));
  const doBin = id => {
    const rc = parseRcBin(id);
    if (rc) {
      if (!world.locateBin(id)) { ctx.toast(`未找到料塔料位 ${id}`); return; }
      setViewBtn('');
      banner.hidden = false;
      banner.innerHTML = `${icon('target', 16)}<span>已定位料塔料位 <b>${id}</b>（${rc.id} · 槽位 ${rc.slot}）${ctx.params?.item ? ` · 物料：${ctx.params.item}` : ''}</span>${ctx.params?.from ? `<button class="btn btn-sm" data-act="back">${icon('back', 14)}返回${ctx.params.fromTitle || '上一页'}</button>` : ''}<button class="btn btn-sm" data-act="clearbin">清除</button>`;
      return;
    }
    if (!parseBin(id)) { ctx.toast('库位号格式应为 WH-A-排-列-层 或 RC-柜号-槽位，例如 WH-A-02-07-03 / RC-01-08'); return; }
    if (!world.locateBin(id)) { ctx.toast(`未找到库位 ${id}`); return; }
    setViewBtn('');
    const q = parseBin(id);
    banner.hidden = false;
    banner.innerHTML = `${icon('target', 16)}<span>已定位库位 <b>${id}</b>（第 ${q.row} 排 · 第 ${q.col} 列 · 第 ${q.level} 层）${ctx.params?.item ? ` · 物料：${ctx.params.item}` : ''}</span>${ctx.params?.from ? `<button class="btn btn-sm" data-act="back">${icon('back', 14)}返回${ctx.params.fromTitle || '上一页'}</button>` : ''}<button class="btn btn-sm" data-act="clearbin">清除</button>`;
  };
  const onClick = e => {
    const v = e.target.closest('[data-view]'); if (v) { world.setView(v.dataset.view); setViewBtn(v.dataset.view); banner.hidden = true; return; }
    const dv = e.target.closest('[data-dev]'); if (dv) { world.focusDevice(dv.dataset.dev); banner.hidden = true; return; }
    const f = e.target.closest('[data-f]'); if (f) { el.querySelectorAll('.ws-filter .chip').forEach(c => c.classList.toggle('on', c === f)); el.querySelectorAll('.dv').forEach(b => { b.hidden = f.dataset.f !== 'all' && b.dataset.st !== f.dataset.f; }); return; }
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'labels') { world.labelsOn = !world.labelsOn; world.setLabels(world.labelsOn); a.classList.toggle('on', world.labelsOn); }
    if (act === 'flow') { world.flowOn = !world.flowOn; a.classList.toggle('on', world.flowOn); }
    if (act === 'rotate') { world.autoRotate = !world.autoRotate; a.classList.toggle('on', world.autoRotate); }
    if (act === 'bintoggle') {
      const pop = el.querySelector('.ws-bin-pop');
      const open = pop.hidden;
      pop.hidden = !open;
      a.classList.toggle('on', open);
      if (open) setTimeout(() => el.querySelector('#ws-bin')?.focus(), 0);
      return;
    }
    if (act === 'bin') {
      doBin(el.querySelector('#ws-bin').value.trim().toUpperCase());
      const pop = el.querySelector('.ws-bin-pop'); if (pop) pop.hidden = true;
      el.querySelector('.ws-bin-btn')?.classList.remove('on');
    }
    if (act === 'clearbin') { world.clearBin(); banner.hidden = true; }
    if (act === 'back') ctx.navigate(ctx.params.from, ctx.params.fromParams || {});
  };
  el.addEventListener('click', onClick);
  const onDoc = e => {
    const bin = el.querySelector('.ws-bin');
    if (bin && !bin.contains(e.target)) {
      const pop = el.querySelector('.ws-bin-pop');
      if (pop && !pop.hidden) { pop.hidden = true; el.querySelector('.ws-bin-btn')?.classList.remove('on'); }
    }
  };
  document.addEventListener('click', onDoc);
  el.querySelector('#ws-bin').addEventListener('keydown', e => { if (e.key === 'Enter') { doBin(e.target.value.trim().toUpperCase()); el.querySelector('.ws-bin-pop').hidden = true; el.querySelector('.ws-bin-btn')?.classList.remove('on'); } });
  let bootTimer = 0;
  if (ctx.params?.bin) bootTimer = setTimeout(() => doBin(ctx.params.bin), 30);
  else if (ctx.params?.device) bootTimer = setTimeout(() => world.focusDevice(ctx.params.device), 30);
  return () => { clearTimeout(bootTimer); offSel(); offSt(); cleanupPanel?.(); world.select(null); world.clearBin(); world.autoRotate = false; world.unmount(); el.removeEventListener('click', onClick); document.removeEventListener('click', onDoc); };
}
