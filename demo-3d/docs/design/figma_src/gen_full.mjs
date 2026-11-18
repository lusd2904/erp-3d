// 生成 fullsys UI 设计稿 SVG：UI03 / UI04 / UI24 / UI25(+ok/err) / UI32   (node gen_full.mjs)
import fs from 'fs';
const OUT = '/workspace/erp-3d/fullsys/ui/src/';
const src = fs.readFileSync('build.js', 'utf8');
const eng = src.slice(src.indexOf('// ---------- iso engine'), src.indexOf('// ================= PAGE 1'));
const E = new Function(eng + '; return {C30,WH,GR,BL,BLD,CY,GL,OR,LT,STK,bx,fy,fx,ft,ln,circ,cyl,render,mk,tower,printer,spi,mounter,reflow,aoi,conveyor,taping,tester,stacker,agv,rack};')();
const { bx, fy, fx, ft, ln, render, mk, printer, spi, mounter, reflow, aoi, conveyor, taping, tester, stacker, agv, rack } = E;
const ADV = JSON.parse(fs.readFileSync('adv_full.json', 'utf8'));
const W = (s, size, w = 400) => { let t = 0; for (const c of String(s)) t += (ADV[w][c] ?? 1) * size; return t; };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const FF = 'Noto Sans SC';
const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
const n0 = v => Math.round(v).toLocaleString('en-US');
// T：以文字垂直中心 cy 定位，anchor 手动换算为左对齐 x
const T = (s, x, cy, size, w = 400, col = '#1E293B', anchor = 'start', extra = '') => { const wd = W(s, size, w); const x0 = anchor === 'middle' ? x - wd / 2 : anchor === 'end' ? x - wd : x;
  return `<text x="${x0.toFixed(1)}" y="${(cy + size * 0.36).toFixed(1)}" font-family="${FF}" font-size="${size}" font-weight="${w}" fill="${col}"${extra}>${esc(s)}</text>`; };
const R = (x, y, w, h, f, r = 0, ex = '') => `<rect x="${(+x).toFixed(1)}" y="${(+y).toFixed(1)}" width="${(+w).toFixed(1)}" height="${(+h).toFixed(1)}"${r ? ` rx="${r}"` : ''} fill="${f}"${ex}/>`;
const pill = (s, x, cy, fg, bg, size = 12, w = 500, px = 8, h = size + 8, anchor = 'start', ex = '') => { const wd = W(s, size, w) + px * 2; const x0 = anchor === 'end' ? x - wd : anchor === 'middle' ? x - wd / 2 : x; return { w: wd, svg: R(x0, cy - h / 2, wd, h, bg, Math.min(h / 2, 6), ex) + T(s, x0 + px, cy, size, w, fg) }; };
const bar = (x, y, w, h, p, col, bgc = '#E2E8F0') => R(x, y, w, h, bgc, h / 2) + (p > 0 ? R(x, y, Math.max(h, w * p), h, col, h / 2) : '');
const ring = (cx, cy, r, sw, p, col, bgc = '#E2E8F0') => { const a0 = -Math.PI / 2, a1 = a0 + p * Math.PI * 2; return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${bgc}" stroke-width="${sw}"/><path d="M ${cx} ${cy - r} A ${r} ${r} 0 ${p > 0.5 ? 1 : 0} 1 ${(cx + r * Math.cos(a1)).toFixed(2)} ${(cy + r * Math.sin(a1)).toFixed(2)}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round"/>`; };
const g = (x, y, s) => `<g transform="translate(${x},${y})">${s}</g>`;
const shadow = (id, dx, dy, sd, a) => `<filter id="${id}" x="-20%" y="-20%" width="140%" height="150%" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dx="${dx}" dy="${dy}"/><feGaussianBlur stdDeviation="${sd}"/><feColorMatrix type="matrix" values="0 0 0 0 0.12 0 0 0 0 0.25 0 0 0 0 0.45 0 0 0 ${a} 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="ds"/><feBlend mode="normal" in="SourceGraphic" in2="ds" result="shape"/></filter>`;
const DEFS = `<defs>${shadow('sh', 0, 4, 10, 0.08)}${shadow('shP', 0, 10, 18, 0.18)}${shadow('shL', -6, 0, 16, 0.10)}
<linearGradient id="bgG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FAFCFE"/><stop offset="1" stop-color="#E3ECF6"/></linearGradient>
<linearGradient id="logoG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3B82F6"/><stop offset="1" stop-color="#1D4ED8"/></linearGradient>
<linearGradient id="okG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16A34A"/><stop offset="1" stop-color="#22C55E"/></linearGradient>
<linearGradient id="errG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DC2626"/><stop offset="1" stop-color="#EF4444"/></linearGradient>
<linearGradient id="areaB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B82F6" stop-opacity="0.22"/><stop offset="1" stop-color="#3B82F6" stop-opacity="0.02"/></linearGradient>
<linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10B981" stop-opacity="0.22"/><stop offset="1" stop-color="#10B981" stop-opacity="0.02"/></linearGradient>
<radialGradient id="glowR" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#EF4444" stop-opacity="0.45"/><stop offset="1" stop-color="#EF4444" stop-opacity="0"/></radialGradient>
</defs>`;
const SVG = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${DEFS}${body}</svg>`;
const logo = (x, y, s = 32) => g(x, y, `<rect width="${s}" height="${s}" rx="${s * 0.25}" fill="url(#logoG)"/><g transform="scale(${s / 40})"><rect x="11" y="11" width="18" height="18" rx="3" fill="none" stroke="#FFFFFF" stroke-width="2.2"/><rect x="16" y="16" width="8" height="8" rx="1.5" fill="#67E8F9"/>${[15, 20, 25].map(v => `<line x1="${v}" y1="6" x2="${v}" y2="11" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/><line x1="${v}" y1="29" x2="${v}" y2="34" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="${v}" x2="11" y2="${v}" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/><line x1="29" y1="${v}" x2="34" y2="${v}" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>`).join('')}</g>`);
// ---- 图标（16×16 线框） ----
const IC = {
  search: c => `<circle cx="7" cy="7" r="5" fill="none" stroke="${c}" stroke-width="1.6"/><line x1="11" y1="11" x2="14.5" y2="14.5" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`,
  bell: c => `<path d="M4 11 V7 A4 4 0 0 1 12 7 V11 L13 12.5 H3 Z" fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/><path d="M6.5 14 H9.5" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>`,
  chev: c => `<path d="M4 6 L8 10 L12 6" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  chevR: c => `<path d="M6 4 L10 8 L6 12" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  lock: c => `<rect x="3" y="7" width="10" height="7.5" rx="1.8" fill="none" stroke="${c}" stroke-width="1.4"/><path d="M5.2 7 V5.2 A2.8 2.8 0 0 1 10.8 5.2 V7" fill="none" stroke="${c}" stroke-width="1.4"/>`,
  cal: c => `<rect x="2.5" y="3.5" width="11" height="10" rx="2" fill="none" stroke="${c}" stroke-width="1.4"/><line x1="2.5" y1="7" x2="13.5" y2="7" stroke="${c}" stroke-width="1.4"/><line x1="5.5" y1="2" x2="5.5" y2="5" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/><line x1="10.5" y1="2" x2="10.5" y2="5" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>`,
  cols: c => `<rect x="2" y="2.5" width="12" height="11" rx="2" fill="none" stroke="${c}" stroke-width="1.4"/><line x1="6" y1="2.5" x2="6" y2="13.5" stroke="${c}" stroke-width="1.4"/><line x1="10" y1="2.5" x2="10" y2="13.5" stroke="${c}" stroke-width="1.4"/>`,
  filter: c => `<path d="M2.5 3 H13.5 L9.5 8 V13 L6.5 11.5 V8 Z" fill="none" stroke="${c}" stroke-width="1.4" stroke-linejoin="round"/>`,
  refresh: c => `<path d="M13 8 A5 5 0 1 1 11.5 4.4" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/><path d="M12 1.8 V4.8 H9" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  clip: c => `<path d="M11 5.5 L6.2 10.3 A1.5 1.5 0 0 0 8.3 12.4 L13 7.7 A3 3 0 0 0 8.8 3.5 L4 8.3 A4.2 4.2 0 0 0 10 14.2" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>`,
  drag: c => [5, 8, 11].map(y => `<circle cx="6" cy="${y}" r="1.1" fill="${c}"/><circle cx="10" cy="${y}" r="1.1" fill="${c}"/>`).join(''),
  plus: c => `<path d="M8 3 V13 M3 8 H13" stroke="${c}" stroke-width="1.7" stroke-linecap="round"/>`,
  close: c => `<path d="M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>`,
  star: c => `<path d="M8 2 L9.8 5.8 L14 6.3 L10.9 9.2 L11.7 13.3 L8 11.2 L4.3 13.3 L5.1 9.2 L2 6.3 L6.2 5.8 Z" fill="none" stroke="${c}" stroke-width="1.3" stroke-linejoin="round"/>`,
  up: c => `<path d="M8 13 V3 M4 7 L8 3 L12 7" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  down: c => `<path d="M8 3 V13 M4 9 L8 13 L12 9" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  save: c => `<path d="M3 3 H11 L13 5 V13 H3 Z" fill="none" stroke="${c}" stroke-width="1.4" stroke-linejoin="round"/><rect x="5.5" y="3" width="5" height="3.5" fill="none" stroke="${c}" stroke-width="1.2"/><rect x="5" y="9" width="6" height="4" fill="none" stroke="${c}" stroke-width="1.2"/>`,
  send: c => `<path d="M2.5 8 L13.5 3 L10 13.5 L7.5 9 Z" fill="none" stroke="${c}" stroke-width="1.4" stroke-linejoin="round"/>`,
  check: c => `<circle cx="8" cy="8" r="6" fill="none" stroke="${c}" stroke-width="1.4"/><path d="M5.3 8.2 L7.2 10 L10.8 6.3" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  push: c => `<path d="M3 8 H12 M9 5 L12 8 L9 11" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><line x1="14" y1="3.5" x2="14" y2="12.5" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>`,
  stop: c => `<circle cx="8" cy="8" r="6" fill="none" stroke="${c}" stroke-width="1.4"/><line x1="4" y1="12" x2="12" y2="4" stroke="${c}" stroke-width="1.4"/>`,
  more: c => [4, 8, 12].map(x => `<circle cx="${x}" cy="8" r="1.3" fill="${c}"/>`).join(''),
  grid: c => `<rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1.2" fill="none" stroke="${c}" stroke-width="1.4"/><rect x="9" y="2.5" width="4.5" height="4.5" rx="1.2" fill="none" stroke="${c}" stroke-width="1.4"/><rect x="2.5" y="9" width="4.5" height="4.5" rx="1.2" fill="none" stroke="${c}" stroke-width="1.4"/><rect x="9" y="9" width="4.5" height="4.5" rx="1.2" fill="none" stroke="${c}" stroke-width="1.4"/>`,
  doc: c => `<path d="M4 2.5 H9.5 L12.5 5.5 V13.5 H4 Z" fill="none" stroke="${c}" stroke-width="1.4" stroke-linejoin="round"/><line x1="6" y1="8" x2="10.5" y2="8" stroke="${c}" stroke-width="1.3"/><line x1="6" y1="10.5" x2="10.5" y2="10.5" stroke="${c}" stroke-width="1.3"/>`,
  cube: c => `<path d="M8 2 L13.5 5 V11 L8 14 L2.5 11 V5 Z M2.5 5 L8 8 L13.5 5 M8 8 V14" fill="none" stroke="${c}" stroke-width="1.3" stroke-linejoin="round"/>`,
  gear: c => `<circle cx="8" cy="8" r="2.4" fill="none" stroke="${c}" stroke-width="1.4"/><circle cx="8" cy="8" r="5.6" fill="none" stroke="${c}" stroke-width="1.4" stroke-dasharray="2.2 1.6"/>`,
  chart: c => `<path d="M2.5 13.5 H13.5" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/><rect x="3.5" y="8" width="2.4" height="4.5" fill="${c}"/><rect x="7" y="5" width="2.4" height="7.5" fill="${c}"/><rect x="10.5" y="2.5" width="2.4" height="10" fill="${c}"/>`,
  user: c => `<circle cx="8" cy="5.5" r="2.8" fill="none" stroke="${c}" stroke-width="1.4"/><path d="M2.8 14 C3.5 10 12.5 10 13.2 14" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>`,
  truck: c => `<rect x="1.5" y="4" width="8" height="7" rx="1" fill="none" stroke="${c}" stroke-width="1.3"/><path d="M9.5 6.5 H12.5 L14.5 9 V11 H9.5" fill="none" stroke="${c}" stroke-width="1.3" stroke-linejoin="round"/><circle cx="4.5" cy="12" r="1.4" fill="#fff" stroke="${c}" stroke-width="1.2"/><circle cx="11.5" cy="12" r="1.4" fill="#fff" stroke="${c}" stroke-width="1.2"/>`,
  shield: c => `<path d="M8 2 L13 4 V8 C13 11 10.8 13 8 14 C5.2 13 3 11 3 8 V4 Z" fill="none" stroke="${c}" stroke-width="1.4" stroke-linejoin="round"/><path d="M5.8 8 L7.4 9.6 L10.4 6.6" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>`,
  home: c => `<path d="M2.5 7.5 L8 3 L13.5 7.5 V13.5 H2.5 Z" fill="none" stroke="${c}" stroke-width="1.4" stroke-linejoin="round"/><rect x="6.5" y="9.5" width="3" height="4" fill="none" stroke="${c}" stroke-width="1.2"/>`,
};
const ic = (k, x, y, c = '#64748B', s = 16) => `<g transform="translate(${(+x).toFixed(1)},${(+y).toFixed(1)})${s !== 16 ? ` scale(${s / 16})` : ''}">${IC[k](c)}</g>`;
// ---- 通用控件 ----
const chk = (x, y, on, part) => R(x, y, 16, 16, on || part ? '#2563EB' : '#FFFFFF', 4, on || part ? '' : ' stroke="#CBD5E1"') + (on ? `<path d="M${x + 4} ${y + 8.2} L${x + 7} ${y + 11} L${x + 12} ${y + 5.5}" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>` : part ? R(x + 4, y + 7, 8, 2, '#FFFFFF', 1) : '');
const btn = (x, y, s, kind = 0, icon, h = 32, size = 14) => { // kind 0 白 1 主色 2 文字
  const wd = W(s, size, 500) + (icon ? 22 : 0) + 28; const fg = kind === 1 ? '#FFFFFF' : '#334155';
  return { w: wd, svg: R(x, y, wd, h, kind === 1 ? '#2563EB' : '#FFFFFF', 6, kind === 1 ? '' : ' stroke="#CBD5E1"') + (icon ? ic(icon, x + 13, y + h / 2 - 8, kind === 1 ? '#FFFFFF' : '#475569') : '') + T(s, x + 14 + (icon ? 22 : 0), y + h / 2, size, 500, fg) }; };
