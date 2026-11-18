// 应用外壳：登录守卫、顶栏、左侧导航（不含驾驶舱）、哈希路由、独立驾驶舱大屏
import { echarts, chart } from './charts.js';
import { getWorld } from '../three/world.js';
import * as plant from '../data/plant.js';
import { runtime, openAlarmCount } from './runtime.js';
import { icon } from './icons.js';
import * as cockpit from './cockpit.js';
import * as workshop from './workshop.js';
import { isLoggedIn, currentUser, logout as doLogout } from './auth.js';
import { renderLogin } from './login.js';
import { isMuted, play, muteButton, bindMute, startAlarmLoop } from './audio.js';

const BUILTIN = [workshop, cockpit];
const state = { modules: [], current: null, cleanup: null, mock: null, history: [], loaded: false, chrome: null };
const $ = s => document.querySelector(s);

export function cockpitUrl() {
  const q = location.search || '';
  return `${location.pathname}${q}#/cockpit?standalone=1`;
}
export function openCockpitTab() {
  window.open(cockpitUrl(), '_blank');
}
function isCockpitHash() {
  return parseHash().id === 'cockpit';
}

function clockText() {
  return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' }).replace(/\//g, '-');
}
let clockTimer = 0;
function startClock(sel) {
  if (clockTimer) clearInterval(clockTimer);
  const tick = () => { document.querySelectorAll(sel).forEach(n => { n.textContent = clockText(); }); };
  tick(); clockTimer = setInterval(tick, 1000); return clockTimer;
}
function paintMute() {
  document.querySelectorAll('[data-act="mute"]').forEach(b => {
    b.innerHTML = icon(isMuted() ? 'mute' : 'volume', 18);
    b.classList.toggle('is-muted', isMuted());
    b.title = isMuted() ? '点击开启语音提示' : '点击关闭语音提示';
  });
}
let muteBound = false;
function hookMute() {
  paintMute();
  if (muteBound) return;
  muteBound = true;
  bindMute(document);
  window.addEventListener('erp-unmuted', paintMute);
  window.addEventListener('erp-muted', paintMute);
}

// ---------- 业务外壳 ----------
function renderShell() {
  const u = currentUser() || { name: '张工', role: '生产经理', initial: '张' };
  document.body.className = '';
  document.body.innerHTML = `
  <header class="topbar">
    <div class="brand"><div class="logo">芯</div><div><h1>芯程电子 · 电子元器件生产管理 ERP</h1><p>三维数字孪生可视化平台 V1.0</p></div></div>
    <label class="search" title="全局搜索">${icon('search', 16)}<input id="g-search" placeholder="搜索单号 / 物料 / 批次 / 设备" autocomplete="off"><kbd>/</kbd></label>
    <div class="top-r">
      <span class="weather">${icon('cloud', 16)}多云 16~23℃</span>
      <span class="clock num" id="clock"></span>
      <button class="btn-cockpit" id="btn-cockpit" title="在新标签页打开生产数字孪生驾驶舱">${icon('cockpit', 18)}<span>驾驶舱</span></button>
      ${muteButton('btn-mute')}
      <button class="ibtn" id="btn-alarm" title="实时报警">${icon('bell', 18)}<i class="badge">${openAlarmCount()}</i></button>
      <span class="user" id="user-menu" tabindex="0">
        <span class="avatar">${u.initial}</span>
        <span><b>${u.name}</b><small>${u.role}</small></span>
        <div class="user-drop" hidden>
          <button type="button" data-act="logout">${icon('logout', 16)}退出登录</button>
        </div>
      </span>
    </div>
  </header>
  <nav class="sidebar" id="nav"></nav>
  <main class="content" id="view"><div class="boot"><div class="spin"></div><p>正在加载三维场景…</p></div></main>
  <div class="toasts" id="toasts"></div>`;
  startClock('#clock');
  hookMute();
  $('#btn-cockpit').onclick = ev => { ev.preventDefault(); openCockpitTab(); };
  $('#btn-alarm').onclick = () => openCockpitTab();
  initUserMenu();
  initSearch();
  state.chrome = 'shell';
}
function renderNav() {
  const nav = $('#nav'); if (!nav) return;
  const all = BUILTIN.map(m => m.meta).concat(state.modules.map(m => m.meta)).filter(m => m.id !== 'cockpit');
  const groups = [];
  for (const m of all) { let g = groups.find(x => x.name === (m.group || '业务')); if (!g) groups.push(g = { name: m.group || '业务', items: [] }); g.items.push(m); }
  nav.innerHTML = groups.map(g => `<div class="nav-g"><div class="nav-gt">${g.name}</div>${g.items.map(m => `<a class="nav-i" href="#/${m.id}" data-id="${m.id}">${icon(m.icon || m.id, 17)}<span>${m.title}</span></a>`).join('')}</div>`).join('')
    + (state.modules.length ? '' : `<div class="nav-g"><div class="nav-gt">业务模块</div><div class="nav-empty">业务模块加载中 / 暂未接入</div></div>`);
}
function initUserMenu() {
  if (initUserMenu._bound) return;
  initUserMenu._bound = true;
  document.addEventListener('click', e => {
    if (e.target.closest('[data-act="logout"]')) { doLogout(); location.hash = ''; location.reload(); return; }
    const box = $('#user-menu'); if (!box) return;
    const drop = box.querySelector('.user-drop'); if (!drop) return;
    if (box.contains(e.target) && !e.target.closest('.user-drop')) drop.hidden = !drop.hidden;
    else if (!box.contains(e.target)) drop.hidden = true;
  });
}