const row = (x, y, items, gap = 8) => { let s = '', cx = x; for (const it of items) { if (it === '|') { s += R(cx + 2, y + 7, 1, 18, '#E2E8F0'); cx += 13; continue; } const b = btn(cx, y, ...it); s += b.svg; cx += b.w + gap; } return { svg: s, x: cx }; };
const ST1 = { 暂存: ['#475569', '#F1F5F9', '#CBD5E1'], 创建: ['#1D4ED8', '#EFF6FF', '#BFDBFE'], 审核中: ['#C2410C', '#FFF7ED', '#FED7AA'], 已审核: ['#15803D', '#F0FDF4', '#BBF7D0'] };
const ST2 = { 计划: ['#475569', '#EEF2F6'], 计划确认: ['#4338CA', '#EEF2FF'], 下达: ['#1D4ED8', '#DBEAFE'], 开工: ['#0E7490', '#CFFAFE'], 完工: ['#15803D', '#DCFCE7'] };
const tag1 = (s, x, cy) => { const c = ST1[s]; return pill(s, x, cy, c[0], c[1], 12, 500, 8, 22, 'start', ` stroke="${c[2]}"`).svg; };
const tag2 = (s, x, cy) => { const c = ST2[s]; return `<circle cx="${x + 4}" cy="${cy}" r="3.5" fill="${c[0]}"/>` + T(s, x + 13, cy, 13, 500, c[0]); };
// ---- 后台框架：顶栏 + 左菜单 + 页签栏 ----
const MENU = [ // 定稿菜单（2026-11-13）：一级 10 项与“生产管理”子项保持不变（UI03/UI04 已认可），之后不再修改
  ['home', '工作台'],
  ['chart', '计划管理', ['销售订单', 'MRP 运算', 'MRP 运算结果', '计划订单', '日排产']],
  ['cube', '生产管理', ['生产订单', '生产用料清单', '生产领料单', '生产补料单', '生产汇报单', '生产入库单', '齐套分析']],
  ['gear', '车间执行', ['工序计划', '调度派工', '工位终端 HMI', '安灯看板', '安灯处理单', '设备台账', 'OEE 分析']],
  ['truck', '采购管理', ['采购申请', '采购订单', '委外订单', '收料通知', '供应商门户']],
  ['grid', '库存管理', ['即时库存', '采购入库', '销售出库', '调拨单', '盘点单', '卷盘 MSL 管理', '条码打印']],
  ['shield', '质量管理', ['检验单', '首检记录', '不良处理', '批号 / 卷盘追溯']],
  ['chart', '三维与看板', ['三维车间', '驾驶舱', '电子看板', '订单执行进度', '报表中心']],
  ['doc', '基础资料', ['物料', '物料清单 BOM', '替代方案', '工艺路线', '站位表', '工程变更 ECN', '供应商', '客户', '仓库', '工作中心']],
  ['user', '系统管理', ['待办中心', '流程设计器', '转换规则', '用户角色权限', '系统参数']]];
function frame(tabs, activeSub) {
  const b = [];
  b.push(R(0, 0, 1920, 1080, '#F3F6FA'));
  // 顶栏
  b.push(R(0, 0, 1920, 52, '#FFFFFF') + R(0, 51, 1920, 1, '#E2E8F0'));
  b.push(logo(18, 10, 32) + T('芯程电子', 60, 26, 17, 700, '#0F172A') + R(140, 18, 1, 16, '#CBD5E1') + T('电子元器件生产管理 ERP', 152, 26, 14, 500, '#475569'));
  b.push(R(1180, 11, 340, 30, '#F1F5F9', 15) + ic('search', 1194, 18, '#94A3B8') + T('搜索功能、单据编号、物料', 1218, 26, 13, 400, '#94A3B8') + T('Ctrl K', 1506, 26, 12, 500, '#94A3B8', 'end'));
  b.push(T('一号工厂', 1552, 26, 13, 500, '#334155') + ic('chev', 1612, 18, '#94A3B8') + R(1640, 18, 1, 16, '#E2E8F0'));
  b.push(ic('bell', 1660, 18, '#475569') + `<circle cx="1675" cy="18" r="7.5" fill="#EF4444"/>` + T('6', 1675, 18.5, 10, 700, '#FFFFFF', 'middle'));
  b.push(`<circle cx="1712" cy="26" r="15" fill="#DBEAFE"/>` + T('王', 1712, 26, 14, 700, '#1D4ED8', 'middle') + T('王敏', 1736, 19, 13, 500, '#0F172A') + T('计划员 · 生产计划部', 1736, 35, 11, 400, '#64748B'));
  // 左菜单
  b.push(R(0, 52, 208, 1028, '#FFFFFF') + R(207, 52, 1, 1028, '#E2E8F0'));
  b.push(R(12, 64, 184, 30, '#F1F5F9', 6) + ic('search', 22, 71, '#94A3B8') + T('搜索菜单', 44, 79, 13, 400, '#94A3B8'));
  let y = 106;
  for (const [k, n, subs] of MENU) {
    const open = !!subs && subs.includes(activeSub), topOn = n === activeSub;
    if (topOn) b.push(R(12, y + 2, 184, 34, '#E6F0FF', 6) + R(0, y + 7, 3, 24, '#2563EB', 1.5));
    b.push(ic(k, 22, y + 10, open || topOn ? '#1D4ED8' : '#64748B') + T(n, 48, y + 18, 14, open || topOn ? 700 : 500, open || topOn ? '#1D4ED8' : '#334155') + ic(open ? 'chev' : 'chevR', 172, y + 10, '#94A3B8'));
    y += 38;
    if (open) for (const s of subs) { const on = s === activeSub; if (on) b.push(R(12, y + 2, 184, 32, '#E6F0FF', 6) + R(0, y + 6, 3, 24, '#2563EB', 1.5)); b.push(T(s, 48, y + 18, 13, on ? 700 : 400, on ? '#1D4ED8' : '#475569')); y += 34; }
  }
  b.push(R(12, 1020, 184, 1, '#EEF2F7') + T('V1.0.3 · 一号工厂', 22, 1044, 12, 400, '#94A3B8'));
  // 页签栏
  b.push(R(208, 52, 1712, 40, '#FFFFFF') + R(208, 91, 1712, 1, '#E2E8F0'));
  let tx = 216;
  tabs.forEach(([s, on], i) => { const wd = W(s, 13, on ? 500 : 400) + (i ? 50 : 32);
    b.push(on ? R(tx, 58, wd, 34, '#F3F6FA', 6) + R(tx, 88, wd, 4, '#F3F6FA') + R(tx + 10, 58, wd - 20, 2, '#2563EB', 1) : '');
    b.push(i === 0 ? ic('home', tx + 10, 67, on ? '#1D4ED8' : '#64748B', 14) : '');
    b.push(T(s, tx + (i === 0 ? 30 : 14), 73, 13, on ? 500 : 400, on ? '#1D4ED8' : '#475569') + (i ? ic('close', tx + wd - 24, 66, '#94A3B8', 14) : ''));
    tx += wd + 4; if (!on && i < tabs.length - 1 && !tabs[i + 1][1]) b.push(R(tx - 3, 64, 1, 16, '#E2E8F0')); });
  return b;
}

// ======================= UI03 生产订单列表 =======================
const PROD = {
  BT52: ['3.01.0052', 'BLE5.0 蓝牙模块', 'BT-52 V2.3', 'SMT二车间'], PM0520: ['3.01.0031', 'DC-DC 电源模块', 'PM-0520', 'SMT一车间'], PM1230: ['3.01.0034', 'DC-DC 电源模块', 'PM-1230', 'SMT一车间'],
  LM1117: ['3.01.0047', 'LDO 稳压模块', 'LM-1117 3.3V', 'SMT一车间'], WM6200: ['3.01.0061', 'Wi-Fi 模块', 'WM-6200', 'SMT二车间'], MD8833: ['3.01.0072', '电机驱动模块', 'MD-8833', 'SMT一车间'],
  C104: ['3.02.0104', 'MLCC 贴片电容', '0603 X7R 104K', '测试编带车间'], C105: ['3.02.0105', 'MLCC 贴片电容', '0402 X5R 105K', '测试编带车间'], L4R7: ['3.03.0047', '功率电感', 'CD54-4R7', '测试编带车间'],
  TVS: ['3.04.0050', 'TVS 二极管', 'SMBJ5.0A', '测试编带车间'], XT24: ['3.05.0024', '无源晶振', '3225 24MHz', '测试编带车间'] };
const ROWS3 = [ // 单号, 单据类型, 单据状态, 业务状态, 产品, 数量, 计划开工, 计划完工, 领料状态, 入库, 计划员, 来源
  ['MO-20261113-006', '普通生产', '暂存', '计划', 'WM6200', 6000, '11-16', '11-17', '未领料', 0, '王敏', ''],
  ['MO-20261113-005', '普通生产', '创建', '计划', 'PM1230', 4000, '11-15', '11-15', '未领料', 0, '王敏', 'SO-20261109-014'],
  ['MO-20261113-004', '普通生产', '审核中', '计划', 'C105', 500000, '11-14', '11-15', '未领料', 0, '赵磊', 'SO-20261110-003'],
  ['MO-20261113-003', '返工生产', '审核中', '计划', 'TVS', 20000, '11-14', '11-14', '未领料', 0, '赵磊', ''],
  ['MO-20261113-002', '普通生产', '创建', '计划', 'MD8833', 3000, '11-15', '11-16', '未领料', 0, '王敏', 'SO-20261111-008'],
  ['MO-20261113-001', '普通生产', '已审核', '下达', 'WM6200', 6000, '11-14', '11-14', '未领料', 0, '王敏', 'SO-20261108-021'],
  ['MO-20261112-005', '普通生产', '已审核', '开工', 'MD8833', 3500, '11-12', '11-13', '部分领料', 0, '王敏', 'SO-20261106-011'],
  ['MO-20261112-004', '普通生产', '已审核', '开工', 'TVS', 150000, '11-12', '11-13', '全部领料', 52000, '赵磊', 'SO-20261107-002'],
  ['MO-20261112-003', '普通生产', '已审核', '开工', 'C104', 200000, '11-12', '11-13', '全部领料', 94000, '赵磊', 'SO-20261105-017'],
  ['MO-20261112-002', '普通生产', '已审核', '开工', 'BT52', 8000, '11-12', '11-13', '全部领料', 4800, '王敏', 'SO-20261105-021'],
  ['MO-20261112-001', '普通生产', '已审核', '开工', 'PM0520', 5000, '11-12', '11-12', '全部领料', 3600, '王敏', 'SO-20261104-009'],
  ['MO-20261111-018', '普通生产', '已审核', '完工', 'L4R7', 60000, '11-11', '11-11', '全部领料', 60000, '赵磊', 'SO-20261103-006'],
  ['MO-20261111-017', '普通生产', '已审核', '完工', 'LM1117', 12000, '11-11', '11-12', '全部领料', 12000, '王敏', 'SO-20261102-015'],
  ['MO-20261111-016', '普通生产', '已审核', '下达', 'PM1230', 4000, '11-14', '11-14', '未领料', 0, '王敏', 'SO-20261109-014'],
  ['MO-20261111-015', '普通生产', '已审核', '完工', 'BT52', 8000, '11-10', '11-11', '超额领料', 8000, '王敏', 'SO-20261101-004'],
  ['MO-20261110-022', '普通生产', '已审核', '完工', 'XT24', 300000, '11-10', '11-11', '全部领料', 300000, '赵磊', 'SO-20261031-010'],
  ['MO-20261110-021', '普通生产', '已审核', '下达', 'C104', 200000, '11-15', '11-16', '部分领料', 0, '赵磊', 'SO-20261108-002'],
  ['MO-20261110-020', '普通生产', '暂存', '计划', 'LM1117', 10000, '11-17', '11-18', '未领料', 0, '王敏', ''],
];
const LL = { 未领料: '#94A3B8', 部分领料: '#D97706', 全部领料: '#15803D', 超额领料: '#DC2626' };
function ui03() {
  const b = frame([['工作台', 0], ['生产订单列表', 1], ['生产订单 - MO-20261112-002', 0], ['生产用料清单列表', 0]], '生产订单');
  const X0 = 224, CW = 1680;
  // 标题 + 批量按钮
  b.push(T('生产订单列表', X0, 120, 20, 700, '#0F172A') + ic('star', X0 + W('生产订单列表', 20, 700) + 10, 112, '#F59E0B'));
  const r1 = row(X0 + 180, 104, [['新增', 1, 'plus'], ['提交', 0, 'send'], ['审核', 0, 'check'], ['下推', 0, 'push'], ['关闭', 0, 'stop'], '|', ['业务操作', 0], ['选单', 0], ['关联查询', 0], ['引出', 0], ['打印', 0]]);
  b.push(r1.svg);
  const r2 = row(1904 - 252, 104, [['过滤', 0, 'filter'], ['刷新', 0, 'refresh'], ['引入', 0]]);
  b.push(r2.svg);
  // 过滤方案栏
  b.push(R(X0, 148, CW, 96, '#FFFFFF', 10, ' stroke="#E2E8F0"'));
  b.push(T('过滤方案', X0 + 16, 172, 13, 500, '#64748B'));
  let fx0 = X0 + 84; [['缺省方案', 0], ['本周开工', 0], ['我的待审核', 0], ['SMT 车间', 1], ['异常工单', 0]].forEach(([s, on]) => { const p = pill(s, fx0, 172, on ? '#1D4ED8' : '#334155', on ? '#E6F0FF' : '#F8FAFC', 13, on ? 700 : 400, 12, 26, 'start', on ? ' stroke="#93C5FD"' : ' stroke="#E2E8F0"'); b.push(p.svg); fx0 += p.w + 8; });
  b.push(ic('plus', fx0 + 4, 164, '#2563EB') + T('保存方案', fx0 + 24, 172, 13, 500, '#2563EB'));
  b.push(T('排序：计划开工 降序', X0 + CW - 16, 172, 13, 400, '#64748B', 'end'));
  b.push(R(X0 + 16, 190, CW - 32, 1, '#EEF2F7'));
  const fld = (x, lab, w, val, ph, icon) => T(lab, x, 218, 13, 400, '#475569') + R(x + W(lab, 13) + 8, 203, w, 30, '#FFFFFF', 6, ' stroke="#CBD5E1"') + T(val, x + W(lab, 13) + 18, 218, 13, 400, ph ? '#94A3B8' : '#1E293B') + (icon ? ic(icon, x + W(lab, 13) + 8 + w - 24, 210, '#94A3B8') : '');
  b.push(fld(X0 + 16, '单据编号', 150, '请输入', 1) + fld(X0 + 248, '物料编码', 150, '请选择', 1, 'chev') + fld(X0 + 480, '生产车间', 184, 'SMT一车间, SMT二车间', 0, 'chev'));
  b.push(fld(X0 + 744, '单据状态', 112, '全部', 0, 'chev') + fld(X0 + 934, '业务状态', 112, '全部', 0, 'chev') + fld(X0 + 1124, '计划开工', 220, '2026-11-10 ~ 2026-11-17', 0, 'cal'));
  b.push(btn(X0 + 1420, 203, '查询', 1, 'search', 30, 13).svg + btn(X0 + 1504, 203, '重置', 0, null, 30, 13).svg + T('展开高级条件', X0 + CW - 34, 218, 13, 500, '#2563EB', 'end') + ic('chev', X0 + CW - 32, 210, '#2563EB'));
  // 表格
  const TY = 256, HH = 40, RH = 37;
  const COLS = [['', 40], ['序号', 40], ['单据编号', 148], ['单据类型', 82], ['单据状态', 86], ['业务状态', 84], ['物料编码', 98], ['物料名称', 128], ['规格型号', 124], ['生产车间', 108], ['数量', 92, 'r'], ['单位', 44], ['计划开工', 92], ['计划完工', 92], ['领料状态', 88], ['入库数量', 96, 'r'], ['计划员', 68], ['来源单号', 136], ['', 34]];
  const cx = []; { let x = X0; for (const c of COLS) { cx.push(x); x += c[1]; } }
  const TH = HH + RH * ROWS3.length + 38;
  b.push(R(X0, TY, CW, TH, '#FFFFFF', 10, ' stroke="#E2E8F0"'));
  b.push(`<clipPath id="tb3"><rect x="${X0}" y="${TY}" width="${CW}" height="${TH}" rx="10"/></clipPath><g clip-path="url(#tb3)">`);
  b.push(R(X0, TY, CW, HH, '#F8FAFC') + R(X0, TY + HH - 1, CW, 1, '#E2E8F0'));
  const SEL = new Set([6, 9, 10]);
  COLS.forEach(([h, w, al], i) => { if (i === 0) b.push(chk(cx[0] + 14, TY + 12, 0, 1)); else if (i === COLS.length - 1) b.push(R(cx[i], TY + 4, 30, 32, '#E6F0FF', 6) + ic('cols', cx[i] + 7, TY + 12, '#1D4ED8')); else b.push(T(h, al === 'r' ? cx[i] + w - 14 : cx[i] + 10, TY + HH / 2, 13, 700, '#475569', al === 'r' ? 'end' : 'start'));
    if (i > 1 && i < COLS.length) b.push(R(cx[i] - 0.5, TY + 12, 1, 16, '#E2E8F0')); });
  b.push(ic('filter', cx[4] + 64, TY + 12, '#94A3B8', 14) + ic('filter', cx[5] + 64, TY + 12, '#94A3B8', 14) + `<path d="M${cx[12] + 76} ${TY + 17} L${cx[12] + 80} ${TY + 13} L${cx[12] + 84} ${TY + 17}" fill="none" stroke="#CBD5E1" stroke-width="1.4"/><path d="M${cx[12] + 76} ${TY + 23} L${cx[12] + 80} ${TY + 27} L${cx[12] + 84} ${TY + 23}" fill="none" stroke="#2563EB" stroke-width="1.4"/>`);
  let sumQ = 0, sumIn = 0;
  ROWS3.forEach((r, i) => { const y = TY + HH + i * RH, cy = y + RH / 2, sel = SEL.has(i), p = PROD[r[4]]; sumQ += r[5]; sumIn += r[9];
    if (sel) b.push(R(X0, y, CW, RH, '#EFF6FF')); else if (i % 2) b.push(R(X0, y, CW, RH, '#FBFCFE'));
    if (i === 9) b.push(R(X0, y, 3, RH, '#2563EB'));
    b.push(R(X0, y + RH - 1, CW, 1, '#EEF2F7'));
    b.push(chk(cx[0] + 14, cy - 8, sel) + T(String(i + 1), cx[1] + 10, cy, 13, 400, '#64748B'));
    b.push(T(r[0], cx[2] + 10, cy, 13, 500, '#2563EB') + T(r[1], cx[3] + 10, cy, 13, 400, r[1] === '返工生产' ? '#C2410C' : '#334155'));
    b.push(tag1(r[2], cx[4] + 10, cy) + tag2(r[3], cx[5] + 10, cy));
    b.push(T(p[0], cx[6] + 10, cy, 13, 400, '#334155') + T(p[1], cx[7] + 10, cy, 13, 400, '#1E293B') + T(p[2], cx[8] + 10, cy, 13, 400, '#475569') + T(p[3], cx[9] + 10, cy, 13, 400, '#334155'));
    b.push(T(n0(r[5]), cx[10] + 92 - 14, cy, 13, 500, '#1E293B', 'end') + T('Pcs', cx[11] + 10, cy, 13, 400, '#64748B'));
    b.push(T('2026-' + r[6], cx[12] + 10, cy, 13, 400, '#334155') + T('2026-' + r[7], cx[13] + 10, cy, 13, 400, '#334155'));
    b.push(`<circle cx="${cx[14] + 14}" cy="${cy}" r="3" fill="${LL[r[8]]}"/>` + T(r[8], cx[14] + 22, cy, 13, 400, LL[r[8]] === '#94A3B8' ? '#64748B' : LL[r[8]]));
    b.push(T(r[9] ? n0(r[9]) : '0', cx[15] + 96 - 14, cy, 13, 500, r[9] ? '#1E293B' : '#94A3B8', 'end') + T(r[10], cx[16] + 10, cy, 13, 400, '#334155') + T(r[11] || '—', cx[17] + 10, cy, 13, 400, r[11] ? '#2563EB' : '#CBD5E1'));
  });
  const fy0 = TY + HH + RH * ROWS3.length;
  b.push(R(X0, fy0, CW, 38, '#F8FAFC') + T('合计', cx[2] + 10, fy0 + 19, 13, 700, '#0F172A') + T(n0(sumQ), cx[10] + 92 - 14, fy0 + 19, 13, 700, '#0F172A', 'end') + T(n0(sumIn), cx[15] + 96 - 14, fy0 + 19, 13, 700, '#0F172A', 'end'));
  b.push('</g>');
  // 分页
  const PY = TY + TH + 22;
  b.push(T('已选 3 条', X0, PY, 13, 500, '#1D4ED8') + T('共 128 条 · 本页 18 条', X0 + 74, PY, 13, 400, '#64748B'));
  let px = 1904; const pg = ['›', '7', '…', '3', '2', '1', '‹'];
  b.push(T('页', px, PY, 13, 400, '#64748B', 'end')); px -= 16 + 44; b.push(R(px, PY - 15, 44, 30, '#FFFFFF', 6, ' stroke="#CBD5E1"') + T('1', px + 22, PY, 13, 500, '#334155', 'middle')); px -= 8; b.push(T('前往', px, PY, 13, 400, '#64748B', 'end')); px -= W('前往', 13) + 20;
  pg.forEach(s => { px -= 32; const on = s === '1'; b.push(R(px, PY - 15, 32, 30, on ? '#2563EB' : '#FFFFFF', 6, on ? '' : ' stroke="#E2E8F0"') + T(s, px + 16, PY, 13, 500, on ? '#FFFFFF' : '#334155', 'middle')); px -= 6; });
  px -= 104; b.push(R(px, PY - 15, 96, 30, '#FFFFFF', 6, ' stroke="#CBD5E1"') + T('20 条/页', px + 12, PY, 13, 400, '#334155') + ic('chev', px + 72, PY - 8, '#94A3B8'));
  // 列设置浮层
  const PX = 1904 - 268 - 4, PYp = TY + HH + 4;
  const cl = [['单据编号', 1, 1], ['单据类型', 1], ['单据状态', 1], ['业务状态', 1], ['物料编码', 1], ['物料名称', 1], ['规格型号', 1], ['生产车间', 1], ['数量', 1], ['计划开工', 1], ['计划完工', 1], ['领料状态', 1], ['入库数量', 1], ['计划员', 1], ['来源单号', 1], ['BOM 版本', 0], ['批号', 0], ['入库上限', 0]];
  const PH = 76 + cl.length * 30 + 62;
  const pp = [R(0, 0, 268, PH, '#FFFFFF', 10, ' stroke="#D6E2EF" filter="url(#shP)"'), `<path d="M243 0.5 L251 -7 L259 0.5 Z" fill="#FFFFFF" stroke="#D6E2EF"/>`, R(240, 0, 22, 2, '#FFFFFF')];
  pp.push(T('列设置', 16, 22, 14, 700, '#0F172A') + T('已显示 15 / 18 列', 252, 22, 12, 400, '#64748B', 'end'));
  pp.push(R(16, 40, 236, 28, '#F8FAFC', 6, ' stroke="#E2E8F0"') + ic('search', 24, 46, '#94A3B8', 14) + T('搜索字段', 44, 54, 12, 400, '#94A3B8'));
  cl.forEach(([s, on, fix], i) => { const y = 76 + i * 30; pp.push(ic('drag', 14, y + 7, '#CBD5E1') + chk(36, y + 7, on) + T(s, 62, y + 15, 13, 400, on ? '#1E293B' : '#64748B') + (fix ? pill('冻结', 252, y + 15, '#1D4ED8', '#E6F0FF', 11, 500, 6, 18, 'end').svg : T(on ? '' : '隐藏', 252, y + 15, 12, 400, '#94A3B8', 'end'))); });
  const by = PH - 46; pp.push(R(0, by - 8, 268, 1, '#EEF2F7') + T('恢复默认', 16, by + 15, 13, 500, '#2563EB') + btn(130, by, '取消', 0, null, 30, 13).svg + btn(196, by, '确定', 1, null, 30, 13).svg);
  b.push(g(PX, PYp + 6, pp.join('')));
  return SVG(1920, 1080, b.join(''));
}