// ---------- 独立驾驶舱大屏 ----------
function renderStandalone() {
  document.body.className = 'standalone';
  document.title = '芯程电子 · 生产数字孪生驾驶舱';
  document.body.innerHTML = `
  <header class="ck-banner">
    <div class="ck-b-left"><div class="logo">芯</div><span class="weather">${icon('cloud', 16)}多云 16~23℃</span></div>
    <div class="ck-b-title"><i class="orn"></i><h1>芯程电子 · 生产数字孪生驾驶舱</h1><i class="orn"></i></div>
    <div class="ck-b-right">
      <span class="clock num" id="clock"></span>
      ${muteButton('btn-mute')}
      <span class="user" id="user-menu" tabindex="0">
        <span class="avatar">${(currentUser() || { initial: '张' }).initial}</span>
        <span><b>${(currentUser() || { name: '张工' }).name}</b><small>${(currentUser() || { role: '生产经理' }).role}</small></span>
        <div class="user-drop" hidden>
          <button type="button" data-act="logout">${icon('logout', 16)}退出登录</button>
        </div>
      </span>
    </div>
  </header>
  <main class="content content-3d content-standalone" id="view"></main>
  <div class="toasts" id="toasts"></div>`;
  startClock('#clock');
  hookMute();
  initUserMenu();
  state.chrome = 'standalone';
}