// ======================= UI04 生产订单编辑 =======================
function tableX(x, y, w, cols, rows, o = {}) { // cols: [title, width, align]；rows: 数组的数组（字符串或 {svg} 函数）
  const HH = o.hh || 38, RH = o.rh || 40, out = [];
  const cx = []; { let xx = x; for (const c of cols) { cx.push(xx); xx += c[1]; } }
  const H = HH + RH * rows.length + (o.total ? 36 : 0);
  out.push(R(x, y, w, H, '#FFFFFF', 8, ' stroke="#E2E8F0"'));
  out.push(`<clipPath id="${o.id}"><rect x="${x}" y="${y}" width="${w}" height="${H}" rx="8"/></clipPath><g clip-path="url(#${o.id})">`);
  out.push(R(x, y, w, HH, '#F8FAFC') + R(x, y + HH - 1, w, 1, '#E2E8F0'));
  cols.forEach(([h, cw, al, req], i) => { if (h) out.push(T(h, al === 'r' ? cx[i] + cw - 12 : cx[i] + 10, y + HH / 2, 13, 700, '#475569', al === 'r' ? 'end' : 'start') + (req ? T('*', (al === 'r' ? cx[i] + cw - 12 - W(h, 13, 700) - 8 : cx[i] + 10 + W(h, 13, 700) + 2), y + HH / 2, 13, 700, '#EF4444') : ''));
    if (i > 0) out.push(R(cx[i] - 0.5, y + 11, 1, 16, '#E2E8F0')); });
  rows.forEach((r, ri) => { const yy = y + HH + ri * RH, cy = yy + RH / 2, sel = o.sel === ri;
    out.push(sel ? R(x, yy, w, RH, '#EFF6FF') + R(x, yy, 3, RH, '#2563EB') : ri % 2 ? R(x, yy, w, RH, '#FBFCFE') : '');
    out.push(R(x, yy + RH - 1, w, 1, '#EEF2F7'));
    r.forEach((v, i) => { const [, cw, al] = cols[i]; if (v == null) return; if (typeof v === 'function') { out.push(v(cx[i], cy, cw)); return; }
      const lock = typeof v === 'object'; const s = lock ? v.t : v; const col = lock ? (v.c || '#64748B') : '#1E293B';
      if (lock && v.lock) out.push(R(cx[i] + 2, yy + 4, cw - 4, RH - 8, '#F1F5F9', 4));
      out.push(T(s, al === 'r' ? cx[i] + cw - 12 : cx[i] + 10, cy, 13, lock && v.b ? 700 : 400, col, al === 'r' ? 'end' : 'start')); }); });
  if (o.total) { const yy = y + HH + RH * rows.length; out.push(R(x, yy, w, 36, '#F8FAFC') + o.total(cx, yy + 18)); }
  out.push('</g>');
  return { svg: out.join(''), h: H, cx };
}
function ui04() {
  const b = frame([['工作台', 0], ['生产订单列表', 0], ['生产订单 - MO-20261112-002', 1], ['生产用料清单列表', 0]], '生产订单');
  const X0 = 224, MW = 1316, PX = 1556, PW = 348;
  // 标题
  b.push(T('生产订单', X0, 120, 20, 700, '#0F172A') + T('MO-20261112-002', X0 + 96, 121, 16, 500, '#475569'));
  { let x = X0 + 96 + W('MO-20261112-002', 16, 500) + 12; b.push(tag1('已审核', x, 120)); x += W('已审核', 12, 500) + 24; b.push(tag2('开工', x, 120)); }
  b.push(T('最后修改：王敏  2026-11-12 07:52', X0 + MW, 120, 12, 400, '#94A3B8', 'end'));
  // 工具栏
  const dis = (x, s, icon) => { const wd = W(s, 14, 500) + 50; return { w: wd, svg: R(x, 144, wd, 32, '#F8FAFC', 6, ' stroke="#E2E8F0"') + ic(icon, x + 13, 152, '#CBD5E1') + T(s, x + 36, 160, 14, 500, '#A3B1C2') }; };
  let tx = X0; const put = o => { b.push(o.svg); tx += o.w + 8; };
  put(btn(tx, 144, '保存', 1, 'save')); put(dis(tx, '提交', 'send')); put(dis(tx, '审核', 'check'));
  b.push(R(tx + 2, 151, 1, 18, '#E2E8F0')); tx += 13;
  put(btn(tx, 144, '下推', 0, 'push')); put(btn(tx, 144, '上查', 0, 'up')); put(btn(tx, 144, '下查', 0, 'down'));
  b.push(R(tx + 2, 151, 1, 18, '#E2E8F0')); tx += 13;
  { const o = btn(tx, 144, '附件', 0, 'clip'); b.push(o.svg + `<circle cx="${tx + o.w - 4}" cy="146" r="8" fill="#2563EB"/>` + T('2', tx + o.w - 4, 146.5, 10, 700, '#FFFFFF', 'middle')); tx += o.w + 8; }
  put(btn(tx, 144, '业务操作', 0)); put(btn(tx, 144, '打印', 0)); put(btn(tx, 144, '选项', 0));
  { const r = row(X0 + MW - 172, 144, [['上一张', 0], ['下一张', 0]]); b.push(r.svg); }
  // 表头字段
  const HY = 188, HHt = 248;
  b.push(R(X0, HY, MW, HHt, '#FFFFFF', 10, ' stroke="#E2E8F0"'));
  b.push(R(X0 + 16, HY + 16, 4, 16, '#2563EB', 2) + T('基本信息', X0 + 28, HY + 24, 15, 700, '#0F172A') + ic('chev', X0 + 100, HY + 16, '#94A3B8'));
  b.push(ic('lock', X0 + MW - 16 - W('灰色字段已锁定：单据已审核 / 分录已开工', 12) - 22, HY + 16, '#94A3B8') + T('灰色字段已锁定：单据已审核 / 分录已开工', X0 + MW - 16, HY + 24, 12, 400, '#94A3B8', 'end'));
  const F = [['单据编号', 'MO-20261112-002', 1, 1], ['单据类型', '普通生产', 1, 1], ['单据日期', '2026-11-12', 1, 1], ['生产组织', '芯程电子一号工厂', 1, 1],
    ['计划组', 'SMT 计划组', 0], ['计划员', '王敏', 0], ['生产车间', 'SMT二车间', 1, 1], ['业务流程', '生产汇报入库流程', 1],
    ['来源单据', 'SO-20261105-021', 1, 1, '#2563EB'], ['生成方式', 'MRP 生成', 1], ['客户', '华东智联电子', 1], ['单据状态', '已审核', 1],
    ['审核人', '陈立', 1], ['审核日期', '2026-11-12 07:46', 1], ['备注', '客户急单，11-13 前交付 8,000 pcs；首检严格控制', 0, 0, null, 2]];
  const CWc = (MW - 32) / 4;
  let ci = 0;
  F.forEach(([lab, val, lock, req, col, span = 1]) => { const c = ci % 4, r = Math.floor(ci / 4), x = X0 + 16 + c * CWc, y = HY + 48 + r * 48; ci += span;
    const iw = CWc * span - 98;
    b.push((req ? T('*', x, y + 18, 13, 700, '#EF4444') : '') + T(lab, x + 10, y + 18, 13, 400, '#475569'));
    b.push(R(x + 80, y + 2, iw, 32, lock ? '#F1F5F9' : '#FFFFFF', 6, lock ? ' stroke="#E2E8F0"' : ' stroke="#CBD5E1"'));
    b.push(T(val, x + 92, y + 18, 13, lock ? 400 : 400, lock ? (col || '#64748B') : '#1E293B'));
    if (lock) b.push(ic('lock', x + 80 + iw - 24, y + 10, '#A3B1C2'));
    else if (lab === '计划组' || lab === '计划员') b.push(ic('search', x + 80 + iw - 24, y + 10, '#94A3B8'));
  });
  // 分录
  const EY = HY + HHt + 12, EH = 1064 - EY;
  b.push(R(X0, EY, MW, EH, '#FFFFFF', 10, ' stroke="#E2E8F0"'));
  { let x = X0 + 16; [['明细', 2, 1], ['用料', 14, 0], ['其他', null, 0]].forEach(([s, n, on]) => { const t = n != null ? s + ' (' + n + ')' : s; b.push(T(t, x, EY + 24, 14, on ? 700 : 500, on ? '#1D4ED8' : '#475569')); if (on) b.push(R(x, EY + 44, W(t, 14, 700), 2, '#2563EB', 1)); x += W(t, 14, 700) + 32; }); }
  b.push(R(X0, EY + 46, MW, 1, '#E2E8F0'));
  { const r = row(X0 + MW - 16 - 540, EY + 8, [['新增行', 0, 'plus', 30, 13], ['删除行', 0, null, 30, 13], ['执行至', 0, null, 30, 13], ['挂起', 0, null, 30, 13], ['拆分', 0, null, 30, 13], ['齐套分析', 0, null, 30, 13]], 6); b.push(r.svg); }
  const L = t => ({ t, lock: 1 }), LB = t => ({ t, lock: 1, b: 1, c: '#1E293B' });
  const ecols = [['序号', 52], ['产品类型', 72], ['物料编码', 100, 0, 1], ['物料名称', 130], ['规格型号', 96], ['单位', 48], ['数量', 84, 'r', 1], ['计划开工', 124], ['计划完工', 124], ['BOM 版本', 116], ['业务状态', 84], ['领料状态', 84], ['入库上限', 84, 'r'], ['入库数量', 84, 'r']];
  const tagF = s => (x, cy) => tag2(s, x + 10, cy);
  const llF = s => (x, cy) => `<circle cx="${x + 14}" cy="${cy}" r="3" fill="${LL[s]}"/>` + T(s, x + 22, cy, 13, 400, LL[s]);
  const er = [['1', L('主产品'), L('3.01.0052'), L('BLE5.0 蓝牙模块'), L('BT-52 V2.3'), L('Pcs'), LB('6,000'), L('2026-11-12 08:00'), L('2026-11-13 08:00'), L('BT52-BOM V2.3'), tagF('开工'), llF('全部领料'), L('6,060'), { t: '4,800', b: 1, c: '#1E293B' }],
              ['2', L('主产品'), L('3.01.0052'), L('BLE5.0 蓝牙模块'), L('BT-52 V2.3'), L('Pcs'), LB('2,000'), '2026-11-13 08:00', '2026-11-13 20:00', L('BT52-BOM V2.3'), tagF('下达'), llF('未领料'), '2,020', { t: '0', c: '#94A3B8' }]];
  const et = tableX(X0 + 16, EY + 62, MW - 32, ecols, er, { id: 'et4', sel: 0, rh: 46, total: (cx, cy) => T('合计', cx[1] + 10, cy, 13, 700, '#0F172A') + T('8,000', cx[6] + 84 - 12, cy, 13, 700, '#0F172A', 'end') + T('8,080', cx[12] + 84 - 12, cy, 13, 700, '#0F172A', 'end') + T('4,800', cx[13] + 84 - 12, cy, 13, 700, '#0F172A', 'end') });
  b.push(et.svg);
  // 子分录
  const SY = EY + 62 + et.h + 28;
  b.push(R(X0 + 16, SY + 2, 4, 14, '#06B6D4', 2) + T('子分录 · 排产明细', X0 + 28, SY + 9, 14, 700, '#0F172A') + T('当前：分录 1  BLE5.0 蓝牙模块 6,000 Pcs', X0 + 28 + W('子分录 · 排产明细', 14, 700) + 14, SY + 9, 12, 400, '#64748B'));
  { let x = X0 + MW - 16; ['质检记录', '汇报记录', '排产明细'].forEach((s, i) => { const on = i === 2, p = pill(s, x, SY + 9, on ? '#1D4ED8' : '#475569', on ? '#E6F0FF' : '#F8FAFC', 12, on ? 700 : 400, 10, 24, 'end', on ? ' stroke="#93C5FD"' : ' stroke="#E2E8F0"'); b.push(p.svg); x -= p.w + 6; }); }
  const scols = [['序号', 52], ['排产日期', 110], ['产线', 96], ['班次', 64], ['排产数量', 100, 'r'], ['上线数量', 100, 'r'], ['汇报数量', 100, 'r'], ['合格数量', 100, 'r'], ['不良数量', 90, 'r'], ['首检状态', 110], ['执行状态', 96], ['备注', 266]];
  const stF = (s, c) => (x, cy) => `<circle cx="${x + 14}" cy="${cy}" r="3" fill="${c}"/>` + T(s, x + 22, cy, 13, 500, c);
  const sr = [['1', '2026-11-12', 'SMT-2 线', '白班', '2,400', '2,400', '2,400', '2,392', { t: '8', c: '#DC2626' }, stF('首检完成', '#15803D'), stF('完工', '#15803D'), { t: '首检 08:35 合格（IPQC 孙悦）', c: '#64748B' }],
              ['2', '2026-11-12', 'SMT-2 线', '夜班', '2,400', '2,400', '2,400', '2,391', { t: '9', c: '#DC2626' }, stF('首检完成', '#15803D'), stF('完工', '#15803D'), { t: '换线 20:10–20:35', c: '#64748B' }],
              ['3', '2026-11-13', 'SMT-2 线', '白班', '1,200', '520', '320', '316', { t: '4', c: '#DC2626' }, stF('首检完成', '#15803D'), stF('进行中', '#2563EB'), { t: '08:40 F-12 抛料报警，已处理', c: '#C2410C' }]];
  const st = tableX(X0 + 16, SY + 28, MW - 32, scols, sr, { id: 'st4', rh: 44, total: (cx, cy) => T('合计', cx[1] + 10, cy, 13, 700, '#0F172A') + ['6,000', '5,320', '5,120', '5,099', '21'].map((v, i) => T(v, cx[4 + i] + scols[4 + i][1] - 12, cy, 13, 700, i === 4 ? '#DC2626' : '#0F172A', 'end')).join('') });
  b.push(st.svg);
  // 执行进度条带
  const KY = SY + 28 + st.h + 26;
  b.push(R(X0 + 16, KY, MW - 32, 1, '#EEF2F7'));
  const ks = [['领料套数', '6,000 / 6,000', 1, '#10B981'], ['汇报数量', '5,120 / 6,000', 5120 / 6000, '#3B82F6'], ['合格率', '99.6%', 0.996, '#10B981'], ['入库数量', '4,800 / 6,060', 4800 / 6060, '#06B6D4'], ['用料齐套率', '100%', 1, '#10B981']];
  const kw = (MW - 32) / 5;
  ks.forEach(([k, v, p, c], i) => { const x = X0 + 16 + i * kw + (i ? 16 : 0); b.push(T(k, x, KY + 24, 12, 400, '#64748B') + T(v, x + kw - 32, KY + 24, 13, 700, '#0F172A', 'end') + bar(x, KY + 38, kw - 32, 6, p, c)); });
  // 右侧审批历史
  b.push(R(PX, 104, PW, 960, '#FFFFFF', 10, ' stroke="#E2E8F0"'));
  b.push(T('审批历史', PX + 20, 128, 16, 700, '#0F172A') + pill('已通过', PX + PW - 20, 128, '#15803D', '#F0FDF4', 12, 500, 8, 22, 'end', ' stroke="#BBF7D0"').svg);
  b.push(T('流程：生产订单审批（两级）· 耗时 44 分钟', PX + 20, 152, 12, 400, '#64748B'));
  b.push(R(PX, 168, PW, 1, '#EEF2F7'));
  const TL = [['创建', '王敏 · 计划员', '11-12 07:02', '由计划订单 PLN-20261111-033 投放生成', '#94A3B8'],
    ['提交', '王敏 · 计划员', '11-12 07:15', '', '#3B82F6'],
    ['计划主管审批', '陈立 · 同意', '11-12 07:38', '“齐套率 92%，缺料 nRF52832 已在途，同意。”', '#10B981'],
    ['生产经理审批', '周海 · 同意', '11-12 07:46', '“急单优先排 SMT-2 线。”', '#10B981'],
    ['审核完成', '系统', '11-12 07:46', '自动计划确认，生成用料清单\nPPBOM-20261112-002', '#10B981'],
    ['下达', '王敏 · 计划员', '11-12 07:52', '生成工序计划 OP-20261112-002', '#2563EB'],
    ['开工', '系统', '11-12 08:12', '领料单 PICK-20261112-011 审核，自动开工', '#0E7490']];
  let ty = 196;
  const wrap = (note, max) => { const lines = []; let cur = ''; for (const ch of note) { if (ch === '\n') { lines.push(cur); cur = ''; continue; } if (W(cur + ch, 12) > max) { lines.push(cur); cur = ''; } cur += ch; } if (cur) lines.push(cur); return lines; };
  TL.forEach(([n, who, t, note, c], i) => { const lines = note ? wrap(note, PW - 76) : []; const h = 46 + lines.length * 17 + (lines.length ? 10 : 4);
    if (i < TL.length - 1) b.push(R(PX + 29, ty + 12, 2, h - 8, '#E2E8F0'));
    b.push(`<circle cx="${PX + 30}" cy="${ty + 4}" r="8" fill="#FFFFFF" stroke="${c}" stroke-width="2"/><circle cx="${PX + 30}" cy="${ty + 4}" r="3.5" fill="${c}"/>`);
    b.push(T(n, PX + 50, ty + 4, 14, 700, '#0F172A') + T(t, PX + PW - 20, ty + 4, 12, 400, '#94A3B8', 'end') + T(who, PX + 50, ty + 26, 12, 400, '#475569'));
    if (lines.length) b.push(R(PX + 50, ty + 38, 3, lines.length * 17, '#E2E8F0', 1.5) + lines.map((l, k) => T(l, PX + 60, ty + 46 + k * 17, 12, 400, '#64748B')).join(''));
    ty += h; });
  // 关联单据
  ty += 2; b.push(R(PX, ty, PW, 1, '#EEF2F7')); ty += 24;
  b.push(T('关联单据', PX + 20, ty, 15, 700, '#0F172A') + T('上查 / 下查', PX + PW - 20, ty, 12, 500, '#2563EB', 'end')); ty += 26;
  [['上游', '销售订单', 'SO-20261105-021', ''], ['下游', '生产用料清单', 'PPBOM-20261112-002', ''], ['下游', '生产领料单', '2 张', '已审核'], ['下游', '生产汇报单', '3 张', '2 已审核'], ['下游', '生产入库单', '2 张', '已审核']].forEach(([k, n, v, s]) => {
    b.push(pill(k, PX + 20, ty, k === '上游' ? '#4338CA' : '#0E7490', k === '上游' ? '#EEF2FF' : '#ECFEFF', 11, 500, 6, 18).svg + T(n, PX + 64, ty, 13, 400, '#334155') + T(v, PX + 172, ty, 13, 500, '#2563EB') + T(s, PX + PW - 20, ty, 12, 400, '#94A3B8', 'end')); ty += 27; });
  // 附件
  ty += 4; b.push(R(PX, ty, PW, 1, '#EEF2F7')); ty += 26;
  b.push(T('附件 (2)', PX + 20, ty, 15, 700, '#0F172A')); ty += 24;
  [['BT52_贴片程序_V2.3.pdf', '1.8 MB'], ['客户特殊要求_华东智联.xlsx', '46 KB']].forEach(([n, sz]) => { b.push(R(PX + 20, ty - 14, PW - 40, 30, '#F8FAFC', 6, ' stroke="#E2E8F0"') + ic('doc', PX + 28, ty - 7, '#2563EB', 14) + T(n, PX + 48, ty + 1, 12, 400, '#1E293B') + T(sz, PX + PW - 30, ty + 1, 12, 400, '#94A3B8', 'end')); ty += 36; });
  return SVG(1920, 1080, b.join(''));
}

// ======================= UI24 HMI 工位终端 1280×800 =======================
function ui24() {
  const b = [R(0, 0, 1280, 800, '#EDF2F8')];
  // 顶栏
  b.push(R(0, 0, 1280, 68, '#FFFFFF') + R(0, 67, 1280, 1, '#DCE5EF'));
  b.push(logo(20, 14, 40) + T('SMT-2 线 · 贴片工位 02', 74, 27, 20, 700, '#0F172A') + T('设备 EQ-SMT2-0402 · 贴片机 SMT-2-02', 74, 50, 13, 400, '#64748B'));
  b.push(`<circle cx="784" cy="34" r="20" fill="#DBEAFE"/>` + T('刘', 784, 34, 16, 700, '#1D4ED8', 'middle') + T('刘洋', 814, 25, 15, 700, '#0F172A') + T('操作员 · 工号 10237', 814, 46, 12, 400, '#64748B'));
  b.push(R(966, 18, 1, 32, '#E2E8F0') + T('白班', 986, 25, 15, 700, '#0F172A') + T('08:00–20:00', 986, 46, 12, 400, '#64748B'));
  b.push(R(1078, 18, 1, 32, '#E2E8F0') + T('10:26', 1098, 30, 26, 700, '#0F172A') + T('11-13 周五', 1098, 53, 11, 400, '#64748B'));
  b.push(`<circle cx="1216" cy="22" r="5" fill="#10B981"/>` + T('在线', 1226, 22, 12, 500, '#15803D') + `<path d="M1200 46 A20 20 0 0 1 1232 46" fill="none" stroke="#10B981" stroke-width="2.4" stroke-linecap="round"/><path d="M1206 50 A12 12 0 0 1 1226 50" fill="none" stroke="#10B981" stroke-width="2.4" stroke-linecap="round"/><circle cx="1216" cy="54" r="2.6" fill="#10B981"/>`);
  // 当前工单卡
  const C1 = [16, 84, 792, 352];
  b.push(R(C1[0], C1[1], C1[2], C1[3], '#FFFFFF', 16, ' stroke="#DCE5EF" filter="url(#sh)"'));
  { const x = C1[0] + 24, y = C1[1];
    b.push(T('当前工单', x, y + 30, 15, 500, '#64748B') + T('分录 1 / 2', x + C1[2] - 48, y + 30, 14, 500, '#64748B', 'end'));
    b.push(T('MO-20261112-002', x, y + 66, 30, 700, '#0F172A'));
    b.push(pill('开工', x + W('MO-20261112-002', 30, 700) + 14, y + 66, '#0E7490', '#CFFAFE', 16, 700, 14, 32).svg);
    b.push(T('BLE5.0 蓝牙模块  BT-52 V2.3  ·  物料 3.01.0052  ·  BOM V2.3', x, y + 100, 16, 400, '#334155'));
    // 工序
    const ops = [['10', '锡膏印刷', 2], ['20', 'SPI 检测', 2], ['30', '贴片', 1], ['40', '回流焊', 0], ['50', 'AOI 检测', 0]];
    const ow = (C1[2] - 48 - 4 * 10) / 5;
    ops.forEach(([no, n, st], i) => { const ox = x + i * (ow + 10), oy = y + 124; const cur = st === 1;
      b.push(R(ox, oy, ow, 56, cur ? '#2563EB' : st === 2 ? '#F0FDF4' : '#F8FAFC', 10, cur ? '' : st === 2 ? ' stroke="#BBF7D0"' : ' stroke="#E2E8F0"'));
      b.push(T('工序 ' + no, ox + 14, oy + 18, 12, 500, cur ? '#BFDBFE' : '#64748B') + T(n, ox + 14, oy + 39, 17, 700, cur ? '#FFFFFF' : st === 2 ? '#15803D' : '#334155'));
      if (st === 2) b.push(ic('check', ox + ow - 28, oy + 10, '#16A34A', 18)); if (cur) b.push(pill('当前', ox + ow - 10, oy + 18, '#1D4ED8', '#FFFFFF', 11, 700, 6, 18, 'end').svg); });
    // 数量
    const q = [['工单计划', '6,000', '#0F172A'], ['累计完成', '5,120', '#2563EB'], ['本班 完成 / 计划', '320 / 1,200', '#0F172A'], ['本班不良', '4', '#DC2626']];
    const qxs = [0, 160, 330, 610];
    q.forEach(([k, v, c], i) => { const qx = x + qxs[i]; if (i) b.push(R(qx - 12, y + 204, 1, 56, '#E2E8F0')); b.push(T(k, qx, y + 212, 14, 400, '#64748B') + T(v, qx, y + 246, 32, 700, c)); });
    b.push(T('工单进度', x, y + 296, 14, 500, '#334155') + T('85.3%', x + C1[2] - 48, y + 296, 20, 700, '#2563EB', 'end'));
    b.push(bar(x, y + 312, C1[2] - 48, 18, 5120 / 6000, '#3B82F6', '#E2E8F0'));
    b.push(R(x + (C1[2] - 48) * (5120 / 6000) - 1, y + 308, 2, 26, '#1D4ED8')); }
  // 设备状态卡
  const C2 = [824, 84, 440, 352];
  b.push(R(C2[0], C2[1], C2[2], C2[3], '#FFFFFF', 16, ' stroke="#DCE5EF" filter="url(#sh)"'));
  { const x = C2[0] + 24, y = C2[1];
    b.push(T('设备状态', x, y + 30, 15, 500, '#64748B'));
    b.push(R(x, y + 46, C2[2] - 48, 72, '#ECFDF5', 12, ' stroke="#A7F3D0"'));
    b.push(`<circle cx="${x + 36}" cy="${y + 82}" r="20" fill="#10B981" fill-opacity="0.18"/><circle cx="${x + 36}" cy="${y + 82}" r="11" fill="#10B981"/>`);
    b.push(T('运行中', x + 68, y + 72, 24, 700, '#047857') + T('已连续运行 1 h 46 min', x + 68, y + 100, 13, 400, '#047857'));
    b.push(T('节拍 0.35 s/点', x + C2[2] - 64, y + 82, 14, 700, '#047857', 'end'));
    const m = [['当班 OEE', '81.6%', '#0F172A'], ['今日停机', '18 min', '#C2410C'], ['抛料率', '0.12%', '#0F172A'], ['贴装数', '9.8 万点', '#0F172A'], ['首检', '完成 08:22', '#15803D'], ['下次保养', '11-14 08:00', '#0F172A']];
    const mw = (C2[2] - 48) / 2;
    m.forEach(([k, v, c], i) => { const mx = x + (i % 2) * mw, my = y + 142 + Math.floor(i / 2) * 62; b.push(R(mx + (i % 2 ? 6 : 0), my, mw - 6, 54, '#F8FAFC', 10, ' stroke="#E2E8F0"') + T(k, mx + (i % 2 ? 6 : 0) + 14, my + 17, 13, 400, '#64748B') + T(v, mx + (i % 2 ? 6 : 0) + 14, my + 38, 18, 700, c)); }); }
  // 四个大按钮
  const BY = 452, BH = 196, BW = (1248 - 3 * 16) / 4;
  const icoBig = {
    play: `<circle cx="28" cy="28" r="25" fill="none" stroke="#FFFFFF" stroke-width="3.5"/><path d="M22 16 L40 28 L22 40 Z" fill="#FFFFFF"/>`,
    report: `<rect x="10" y="6" width="36" height="46" rx="6" fill="none" stroke="#FFFFFF" stroke-width="3.5"/><rect x="20" y="2" width="16" height="9" rx="3" fill="#FFFFFF"/><path d="M18 30 L25 37 L39 22" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
    andon: `<path d="M12 42 V28 A16 16 0 0 1 44 28 V42 Z" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linejoin="round"/><rect x="6" y="42" width="44" height="8" rx="3" fill="#FFFFFF"/><path d="M28 2 V10 M8 10 L13 15 M48 10 L43 15" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round"/><rect x="25" y="24" width="6" height="12" rx="3" fill="#FFFFFF"/>`,
    fai: `<circle cx="24" cy="24" r="17" fill="none" stroke="#FFFFFF" stroke-width="3.5"/><path d="M37 37 L50 50" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/><path d="M16 24 L22 30 L33 18" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>` };
  const BTN = [['开工', '已开工 08:05 · 分录 1', '#059669', '#10B981', 'play'], ['报工', '本班已报 320 pcs · 待报 0', '#1D4ED8', '#3B82F6', 'report'], ['安灯呼叫', '设备 · 物料 · 质量 · 工艺', '#DC2626', '#F97316', 'andon'], ['首检', '首检完成 08:22 · IPQC 孙悦', '#0E7490', '#06B6D4', 'fai']];
  BTN.forEach(([n, sub, c0, c1, k], i) => { const x = 16 + i * (BW + 16);
    b.push(`<linearGradient id="bt${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c0}"/></linearGradient>`);
    b.push(R(x, BY, BW, BH, `url(#bt${i})`, 20, ' filter="url(#shP)"') + R(x, BY, BW, BH, '#FFFFFF', 20, ' fill-opacity="0" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="2"'));
    b.push(`<clipPath id="btc${i}"><rect x="${x}" y="${BY}" width="${BW}" height="${BH}" rx="20"/></clipPath><g clip-path="url(#btc${i})"><circle cx="${x + BW - 30}" cy="${BY + 30}" r="70" fill="#FFFFFF" fill-opacity="0.08"/></g>`);
    b.push(g(x + 28, BY + 30, icoBig[k]) + T(n, x + 28, BY + 126, 34, 700, '#FFFFFF') + T(sub, x + 28, BY + 166, 14, 400, '#FFFFFF', 'start', ' fill-opacity="0.9"'));
    if (i === 2) b.push(pill('长按 2 秒', x + BW - 24, BY + 126, '#FFFFFF', '#FFFFFF', 12, 700, 10, 26, 'end', ' fill-opacity="0.22"').svg); });
  // 底部：上料状态 + 消息
  const DY = 664, DH = 120;
  b.push(R(16, DY, 792, DH, '#FFFFFF', 16, ' stroke="#DCE5EF"'));
  b.push(T('上料状态', 40, DY + 26, 15, 700, '#0F172A') + T('料站 48 / 48 已上料 · 防错校验通过', 784, DY + 26, 13, 400, '#64748B', 'end'));
  [['F-12', 'MLCC 0402 104K', 0.12, '剩余 14 min', '#DC2626', '已呼叫 AGV 补料'], ['F-07', 'nRF52832 QFN48', 0.32, '剩余 41 min', '#D97706', ''], ['F-21', '晶振 2016 32MHz', 0.76, '剩余 2.3 h', '#10B981', '']].forEach(([f, n, p, t, c, note], i) => { const y = DY + 52 + i * 24;
    b.push(T(f, 40, y, 14, 700, '#334155') + T(n, 88, y, 14, 400, '#334155') + bar(240, y - 4, 280, 8, p, c) + T(t, 536, y, 14, 700, c) + (note ? T(note, 784, y, 14, 500, '#DC2626', 'end') : '')); });
  b.push(R(824, DY, 440, DH, '#FFFFFF', 16, ' stroke="#DCE5EF"'));
  b.push(T('现场消息', 848, DY + 26, 15, 700, '#0F172A') + pill('2 条未读', 1240, DY + 26, '#1D4ED8', '#E6F0FF', 12, 500, 8, 22, 'end').svg);
  [['10:12', 'AGV-02 已接收 F-12 补料任务，预计 6 min 到达', '#2563EB'], ['09:58', '班组长：本班优先完成 MO-20261112-002', '#334155'], ['08:40', 'F-12 抛料报警已处理，停机 18 min', '#C2410C']].forEach(([t, s2, c], i) => { const y = DY + 52 + i * 24; b.push(T(t, 848, y, 13, 500, '#94A3B8') + T(s2, 894, y, 13, 400, c)); });
  return SVG(1280, 800, b.join(''));
}