// ---------- 路由 ----------
function parseHash() {
  const h = location.hash.replace(/^#\/?/, ''); const [id, qs] = h.split('?');
  const params = {}; new URLSearchParams(qs || '').forEach((v, k) => { if (/^[\[{]/.test(v)) { try { params[k] = JSON.parse(v); return; } catch { /* 原样 */ } } params[k] = v; });
  return { id: id || 'workshop', params };
}
export function navigate(id, params = {}) {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])).toString();
  const h = `#/${id}${qs ? '?' + qs : ''}`;
  if (location.hash === h) route(); else location.hash = h;
}
function findModule(id) { return BUILTIN.find(m => m.meta.id === id) || state.modules.find(m => m.meta.id === id); }
function ensureChrome() {
  const stand = isCockpitHash();
  if (stand && state.chrome !== 'standalone') renderStandalone();
  else if (!stand && state.chrome !== 'shell') { renderShell(); renderNav(); }
}
function route() {
  if (!isLoggedIn()) { location.hash = ''; location.reload(); return; }
  ensureChrome();
  const { id, params } = parseHash();
  const stand = isCockpitHash();
  const mod = stand ? cockpit : (findModule(id) || workshop);
  try { state.cleanup?.(); } catch (e) { console.warn('模块卸载异常', e); }
  state.cleanup = null;
  stopTableWatch();
  const view = $('#view'); if (!view) return;
  view.innerHTML = ''; view.className = 'content' + (mod === cockpit || mod === workshop ? ' content-3d' : '') + (stand ? ' content-standalone' : '');
  const host = document.createElement('div'); host.className = 'mod-host'; view.appendChild(host);
  document.querySelectorAll('.nav-i').forEach(a => a.classList.toggle('active', a.dataset.id === mod.meta.id));
  document.title = stand ? '芯程电子 · 生产数字孪生驾驶舱' : `${mod.meta.title} · 芯程电子 ERP`;
  const ctx = makeCtx(params, mod.meta.id);
  if (stand) ctx.standalone = true;
  try { const r = mod.mount(host, ctx); state.cleanup = typeof r === 'function' ? r : (mod.unmount ? () => mod.unmount() : null); }
  catch (e) { console.error(e); host.innerHTML = `<div class="card mod-err"><h3>模块「${mod.meta.title}」加载失败</h3><pre>${String(e.message || e)}</pre></div>`; }
  state.current = mod.meta.id;
  if (stand && !isMuted()) play('welcome');
  if (!view.classList.contains('content-3d')) watchTables(host);
}
// 业务页：让表格容器高度适配可视区，保证横向滚动条与分页在首屏可见（模块自身不需改动）
let tblObs = null, tblRaf = 0, tblFitTimer = 0;
function stopTableWatch() {
  tblObs?.disconnect(); tblObs = null;
  cancelAnimationFrame(tblRaf); tblRaf = 0;
  clearTimeout(tblFitTimer); tblFitTimer = 0;
}
function fitTables(host) {
  const vb = $('#view').getBoundingClientRect().bottom;
  host.querySelectorAll('.bm-tw').forEach(tw => {
    if (tw.closest('.bm-drawer,.bm-dw,.bm-modal,[class*=drawer]')) return;
    if (tw.closest('.bm-fill,.bm-out,.bm-split')) {
      tw.style.maxHeight = '';
    } else {
    const body = tw.closest('.bm-body'); const st = body ? body.scrollTop : 0;
    const top = tw.getBoundingClientRect().top + st;
    const pg = tw.parentElement?.querySelector(':scope > .bm-pg'); const pgH = pg ? pg.offsetHeight + 4 : 0;
    const avail = Math.floor(vb - top - pgH - (tw.scrollWidth > tw.clientWidth + 2 ? 42 : 22));
    tw.style.maxHeight = Math.max(260, avail) + 'px';
    }
    const wrap = tw.parentElement; const x = tw.scrollWidth > tw.clientWidth + 2;
    let hint = wrap.querySelector(':scope > .tw-hint');
    if (x && !hint) { hint = document.createElement('div'); hint.className = 'tw-hint'; hint.innerHTML = '⇠ 表格较宽，可横向滚动查看更多列 ⇢'; tw.after(hint); }
    if (!x && hint) hint.remove();
    const upd = () => { const end = tw.scrollLeft + tw.clientWidth >= tw.scrollWidth - 2; tw.classList.toggle('tw-x', x && !end); tw.classList.toggle('tw-xl', x && tw.scrollLeft > 2); };
    if (!tw._twBound) { tw._twBound = true; tw.addEventListener('scroll', upd, { passive: true }); }
    upd();
  });
}
function watchTables(host) {
  tblObs?.disconnect();
  const run = () => { cancelAnimationFrame(tblRaf); tblRaf = requestAnimationFrame(() => fitTables(host)); };
  tblObs = new MutationObserver(run); tblObs.observe(host, { childList: true, subtree: true });
  run(); tblFitTimer = setTimeout(run, 300);
}
addEventListener('resize', () => { const h = document.querySelector('#view .mod-host'); if (h && !$('#view')?.classList.contains('content-3d')) fitTables(h); });
// ---------- ctx（供业务模块调用）----------
function makeCtx(params, from) {
  const world = getWorld();
  const fromTitle = findModule(from)?.meta.title;
  return {
    params, world, echarts, chart, plant, data: state.mock, theme: 'erpLight',
    standalone: isCockpitHash(),
    navigate,
    toast,
    focusDevice: id => { if (!plant.deviceById[id]) return toast(`未找到设备 ${id}`); navigate('workshop', { device: id, from, fromTitle }); },
    locateBin: (bin, opt = {}) => { if (!plant.parseBin(bin)) return toast(`库位号无效：${bin}`); navigate('workshop', { bin, from, fromTitle, ...(opt.item ? { item: opt.item } : {}) }); },
    openWorkOrder: (wo, dev) => { const m = state.modules.find(x => x.meta.id === 'mo') || state.modules.find(x => /production|workorder|plan/i.test(x.meta.id)); if (m) navigate(m.meta.id, { id: wo }); else toast(`工单 ${wo}（生产订单模块尚未接入）`); },
    stockAlerts, wipOrders, wipSource: state.mock?.mos ? '来源：生产订单' : '',
  };
}
function stockAlerts() {
  const inv = state.mock?.inventory || state.mock?.stock || state.mock?.stocks;
  if (Array.isArray(inv) && inv.length && inv[0].bin !== undefined) {
    const list = inv.map(x => ({ name: x.name || x.materialName || x.code, spec: x.spec || x.code || '', qty: +(x.qty ?? x.stock ?? 0), safe: +(x.safety ?? x.safe ?? 0), bin: x.bin || x.binId })).filter(x => plant.parseBin(x.bin));
    const warn = list.filter(x => x.qty < x.safe); if (warn.length) return warn.concat(list.filter(x => x.qty >= x.safe)).slice(0, 8);
  }
  return [
    { name: '贴片电阻 0402', spec: '10KΩ ±1% 1/16W', qty: 182000, safe: 300000, bin: 'WH-A-02-07-03' },
    { name: 'MLCC 0603', spec: '100nF 50V X7R', qty: 96000, safe: 200000, bin: 'WH-A-01-03-02' },
    { name: 'PMIC 芯片', spec: 'QFN-24 4×4', qty: 1450, safe: 3000, bin: 'WH-A-03-10-05' },
    { name: '功率电感', spec: '4.7μH 3A 4020', qty: 5200, safe: 8000, bin: 'WH-A-04-05-01' },
    { name: 'PCB 光板', spec: 'FR4 4层 1.6mm', qty: 820, safe: 1500, bin: 'WH-A-04-11-04' },
    { name: '无铅锡膏', spec: 'SAC305 500g', qty: 46, safe: 60, bin: 'WH-A-03-01-01' },
  ];
}
function wipOrders() {
  const mos = state.mock?.mos;
  if (Array.isArray(mos)) {
    const act = mos.filter(m => m.status === '开工' || m.status === '下达').sort((a, b) => (b.status === '开工') - (a.status === '开工'));
    if (act.length) return act.map(m => ({ no: m.no, line: m.line, product: m.productName || m.product, qty: m.qty, done: m.done, pct: Math.min(100, Math.round(m.done / m.qty * 100)), due: (m.planEnd || '').slice(5) }));
  }
  return [['MO2611-0009', 'L1', '电源管理板', 5000, 3100, '11-13'], ['MO2611-0010', 'L2', 'PCBA 主控板', 8000, 3600, '11-14'], ['MO2611-0011', 'L3', 'MLCC 编带', 8000000, 4400000, '11-14']].map(([no, line, product, qty, done, due]) => ({ no, line, product, qty, done, due, pct: Math.round(done / qty * 100) }));
}
function syncRuntimeWithMock() {
  const mos = state.mock?.mos; if (!Array.isArray(mos)) return;
  for (const L of ['L1', 'L2', 'L3']) {
    const m = mos.find(x => x.line === L && x.status === '开工'); if (!m) continue;
    runtime.wo[L] = m.no; runtime.products[L] = m.productName || m.product;
    for (const d of plant.devices) if (d.line === L) { runtime.dev[d.id].wo = m.no; runtime.dev[d.id].product = runtime.products[L]; }
  }
}
// ---------- 全局搜索（模块 / 设备 / 单号 / 物料 / 批次）----------
function searchIndex() {
  const m = state.mock || {}, out = [], has = id => !!findModule(id);
  for (const x of BUILTIN.concat(state.modules).filter(x => x.meta.id !== 'cockpit')) out.push({ k: x.meta.title + ' ' + x.meta.id, t: x.meta.title, c: '功能模块', go: () => navigate(x.meta.id) });
  out.push({ k: '驾驶舱 三维驾驶舱 cockpit', t: '生产数字孪生驾驶舱', c: '新标签打开', go: () => openCockpitTab() });
  for (const d of plant.devices) out.push({ k: `${d.id} ${d.name} ${d.model}`, t: `${d.name} · ${d.id}`, c: '设备 · 三维定位', go: () => navigate('workshop', { device: d.id }) });
  const add = (arr, mod, f, c) => { if (has(mod)) for (const r of arr || []) { const [k, t, id] = f(r); out.push({ k, t, c, go: () => navigate(mod, { id }) }); } };
  add(m.salesOrders, 'sales', r => [`${r.no} ${r.custName}`, `${r.no} · ${r.custName}`, r.no], '销售订单');
  add(m.mos, 'mo', r => [`${r.no} ${r.productName} ${r.batch || ''}`, `${r.no} · ${r.productName}`, r.no], '生产订单');
  add(m.inventory, 'inventory', r => [`${r.code} ${r.name} ${r.spec}`, `${r.name} ${r.spec}`, r.code], '物料库存');
  if (has('trace')) for (const r of [...(m.traceSamples || []), ...(m.shipments || []).map(s => ({ q: s.batch, label: '成品批次 · ' + s.product }))]) if (r.q) out.push({ k: r.q + ' ' + r.label, t: r.q, c: '批次追溯', go: () => navigate('trace', { id: r.q }) });
  return out;
}
function initSearch() {
  const inp = $('#g-search'); if (!inp) return; let pop = null, idx = null, hits = [], cur = 0;
  const close = () => { pop?.remove(); pop = null; };
  const draw = () => {
    const q = inp.value.trim().toLowerCase(); if (!q) return close();
    idx = idx || searchIndex(); hits = idx.filter(x => x.k.toLowerCase().includes(q)).slice(0, 10); cur = 0;
    if (!pop) { pop = document.createElement('div'); pop.className = 'search-pop'; document.body.appendChild(pop); }
    const r = inp.closest('.search').getBoundingClientRect(); pop.style.left = Math.min(r.left, innerWidth - 370) + 'px';
    pop.innerHTML = hits.length ? hits.map((h, i) => `<button data-i="${i}" class="${i ? '' : 'on'}">${h.t.replace(/[<>&]/g, '')}<em>${h.c}</em></button>`).join('') : '<div class="empty">无匹配结果</div>';
    pop.onmousedown = e => { const b = e.target.closest('button'); if (b) { e.preventDefault(); pick(+b.dataset.i); } };
  };
  const pick = i => { const h = hits[i]; if (!h) return; close(); inp.value = ''; inp.blur(); h.go(); };
  inp.addEventListener('input', draw); inp.addEventListener('focus', () => { idx = null; draw(); }); inp.addEventListener('blur', () => setTimeout(close, 120));
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') pick(cur); else if (e.key === 'Escape') { close(); inp.blur(); }
    else if (pop && /Arrow(Up|Down)/.test(e.key)) { e.preventDefault(); cur = (cur + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length; pop.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === cur)); }
  });
  if (!initSearch._slash) {
    initSearch._slash = true;
    document.addEventListener('keydown', e => {
      const inp2 = $('#g-search');
      if (e.key === '/' && inp2 && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) { e.preventDefault(); inp2.focus(); }
    });
  }
}
// ---------- toast ----------
export function toast(msg, type = 'info') {
  const box = $('#toasts') || document.body;
  const t = document.createElement('div'); t.className = 'toast toast-' + type; t.textContent = msg; box.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3000);
}
// ---------- 启动 ----------
async function loadApp() {
  if (state.loaded) return getWorld();
  const world = getWorld();
  const [w, mods, mock] = await Promise.all([
    world.ready,
    import('../modules/index.js').then(m => (m.default || m.modules || []).filter(x => x && x.meta && typeof x.mount === 'function')).catch(e => { console.warn('业务模块注册表未就绪：', e.message); return []; }),
    import('../data/mock/index.js').catch(e => { console.warn('数据模块未就绪：', e.message); return null; }),
    document.fonts?.ready,
  ]);
  state.modules = mods; state.mock = mock; syncRuntimeWithMock();
  state.loaded = true;
  window.__erp = { world: w, navigate, state, plant, toast, factoryReport: w.factoryReport, openCockpitTab };
  console.info('[设备工厂]', w.factoryReport);
  startAlarmLoop();
  window.addEventListener('erp-unmuted', () => { if (isCockpitHash()) play('welcome'); });
  return w;
}
async function bootApp() {
  document.body.dataset.ready = '0';
  if (isCockpitHash()) renderStandalone(); else renderShell();
  await loadApp();
  renderNav();
  if (!location.hash || location.hash === '#' || location.hash === '#/') location.hash = '#/workshop';
  if (!bootApp._routed) { window.addEventListener('hashchange', route); bootApp._routed = true; }
  route();
  document.body.dataset.ready = '1';
}
function showBootError(e) {
  console.error(e);
  const v = $('#view');
  if (v) v.innerHTML = `<div class="card mod-err"><h3>系统启动失败</h3><pre>${e.stack || e}</pre></div>`;
  document.body.dataset.ready = '1';
}
function start() { return bootApp().catch(showBootError); }
function hookSessionWatch() {
  if (hookSessionWatch._on) return;
  hookSessionWatch._on = true;
  window.addEventListener('storage', e => {
    if (e.key === 'erp-3d-session' && !e.newValue) location.reload();
  });
}
function boot() {
  hookSessionWatch();
  if (!isLoggedIn()) {
    renderLogin(() => start());
    return;
  }
  start();
}
boot();