// ======================= UI25 PDA 扫码 720×1280 =======================
function pda(ok, id) {
  const b = [];
  const red = !ok, fg = red ? '#FFFFFF' : '#0F172A';
  b.push(`<clipPath id="${id}c"><rect width="720" height="1280"/></clipPath><g clip-path="url(#${id}c)">`);
  b.push(red ? R(0, 0, 720, 1280, 'url(#errG)') : R(0, 0, 720, 1280, '#F1F5F9'));
  if (red) b.push(`<circle cx="620" cy="300" r="260" fill="#FFFFFF" fill-opacity="0.06"/><circle cx="80" cy="1040" r="220" fill="#FFFFFF" fill-opacity="0.05"/>`);
  // 状态栏
  const sb = red ? '#FFFFFF' : '#FFFFFF';
  b.push(red ? '' : R(0, 0, 720, 152, '#2563EB'));
  b.push(T('10:31', 32, 26, 22, 700, sb) + [0, 1, 2, 3].map(i => R(560 + i * 9, 32 - i * 5 - 6, 6, 6 + i * 5, sb, 1)).join('') + R(610, 15, 44, 22, 'none', 5, ` stroke="${sb}" stroke-width="2"`) + R(614, 19, 30, 14, sb, 2) + R(656, 22, 4, 8, sb, 1) + T('86%', 704, 26, 16, 500, sb, 'end'));
  // 标题栏
  b.push(`<path d="M44 100 L30 86 M30 86 L44 72" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" transform="translate(0,14)"/>`);
  b.push(T('生产领料 · 扫码发料', 76, 100, 32, 700, '#FFFFFF') + T('仓管 李娜 · 原材料一号仓', 76, 136, 18, 400, '#FFFFFF', 'start', ' fill-opacity="0.85"'));
  b.push(ic('more', 660, 88, '#FFFFFF', 28));
  // 任务卡
  const cardBg = red ? '#FFFFFF' : '#FFFFFF';
  b.push(R(24, 168, 672, 140, cardBg, 20, red ? ' fill-opacity="0.14" stroke="#FFFFFF" stroke-opacity="0.35"' : ' stroke="#E2E8F0" filter="url(#sh)"'));
  const tc = red ? '#FFFFFF' : '#0F172A', tm = red ? '#FEE2E2' : '#64748B';
  b.push(T('领料单 PICK-20261113-004', 48, 202, 24, 700, tc) + pill('严格 FIFO', 672, 202, red ? '#DC2626' : '#1D4ED8', red ? '#FFFFFF' : '#E6F0FF', 16, 700, 12, 30, 'end').svg);
  b.push(T('工单 MO-20261112-002 · 分录 2 · BT-52 × 2,000', 48, 238, 19, 400, tm));
  b.push(T('已扫 7 / 12 盘', 48, 278, 19, 500, tc) + T('58%', 672, 278, 19, 700, tc, 'end') + bar(200, 273, 400, 10, 7 / 12, red ? '#FFFFFF' : '#10B981', red ? '#FFFFFF33' : '#E2E8F0'));
  // 扫码框
  const SX = 24, SY = 324, SW = 672, SH = 272;
  b.push(R(SX, SY, SW, SH, red ? '#7F1D1D' : '#0F172A', 24, red ? ' fill-opacity="0.35"' : ' fill-opacity="0.92"'));
  const bx0 = SX + 136, by0 = SY + 30, bw = SW - 272, bh = 172, cc = ok ? '#22C55E' : '#FFFFFF';
  b.push(R(bx0, by0, bw, bh, '#FFFFFF', 12, ' fill-opacity="0.06"'));
  [[bx0, by0, 1, 1], [bx0 + bw, by0, -1, 1], [bx0, by0 + bh, 1, -1], [bx0 + bw, by0 + bh, -1, -1]].forEach(([x, y, sx, sy]) => b.push(`<path d="M${x} ${y + sy * 40} V${y} H${x + sx * 40}" fill="none" stroke="${cc}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`));
  // 模拟卷盘标签
  const lx = bx0 + 40, ly = by0 + 30;
  b.push(R(lx, ly, bw - 80, bh - 60, '#FFFFFF', 8, ' fill-opacity="0.92"'));
  let k = 3; for (let i = 0; i < 46; i++) { k = (k * 29 + 7) % 23; const w = 1.5 + (k % 4); b.push(R(lx + 18 + i * 5.2, ly + 18, w, 60, '#0F172A')); }
  b.push(T(ok ? 'R26111304-00318' : 'R26101822-01164', lx + 18, ly + 98, 16, 700, '#0F172A'));
  b.push(R(lx + bw - 80 - 18 - 74, ly + 18, 74, 74, '#FFFFFF', 0, ' stroke="#0F172A" stroke-width="2"'));
  for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) { k = (k * 17 + 5) % 31; if (k % 2 || (i < 2 && j < 2)) b.push(R(lx + bw - 80 - 18 - 70 + i * 10, ly + 22 + j * 10, 9, 9, '#0F172A')); }
  b.push(R(bx0 + 12, by0 + bh / 2 - 2, bw - 24, 4, ok ? '#22C55E' : '#FFFFFF', 2, ' fill-opacity="0.9"'));
  b.push(T(ok ? '识别成功 · 0.18 s' : '已识别，校验未通过', SX + SW / 2, SY + SH - 34, 19, 500, ok ? '#86EFAC' : '#FFFFFF', 'middle'));
  // 结果卡
  const RY = 612, RH2 = 516;
  b.push(R(24, RY, 672, RH2, '#FFFFFF', 22, ' filter="url(#shP)"'));
  if (ok) {
    b.push(`<clipPath id="${id}h"><rect x="24" y="${RY}" width="672" height="${RH2}" rx="22"/></clipPath><g clip-path="url(#${id}h)">` + R(24, RY, 672, 88, 'url(#okG)') + '</g>');
    b.push(`<circle cx="74" cy="${RY + 44}" r="24" fill="#FFFFFF"/><path d="M62 ${RY + 45} L71 ${RY + 54} L87 ${RY + 36}" fill="none" stroke="#16A34A" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`);
    b.push(T('校验通过 · 允许发料', 112, RY + 36, 28, 700, '#FFFFFF') + T('料号匹配 · FIFO 通过 · MSL 在寿命内', 112, RY + 66, 17, 400, '#FFFFFF', 'start', ' fill-opacity="0.92"'));
  } else {
    b.push(`<clipPath id="${id}h"><rect x="24" y="${RY}" width="672" height="${RH2}" rx="22"/></clipPath><g clip-path="url(#${id}h)">` + R(24, RY, 672, 88, '#FEF2F2') + R(24, RY + 87, 672, 1, '#FECACA') + '</g>');
    b.push(`<path d="M74 ${RY + 20} L100 ${RY + 66} H48 Z" fill="#DC2626" stroke="#DC2626" stroke-width="4" stroke-linejoin="round"/><rect x="71.5" y="${RY + 36}" width="5" height="16" rx="2.5" fill="#FFFFFF"/><circle cx="74" cy="${RY + 58}" r="3" fill="#FFFFFF"/>`);
    b.push(T('错料！禁止发料', 116, RY + 36, 28, 700, '#B91C1C') + T('错误码 E-201 料号不符 · 已写入防错日志', 116, RY + 66, 17, 400, '#B91C1C'));
  }
  const rows = ok ? [['卷盘码', 'R26111304-00318', '#0F172A'], ['料号', '2.03.0832  nRF52832-QFAA', '#0F172A'], ['物料名称', 'nRF52832 蓝牙 SoC · QFN48', '#334155'], ['数量', '3,000 pcs（本单需 2,000）', '#0F172A'], ['D/C', '2639（2026 年第 39 周）', '#0F172A'], ['批号 / 库位', 'L2639-A07 · A-03-12', '#334155']]
    : [['卷盘码', 'R26101822-01164', '#0F172A'], ['料号', '2.03.0840  nRF52840-QIAA', '#DC2626', '需求 2.03.0832  nRF52832-QFAA'], ['物料名称', 'nRF52840 蓝牙 SoC · aQFN73', '#DC2626'], ['数量', '1,500 pcs', '#0F172A'], ['D/C', '2541（2025 年第 41 周）', '#C2410C', '早于客户 D/C 要求 2601'], ['批号 / 库位', 'L2541-B02 · A-05-07', '#334155']];
  let y = RY + 120;
  rows.forEach(([kk, v, c, note]) => { b.push(T(kk, 52, y, 19, 400, '#64748B') + T(v, 200, y, 20, 700, c)); if (note) { b.push(T(note, 200, y + 26, 16, 500, c === '#DC2626' ? '#DC2626' : '#C2410C')); y += 24; } b.push(R(52, y + 21, 616, 1, '#EEF2F7')); y += 44; });
  // MSL
  const mslP = ok ? 132.5 / 168 : 6 / 168, mc = ok ? '#16A34A' : '#DC2626';
  b.push(T('MSL 剩余时间', 52, y + 4, 19, 400, '#64748B') + T(ok ? '132.5 h' : '6.0 h', 668, y + 4, 28, 700, mc, 'end'));
  b.push(T(ok ? 'MSL 3 级 · 车间寿命 168 h · 已暴露 35.5 h' : 'MSL 3 级 · 已暴露 162.0 h · 即将超时，需烘烤', 52, y + 36, 16, 400, ok ? '#334155' : '#B91C1C'));
  b.push(bar(52, y + 56, 616, 12, mslP, mc, '#E2E8F0'));
  if (ok) b.push(R(52, y + 82, 616, 1, '#EEF2F7') + ic('check', 52, y + 96, '#16A34A', 20) + T('FIFO 通过：本盘为最早入库批次（入库 2026-10-02）', 82, y + 106, 17, 500, '#15803D'));
  // 底部按钮
  const BYb = 1148;
  if (ok) {
    b.push(R(24, BYb, 420, 96, '#16A34A', 18, ' filter="url(#sh)"') + T('确认发料（8 / 12）', 234, BYb + 48, 30, 700, '#FFFFFF', 'middle'));
    b.push(R(460, BYb, 236, 96, '#FFFFFF', 18, ' stroke="#CBD5E1" stroke-width="2"') + T('手工录入', 578, BYb + 48, 26, 500, '#334155', 'middle'));
  } else {
    b.push(R(24, BYb, 420, 96, '#FFFFFF', 18, ' filter="url(#sh)"') + T('重新扫描', 234, BYb + 48, 30, 700, '#DC2626', 'middle'));
    b.push(R(460, BYb, 236, 96, '#FFFFFF', 18, ' fill-opacity="0.12" stroke="#FFFFFF" stroke-width="2"') + T('呼叫班组长', 578, BYb + 48, 26, 500, '#FFFFFF', 'middle'));
  }
  b.push('</g>');
  return b.join('');
}
function ui25() {
  const comp = [R(0, 0, 1600, 1280, '#E9EEF5')];
  const S = 0.92, sw = 720 * S, sh = 1280 * S, gap = 96, x1 = (1600 - sw * 2 - gap) / 2, x2 = x1 + sw + gap, y0 = 1280 - sh - 26;
  [[x1, '成功状态 · 校验通过', '#16A34A', true], [x2, '错料状态 · 全屏红色告警', '#DC2626', false]].forEach(([x, cap, c, ok], i) => {
    comp.push(`<circle cx="${x + 8}" cy="40" r="7" fill="${c}"/>` + T(cap, x + 24, 40, 20, 700, '#0F172A') + T('PDA 720×1280 · 生产领料扫码', x + sw, 40, 15, 400, '#64748B', 'end'));
    comp.push(R(x - 6, y0 - 6, sw + 12, sh + 12, '#CBD5E1', 34, ' filter="url(#shP)"'));
    comp.push(`<clipPath id="ph${i}"><rect x="${x}" y="${y0}" width="${sw}" height="${sh}" rx="28"/></clipPath><g clip-path="url(#ph${i})"><g transform="translate(${x.toFixed(1)},${y0.toFixed(1)}) scale(${S})">${pda(ok, 'p' + i)}</g></g>`);
  });
  return { UI25: SVG(1600, 1280, comp.join('')), UI25_ok: SVG(720, 1280, pda(true, 'a')), UI25_err: SVG(720, 1280, pda(false, 'b')) };
}

// ======================= UI32 三维车间主页 =======================
const SC = { 运行: '#10B981', 待机: '#F59E0B', 故障: '#EF4444', 保养: '#3B82F6', 关机: '#94A3B8' };
const GRN = ['#86EFAC', '#4ADE80', '#22C55E'], YEL = ['#FDE68A', '#FCD34D', '#F59E0B'], RED = ['#FECACA', '#FCA5A5', '#EF4444'];
const mix = (a, b2, t) => { const h = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)); const A = h(a), B = h(b2); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase(); };
const grey = c => { const v = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); const l = Math.round(v[0] * 0.3 + v[1] * 0.59 + v[2] * 0.11); return mix('#' + [l, l, l].map(x => x.toString(16).padStart(2, '0')).join(''), '#F1F5F9', 0.25); };
function tint(L, st) {
  const unlit = ['#E2E8F0', '#CBD5E1', '#A3B1C2'];
  for (const q of L) { if (!q.f || q.f[0] !== '#' || q.f.length !== 7) continue;
    const gi = GRN.indexOf(q.f), yi = YEL.indexOf(q.f), ri = RED.indexOf(q.f);
    if (gi >= 0) q.f = st === '运行' ? GRN[gi] : unlit[gi];
    else if (yi >= 0) q.f = st === '待机' ? YEL[yi] : unlit[yi];
    else if (ri >= 0) q.f = st === '故障' ? RED[ri] : st === '保养' ? ['#BFDBFE', '#93C5FD', '#3B82F6'][ri] : unlit[ri];
    else if (st === '关机') q.f = grey(q.f);
    else if (st === '故障') q.f = mix(q.f, '#FEE2E2', 0.35);
    if (st === '关机' && q.s && q.s !== 'none') q.s = '#A3B1C2'; }
}
function ui32() {
  const b = [R(0, 0, 1920, 1080, 'url(#bgG)')];
  const S1 = 12.6, pr = mk(843, 306, S1);
  const BG = [], IT = [];
  const add = (k, fn) => { const L = []; fn(L); IT.push({ k, L }); };
  ft(BG, -1, 60, -1, 38.5, 0, '#FFFFFF', 0.92, '#B9CDE2');
  for (let gg = 3; gg < 60; gg += 4) ln(BG, [[gg, -1, 0], [gg, 38.5, 0]], '#E6EEF6', 0.8);
  for (let gg = 3; gg < 38; gg += 4) ln(BG, [[-1, gg, 0], [60, gg, 0]], '#E6EEF6', 0.8);
  ft(BG, 3, 35, -0.6, 5.6, 0.01, '#E0F2FE', 0.7, '#7DD3FC', '6 4');
  const LINES = [10.5, 20.5];
  for (const yc of LINES) ft(BG, 3.2, 57.6, yc - 3.6, yc + 5, 0.01, '#DBEAFE', 0.45, '#93C5FD', '6 4');
  ft(BG, 3.2, 38.4, 26.9, 33.8, 0.01, '#CFFAFE', 0.45, '#67E8F9', '6 4');
  for (const l of [[[1.5, 6.5, 0.02], [58.6, 6.5, 0.02], [58.6, 35.8, 0.02], [1.5, 35.8, 0.02], [1.5, 6.5, 0.02]], [[1.5, 16.6, 0.02], [58.6, 16.6, 0.02]], [[1.5, 26.2, 0.02], [58.6, 26.2, 0.02]]]) ln(BG, l, '#06B6D4', 2.4, '9 6');
  add(-100, L => rack(L, 4, 34, -0.3, 3.4, 12.9));
  add(-99, L => { stacker(L, 20, 4.6, 12.6, 6.4, 4, 34); tint(L, '运行'); });
  const marks = []; // [X,Y,Z,status,name]
  const STS = [['运行', '运行', '运行', '运行', '运行', '运行'], ['运行', '运行', '运行', '故障', '运行', '待机']];
  const NM = ['锡膏印刷机', 'SPI', '贴片机', '贴片机', '回流焊', 'AOI'], MZ = [5.6, 4.6, 6.4, 6.4, 5.4, 7.2];
  LINES.forEach((yc, li) => { let x = 4; const ds = [printer, spi, mounter, mounter, reflow, aoi];
    ds.forEach((d, i) => { const x0 = x, Lm = []; const w = d(Lm, x0, yc); const st = STS[li][i]; tint(Lm, st);
      Lm.unshift({ p: [[x0 - 0.2, yc - 3.3, 0.015], [x0 + w + 0.2, yc - 3.3, 0.015], [x0 + w + 0.2, yc + 3.6, 0.015], [x0 - 0.2, yc + 3.6, 0.015]], f: SC[st], o: st === '运行' ? 0.10 : 0.22, s: SC[st], sw: st === '运行' ? 0.8 : 1.6, dash: st === '运行' ? null : '6 4' });
      IT.push({ k: x0 + w / 2 + yc, L: Lm }); marks.push([x0 + w / 2, yc, MZ[i], st, NM[i], li, i]); x += w;
      if (i < ds.length - 1) { const a = x, z = x + 1.2; add(a + 0.6 + yc, L => conveyor(L, a, z, yc)); x = z; } }); });
  { let x = 4; const yc = 30; const TS = ['运行', '保养', '运行', '关机'];
    [tester, tester, taping, taping].forEach((d, i) => { const x0 = x, Lm = []; const w = d(Lm, x0, yc); tint(Lm, TS[i]);
      Lm.unshift({ p: [[x0 - 0.2, yc - 2.8, 0.015], [x0 + w + 0.2, yc - 2.8, 0.015], [x0 + w + 0.2, yc + 3.4, 0.015], [x0 - 0.2, yc + 3.4, 0.015]], f: SC[TS[i]], o: TS[i] === '运行' ? 0.10 : 0.22, s: SC[TS[i]], sw: TS[i] === '运行' ? 0.8 : 1.6, dash: TS[i] === '运行' ? null : '6 4' });
      IT.push({ k: x0 + w / 2 + yc, L: Lm }); marks.push([x0 + w / 2, yc, 5.6, TS[i], d === taping ? '编带机' : '测试分选机', 2, i]); x += w;
      if (i < 3) { const a = x, z = x + 1.2; add(a + 0.6 + yc, L => conveyor(L, a, z, yc, 1.6)); x = z; } }); }
  const AG = [[57.2, 20, 1, 1, '运行'], [46, 34.4, 1, 0, '运行'], [44, 15.2, 0, 0, '待机'], [8, 5.1, 1, 0, '运行']];
  AG.forEach(([x, y, ld, rot, st]) => add(x + y + 2, L => agv(L, x, y, ld, rot)));
  IT.sort((a, c) => a.k - c.k);
  b.push('<g>' + render(BG, pr) + IT.map(i => render(i.L, pr)).join('') + '</g>');
  // 产线标签
  [['SMT-1 线', 3.3, 12.5], ['SMT-2 线', 3.3, 22.5], ['测试编带线', 3.3, 32]].forEach(([t, X, Y]) => { const [px, py] = pr([X, Y, 0]); const p = pill(t, px - 8, py - 14, '#FFFFFF', '#2563EB', 15, 700, 14, 30, 'end'); b.push(p.svg); });
  // 设备状态灯
  marks.forEach(([X, Y, Z, st, nm, li, i]) => { const [px, py] = pr([X, Y, Z]);
    if (li === 0) { const t = nm; const wd = W(t, 13, 500) + 34, x0 = px - wd / 2, y0 = py - 34; b.push(R(x0, y0, wd, 24, '#FFFFFF', 12, ' stroke="#93C5FD" fill-opacity="0.95"') + `<circle cx="${x0 + 13}" cy="${y0 + 12}" r="4.5" fill="${SC[st]}"/>` + T(t, x0 + 24, y0 + 12, 13, 500, '#1E3A8A') + R(px - 0.75, y0 + 24, 1.5, 10, '#93C5FD')); }
    else if (li === 2) { const [qx, qy] = pr([X, Y + 3.6, 0]); const t = nm + (st !== '运行' ? ' · ' + st : ''); const wd = W(t, 13, 500) + 34, x0 = qx - wd / 2; b.push(R(x0, qy + 8, wd, 24, '#FFFFFF', 12, ` stroke="${st === '运行' ? '#93C5FD' : SC[st]}" fill-opacity="0.95"`) + `<circle cx="${x0 + 13}" cy="${qy + 20}" r="4.5" fill="${SC[st]}"/>` + T(t, x0 + 24, qy + 20, 13, 500, st === '运行' ? '#1E3A8A' : '#334155')); }
    b.push(`<circle cx="${px.toFixed(1)}" cy="${(py + (li === 0 ? 6 : 0)).toFixed(1)}" r="${st === '运行' ? 6 : 8}" fill="${SC[st]}" stroke="#FFFFFF" stroke-width="2.5"/>`);
    if (st === '故障') b.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="16" fill="none" stroke="#EF4444" stroke-opacity="0.45" stroke-width="3"/><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="26" fill="none" stroke="#EF4444" stroke-opacity="0.18" stroke-width="3"/>`);
    if (li === 1 && st !== '运行') { const t = st === '故障' ? '贴片机 SMT-2-02 · 故障 37 min' : 'AOI SMT-2 · 待机（待料）'; const wd = W(t, 13, 700) + 24; const x0 = px + 18, y0 = py - 44;
      b.push(R(x0, y0, wd, 28, '#FFFFFF', 8, ` stroke="${SC[st]}" stroke-width="1.5" filter="url(#sh)"`) + T(t, x0 + 12, y0 + 14, 13, 700, st === '故障' ? '#B91C1C' : '#B45309') + `<path d="M${px + 6} ${py - 6} L${x0} ${y0 + 20}" stroke="${SC[st]}" stroke-width="1.5"/>`); } });
  AG.forEach(([x, y, , rot, st]) => { const [px, py] = pr([x + (rot ? 1.4 : 2), y + (rot ? 2 : 1.4), 2.6]); b.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="5.5" fill="${SC[st]}" stroke="#FFFFFF" stroke-width="2"/>`); });
  { const [px, py] = pr([6, 1.5, 14.2]); const t = '立体仓库 · 库位 1,280 / 1,536'; const wd = W(t, 13, 500) + 20; b.push(R(px - wd / 2, py - 12, wd, 24, '#FFFFFF', 12, ' stroke="#93C5FD" fill-opacity="0.95"') + T(t, px - wd / 2 + 10, py, 13, 500, '#1E3A8A')); }
  { const [px, py] = pr([20, 4.6, 15.6]); const t = '堆垛机'; const wd = W(t, 13, 500) + 34; b.push(R(px - wd / 2, py - 12, wd, 24, '#FFFFFF', 12, ' stroke="#93C5FD" fill-opacity="0.95"') + `<circle cx="${px - wd / 2 + 13}" cy="${py}" r="4.5" fill="#10B981"/>` + T(t, px - wd / 2 + 24, py, 13, 500, '#1E3A8A')); }
  // 顶栏
  b.push(R(0, 0, 1920, 68, '#FFFFFF', 0, ' fill-opacity="0.96"') + R(0, 67, 1920, 1, '#E2E8F0'));
  b.push(logo(24, 16, 36) + T('芯程电子 · 三维车间', 72, 34, 22, 700, '#0F172A'));
  { const tabs = ['全厂', 'SMT-1 线', 'SMT-2 线', '测试编带线', '立体仓库'], ws = tabs.map(t => W(t, 15, 500) + 36), tot = ws.reduce((a, c) => a + c, 0) + 8 + 4 * 4; let x = 960 - tot / 2;
    b.push(R(x, 14, tot, 40, '#F1F5F9', 10, ' stroke="#E2E8F0"')); x += 4;
    tabs.forEach((t, i) => { if (!i) b.push(R(x, 18, ws[i], 32, '#2563EB', 8)); b.push(T(t, x + ws[i] / 2, 34, 15, i ? 500 : 700, i ? '#475569' : '#FFFFFF', 'middle')); if (i === 2) b.push(`<circle cx="${x + ws[i] - 9}" cy="24" r="4" fill="#EF4444"/>`); x += ws[i] + 4; }); }
  { let x = 1896; const p1 = pill('数据刷新 5 s', x, 34, '#15803D', '#E5F6EC', 13, 500, 10, 26, 'end'); b.push(p1.svg); x -= p1.w + 16;
    const t2 = '2026-11-13 星期五 14:58:36'; b.push(T(t2, x, 34, 15, 500, '#334155', 'end')); x -= W(t2, 15, 500) + 14; b.push(R(x, 26, 1, 16, '#CBD5E1')); x -= 14; b.push(T('一号厂区 · 白班', x, 34, 15, 500, '#334155', 'end')); }
  // 卡片工具
  const card = (x, y, w, h, title, right) => R(x, y, w, h, '#FFFFFF', 14, ' fill-opacity="0.92" stroke="#D6E2EF" filter="url(#sh)"') + T(title, x + 20, y + 26, 17, 700, '#0F172A') + (right ? T(right, x + w - 20, y + 26, 12, 400, '#64748B', 'end') : '');
  const LX = 24, CWd = 384;
  // OEE
  { const y = 84, h = 264; b.push(card(LX, y, CWd, h, 'OEE 设备综合效率', '目标 80.0% · 当班'));
    const A = 0.882, P = 0.915, Q = 0.974, O = A * P * Q;
    b.push(ring(LX + 82, y + 112, 52, 13, O, '#2563EB') + T(f1(O * 100) + '%', LX + 82, y + 106, 22, 700, '#0F172A', 'middle') + T('全厂 OEE', LX + 82, y + 130, 12, 400, '#64748B', 'middle'));
    [['可用率', A, '#3B82F6'], ['性能', P, '#22D3EE'], ['良率', Q, '#10B981']].forEach(([k, v, c], i) => { const yy = y + 70 + i * 34, x0 = LX + 160; b.push(T(k, x0, yy, 13, 400, '#475569') + bar(x0 + 48, yy - 3, 100, 6, v, c) + T(f1(v * 100) + '%', LX + CWd - 20, yy, 13, 700, '#1E293B', 'end')); });
    b.push(R(LX + 20, y + 180, CWd - 40, 1, '#EEF2F7'));
    [['SMT-1 线', 0.852, '#10B981'], ['SMT-2 线', 0.707, '#EF4444'], ['测试编带线', 0.796, '#F59E0B']].forEach(([k, v, c], i) => { const yy = y + 200 + i * 22; b.push(T(k, LX + 20, yy, 13, 500, '#334155') + bar(LX + 110, yy - 3, 196, 6, v, c) + R(LX + 110 + 196 * 0.8 - 0.5, yy - 7, 1.5, 14, '#64748B') + T(f1(v * 100) + '%', LX + CWd - 20, yy, 13, 700, v < 0.8 ? c : '#1E293B', 'end')); }); }
  // 产量
  { const y = 360, h = 300; b.push(card(LX, y, CWd, h, '今日产量', '截至 14:58 · 单位 千 pcs'));
    b.push(T('128,460', LX + 20, y + 68, 32, 700, '#2563EB') + T('pcs', LX + 20 + W('128,460', 32, 700) + 6, y + 74, 13, 400, '#64748B'));
    b.push(R(LX + 20, y + 93, 10, 10, '#FDBA74', 2) + T('12 时：换线 + 午休', LX + 36, y + 98, 11, 400, '#C2410C') + T('计划 140,000 · 达成 91.8%', LX + CWd - 20, y + 64, 13, 500, '#334155', 'end') + bar(LX + CWd - 160, y + 78, 140, 6, 0.918, '#2563EB'));
    const hv = [14.2, 16.8, 17.1, 16.6, 12.4, 16.5, 17.3, 17.56], bw2 = 30, gx = (CWd - 40 - 8 * bw2) / 7, base = y + 210, sc = 5.4;
    [0, 1, 2].forEach(i => b.push(R(LX + 20, base - i * 40 - 0.5, CWd - 40, 1, '#EEF2F7') + T(String(i * 7.5 === 0 ? 0 : i * 7.5), LX + 20, base - i * 40 - 8, 10, 400, '#94A3B8')));
    hv.forEach((v, i) => { const x = LX + 20 + i * (bw2 + gx); const hh = v * sc; b.push(R(x, base - hh, bw2, hh, i === 4 ? '#FDBA74' : i === 7 ? '#22D3EE' : '#93C5FD', 4) + T(String(8 + i).padStart(2, '0'), x + bw2 / 2, base + 14, 11, 400, '#64748B', 'middle')); });
    [['SMT-1', '46,820'], ['SMT-2', '44,150'], ['测试编带', '37,490']].forEach(([k, v], i) => { const x = LX + 20 + i * 118; b.push(R(x, y + 246, 108, 40, '#F8FAFC', 8, ' stroke="#E2E8F0"') + T(k, x + 10, y + 258, 11, 400, '#64748B') + T(v, x + 10, y + 276, 14, 700, '#0F172A')); }); }
  // 良率
  { const y = 672, h = 324; b.push(card(LX, y, CWd, h, '良率', '近 7 日 · 直通率 FPY'));
    b.push(T('98.6%', LX + 20, y + 66, 30, 700, '#10B981') + T('今日综合良率 · 较昨日 +0.3%', LX + 128, y + 68, 12, 400, '#64748B'));
    const tr = [98.1, 98.4, 98.2, 98.7, 98.5, 98.3, 98.6], X = i => LX + 56 + i * 49, Y = v => y + 196 - (v - 97.8) * 70;
    [98, 98.5, 99].forEach(v => b.push(R(LX + 50, Y(v), CWd - 70, 1, '#EEF2F7') + T(v.toFixed(1), LX + 20, Y(v), 10, 400, '#94A3B8')));
    b.push(`<polygon points="${tr.map((v, i) => X(i) + ',' + Y(v).toFixed(1)).join(' ')} ${X(6)},${y + 200} ${X(0)},${y + 200}" fill="url(#areaG)"/><polyline points="${tr.map((v, i) => X(i) + ',' + Y(v).toFixed(1)).join(' ')}" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linejoin="round"/>`);
    tr.forEach((v, i) => b.push(`<circle cx="${X(i)}" cy="${Y(v).toFixed(1)}" r="${i === 6 ? 5 : 3.5}" fill="#FFFFFF" stroke="#10B981" stroke-width="2"/>` + T('11-' + String(7 + i).padStart(2, '0'), X(i), y + 214, 10, 400, '#64748B', 'middle')));
    b.push(R(LX + 20, y + 230, CWd - 40, 1, '#EEF2F7'));
    [['SPI', '99.2%'], ['AOI', '98.9%'], ['测试分选', '99.1%']].forEach(([k, v], i) => { const x = LX + 20 + i * 118; b.push(T(k + ' 直通率', x, y + 250, 12, 400, '#64748B') + T(v, x, y + 272, 16, 700, '#0F172A')); });
    b.push(T('不良 TOP3：少锡 32% · 偏移 21% · 立碑 14%', LX + 20, y + 302, 12, 500, '#C2410C')); }
  // 安灯告警
  const RX = 1512;
  { const y = 84, h = 448; b.push(card(RX, y, CWd, h, '安灯告警', '今日'));
    [['今日呼叫', '9', '#0F172A'], ['未关闭', '2', '#DC2626'], ['平均响应', '3.8 min', '#0F172A']].forEach(([k, v, c], i) => { const x = RX + 20 + i * 118; b.push(R(x, y + 44, 108, 54, '#F8FAFC', 8, ' stroke="#E2E8F0"') + T(k, x + 10, y + 60, 11, 400, '#64748B') + T(v, x + 10, y + 82, 18, 700, c)); });
    const LVc = { 一级: ['#DC2626', '#FDECEC'], 二级: ['#C2410C', '#FFF1E6'], 三级: ['#B45309', '#FEF9C3'] };
    const al = [['一级', '设备', 'SMT-2 贴片机 02 吸嘴真空异常', '14:21', '处理中', '李工 已到场'], ['二级', '物料', 'SMT-1 F-12 0402 104K 将断料', '14:46', '待处理', 'AGV 配送中'], ['三级', '质量', '编带线 2 号 外观抽检不良 3 pcs', '13:58', '已关闭', '响应 2.6 min'], ['二级', '工艺', 'SMT-2 回流焊 炉温曲线偏移', '11:32', '已关闭', '响应 4.1 min'], ['三级', '设备', '测试分选机 02 计划保养', '10:05', '已关闭', '保养中']];
    al.forEach(([lv, tp, t, tm, st, note], i) => { const yy = y + 118 + i * 64; const c = LVc[lv];
      b.push(R(RX + 20, yy, CWd - 40, 56, i < 2 ? c[1] : '#FFFFFF', 8, ` stroke="${i < 2 ? c[1] : '#EEF2F7'}"`) + R(RX + 20, yy, 4, 56, c[0], 2));
      b.push(pill(lv, RX + 34, yy + 17, c[0], '#FFFFFF', 11, 700, 6, 18, 'start', ` stroke="${c[0]}" stroke-opacity="0.4"`).svg + T(tp, RX + 80, yy + 17, 12, 500, '#475569') + T(t, RX + 34, yy + 40, 13, 500, '#1E293B'));
      b.push(T(tm, RX + CWd - 30, yy + 17, 12, 400, '#64748B', 'end') + T(st, RX + CWd - 30, yy + 40, 12, 700, st === '已关闭' ? '#94A3B8' : st === '处理中' ? '#2563EB' : '#DC2626', 'end'));
      b.push(T(note, RX + CWd - 30 - W(st, 12, 700) - 10, yy + 40, 11, 400, '#94A3B8', 'end')); }); }
  // 缺料预警
  { const y = 544, h = 452; b.push(card(RX, y, CWd, h, '缺料预警', '工位剩余可用时间'));
    b.push(T('齐套率', RX + 20, y + 62, 12, 400, '#64748B') + T('96.4%', RX + 20, y + 84, 20, 700, '#0F172A') + T('预警工位', RX + 140, y + 62, 12, 400, '#64748B') + T('5 / 48', RX + 140, y + 84, 20, 700, '#C2410C') + T('配送中', RX + 260, y + 62, 12, 400, '#64748B') + T('3 单', RX + 260, y + 84, 20, 700, '#2563EB'));
    const sh2 = [['SMT-1 F-12', 'MLCC 0402 104K', 9, 60, 'AGV-03 配送中', '#DC2626'], ['SMT-2 F-07', 'nRF52832 QFN48', 22, 60, '已叫料', '#DC2626'], ['SMT-1 F-03', '0603 10kΩ 电阻', 34, 60, 'AGV-01 配送中', '#D97706'], ['编带线 T-02', '8mm 纸质载带', 41, 60, '待叫料', '#D97706'], ['SMT-2 F-21', '锡膏 SAC305', 52, 60, 'AGV-04 配送中', '#D97706']];
    sh2.forEach(([ws, n, m, mx, st, c], i) => { const yy = y + 114 + i * 64;
      b.push(R(RX + 20, yy - 2, CWd - 40, 1, '#EEF2F7') + T(ws, RX + 20, yy + 18, 13, 700, '#1E293B') + T(n, RX + 112, yy + 18, 13, 400, '#475569') + T(m + ' min', RX + CWd - 20, yy + 18, 14, 700, c, 'end'));
      b.push(bar(RX + 20, yy + 36, CWd - 160, 7, m / mx, c) + T(st, RX + CWd - 20, yy + 40, 12, 500, st.includes('配送') ? '#2563EB' : st === '待叫料' ? '#DC2626' : '#64748B', 'end')); }); }
  // 图例
  { const items = [['运行', 41], ['待机', 6], ['故障', 2], ['保养', 3], ['关机', 2]]; const y = 1016; let w = 32 + W('设备状态', 13, 700) + 16; items.forEach(([k, n]) => { w += 18 + W(k + ' ' + n, 13, 500) + 22; }); w += W('共 54 台', 13, 400) + 12; const x0 = 960 - w / 2; let x = x0 + 16;
    b.push(R(x0, y - 20, w, 40, '#FFFFFF', 10, ' fill-opacity="0.94" stroke="#D6E2EF"') + T('设备状态', x, y, 13, 700, '#0F172A')); x += W('设备状态', 13, 700) + 16;
    items.forEach(([k, n]) => { b.push(R(x, y - 6, 12, 12, SC[k], 3) + T(k + ' ' + n, x + 18, y, 13, 500, '#334155')); x += 18 + W(k + ' ' + n, 13, 500) + 22; });
    b.push(T('共 54 台', x, y, 13, 400, '#64748B')); }
  return SVG(1920, 1080, b.join(''));
}

// ==== MAIN ====
const ALL = { UI03: ui03, UI04: ui04, UI24: ui24, UI25: ui25, UI32: ui32 };
const want = process.argv.slice(2);
if (process.argv[1] && process.argv[1].endsWith('gen_full.mjs')) for (const [k, fn] of Object.entries(ALL)) { if (want.length && !want.includes(k)) continue; const r = fn(); if (typeof r === 'string') fs.writeFileSync(OUT + k + '.svg', r); else for (const [n, v] of Object.entries(r)) fs.writeFileSync(OUT + n + '.svg', v); }

export { fs, OUT, E, W, T, R, pill, bar, ring, g, IC, ic, chk, btn, row, tag1, tag2, ST1, ST2, frame, tableX, logo, SVG, DEFS, PROD, ROWS3, LL, f1, n0, esc, mix, SC, tint, ui03, ui04, ui24, ui32 };
