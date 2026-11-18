// 第 1 批页面：UI01 UI02 UI05 UI06 UI07 UI08 UI09 UI10 UI11   (node gen_b1.mjs [UIxx ...])
import { fs, OUT, E, W, T, R, pill, bar, ring, g, ic, chk, btn, row, tag1, tag2, ST1, ST2, frame, tableX, logo, SVG, DEFS, PROD, LL, f1, n0, ui03, ui04 } from './gen_full.mjs';
const { bx, fy, fx, ft, ln, render, mk, printer, spi, mounter, reflow, aoi, conveyor, taping, tester, stacker, agv, rack, GR, OR } = E;
const X0 = 224, CW = 1680;
const card = (x, y, w, h, title, right, rc = '#64748B') => R(x, y, w, h, '#FFFFFF', 10, ' stroke="#E2E8F0"') + (title ? R(x + 16, y + 17, 4, 16, '#2563EB', 2) + T(title, x + 28, y + 25, 15, 700, '#0F172A') : '') + (right ? T(right, x + w - 16, y + 25, 12, 400, rc, 'end') : '');
const inner = svg => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/<defs>[\s\S]*?<\/defs>/, '');
const tabsBar = (x, y, items, act) => { let s = '', cx = x; items.forEach((t, i) => { const on = i === act, w = W(t, 14, 700); s += T(t, cx, y, 14, on ? 700 : 500, on ? '#1D4ED8' : '#475569') + (on ? R(cx, y + 20, w, 2, '#2563EB', 1) : ''); cx += w + 30; }); return s; };
const field = (x, y, lab, val, o = {}) => { const lw = o.lw || 80, iw = o.iw || 220; const lock = o.lock;
  return (o.req ? T('*', x, y + 16, 13, 700, '#EF4444') : '') + T(lab, x + 10, y + 16, 13, 400, '#475569') + R(x + lw, y, iw, 32, lock ? '#F1F5F9' : '#FFFFFF', 6, lock ? ' stroke="#E2E8F0"' : ' stroke="#CBD5E1"') + T(val, x + lw + 12, y + 16, 13, 400, lock ? (o.c || '#64748B') : (o.c || '#1E293B')) + (lock ? ic('lock', x + lw + iw - 24, y + 8, '#A3B1C2') : o.sel ? ic('chev', x + lw + iw - 24, y + 8, '#94A3B8') : o.find ? ic('search', x + lw + iw - 24, y + 8, '#94A3B8') : ''); };
const sw = (x, cy, on) => R(x, cy - 10, 36, 20, on ? '#2563EB' : '#CBD5E1', 10) + `<circle cx="${on ? x + 26 : x + 10}" cy="${cy}" r="7.5" fill="#FFFFFF"/>`;
const radio = (x, cy, on) => `<circle cx="${x + 8}" cy="${cy}" r="7.5" fill="#FFFFFF" stroke="${on ? '#2563EB' : '#CBD5E1'}" stroke-width="1.5"/>` + (on ? `<circle cx="${x + 8}" cy="${cy}" r="4" fill="#2563EB"/>` : '');
const dim = (bg, a = 0.45) => inner(bg) + R(0, 0, 1920, 1080, '#0F172A', 0, ` fill-opacity="${a}"`);
const titleRow = (title, sub, tags = []) => { let s = T(title, X0, 120, 20, 700, '#0F172A'); let x = X0 + W(title, 20, 700) + 12; if (sub) { s += T(sub, x, 121, 16, 500, '#475569'); x += W(sub, 16, 500) + 12; } for (const t of tags) { s += t[0] === 1 ? tag1(t[1], x, 120) : tag2(t[1], x, 120); x += W(t[1], 12, 500) + 26; } return s; };
const dis = (x, y, s, icon) => { const wd = W(s, 14, 500) + (icon ? 50 : 28); return { w: wd, svg: R(x, y, wd, 32, '#F8FAFC', 6, ' stroke="#E2E8F0"') + (icon ? ic(icon, x + 13, y + 8, '#CBD5E1') : '') + T(s, x + (icon ? 36 : 14), y + 16, 14, 500, '#A3B1C2') }; };
const toolbar = (x, y, items) => { let s = '', cx = x; for (const it of items) { if (it === '|') { s += R(cx + 2, y + 7, 1, 18, '#E2E8F0'); cx += 13; continue; } const o = it[1] === 'd' ? dis(cx, y, it[0], it[2]) : btn(cx, y, it[0], it[1], it[2]); s += o.svg; cx += o.w + 8; } return s; };
const tree = (x, y, nodes, o = {}) => { // nodes: [level, text, open(1/0/-1 叶), count, active]
  const RH = o.rh || 32; let s = '';
  nodes.forEach(([lv, t, op, cnt, act], i) => { const yy = y + i * RH, cy = yy + RH / 2, xx = x + 10 + lv * 18;
    if (act) s += R(x, yy + 2, o.w - 0, RH - 4, '#E6F0FF', 6);
    if (op >= 0) s += op ? `<path d="M${xx} ${cy - 2} L${xx + 4} ${cy + 2} L${xx + 8} ${cy - 2}" fill="none" stroke="#64748B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>` : `<path d="M${xx + 2} ${cy - 4} L${xx + 6} ${cy} L${xx + 2} ${cy + 4}" fill="none" stroke="#64748B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += (op >= 0 ? `<path d="M${xx + 14} ${cy - 5} H${xx + 19} L${xx + 21} ${cy - 3} H${xx + 28} V${cy + 5} H${xx + 14} Z" fill="${act ? '#93C5FD' : '#FDE68A'}" stroke="${act ? '#2563EB' : '#D97706'}" stroke-width="1"/>` : `<circle cx="${xx + 20}" cy="${cy}" r="2.5" fill="#94A3B8"/>`);
    s += T(t, xx + 34, cy, 13, act ? 700 : 400, act ? '#1D4ED8' : '#334155') + (cnt != null ? T(String(cnt), x + o.w - 10, cy, 12, 400, '#94A3B8', 'end') : ''); });
  return s; };
// 箭头：折线 + 实心三角（不用 marker，保证 Figma 导入一致）
const arrow = (pts, col = '#94A3B8', sw2 = 1.6, dash) => { const [a, b2] = [pts[pts.length - 2], pts[pts.length - 1]]; const ang = Math.atan2(b2[1] - a[1], b2[0] - a[0]), L = 9, Wd = 4.5;
  const p1 = [b2[0] - L * Math.cos(ang) + Wd * Math.sin(ang), b2[1] - L * Math.sin(ang) - Wd * Math.cos(ang)], p2 = [b2[0] - L * Math.cos(ang) - Wd * Math.sin(ang), b2[1] - L * Math.sin(ang) + Wd * Math.cos(ang)];
  const end = [b2[0] - (L - 1) * Math.cos(ang), b2[1] - (L - 1) * Math.sin(ang)];
  const line = pts.slice(0, -1).concat([end]).map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
  return `<polyline points="${line}" fill="none" stroke="${col}" stroke-width="${sw2}" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/><polygon points="${[b2, p1, p2].map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="${col}"/>`; };

// ======================= UI01 登录 =======================
function ui01() {
  const b = [];
  b.push(R(0, 0, 1920, 1080, 'url(#bgG)'));
  b.push(`<circle cx="560" cy="560" r="520" fill="#DBEAFE" fill-opacity="0.35"/><circle cx="1600" cy="180" r="260" fill="#E0F2FE" fill-opacity="0.5"/>`);
  b.push(logo(64, 48, 40) + T('芯程电子', 116, 68, 20, 700, '#0F172A'));
  b.push(T('数字化车间  ·  透明化生产', 64, 150, 36, 700, '#0F172A'));
  const S = 12.2, pr = mk(600, 420, S);
  const BG = [], IT = [];
  const add = (k, fn) => { const L = []; fn(L); IT.push({ k, L }); };
  bx(BG, -1, -1, -1.2, 47, 33, 1.2, ['#FFFFFF', '#E2EAF3', '#C9D6E4'], 1, '#B9CDE2');
  for (let x = 3; x < 46; x += 4) ln(BG, [[x, -1, 0.01], [x, 32, 0.01]], '#E6EEF6', 0.8);
  for (let y = 3; y < 32; y += 4) ln(BG, [[-1, y, 0.01], [46, y, 0.01]], '#E6EEF6', 0.8);
  fx(BG, -1, -1, 32, 0, 9, '#EEF3F9', 1, '#B9CDE2');
  fy(BG, -1, 46, -1, 0, 9, '#F4F7FB', 1, '#B9CDE2');
  for (let i = 0; i < 9; i++) fy(BG, 1 + i * 5, 4.4 + i * 5, -0.98, 5.2, 7.8, '#BFDBFE', 0.9, '#93C5FD');
  for (let i = 0; i < 6; i++) fx(BG, -0.98, 2 + i * 5, 5.4 + i * 5, 5.2, 7.8, '#BAE6FD', 0.9, '#7DD3FC');
  fy(BG, -1, 46, -0.97, 3.6, 4, '#2563EB', 0.9); fx(BG, -0.97, -1, 32, 3.6, 4, '#2563EB', 0.9);
  ft(BG, 2.5, 22.5, -0.6, 4.4, 0.02, '#E0F2FE', 0.7, '#7DD3FC', '6 4');
  ft(BG, 2.6, 45, 6.2, 14.8, 0.02, '#DBEAFE', 0.45, '#93C5FD', '6 4');
  ft(BG, 2.6, 30, 19.8, 26.6, 0.02, '#CFFAFE', 0.45, '#67E8F9', '6 4');
  for (const l of [[[1.2, 5.3, 0.03], [45.6, 5.3, 0.03]], [[1.2, 17.2, 0.03], [45.6, 17.2, 0.03]], [[1.2, 29.2, 0.03], [45.6, 29.2, 0.03]], [[1.2, 5.3, 0.03], [1.2, 29.2, 0.03]], [[45.6, 5.3, 0.03], [45.6, 29.2, 0.03]]]) ln(BG, l, '#06B6D4', 2.4, '9 6');
  add(-100, L => rack(L, 3, 22, -0.3, 3.2, 10.8));
  add(-99, L => stacker(L, 12, 4.4, 10.5, 5.2, 3, 22));
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) add(26 + i * 3 + j * 3 + 1, L => { const x = 25 + i * 3.6, y = 0 + j * 2.6; bx(L, x, y, 0, 2.8, 2, 0.3, GR); bx(L, x + 0.2, y + 0.2, 0.3, 2.4, 1.6, (i + j) % 2 ? 1.4 : 2.2, OR); });
  { const yc = 10.5; let x = 3; const ds = [printer, spi, mounter, reflow, aoi]; ds.forEach((d, i) => { const x0 = x, Lm = []; const w = d === reflow ? d(Lm, x0, yc, 12) : d(Lm, x0, yc); IT.push({ k: x0 + w / 2 + yc, L: Lm }); x += w; if (i < ds.length - 1) { const a = x, z = x + 1.2; add(a + 0.6 + yc, L => conveyor(L, a, z, yc)); x = z; } }); }
  { const yc = 23.2; let x = 3; [tester, taping].forEach((d, i) => { const x0 = x, Lm = []; const w = d(Lm, x0, yc); IT.push({ k: x0 + w / 2 + yc, L: Lm }); x += w; if (!i) { const a = x, z = x + 1.2; add(a + 0.6 + yc, L => conveyor(L, a, z, yc, 1.6)); x = z; } }); }
  add(36 + 23, L => { bx(L, 33, 20.5, 0, 9, 3.5, 0.3, GR); for (let i = 0; i < 3; i++) bx(L, 33.4 + i * 2.9, 20.9, 0.3, 2.4, 2.7, 1.2 + (i % 2) * 0.8, i === 1 ? ['#BFDBFE', '#93C5FD', '#60A5FA'] : OR); });
  add(32 + 17.2, L => agv(L, 30, 15.8, 1, 0));
  add(14 + 29.2, L => agv(L, 12, 27.8, 0, 0));
  add(45.6 + 9, L => agv(L, 44.2, 7.5, 1, 1));
  add(40 + 5.3, L => agv(L, 38, 3.9, 1, 0));
  IT.sort((a, c) => a.k - c.k);
  b.push(`<ellipse cx="${pr([22.5, 16, 0])[0].toFixed(0)}" cy="${(pr([46, 32, 0])[1] + 6).toFixed(0)}" rx="470" ry="36" fill="#C7D7EA" fill-opacity="0.35"/>`);
  b.push('<g>' + render(BG, pr) + IT.map(i => render(i.L, pr)).join('') + '</g>');
  const LX = 1264, LY = 300, LW = 536, LH = 480, P = 48, IW = LW - P * 2;
  const c = [];
  c.push(R(0, 0, LW, LH, '#FFFFFF', 20, ' stroke="#D6E2EF" filter="url(#shL)"'));
  c.push(logo(P, 48, 44));
  c.push(T('芯程电子元器件生产管理 ERP', P + 64, 80, 24, 700, '#0F172A'));
  const fld = (y, label, icon, val, pwd) => { let s = T(label, P, y, 14, 500, '#334155') + R(P, y + 16, IW, 50, '#F8FAFC', 10, ' stroke="#CBD5E1"') + g(P + 16, y + 32, icon);
    s += pwd ? Array.from({ length: 10 }, (_, i) => `<circle cx="${P + 52 + i * 14}" cy="${y + 41}" r="4" fill="#334155"/>`).join('') + g(P + IW - 38, y + 31, '<path d="M1 10 C5 3 15 3 19 10 C15 17 5 17 1 10 Z" fill="none" stroke="#94A3B8" stroke-width="1.8"/><circle cx="10" cy="10" r="3" fill="none" stroke="#94A3B8" stroke-width="1.8"/><line x1="3" y1="18" x2="17" y2="2" stroke="#94A3B8" stroke-width="1.8" stroke-linecap="round"/>') : T(val, P + 48, y + 41, 15, 400, '#1E293B');
    return s; };
  const icUser = '<circle cx="9" cy="6" r="4" fill="none" stroke="#64748B" stroke-width="1.8"/><path d="M1.5 18 C2.5 12.5 15.5 12.5 16.5 18" fill="none" stroke="#64748B" stroke-width="1.8" stroke-linecap="round"/>';
  const icLock = '<rect x="2" y="8" width="14" height="10" rx="2.5" fill="none" stroke="#64748B" stroke-width="1.8"/><path d="M5 8 V5.5 A4 4 0 0 1 13 5.5 V8" fill="none" stroke="#64748B" stroke-width="1.8"/><circle cx="9" cy="13" r="1.5" fill="#64748B"/>';
  c.push(fld(140, '账号', icUser, 'zhang.gong'));
  c.push(fld(234, '密码', icLock, '', 1));
  c.push(R(P, 332, 18, 18, '#2563EB', 4) + '<path d="M' + (P + 4) + ' 341 L' + (P + 8) + ' 345 L' + (P + 14) + ' 337" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' + T('记住我', P + 28, 341, 14, 400, '#334155'));
  c.push(T('忘记密码？', P + IW, 341, 14, 500, '#2563EB', 'end'));
  c.push(R(P, 384, IW, 52, '#2563EB', 10) + T('登 录', P + IW / 2, 410, 17, 700, '#FFFFFF', 'middle'));
  b.push(g(LX, LY, c.join('')));
  return SVG(1920, 1080, b.join(''));
}

// ======================= UI02 工作台首页 =======================
function ui02() {
  const b = frame([['工作台', 1], ['生产订单列表', 0], ['生产订单 - MO-20261112-002', 0]], '工作台');
  b.push(T('下午好，王敏', X0, 120, 22, 700, '#0F172A') + T('2026-11-13 星期五 · 生产计划部 · 本周已处理 26 项', X0 + 150, 122, 13, 400, '#64748B'));
  b.push(toolbar(1904 - 226, 104, [['自定义工作台', 0, 'grid'], ['刷新', 0, 'refresh']]));
  // KPI
  const K = [['今日产量', '128,460', 'pcs', '计划 140,000 · 达成 91.8%', 0.918, '#2563EB', [96, 104, 99, 112, 118, 121, 128]],
    ['综合良率', '98.6', '%', '较昨日 +0.3%', 0.986, '#10B981', [98.1, 98.4, 98.2, 98.7, 98.5, 98.3, 98.6]],
    ['全厂 OEE', '78.6', '%', '目标 80.0% · 差 1.4%', 0.786, '#F59E0B', [80.2, 81.0, 79.4, 82.1, 80.6, 79.9, 78.6]],
    ['订单准交率', '96.2', '%', '本月交付 52 / 54 单', 0.962, '#06B6D4', [94, 95, 95.6, 96, 95.8, 96.1, 96.2]],
    ['在制工单', '36', '张', '开工 24 · 下达 9 · 挂起 3', null, '#6366F1', [31, 33, 35, 34, 37, 35, 36]],
    ['物料齐套率', '96.4', '%', '缺料工单 3 张 · 缺料 5 项', 0.964, '#EF4444', [97.8, 97.2, 96.9, 97.5, 96.1, 96.8, 96.4]]];
  const kw = (CW - 5 * 16) / 6;
  K.forEach(([k, v, u, sub, p, c, sp], i) => { const x = X0 + i * (kw + 16), y = 148;
    b.push(R(x, y, kw, 118, '#FFFFFF', 10, ' stroke="#E2E8F0"') + R(x, y + 16, 3, 18, c, 1.5) + T(k, x + 16, y + 25, 13, 500, '#475569'));
    b.push(T(v, x + 16, y + 60, 28, 700, '#0F172A') + T(u, x + 16 + W(v, 28, 700) + 4, y + 66, 13, 400, '#64748B'));
    const mn = Math.min(...sp), mx = Math.max(...sp), px = j => x + kw - 104 + j * 15, py = vv => y + 70 - (vv - mn) / (mx - mn || 1) * 30;
    b.push(`<polyline points="${sp.map((vv, j) => px(j) + ',' + py(vv).toFixed(1)).join(' ')}" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><circle cx="${px(6)}" cy="${py(sp[6]).toFixed(1)}" r="3" fill="${c}"/>`);
    b.push(T(sub, x + 16, y + 94, 12, 400, '#64748B') + (p != null ? bar(x + 16, y + 106, kw - 32, 4, p, c) : R(x + 16, y + 106, kw - 32, 4, '#E2E8F0', 2) + R(x + 16, y + 106, (kw - 32) * 24 / 36, 4, '#6366F1', 2) + R(x + 16 + (kw - 32) * 24 / 36, y + 106, (kw - 32) * 9 / 36, 4, '#93C5FD'))); });
  // 待办
  const C1 = [X0, 282, 700, 420];
  b.push(card(...C1, '', '查看全部'));
  b.push(tabsBar(X0 + 16, 306, ['待我审批 5', '待处理 3', '我发起 7', '抄送我 2'], 0) + R(X0, 330, 700, 1, '#E2E8F0'));
  const td = [['生产订单', '审核中', 'MO-20261113-004 · MLCC 贴片电容 0402 X5R 105K', '500,000 Pcs · 测试编带车间 · 赵磊 提交', '13:42', '审批'],
    ['生产订单', '审核中', 'MO-20261113-003 · 返工生产 TVS 二极管 SMBJ5.0A', '20,000 Pcs · 测试编带车间 · 赵磊 提交', '13:20', '审批'],
    ['采购申请', '审核中', 'PR-20261113-006 · nRF52832 蓝牙 SoC QFN48', '6,000 Pcs · MRP 生成 · 孙丽 提交', '11:05', '审批'],
    ['计划订单', '审核中', 'PLN-20261113-012 · Wi-Fi 模块 WM-6200 投放确认', '6,000 Pcs · 需求日期 11-17 · 系统', '10:40', '审批'],
    ['工程变更', '审核中', 'ECN-20261112-003 · BT-52 C12 增加替代料', '影响在制用料清单 2 张 · 刘工 提交', '昨天 17:26', '审批'],
    ['齐套分析', '创建', 'KIT-20261113-002 · 3 张工单缺料 5 项', '待提交 · 王敏', '09:12', '处理'],
    ['生产订单', '创建', 'MO-20261113-005 · DC-DC 电源模块 PM-1230', '4,000 Pcs · 待提交 · 王敏', '08:46', '处理'],
    ['生产订单', '暂存', 'MO-20261113-006 · Wi-Fi 模块 WM-6200', '6,000 Pcs · 待完善 BOM 版本 · 王敏', '08:30', '处理']];
  td.forEach(([tp, st, t, sub, tm, act], i) => { const y = 331 + i * 46, cy = y + 23; if (i) b.push(R(X0 + 16, y, 668, 1, '#EEF2F7'));
    b.push(pill(tp, X0 + 16, cy, '#1D4ED8', '#EFF6FF', 12, 500, 8, 22).svg + T(t, X0 + 100, cy - 9, 13, 500, '#1E293B') + T(sub, X0 + 100, cy + 11, 12, 400, '#64748B') + tag1(st, X0 + 470, cy));
    b.push(T(tm, X0 + 612, cy, 12, 400, '#94A3B8', 'end') + R(X0 + 630, cy - 13, 54, 26, act === '审批' ? '#2563EB' : '#FFFFFF', 6, act === '审批' ? '' : ' stroke="#CBD5E1"') + T(act, X0 + 657, cy, 12, 500, act === '审批' ? '#FFFFFF' : '#334155', 'middle')); });
  // 工单状态 + 本周达成
  const C2 = [X0, 718, 700, 346];
  b.push(card(...C2, '生产订单状态分布', '共 128 张 · 本月'));
  const ds = [['计划', 22, '#94A3B8'], ['计划确认', 6, '#6366F1'], ['下达', 9, '#3B82F6'], ['开工', 24, '#06B6D4'], ['完工', 64, '#10B981'], ['挂起', 3, '#F59E0B']];
  { let a = -Math.PI / 2; const cx = X0 + 110, cy = 868, Rr = 64; ds.forEach(([k, n, c]) => { const b2 = a + n / 128 * Math.PI * 2 - 0.02; b.push(`<path d="M ${(cx + Rr * Math.cos(a)).toFixed(2)} ${(cy + Rr * Math.sin(a)).toFixed(2)} A ${Rr} ${Rr} 0 ${b2 - a > Math.PI ? 1 : 0} 1 ${(cx + Rr * Math.cos(b2)).toFixed(2)} ${(cy + Rr * Math.sin(b2)).toFixed(2)}" fill="none" stroke="${c}" stroke-width="20"/>`); a = b2 + 0.02; });
    b.push(T('128', cx, cy - 6, 24, 700, '#0F172A', 'middle') + T('生产订单', cx, cy + 18, 12, 400, '#64748B', 'middle'));
    ds.forEach(([k, n, c], i) => { const y = 790 + i * 30; b.push(R(X0 + 206, y - 5, 10, 10, c, 2) + T(k, X0 + 224, y, 13, 400, '#334155') + T(String(n), X0 + 330, y, 13, 700, '#0F172A', 'end')); }); }
  { const x0 = X0 + 372, y0 = 760; b.push(T('本周计划达成（千 pcs）', x0, y0 + 2, 13, 700, '#334155'));
    const days = [['11-09', 132, 136], ['11-10', 138, 140], ['11-11', 136, 129], ['11-12', 140, 133], ['11-13', 140, 128.5]];
    const base = y0 + 220, sc = 1.25;
    [0, 50, 100, 150].forEach(v => b.push(R(x0 + 24, base - v * sc, 286, 1, '#EEF2F7') + T(String(v), x0, base - v * sc, 10, 400, '#94A3B8')));
    days.forEach(([d, pl, ac], i) => { const x = x0 + 36 + i * 56; b.push(R(x, base - pl * sc, 18, pl * sc, '#DBEAFE', 3) + R(x + 20, base - ac * sc, 18, ac * sc, ac >= pl ? '#10B981' : '#3B82F6', 3) + T(d, x + 19, base + 14, 11, 400, '#64748B', 'middle')); });
    b.push(R(x0 + 24, y0 + 254, 10, 10, '#DBEAFE', 2) + T('计划', x0 + 40, y0 + 259, 12, 400, '#64748B') + R(x0 + 84, y0 + 254, 10, 10, '#3B82F6', 2) + T('实际', x0 + 100, y0 + 259, 12, 400, '#64748B') + T('11-13 截至 14:58', x0 + 310, y0 + 259, 12, 400, '#94A3B8', 'end')); }
  // 常用功能
  const MX = X0 + 716, MW = 480;
  b.push(card(MX, 282, MW, 300, '常用功能', '编辑'));
  const fn = [['生产订单', 'cube', '#2563EB'], ['用料清单', 'doc', '#6366F1'], ['齐套分析', 'grid', '#EF4444'], ['MRP 运算', 'chart', '#0EA5E9'], ['计划订单', 'cal', '#8B5CF6'], ['日排产', 'cols', '#F59E0B'], ['生产领料', 'truck', '#06B6D4'], ['生产汇报', 'send', '#10B981'], ['即时库存', 'grid', '#14B8A6'], ['物料', 'cube', '#64748B'], ['物料清单 BOM', 'doc', '#3B82F6'], ['三维车间', 'home', '#2563EB']];
  fn.forEach(([n, k, c], i) => { const x = MX + 16 + (i % 4) * 114, y = 326 + Math.floor(i / 4) * 82; b.push(R(x, y, 106, 72, '#F8FAFC', 8, ' stroke="#EEF2F7"') + R(x + 37, y + 10, 32, 32, c, 8, ' fill-opacity="0.12"') + ic(k, x + 45, y + 18, c) + T(n, x + 53, y + 56, 12, 500, '#334155', 'middle')); });
  // 消息
  b.push(card(MX, 598, MW, 466, '消息', '5 条未读', '#2563EB'));
  const ms = [['审批', '赵磊 提交 MO-20261113-004 待你审批', '13:42', 1], ['预警', 'SMT-1 F-12 MLCC 0402 104K 将断料，AGV-03 配送中', '14:46', 1], ['安灯', 'SMT-2 贴片机 02 一级设备安灯，李工已到场', '14:21', 1], ['系统', 'MRP 运算 MRP-20261113-01 完成，生成计划订单 14 张', '12:30', 1], ['审批', '陈立 已同意 MO-20261112-002，单据已审核', '昨天 07:38', 0], ['预警', '卷盘 R26101822-01164 MSL 剩余 6.0 h，需烘烤', '11:20', 1], ['质量', '首检 FAI-20261113-004 合格，SMT-2 白班可汇报', '08:22', 0], ['系统', 'ECN-20261112-003 已生效，在制用料清单已同步 2 张', '昨天 18:05', 0]];
  const mc = { 审批: '#2563EB', 预警: '#D97706', 安灯: '#DC2626', 系统: '#64748B', 质量: '#10B981' };
  ms.forEach(([tp, t, tm, un], i) => { const y = 640 + i * 52, cy = y + 12; if (i) b.push(R(MX + 16, y - 6, MW - 32, 1, '#EEF2F7'));
    b.push((un ? `<circle cx="${MX + 20}" cy="${cy}" r="3.5" fill="#EF4444"/>` : '') + pill(tp, MX + 30, cy, mc[tp], '#FFFFFF', 11, 700, 6, 20, 'start', ` stroke="${mc[tp]}" stroke-opacity="0.35"`).svg + T(tm, MX + MW - 16, cy, 12, 400, '#94A3B8', 'end'));
    b.push(T(t, MX + 30, cy + 22, 12, 400, un ? '#1E293B' : '#64748B')); });
  // 预警
  const PX = MX + MW + 16, PW = 1904 - PX;
  b.push(card(PX, 282, PW, 782, '异常与预警', '实时'));
  let y = 348;
  const sec = (t, n, c) => { b.push(R(PX + 16, y - 10, 4, 20, c, 2) + T(t, PX + 28, y, 14, 700, '#0F172A') + pill(String(n), PX + 28 + W(t, 14, 700) + 8, y, c, '#FFFFFF', 11, 700, 7, 20, 'start', ` stroke="${c}" stroke-opacity="0.4"`).svg); y += 24; };
  const rowW = (a, bb, c2, col) => { b.push(R(PX + 16, y, PW - 32, 52, '#F8FAFC', 8, ' stroke="#EEF2F7"') + T(a, PX + 28, y + 17, 13, 700, '#1E293B') + T(bb, PX + 28, y + 37, 12, 400, '#64748B') + T(c2, PX + PW - 28, y + 17, 13, 700, col, 'end')); y += 60; };
  sec('缺料预警', 5, '#DC2626');
  rowW('SMT-1 F-12 · MLCC 0402 104K', 'AGV-03 配送中 · MO-20261112-001', '9 min', '#DC2626');
  rowW('SMT-2 F-07 · nRF52832 QFN48', '已叫料 · MO-20261112-002', '22 min', '#DC2626');
  rowW('SMT-1 F-03 · 0603 10kΩ 电阻', 'AGV-01 配送中 · MO-20261112-005', '34 min', '#D97706');
  y += 8; sec('MSL 超时预警', 2, '#D97706');
  rowW('R26101822-01164 · nRF52840-QIAA', 'MSL 3 级 · 已暴露 162.0 h · 需烘烤', '6.0 h', '#DC2626');
  rowW('R26110907-00221 · STM32G030 QFN', 'MSL 3 级 · 已暴露 151.5 h', '16.5 h', '#D97706');
  y += 8; sec('交期风险', 2, '#6366F1');
  rowW('MO-20261112-004 · TVS SMBJ5.0A', '入库 52,000 / 150,000 · 计划完工 11-13', '-1 天', '#DC2626');
  rowW('MO-20261112-005 · 电机驱动模块', '缺 0603 电阻 · 计划完工 11-13', '风险', '#D97706');
  y += 8; sec('未关闭安灯', 2, '#DC2626');
  rowW('一级 · SMT-2 贴片机 02', '吸嘴真空异常 · 李工 处理中', '37 min', '#DC2626');
  rowW('二级 · SMT-1 F-12 将断料', '物料安灯 · 待处理', '12 min', '#D97706');
  return SVG(1920, 1080, b.join(''));
}

// ======================= UI05 下推 / 选单弹窗 =======================
const modal = (x, y, w, h, title, sub) => R(x, y, w, h, '#FFFFFF', 14, ' filter="url(#shP)"') + T(title, x + 28, y + 32, 19, 700, '#0F172A') + (sub ? T(sub, x + 28 + W(title, 19, 700) + 14, y + 33, 13, 400, '#64748B') : '') + g(x + w - 52, y + 16, `<rect width="32" height="32" rx="8" fill="#F1F5F9"/><path d="M11 11 L21 21 M21 11 L11 21" stroke="#475569" stroke-width="2" stroke-linecap="round"/>`) + R(x, y + 64, w, 1, '#E2E8F0');
function ui05() {
  const b = [dim(ui03(), 0.42)];
  const MX = 220, MY = 150, MW = 1480, MH = 780;
  b.push(modal(MX, MY, MW, MH, '下推', '源单：生产订单 · 已选 3 张，4 条分录'));
  // 左：目标单据
  const LX = MX + 24, LY = MY + 88, LW = 268;
  b.push(T('选择目标单据', LX, LY, 14, 700, '#0F172A'));
  const tg = [['生产用料清单', '保存生产订单时自动生成', -1], ['生产领料单', '按用料清单应发数量', 0], ['生产补料单', '超损耗补料需审批', 0], ['生产汇报单', '订单分录为开工或完工', 1], ['生产入库单', '不超过入库上限', 0], ['检验单（首检）', '首检标识的工序', 0], ['委外订单', '仅委外类单据类型', -1]];
  tg.forEach(([n, d, st], i) => { const y = LY + 22 + i * 64, on = st === 1, off = st === -1;
    b.push(R(LX, y, LW, 56, on ? '#EFF6FF' : '#FFFFFF', 8, on ? ' stroke="#2563EB" stroke-width="1.5"' : ' stroke="#E2E8F0"') + radio(LX + 14, y + 20, on));
    b.push(T(n, LX + 40, y + 20, 14, on ? 700 : 500, off ? '#A3B1C2' : on ? '#1D4ED8' : '#1E293B') + T(d, LX + 40, y + 40, 12, 400, off ? '#CBD5E1' : '#64748B') + (off ? T('不可下推', LX + LW - 12, y + 20, 11, 500, '#A3B1C2', 'end') : '')); });
  // 右：规则与分录
  const RX = LX + LW + 24, RW = MX + MW - 24 - RX;
  b.push(R(RX - 12, MY + 76, 1, MH - 76 - 80, '#EEF2F7'));
  b.push(field(RX, LY - 10, '转换规则', '生产订单 → 生产汇报单（标准）', { lw: 72, iw: 300, sel: 1 }) + field(RX + 400, LY - 10, '单据类型', '汇报入库-普通生产', { lw: 72, iw: 200, sel: 1 }) + field(RX + 700, LY - 10, '汇报日期', '2026-11-13', { lw: 72, iw: 150 }));
  b.push(chk(RX, LY + 38, 1) + T('按生产车间合单', RX + 24, LY + 46, 13, 400, '#334155') + chk(RX + 150, LY + 38, 1) + T('下推后打开目标单据', RX + 174, LY + 46, 13, 400, '#334155') + chk(RX + 330, LY + 38, 0) + T('携带备注', RX + 354, LY + 46, 13, 400, '#334155'));
  b.push(T('仅显示可下推分录', RX + RW - 46, LY + 46, 13, 400, '#334155', 'end') + sw(RX + RW - 36, LY + 46, 0));
  const cols = [['', 40], ['源单编号', 150], ['分录', 48], ['物料编码', 96], ['物料名称', 132], ['业务状态', 84], ['首检状态', 96], ['入库上限', 84, 'r'], ['已汇报', 78, 'r'], ['可下推', 84, 'r'], ['本次下推', 108, 'r']];
  const used = cols.reduce((a, c) => a + c[1], 0); cols.push(['校验结果', RW - used]);
  const inp = v => (x, cy, w) => R(x + 8, cy - 14, w - 16, 28, '#FFFFFF', 6, ' stroke="#93C5FD"') + T(v, x + w - 18, cy, 13, 700, '#1D4ED8', 'end');
  const ok = t => (x, cy) => ic('check', x + 10, cy - 8, '#16A34A') + T(t, x + 32, cy, 13, 500, '#15803D');
  const bad = t => (x, cy) => ic('stop', x + 10, cy - 8, '#DC2626') + T(t, x + 32, cy, 12, 500, '#DC2626');
  const cb = on => (x, cy) => chk(x + 12, cy - 8, on);
  const gr = t => ({ t, c: '#A3B1C2' });
  const rows = [[cb(1), { t: 'MO-20261112-005', c: '#2563EB' }, '1', '3.01.0072', '电机驱动模块', tagF2('开工'), stF2('首检完成', '#15803D'), '3,535', '1,260', { t: '2,275', b: 1, c: '#0F172A' }, inp('2,275'), ok('通过')],
    [cb(1), { t: 'MO-20261112-002', c: '#2563EB' }, '1', '3.01.0052', 'BLE5.0 蓝牙模块', tagF2('开工'), stF2('首检完成', '#15803D'), '6,060', '5,120', { t: '940', b: 1, c: '#0F172A' }, inp('940'), ok('通过')],
    [(x, cy) => R(x + 12, cy - 8, 16, 16, '#F1F5F9', 4, ' stroke="#E2E8F0"'), gr('MO-20261112-002'), gr('2'), gr('3.01.0052'), gr('BLE5.0 蓝牙模块'), tagF2('下达'), gr('—'), gr('2,020'), gr('0'), gr('0'), gr('—'), bad('未开工，不可汇报')],
    [cb(1), { t: 'MO-20261112-001', c: '#2563EB' }, '1', '3.01.0031', 'DC-DC 电源模块', tagF2('开工'), stF2('首检完成', '#15803D'), '5,050', '3,820', { t: '1,230', b: 1, c: '#0F172A' }, inp('1,230'), ok('通过')]];
  const t1 = tableX(RX, LY + 70, RW, cols, rows, { id: 'pt5', rh: 46, total: (cx, cy) => T('合计（已选 3 条）', cx[1] + 10, cy, 13, 700, '#0F172A') + T('4,445', cx[9] + 84 - 12, cy, 13, 700, '#0F172A', 'end') + T('4,445', cx[10] + 108 - 18, cy, 13, 700, '#1D4ED8', 'end') });
  b.push(t1.svg);
  // 规则说明 + 生成预览
  const IY = LY + 70 + t1.h + 20;
  b.push(R(RX, IY, (RW - 16) / 2, 196, '#F8FAFC', 10, ' stroke="#E2E8F0"'));
  b.push(T('下推规则', RX + 16, IY + 24, 14, 700, '#0F172A'));
  ['可下推数量 = 入库上限 − 汇报选单数量 + 返修数量', '订单分录业务状态须为开工或完工，且未挂起', '严格首检控制：首检完成或首检状态为空才允许汇报', '保存目标单时反写源单“汇报选单数量”', '目标单审核后反写合格 / 不合格 / 返修数量'].forEach((t, i) => b.push(`<circle cx="${RX + 20}" cy="${IY + 54 + i * 28}" r="2.5" fill="#64748B"/>` + T(t, RX + 30, IY + 54 + i * 28, 13, 400, '#475569')));
  const PX2 = RX + (RW - 16) / 2 + 16, PW2 = (RW - 16) / 2;
  b.push(R(PX2, IY, PW2, 196, '#FFFFFF', 10, ' stroke="#E2E8F0"') + T('将生成 2 张生产汇报单', PX2 + 16, IY + 24, 14, 700, '#0F172A') + T('按生产车间合单', PX2 + PW2 - 16, IY + 24, 12, 400, '#64748B', 'end'));
  [['SMT一车间', '2 条分录', 'MO-20261112-005 × 2,275 · MO-20261112-001 × 1,230', '3,505'], ['SMT二车间', '1 条分录', 'MO-20261112-002 分录 1 × 940', '940']].forEach(([ws, n, d, q], i) => { const y = IY + 44 + i * 72;
    b.push(R(PX2 + 16, y, PW2 - 32, 62, '#F8FAFC', 8, ' stroke="#EEF2F7"') + ic('doc', PX2 + 28, y + 12, '#2563EB') + T('生产汇报单 · ' + ws, PX2 + 50, y + 20, 13, 700, '#1E293B') + T(n, PX2 + 50 + W('生产汇报单 · ' + ws, 13, 700) + 10, y + 20, 12, 400, '#64748B') + T(q + ' Pcs', PX2 + PW2 - 30, y + 20, 14, 700, '#1D4ED8', 'end') + T(d, PX2 + 50, y + 44, 12, 400, '#64748B')); });
  // 底部
  const FY = MY + MH - 64;
  b.push(R(MX, FY, MW, 1, '#E2E8F0') + T('已选 3 条分录 · 本次下推 4,445 Pcs · 1 条分录不满足下推条件', MX + 28, FY + 32, 13, 400, '#64748B'));
  b.push(btn(MX + MW - 28 - 120 - 12 - 80, FY + 14, '取消', 0, null, 36).svg + btn(MX + MW - 28 - 120, FY + 14, '确定下推', 1, 'push', 36).svg);
  return SVG(1920, 1080, b.join(''));
}
const tagF2 = s => (x, cy) => tag2(s, x + 10, cy);
const stF2 = (s, c) => (x, cy) => `<circle cx="${x + 14}" cy="${cy}" r="3" fill="${c}"/>` + T(s, x + 22, cy, 13, 500, c);

// ======================= UI06 上查下查关系图 =======================
function ui06() {
  const b = [dim(ui04(), 0.42)];
  const MX = 60, MY = 84, MW = 1800, MH = 924;
  b.push(modal(MX, MY, MW, MH, '上查 / 下查', '当前单据：生产订单 MO-20261112-002'));
  // 工具条
  const TY = MY + 80;
  { let x = MX + 24; const seg = ['全部链路', '上查', '下查']; b.push(R(x, TY, 276, 34, '#F1F5F9', 8, ' stroke="#E2E8F0"')); seg.forEach((t, i) => { const w = i ? 86 : 96; if (!i) b.push(R(x + 3, TY + 3, w, 28, '#2563EB', 6)); b.push(T(t, x + 3 + w / 2, TY + 17, 13, i ? 500 : 700, i ? '#475569' : '#FFFFFF', 'middle')); x += w + 2; }); }
  b.push(T('显示数量', MX + 330, TY + 17, 13, 400, '#334155') + sw(MX + 392, TY + 17, 1) + T('显示已作废', MX + 452, TY + 17, 13, 400, '#334155') + sw(MX + 528, TY + 17, 0));
  b.push(toolbar(MX + 1464 - 330, TY, [['展开全部', 0], ['导出图片', 0], ['打开单据', 1]]));
  // 画布
  const CX = MX + 24, CY = TY + 50, CWc = 1440, CH = MH - (CY - MY) - 24;
  b.push(R(CX, CY, CWc, CH, '#F8FAFC', 10, ' stroke="#E2E8F0"'));
  let dots = ''; for (let x = CX + 20; x < CX + CWc; x += 24) for (let y = CY + 20; y < CY + CH; y += 24) dots += `<circle cx="${x}" cy="${y}" r="1" fill="#DCE5EF"/>`; b.push(dots);
  const NW = 192, NH = 92, col = i => CX + 24 + i * ((CWc - 48 - NW) / 5);
  const N = {
    so: [0, 330, '销售订单', 'SO-20261105-021', '已审核', '华东智联电子 · 8,000 Pcs', '交期 2026-11-14'],
    pln: [1, 330, '计划订单', 'PLN-20261111-033', '投放关闭', 'MRP 运算 · 8,000 Pcs', '投放 2026-11-12 07:02'],
    mo: [2, 330, '生产订单', 'MO-20261112-002', '已审核', '开工 · 2 条分录 · 8,000 Pcs', '计划完工 11-13 20:00'],
    pp: [3, 150, '生产用料清单', 'PPBOM-20261112-002', '已审核', '14 个子项 · 齐套 100%', '下达时自动审核'],
    op: [3, 500, '工序计划', 'OP-20261112-002', '开工', '7 道工序 · 当前 30 贴片', '派工 SMT-2 线'],
    k1: [4, 40, '生产领料单', 'PICK-20261112-011', '已审核', '4,000 套 · 14 行', '11-12 08:10'],
    k2: [4, 150, '生产领料单', 'PICK-20261112-014', '已审核', '2,000 套 · 14 行', '11-12 19:40'],
    r1: [4, 270, '生产汇报单', 'RPT-20261112-021', '已审核', '汇报 2,400 · 合格 2,392', '白班 11-12'],
    r2: [4, 380, '生产汇报单', 'RPT-20261112-022', '已审核', '汇报 2,400 · 合格 2,391', '夜班 11-12'],
    r3: [4, 490, '生产汇报单', 'RPT-20261113-003', '创建', '汇报 320 · 合格 316', '白班 11-13'],
    fai: [4, 620, '检验单（首检）', 'FAI-20261112-007', '已审核', '首检合格 · IPQC 孙悦', '11-12 08:35'],
    s1: [5, 270, '生产入库单', 'STK-20261112-031', '已审核', '入库 2,400（不合格 8）', '成品仓 A 区'],
    s2: [5, 380, '生产入库单', 'STK-20261113-004', '已审核', '入库 2,400（不合格 9）', '成品仓 A 区'] };
  const pos = k => { const n = N[k]; return [col(n[0]), CY + n[1]]; };
  const E2 = [['so', 'pln', '需求 8,000'], ['pln', 'mo', '投放 8,000'], ['mo', 'pp', '生成'], ['mo', 'op', '生成'], ['pp', 'k1', '4,000'], ['pp', 'k2', '2,000'], ['op', 'r1', '2,400'], ['op', 'r2', '2,400'], ['op', 'r3', '320'], ['op', 'fai', '首检'], ['r1', 's1', '2,400'], ['r2', 's2', '2,400']];
  E2.forEach(([a, z, lab]) => { const [ax, ay] = pos(a), [zx, zy] = pos(z); const x1 = ax + NW, y1 = ay + NH / 2, x2 = zx, y2 = zy + NH / 2, mx = x1 + 14;
    const hot = (a === 'pln' && z === 'mo') || (a === 'so' && z === 'pln');
    b.push(arrow(Math.abs(y1 - y2) < 1 ? [[x1, y1], [x2, y2]] : [[x1, y1], [mx, y1], [mx, y2], [x2, y2]], hot ? '#2563EB' : '#94A3B8', 1.6));
    const lx = Math.abs(y1 - y2) < 1 ? (x1 + x2) / 2 : mx + (x2 - mx) / 2 + 1, ly = y2 - 10; const lw = W(lab, 11, 500) + 10; b.push(R(lx - lw / 2, ly - 9, lw, 18, '#FFFFFF', 4, ' stroke="#E2E8F0"') + T(lab, lx, ly, 11, 500, '#475569', 'middle')); });
  Object.entries(N).forEach(([k, n]) => { const [x, y] = pos(k), cur = k === 'mo'; const up = ['so', 'pln'].includes(k);
    const stc = n[4] === '已审核' ? ST1['已审核'] : n[4] === '创建' ? ST1['创建'] : n[4] === '开工' ? ['#0E7490', '#CFFAFE', '#A5F3FC'] : ['#475569', '#F1F5F9', '#CBD5E1'];
    b.push(R(x, y, NW, NH, cur ? '#2563EB' : '#FFFFFF', 10, cur ? ' filter="url(#sh)"' : ` stroke="${up ? '#C7D2FE' : '#D6E2EF'}" filter="url(#sh)"`) + R(x, y + 10, 3, 24, cur ? '#FFFFFF' : up ? '#6366F1' : '#06B6D4', 1.5));
    b.push(T(n[2], x + 14, y + 22, 12, 500, cur ? '#BFDBFE' : '#64748B') + pill(n[4], x + NW - 10, y + 22, cur ? '#1D4ED8' : stc[0], cur ? '#FFFFFF' : stc[1], 11, 500, 6, 18, 'end').svg);
    b.push(T(n[3], x + 14, y + 46, 14, 700, cur ? '#FFFFFF' : '#1D4ED8') + T(n[5], x + 14, y + 67, 12, 400, cur ? '#E0E7FF' : '#334155') + T(n[6], x + 14, y + 84, 11, 400, cur ? '#BFDBFE' : '#94A3B8')); });
  [['上游', 0, 1, '#6366F1'], ['当前', 2, 2, '#2563EB'], ['下游', 3, 5, '#06B6D4']].forEach(([t, a, z, c]) => { const x1 = col(a), x2 = col(z) + NW; b.push(R(x1, CY + 12, x2 - x1, 3, c, 1.5, ' fill-opacity="0.5"') + T(t, x1, CY + 28, 12, 700, c)); });
  // 图例
  b.push(R(CX + 16, CY + CH - 46, 520, 32, '#FFFFFF', 8, ' stroke="#E2E8F0"'));
  { let x = CX + 30; [['#2563EB', '当前单据'], ['#6366F1', '上游单据'], ['#06B6D4', '下游单据']].forEach(([c, t]) => { b.push(R(x, CY + CH - 36, 12, 12, c, 3) + T(t, x + 18, CY + CH - 30, 12, 400, '#475569')); x += 18 + W(t, 12) + 22; }); b.push(arrow([[x, CY + CH - 30], [x + 30, CY + CH - 30]], '#94A3B8') + T('数量为下推 / 反写数量', x + 38, CY + CH - 30, 12, 400, '#475569')); }
  b.push(R(CX + CWc - 116, CY + CH - 46, 100, 32, '#FFFFFF', 8, ' stroke="#E2E8F0"') + T('−', CX + CWc - 96, CY + CH - 30, 16, 500, '#475569', 'middle') + T('100%', CX + CWc - 66, CY + CH - 30, 12, 500, '#334155', 'middle') + T('+', CX + CWc - 36, CY + CH - 30, 16, 500, '#475569', 'middle'));
  // 右侧明细
  const DX = CX + CWc + 16, DW = MX + MW - 24 - DX;
  b.push(R(DX, CY, DW, CH, '#FFFFFF', 10, ' stroke="#E2E8F0"'));
  b.push(T('单据摘要', DX + 16, CY + 26, 15, 700, '#0F172A') + T('MO-20261112-002', DX + 16, CY + 56, 16, 700, '#1D4ED8') + tag1('已审核', DX + 16 + W('MO-20261112-002', 16, 700) + 10, CY + 56));
  const kv = [['产品', 'BLE5.0 蓝牙模块 BT-52'], ['数量', '8,000 Pcs（2 条分录）'], ['来源', 'SO-20261105-021'], ['生产车间', 'SMT二车间'], ['计划完工', '2026-11-13 20:00']];
  kv.forEach(([k, v], i) => b.push(T(k, DX + 16, CY + 90 + i * 28, 13, 400, '#64748B') + T(v, DX + 96, CY + 90 + i * 28, 13, 500, '#1E293B')));
  let y = CY + 238; b.push(R(DX + 16, y, DW - 32, 1, '#EEF2F7')); y += 24;
  b.push(T('反写汇总（分录 1）', DX + 16, y, 14, 700, '#0F172A')); y += 28;
  [['领料套数', '6,000 / 6,000', 1, '#10B981'], ['汇报选单数量', '5,120 / 6,060', 5120 / 6060, '#3B82F6'], ['合格数量（已审核）', '4,783', 4783 / 6060, '#10B981'], ['入库数量', '4,800 / 6,060', 4800 / 6060, '#06B6D4']].forEach(([k, v, p, c]) => { b.push(T(k, DX + 16, y, 13, 400, '#475569') + T(v, DX + DW - 16, y, 13, 700, '#0F172A', 'end') + bar(DX + 16, y + 14, DW - 32, 6, p, c)); y += 46; });
  y += 4; b.push(R(DX + 16, y, DW - 32, 1, '#EEF2F7')); y += 24;
  b.push(T('关联单据统计', DX + 16, y, 14, 700, '#0F172A')); y += 28;
  [['上游', '2 张', '销售订单 1 · 计划订单 1'], ['下游', '10 张', '领料 2 · 汇报 3 · 入库 2 · 其他 3'], ['未审核', '1 张', 'RPT-20261113-003']].forEach(([k, v, d]) => { b.push(T(k, DX + 16, y, 13, 500, '#334155') + T(v, DX + DW - 16, y, 13, 700, k === '未审核' ? '#C2410C' : '#0F172A', 'end') + T(d, DX + 16, y + 20, 12, 400, '#94A3B8')); y += 50; });
  b.push(R(DX + 16, CY + CH - 106, DW - 32, 90, '#FFFBEB', 8, ' stroke="#FDE68A"') + T('反审核保护', DX + 30, CY + CH - 82, 13, 700, '#B45309') + T('存在已审核的下游单据（领料 2、汇报 2、', DX + 30, CY + CH - 58, 12, 400, '#92400E') + T('入库 2），当前生产订单不能反审核。', DX + 30, CY + CH - 38, 12, 400, '#92400E'));
  return SVG(1920, 1080, b.join(''));
}

// ======================= UI07 基础资料列表 + 编辑（供应商） =======================
const secT = (x, y, t, c = '#2563EB') => R(x, y - 8, 3, 16, c, 1.5) + T(t, x + 12, y, 14, 700, '#0F172A');
function ui07() {
  const b = frame([['工作台', 0], ['生产订单列表', 0], ['供应商', 1]], '供应商');
  b.push(titleRow('供应商', '共 86 条'));
  b.push(toolbar(X0, 144, [['新增', 1, 'plus'], ['修改', 0], ['删除', 'd'], '|', ['提交', 0, 'send'], ['审核', 0, 'check'], ['反审核', 'd'], '|', ['禁用', 0, 'stop'], ['反禁用', 'd'], '|', ['分配', 0], ['引入', 0], ['引出', 0]]));
  // 分组树
  const GX = X0, GW = 248;
  b.push(card(GX, 188, GW, 876, '供应商分组', '管理', '#2563EB'));
  b.push(R(GX + 12, 224, GW - 24, 32, '#F8FAFC', 6, ' stroke="#E2E8F0"') + ic('search', GX + 22, 232, '#94A3B8') + T('搜索分组', GX + 46, 240, 13, 400, '#94A3B8'));
  b.push(tree(GX + 8, 266, [[0, '全部供应商', 1, 86, 1], [1, 'IC 原厂 / 代理', 1, 18], [2, '原厂', -1, 5], [2, '授权代理', -1, 13], [1, '被动元件', 1, 24], [2, '电容', -1, 9], [2, '电阻', -1, 7], [2, '电感 / 磁珠', -1, 5], [2, '晶振', -1, 3], [1, 'PCB / FPC', 0, 9], [1, '结构件', 0, 11], [1, '包材辅料', 0, 16], [1, '外协加工', 0, 8]], { w: GW - 16, rh: 34 }));
  b.push(R(GX + 12, 724, GW - 24, 1, '#EEF2F7') + T('数据状态', GX + 16, 748, 13, 700, '#334155'));
  [['已审核', 81], ['创建', 4], ['审核中', 1], ['已禁用', 2]].forEach(([t, n], i) => b.push(chk(GX + 16, 768 + i * 32, i < 3 ? 1 : 0) + T(t, GX + 40, 776 + i * 32, 13, 400, '#334155') + T(String(n), GX + GW - 16, 776 + i * 32, 12, 400, '#94A3B8', 'end')));
  b.push(T('使用组织', GX + 16, 914, 13, 700, '#334155') + R(GX + 12, 930, GW - 24, 32, '#FFFFFF', 6, ' stroke="#CBD5E1"') + T('芯程电子一号工厂', GX + 24, 946, 13, 400, '#1E293B') + ic('chev', GX + GW - 36, 938, '#94A3B8'));
  // 列表
  const LX = GX + GW + 16, LW = 1904 - LX;
  b.push(R(LX, 188, LW, 56, '#FFFFFF', 10, ' stroke="#E2E8F0"'));
  b.push(R(LX + 16, 200, 300, 32, '#FFFFFF', 6, ' stroke="#CBD5E1"') + ic('search', LX + 26, 208, '#94A3B8') + T('编码 / 名称 / 简称 / 联系人', LX + 50, 216, 13, 400, '#94A3B8'));
  { let x = LX + 332; [['全部', 1], ['已审核', 0], ['创建', 0], ['未承认', 0], ['禁用', 0]].forEach(([t, on]) => { const o = pill(t, x, 216, on ? '#1D4ED8' : '#475569', on ? '#E6F0FF' : '#F1F5F9', 13, on ? 700 : 500, 12, 28); b.push(o.svg); x += o.w + 8; }); }
  const cols = [['', 40], ['编码', 100], ['名称', 236], ['简称', 96], ['分组', 120], ['供应类别', 88], ['承认状态', 92], ['数据状态', 92], ['禁用状态', 84], ['联系人', 80], ['电话', 140], ['创建日期', 110]];
  const ap = (t) => (x, cy) => { const c = t === '已承认' ? ['#15803D', '#ECFDF5'] : t === '承认中' ? ['#B45309', '#FFFBEB'] : ['#64748B', '#F1F5F9']; return pill(t, x + 10, cy, c[0], c[1], 12, 500, 8, 22).svg; };
  const st = t => (x, cy) => tag1(t, x + 10, cy);
  const dsb = t => (x, cy) => `<circle cx="${x + 14}" cy="${cy}" r="3" fill="${t === '正常' ? '#16A34A' : '#DC2626'}"/>` + T(t, x + 22, cy, 13, 400, t === '正常' ? '#334155' : '#DC2626');
  const R7 = [['SUP-0003', '世平国际（深圳）有限公司', '世平', '授权代理', '采购', '已承认', '已审核', '正常', '何俊', '0755-8352 6610', '2023-03-14'],
    ['SUP-0007', '文晔领科（上海）有限公司', '文晔', '授权代理', '采购', '已承认', '已审核', '正常', '陆婷', '021-6485 2290', '2023-03-14'],
    ['SUP-0012', '深圳市芯联科技有限公司', '芯联科技', '授权代理', '采购', '已承认', '已审核', '正常', '周凯', '0755-8632 1208', '2023-05-22'],
    ['SUP-0015', '富昌电子（深圳）有限公司', '富昌', '授权代理', '采购', '已承认', '已审核', '正常', '林晓', '0755-2398 7741', '2023-06-01'],
    ['SUP-0021', '广东风华高新科技股份有限公司', '风华高科', '电容', '采购', '已承认', '已审核', '正常', '钟敏', '0758-2865 103', '2023-02-09'],
    ['SUP-0022', '村田（中国）投资有限公司', '村田', '电容', '采购', '已承认', '已审核', '正常', '高桥', '021-5258 8899', '2023-02-09'],
    ['SUP-0026', '国巨电子（中国）有限公司', '国巨', '电阻', '采购', '已承认', '已审核', '正常', '黄伟', '0512-6252 1830', '2023-02-10'],
    ['SUP-0031', '深圳市顺络电子股份有限公司', '顺络', '电感 / 磁珠', '采购', '已承认', '已审核', '正常', '吴斌', '0755-2902 9188', '2023-04-18'],
    ['SUP-0034', '泰晶科技股份有限公司', '泰晶', '晶振', '采购', '已承认', '已审核', '正常', '刘洋', '0722-3308 962', '2023-04-20'],
    ['SUP-0041', '深圳市景旺电子股份有限公司', '景旺', 'PCB / FPC', '采购', '已承认', '已审核', '正常', '邓华', '0755-8328 5512', '2023-03-02'],
    ['SUP-0043', '胜宏科技（惠州）股份有限公司', '胜宏', 'PCB / FPC', '采购', '已承认', '已审核', '正常', '曾强', '0752-3761 288', '2024-01-11'],
    ['SUP-0052', '东莞市铭丰五金制品有限公司', '铭丰五金', '结构件', '采购', '已承认', '已审核', '正常', '杨帆', '0769-8521 3306', '2024-02-27'],
    ['SUP-0058', '深圳市唯特偶新材料股份有限公司', '唯特偶', '包材辅料', '采购', '已承认', '已审核', '正常', '谢磊', '0755-2715 6618', '2023-07-05'],
    ['SUP-0061', '苏州达翔新材料有限公司', '达翔', '包材辅料', '采购', '已承认', '已审核', '正常', '朱琳', '0512-6587 4420', '2024-05-16'],
    ['SUP-0071', '深圳市明阳电路科技有限公司', '明阳电路', '外协加工', '委外', '已承认', '已审核', '正常', '马超', '0755-2961 0035', '2024-08-08'],
    ['SUP-0074', '东莞市恒创精密电子有限公司', '恒创精密', '外协加工', '委外', '已承认', '已审核', '禁用', '彭涛', '0769-2265 7812', '2024-09-03'],
    ['SUP-0086', '昆山兴展包装材料有限公司', '兴展包装', '包材辅料', '采购', '承认中', '审核中', '正常', '钱进', '0512-5763 2209', '2026-11-06'],
    ['SUP-0088', '无锡华泰半导体有限公司', '华泰半导体', '原厂', '采购', '未承认', '创建', '正常', '孔亮', '0510-8816 7350', '2026-11-11']];
  const rows = R7.map((r, i) => [(x, cy) => chk(x + 12, cy - 8, i === 2), { t: r[0], c: '#2563EB' }, r[1], r[2], r[3], r[4], ap(r[5]), st(r[6]), dsb(r[7]), r[8], r[9], r[10]]);
  const tb = tableX(LX, 256, LW, cols, rows, { id: 'pt7', rh: 40, sel: 2 }); b.push(tb.svg);
  b.push(T('共 86 条 · 已选 1 条', LX, 1040, 13, 400, '#64748B'));
  // 抽屉
  const DX = 1248, DW = 1920 - DX;
  b.push(R(0, 0, DX, 1080, '#0F172A', 0, ' fill-opacity="0.14"'));
  b.push(R(DX, 96, DW, 984, '#FFFFFF', 0, ' filter="url(#shP)"'));
  b.push(T('修改供应商', DX + 28, 128, 18, 700, '#0F172A') + T('SUP-0012', DX + 28 + W('修改供应商', 18, 700) + 12, 129, 14, 500, '#475569') + tag1('已审核', DX + 28 + W('修改供应商', 18, 700) + 12 + W('SUP-0012', 14, 500) + 10, 128));
  b.push(g(DX + DW - 52, 112, `<rect width="32" height="32" rx="8" fill="#F1F5F9"/><path d="M11 11 L21 21 M21 11 L11 21" stroke="#475569" stroke-width="2" stroke-linecap="round"/>`));
  b.push(tabsBar(DX + 28, 172, ['基本信息', '联系人', '银行信息', '资质与承认', '使用组织'], 0) + R(DX, 194, DW, 1, '#E2E8F0'));
  const FX = DX + 28, c2 = FX + 312, o1 = { lw: 88, iw: 212 };
  let y = 226; b.push(secT(FX, y, '基本信息')); y += 22;
  [[['编码', 'SUP-0012', { lock: 1 }], ['供应商分组', '授权代理', { sel: 1, req: 1 }]], [['名称', '深圳市芯联科技有限公司', { req: 1 }], ['简称', '芯联科技', {}]], [['供应类别', '采购', { sel: 1, req: 1 }], ['信用代码', '91440300MA5F2KQ81X', {}]], [['创建组织', '芯程电子一号工厂', { lock: 1 }], ['默认采购员', '孙丽', { find: 1 }]]].forEach(([a, z]) => { b.push(field(FX, y, a[0], a[1], { ...o1, ...a[2] }) + field(c2, y, z[0], z[1], { ...o1, ...z[2] })); y += 44; });
  y += 14; b.push(secT(FX, y, '财务信息')); y += 22;
  [[['结算币别', '人民币', { sel: 1, req: 1 }], ['税率', '13% 增值税', { sel: 1 }]], [['付款条件', '月结 60 天', { sel: 1, req: 1 }], ['结算方式', '电汇', { sel: 1 }]], [['发票类型', '增值税专用发票', { sel: 1 }], ['价目表', 'IC 采购价目表 2026', { find: 1 }]]].forEach(([a, z]) => { b.push(field(FX, y, a[0], a[1], { ...o1, ...a[2] }) + field(c2, y, z[0], z[1], { ...o1, ...z[2] })); y += 44; });
  y += 14; b.push(secT(FX, y, '资质与绩效')); y += 20;
  b.push(R(FX, y, DW - 56, 176, '#F8FAFC', 10, ' stroke="#E2E8F0"'));
  b.push(T('承认状态', FX + 16, y + 26, 13, 400, '#64748B') + pill('已承认', FX + 96, y + 26, '#15803D', '#ECFDF5', 12, 500, 8, 22).svg + T('承认日期 2023-06-18', FX + 166, y + 26, 13, 400, '#334155'));
  b.push(T('代理品牌', FX + 16, y + 60, 13, 400, '#64748B')); { let x = FX + 96; ['Nordic', 'ST', 'TI', 'Silicon Labs'].forEach(t => { const o = pill(t, x, y + 60, '#1D4ED8', '#E6F0FF', 12, 500, 8, 22); b.push(o.svg); x += o.w + 6; }); }
  b.push(T('资质证书', FX + 16, y + 94, 13, 400, '#64748B') + T('ISO 9001 有效至 2027-08-31 · ISO 14001 有效至 2027-03-15', FX + 96, y + 94, 13, 400, '#334155'));
  const kp = [['承认物料', '46 项', '#0F172A'], ['近 90 天来料合格率', '99.2%', '#15803D'], ['准交率', '97.5%', '#15803D'], ['平均交期', '9.6 天', '#0F172A']];
  kp.forEach(([k, v, c], i) => { const x = FX + 16 + i * 150; b.push(T(v, x, y + 134, 18, 700, c) + T(k, x, y + 158, 12, 400, '#64748B')); });
  y += 196; b.push(secT(FX, y, '联系信息')); y += 22;
  b.push(field(FX, y, '联系人', '周凯（销售经理）', o1) + field(c2, y, '手机', '138 2875 4416', o1)); y += 44;
  b.push(field(FX, y, '地址', '深圳市南山区粤海街道科技南十二路 18 号长虹科技大厦 21 层', { lw: 88, iw: 524 }));
  b.push(R(DX, 1016, DW, 1, '#E2E8F0') + T('最后修改：孙丽  2026-11-10 16:22', FX, 1048, 12, 400, '#94A3B8'));
  b.push(btn(1920 - 28 - 72, 1030, '保存', 1, 'save', 36).svg + btn(1920 - 28 - 72 - 8 - 110, 1030, '保存并新增', 0, null, 36).svg + btn(1920 - 28 - 72 - 8 - 110 - 8 - 66, 1030, '取消', 0, null, 36).svg);
  return SVG(1920, 1080, b.join(''));
}

// ======================= UI08 物料编辑（元器件扩展属性） =======================
function chipIcon(x, y, s) { let p = ''; const n = 6, st = s * 0.62 / n; for (let i = 0; i < n; i++) { const o = s * 0.19 + st * (i + 0.5) - 2; p += R(x + o, y + s * 0.1, 4, 8, '#CBD5E1', 1) + R(x + o, y + s * 0.9 - 8, 4, 8, '#CBD5E1', 1) + R(x + s * 0.1, y + o, 8, 4, '#CBD5E1', 1) + R(x + s * 0.9 - 8, y + o, 8, 4, '#CBD5E1', 1); }
  return R(x, y, s, s, '#F1F5F9', 10, ' stroke="#E2E8F0"') + p + R(x + s * 0.18, y + s * 0.18, s * 0.64, s * 0.64, '#1E293B', 6) + `<circle cx="${x + s * 0.27}" cy="${y + s * 0.27}" r="3" fill="#64748B"/>` + T('N52832', x + s / 2, y + s / 2 - 6, 11, 700, '#E2E8F0', 'middle') + T('QFAAE0', x + s / 2, y + s / 2 + 10, 9, 500, '#94A3B8', 'middle'); }
function ui08() {
  const b = frame([['工作台', 0], ['生产订单列表', 0], ['物料 - 2.03.0832', 1]], '物料');
  const MW = 1316, PX = 1556, PW = 348;
  b.push(titleRow('物料', '2.03.0832', [[1, '已审核']]) + T('最后修改：刘工  2026-11-12 10:18', X0 + MW, 120, 12, 400, '#94A3B8', 'end'));
  b.push(toolbar(X0, 144, [['保存', 1, 'save'], ['提交', 'd', 'send'], ['审核', 'd', 'check'], '|', ['禁用', 0, 'stop'], ['分配', 0], ['复制', 0], '|', ['BOM 反查', 0, 'down'], ['替代方案', 0], ['附件', 0, 'clip'], ['打印', 0]]));
  // 表头
  const HY = 188; b.push(card(X0, HY, MW, 196, '基本资料'));
  b.push(chipIcon(X0 + 16, HY + 48, 132));
  const F = [['编码', '2.03.0832', { lock: 1, req: 1 }], ['名称', 'nRF52832 蓝牙 SoC', { req: 1 }], ['规格型号', 'nRF52832-QFAA-R', {}], ['物料分组', '集成电路 / 蓝牙 SoC', { sel: 1 }],
    ['物料属性', '外购', { sel: 1, req: 1 }], ['基本单位', 'Pcs', { sel: 1, req: 1 }], ['创建组织', '芯程电子一号工厂', { lock: 1 }], ['使用组织', '一号工厂 · 二号工厂', { lock: 1 }],
    ['存货类别', '原材料-电子元器件', { sel: 1 }], ['条码规则', '卷盘 Reel ID', { sel: 1 }], ['禁用状态', '正常', { lock: 1, c: '#15803D' }], ['旧物料编码', 'IC-BLE-0032', {}]];
  const fw = (MW - 180) / 4; F.forEach(([l, v, o], i) => b.push(field(X0 + 164 + (i % 4) * fw, HY + 48 + Math.floor(i / 4) * 46, l, v, { lw: 80, iw: fw - 92, ...o })));
  // 页签
  const TY = 400; b.push(R(X0, TY, MW, 1064 - TY, '#FFFFFF', 10, ' stroke="#E2E8F0"'));
  b.push(tabsBar(X0 + 20, TY + 26, ['基本', '库存', '计划', '生产', '质量', '元器件扩展属性', '财务', '附件 (3)'], 5) + R(X0, TY + 48, MW, 1, '#E2E8F0'));
  const C3 = (MW - 64) / 3, o2 = { lw: 104, iw: C3 - 120 };
  const sec = (ci, y, t, list) => { const x = X0 + 16 + ci * (C3 + 16); b.push(secT(x, y, t)); let yy = y + 22; list.forEach(([l, v, o = {}]) => { if (typeof v === 'function') b.push(T(l, x + 10, yy + 16, 13, 400, '#475569') + v(x + o2.lw, yy + 16)); else b.push(field(x, yy, l, v, { ...o2, ...o })); yy += 44; }); return yy; };
  const swf = on => (x, cy) => sw(x, cy, on) + T(on ? '是' : '否', x + 46, cy, 13, 400, '#334155');
  const pl = (t, fg, bg) => (x, cy) => pill(t, x, cy, fg, bg, 12, 500, 8, 22).svg;
  let y1 = sec(0, TY + 82, '元器件属性', [['品牌', 'Nordic Semiconductor', { sel: 1, req: 1 }], ['制造商料号', 'nRF52832-QFAA-R', { req: 1 }], ['封装', 'QFN48  6 × 6 mm', { sel: 1, req: 1 }], ['元器件类别', 'IC / 蓝牙 SoC', { sel: 1 }], ['RoHS', swf(1)], ['无卤素', swf(1)], ['承认状态', pl('已承认', '#15803D', '#ECFDF5')], ['承认书编号', 'AP-2025-0318', { find: 1 }]]);
  sec(1, TY + 82, '湿敏控制（MSL）', [['湿敏管控', swf(1)], ['MSL 等级', '3 级', { sel: 1, req: 1 }], ['车间寿命', '168 h', { req: 1 }], ['烘烤温度', '125 ℃', {}], ['烘烤时长', '24 h', {}], ['存储条件', '≤ 30 ℃ / 60% RH', {}], ['预警阈值', '剩余 ≤ 24 h 预警', { sel: 1 }], ['超时处理', '冻结并提示烘烤', { sel: 1 }]]);
  sec(2, TY + 82, '卷盘与包装', [['包装方式', '卷盘 Reel', { sel: 1, req: 1 }], ['卷盘规格', '13 寸', { sel: 1 }], ['每盘数量', '3,000 Pcs', { req: 1 }], ['载带宽度', '16 mm', {}], ['最小包装量', '3,000 Pcs', {}], ['允许拆盘', swf(1)], ['D/C 有效期', '24 个月', {}], ['先进先出', pl('按 D/C 先进先出', '#1D4ED8', '#E6F0FF')]]);
  const HWd = (MW - 48) / 2;
  b.push(R(X0 + 16, y1 + 6, MW - 32, 1, '#EEF2F7') + secT(X0 + 16, y1 + 30, '贴片参数') + secT(X0 + 32 + HWd, y1 + 30, '合格供应商（AVL）'));
  { const y = y1 + 50; [['吸嘴', 'CN065'], ['供料器', '16 mm 电动飞达'], ['贴装精度', '±0.03 mm'], ['钢网开口', '0.12 mm · 内缩 10%']].forEach(([l, v], i) => b.push(field(X0 + 16 + (i % 2) * (HWd / 2), y + Math.floor(i / 2) * 44, l, v, { lw: 76, iw: HWd / 2 - 88 })));
    const cols = [['供应商', 170], ['制造商', 96], ['优先级', 70], ['最新单价', 96, 'r'], ['交期', 70, 'r'], ['配额', HWd - 502, 'r']];
    const tb = tableX(X0 + 32 + HWd, y, HWd, cols, [[{ t: 'SUP-0012 芯联科技', c: '#2563EB' }, 'Nordic', '1', '¥ 13.85', '7 天', '70%'], [{ t: 'SUP-0015 富昌', c: '#2563EB' }, 'Nordic', '2', '¥ 14.20', '10 天', '30%'], [{ t: 'SUP-0003 世平', c: '#2563EB' }, 'Nordic', '3', '¥ 14.60', '14 天', '0%']], { id: 'pt8', rh: 32, hh: 34 }); b.push(tb.svg); }
  // 右侧
  let y = 188; b.push(card(PX, y, PW, 268, '库存概况', '即时', '#64748B'));
  b.push(T('3,860', PX + 16, y + 74, 30, 700, '#0F172A') + T('Pcs · 2 卷', PX + 20 + W('3,860', 30, 700), y + 78, 13, 400, '#64748B'));
  [['安全库存', '2,000'], ['预留（MO-20261112-002 分录 2）', '2,000'], ['可用库存', '1,860'], ['采购在途（PR-20261113-006）', '6,000']].forEach(([k, v], i) => b.push(T(k, PX + 16, y + 118 + i * 30, 13, 400, '#475569') + T(v, PX + PW - 16, y + 118 + i * 30, 13, 700, i === 2 ? '#B45309' : '#0F172A', 'end')));
  b.push(bar(PX + 16, y + 240, PW - 32, 6, 1860 / 3860, '#F59E0B') + T('可用 / 即时', PX + 16, y + 226, 11, 400, '#94A3B8') + T('48.2%', PX + PW - 16, y + 226, 11, 500, '#B45309', 'end'));
  y += 284; b.push(card(PX, y, PW, 200, '卷盘明细', '2 卷', '#64748B'));
  [['R26111304-00318', '3,000', 'D/C 2544 · A-03-12', '已开封 0.0 h'], ['R26110907-00205', '860', 'D/C 2541 · A-03-12', '已暴露 46.5 h']].forEach(([id, q, d, m], i) => { const yy = y + 50 + i * 72; b.push(R(PX + 16, yy, PW - 32, 62, '#F8FAFC', 8, ' stroke="#EEF2F7"') + T(id, PX + 28, yy + 20, 13, 700, '#1E293B') + T(q + ' Pcs', PX + PW - 28, yy + 20, 13, 700, '#0F172A', 'end') + T(d, PX + 28, yy + 44, 12, 400, '#64748B') + T(m, PX + PW - 28, yy + 44, 12, 500, i ? '#B45309' : '#15803D', 'end')); });
  y += 216; b.push(card(PX, y, PW, 1064 - y, '使用与替代', '', ''));
  b.push(T('被以下 BOM 使用', PX + 16, y + 56, 12, 500, '#64748B'));
  [['BT52-BOM V2.3', 'BLE5.0 蓝牙模块 · U1 × 1'], ['BT52C-BOM V1.1', '蓝牙模块（陶瓷天线） · U1 × 1']].forEach(([a, d], i) => b.push(T(a, PX + 16, y + 82 + i * 46, 13, 700, '#2563EB') + T(d, PX + 16, y + 102 + i * 46, 12, 400, '#64748B')));
  b.push(R(PX + 16, y + 166, PW - 32, 1, '#EEF2F7') + T('替代方案 SUB-0832', PX + 16, y + 190, 12, 500, '#64748B'));
  b.push(T('2.03.0833  nRF52832-QFAB-R', PX + 16, y + 216, 13, 500, '#1E293B') + pill('优先级 2', PX + PW - 16, y + 216, '#B45309', '#FFFBEB', 12, 500, 8, 22, 'end').svg + T('同封装 · 512KB Flash · 需客户确认', PX + 16, y + 238, 12, 400, '#94A3B8'));
  b.push(R(PX + 16, y + 258, PW - 32, 1, '#EEF2F7') + T('最近出入库', PX + 16, y + 282, 12, 500, '#64748B'));
  [['11-13 08:30', '采购入库', '+3,000', '#15803D'], ['11-12 19:40', '生产领料 PICK-20261112-014', '−2,000', '#DC2626'], ['11-12 08:10', '生产领料 PICK-20261112-011', '−4,000', '#DC2626']].forEach(([t, d, q, c], i) => b.push(T(t, PX + 16, y + 308 + i * 26, 12, 400, '#94A3B8') + T(d, PX + 96, y + 308 + i * 26, 12, 400, '#334155') + T(q, PX + PW - 16, y + 308 + i * 26, 12, 700, c, 'end')));
  return SVG(1920, 1080, b.join(''));
}

// ======================= UI09 BOM 编辑与树形展开 =======================
const prio = (n) => (x, cy) => pill('P' + n, x + 10, cy, n === 1 ? '#15803D' : '#B45309', n === 1 ? '#ECFDF5' : '#FFFBEB', 12, 700, 7, 20).svg;
function ui09() {
  const b = frame([['工作台', 0], ['生产订单列表', 0], ['物料清单 - BT52-BOM V2.3', 1]], '物料清单 BOM');
  b.push(titleRow('物料清单', 'BT52-BOM V2.3', [[1, '已审核']]) + T('最后修改：刘工  2026-11-12 09:40 · ECN-20261112-003', 1904, 120, 12, 400, '#94A3B8', 'end'));
  b.push(toolbar(X0, 144, [['保存', 1, 'save'], ['提交', 'd', 'send'], ['审核', 'd', 'check'], '|', ['新增版本', 0, 'plus'], ['工程变更', 0], '|', ['BOM 正查', 0, 'down'], ['BOM 反查', 0, 'up'], ['成本展开', 0], ['引出', 0], ['打印', 0]]));
  // 左：树
  const TX = X0, TW = 340; b.push(card(TX, 188, TW, 876, 'BOM 树形展开', '展开到底层', '#2563EB'));
  b.push(R(TX + 12, 224, TW - 24, 30, '#F8FAFC', 6, ' stroke="#E2E8F0"') + ic('search', TX + 22, 231, '#94A3B8') + T('物料编码 / 名称 / 位号', TX + 46, 239, 13, 400, '#94A3B8'));
  const N9 = [[0, 'BLE5.0 蓝牙模块 BT-52', '3.01.0052 · 成品', '1', 1], [1, 'BT52 PCBA 半成品', '1.01.0052 · 自制', '×1', 1, 1], [2, 'PCB BT52 V2.1', '2.05.0152', '×1'], [2, 'nRF52832-QFAA', '2.03.0832 · U1', '×1', 0, 0, '替'], [2, 'MLCC 0402 104K 16V', '2.02.0402 · C1–C12', '×12', 0, 0, '替', 1], [2, '电阻 0603 10kΩ 1%', '2.01.0603 · R1–R6', '×6'], [2, '电阻 0402 0Ω', '2.01.0402 · R7–R8', '×2'], [2, '晶振 2016 32MHz', '2.04.2016 · Y1', '×1'], [2, '晶振 3215 32.768kHz', '2.04.3215 · Y2', '×1'], [2, '电感 0402 10nH', '2.09.0040 · L1–L2', '×2'], [2, 'LED 0603 绿', '2.12.0003 · D1', '×1'], [2, '锡膏 SAC305 T4', '2.06.0001', '0.12 g'], [1, '屏蔽罩 BT52', '2.07.0012 · SH1', '×1'], [1, '产品标签 BT52', '2.10.0008', '×1'], [1, '吸塑托盘 50 位', '2.11.0016', '×0.02'], [1, '防静电袋', '2.11.0003', '×0.02']];
  N9.forEach(([lv, n, c, q, par, act, sub, hl], i) => { const y = 264 + i * 42, cy = y + 21, xx = TX + 16 + lv * 18;
    if (act) b.push(R(TX + 8, y + 2, TW - 16, 38, '#E6F0FF', 6)); else if (hl) b.push(R(TX + 8, y + 2, TW - 16, 38, '#FFFBEB', 6));
    if (par) b.push(`<path d="M${xx} ${cy - 2} L${xx + 4} ${cy + 2} L${xx + 8} ${cy - 2}" fill="none" stroke="#64748B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`);
    const ix = xx + 14; b.push(par ? R(ix, cy - 7, 14, 14, act ? '#2563EB' : '#6366F1', 3) + T(lv ? '半' : '成', ix + 7, cy, 9, 700, '#FFFFFF', 'middle') : `<circle cx="${ix + 7}" cy="${cy}" r="3" fill="#94A3B8"/>`);
    b.push(T(n, ix + 22, cy - 8, 13, act || par ? 700 : 500, act ? '#1D4ED8' : '#1E293B') + T(c, ix + 22, cy + 10, 11, 400, '#94A3B8') + T(q, TX + TW - 18, cy - 8, 12, 700, '#334155', 'end'));
    if (sub) b.push(pill(sub, ix + 28 + W(n, 13, act || par ? 700 : 500), cy - 8, '#B45309', '#FFFBEB', 10, 700, 4, 16).svg); });
  b.push(R(TX + 12, 948, TW - 24, 1, '#EEF2F7'));
  [['层级', '3 层'], ['子项', '14 项（替代 2 组）'], ['位号总数', '27 个']].forEach(([k, v], i) => b.push(T(k, TX + 16, 972 + i * 26, 12, 400, '#64748B') + T(v, TX + TW - 16, 972 + i * 26, 12, 700, '#334155', 'end')));
  // 右：表头
  const MX = TX + TW + 16, MW = 1904 - MX;
  b.push(card(MX, 188, MW, 140, '表头'));
  const F = [['BOM 版本', 'BT52-BOM V2.3', { lock: 1 }], ['父项物料', '3.01.0052  BLE5.0 蓝牙模块', { lock: 1 }], ['BOM 用途', '自制 · 通用', { sel: 1 }], ['数据状态', '已审核', { lock: 1, c: '#15803D' }],
    ['父项数量', '1 Pcs', {}], ['生效日期', '2026-11-12', {}], ['工艺路线', 'RT-BT52-02', { find: 1, c: '#2563EB' }], ['来源变更', 'ECN-20261112-003', { lock: 1, c: '#2563EB' }]];
  const fw = (MW - 32) / 4; F.forEach(([l, v, o], i) => b.push(field(MX + 16 + (i % 4) * fw, 230 + Math.floor(i / 4) * 44, l, v, { lw: 80, iw: fw - 96, ...o })));
  // 子项明细
  const CY = 344; b.push(card(MX, CY, MW, 452, '子项明细', '', ''));
  b.push(T('BT52 PCBA 半成品 · 1.01.0052', MX + 28 + W('子项明细', 15, 700) + 12, CY + 25, 13, 400, '#64748B'));
  { const r = row(MX + MW - 16 - 442, CY + 10, [['新增行', 0, 'plus'], ['插入行', 0], ['删除行', 0], ['替代设置', 0], ['阶梯损耗', 0]], 6); b.push(r.svg); }
  const cols = [['项次', 56], ['子项物料编码', 108], ['子项名称 / 规格', 236], ['子项类型', 88], ['用量', 80, 'r'], ['单位', 52], ['损耗率', 92], ['位号', 150], ['发料方式', 90], ['工序', 92], ['替代', 120]];
  const used = cols.reduce((a, c) => a + c[1], 0); cols.push(['供应商（首选）', MW - 32 - used]);
  const ty = t => (x, cy) => t === '替代件' ? pill(t, x + 10, cy, '#B45309', '#FFFBEB', 12, 500, 8, 22).svg : T(t, x + 10, cy, 13, 400, '#1E293B');
  const ld = (x, cy) => pill('阶梯', x + 10, cy, '#1D4ED8', '#E6F0FF', 12, 500, 8, 22).svg + T('1.5–3%', x + 54, cy, 12, 400, '#475569');
  const sb = (t, n) => (x, cy) => prio(n)(x, cy) + T(t, x + 46, cy, 12, 400, '#475569');
  const sub1 = (x, cy) => `<path d="M${x + 14} ${cy - 18} V${cy} H${x + 26}" fill="none" stroke="#CBD5E1" stroke-width="1.2"/>` + T('30.1', x + 30, cy, 13, 400, '#B45309');
  const rows = [['10', '2.05.0152', 'PCB BT52 V2.1 · 4 层 1.0 mm', ty('标准件'), '1', 'Pcs', '0.5%', '—', '直接领料', '10 锡膏印刷', '—', '景旺'],
    ['20', '2.03.0832', 'nRF52832-QFAA-R · QFN48', ty('标准件'), '1', 'Pcs', '0.2%', 'U1', '直接领料', '30 贴片', { t: 'SUB-0832', c: '#2563EB' }, '芯联科技'],
    ['30', '2.02.0402', 'MLCC 0402 104K 16V X7R · 村田', ty('标准件'), '12', 'Pcs', ld, 'C1–C12', '倒冲领料', '30 贴片', sb('主料', 1), '村田'],
    [sub1, '2.02.0403', 'MLCC 0402 104K 16V X7R · 风华', ty('替代件'), '12', 'Pcs', ld, 'C1–C12', '倒冲领料', '30 贴片', sb('替代', 2), '风华高科'],
    ['40', '2.01.0603', '电阻 0603 10kΩ ±1% · 国巨', ty('标准件'), '6', 'Pcs', ld, 'R1–R6', '倒冲领料', '30 贴片', '—', '国巨'],
    ['50', '2.01.0402', '电阻 0402 0Ω · 国巨', ty('标准件'), '2', 'Pcs', '2.0%', 'R7, R8', '倒冲领料', '30 贴片', '—', '国巨'],
    ['60', '2.04.2016', '晶振 2016 32MHz 10ppm · 泰晶', ty('标准件'), '1', 'Pcs', '0.5%', 'Y1', '直接领料', '30 贴片', '—', '泰晶'],
    ['70', '2.04.3215', '晶振 3215 32.768kHz · 泰晶', ty('标准件'), '1', 'Pcs', '0.5%', 'Y2', '直接领料', '30 贴片', '—', '泰晶'],
    ['80', '2.09.0040', '电感 0402 10nH ±2% · 顺络', ty('标准件'), '2', 'Pcs', '1.0%', 'L1, L2', '倒冲领料', '30 贴片', '—', '顺络'],
    ['90', '2.12.0003', 'LED 0603 绿色 · 国星', ty('标准件'), '1', 'Pcs', '1.0%', 'D1', '倒冲领料', '30 贴片', '—', '国星光电'],
    ['100', '2.06.0001', '锡膏 SAC305 T4 500 g/罐', ty('标准件'), '0.12', 'g', '3.0%', '—', '倒冲领料', '10 锡膏印刷', '—', '唯特偶']];
  const tb = tableX(MX + 16, CY + 48, MW - 32, cols, rows, { id: 'pt9', rh: 34, sel: 2 }); b.push(tb.svg);
  // 阶梯损耗
  const BY = 812, BW = (MW - 16) / 2; b.push(card(MX, BY, BW, 1064 - BY, '阶梯损耗', '项次 30 · MLCC 0402 104K', '#64748B'));
  const lc = [['数量下限', 110, 'r'], ['数量上限', 110, 'r'], ['固定损耗', 110, 'r'], ['变动损耗率', BW - 32 - 330, 'r']];
  const lt = tableX(MX + 16, BY + 44, BW - 32, lc, [['1', '1,000', '20 Pcs', '3.0%'], ['1,001', '5,000', '50 Pcs', '2.0%'], [{ t: '5,001', b: 1, c: '#1D4ED8' }, { t: '—', c: '#1D4ED8' }, { t: '100 Pcs', b: 1, c: '#1D4ED8' }, { t: '1.5%', b: 1, c: '#1D4ED8' }]], { id: 'pt9b', rh: 32, hh: 34, sel: 2 }); b.push(lt.svg);
  b.push(R(MX + 16, BY + 192, BW - 32, 44, '#F8FAFC', 8, ' stroke="#EEF2F7"') + T('MO-20261112-002 分录 1 · 6,000 套：', MX + 28, BY + 214, 12, 400, '#64748B') + T('12 × 6,000 × (1 + 1.5%) + 100 = 73,180 Pcs', MX + BW - 28, BY + 214, 13, 700, '#0F172A', 'end'));
  // 替代关系
  const SX = MX + BW + 16; b.push(card(SX, BY, BW, 1064 - BY, '替代关系', '方案 SUB-0402-104K · 不足时替代', '#64748B'));
  const sc = [[1, '2.02.0402', '村田 GRM155R71C104KA88D', '库存 52,000', '#15803D', '主料'], [2, '2.02.0403', '风华 0402B104K160NT', '库存 30,000', '#15803D', '替代 1'], [3, '2.02.0404', '国巨 CC0402KRX7R7BB104', '库存 18,000', '#15803D', '替代 2']];
  const cw = (BW - 32 - 2 * 28) / 3;
  sc.forEach(([n, c, m, st, col, lab], i) => { const x = SX + 16 + i * (cw + 28), y = BY + 48; b.push(R(x, y, cw, 128, n === 1 ? '#F0FDF4' : '#FFFFFF', 8, ` stroke="${n === 1 ? '#86EFAC' : '#E2E8F0'}"`) + prio(n)(x + 2, y + 22) + T(lab, x + 50, y + 22, 13, 700, '#1E293B') + T(c, x + 12, y + 50, 13, 700, '#2563EB') + T(m, x + 12, y + 72, 11, 400, '#475569') + T('比例 1 : 1', x + 12, y + 96, 12, 400, '#64748B') + T(st, x + 12, y + 114, 12, 500, col));
    if (i < 2) b.push(arrow([[x + cw + 4, y + 64], [x + cw + 24, y + 64]], '#94A3B8')); });
  b.push(T('同位号整批替代 · 不允许混贴 · 生效 2026-11-12 · 替代 3（三星）承认中未启用', SX + 16, BY + 204, 12, 400, '#64748B'));
  b.push(T('ECN-20261112-003 已同步在制用料清单 2 张', SX + 16, BY + 228, 12, 400, '#2563EB'));
  return SVG(1920, 1080, b.join(''));
}

// ======================= UI10 替代方案 =======================
function ui10() {
  const b = frame([['工作台', 0], ['物料清单 - BT52-BOM V2.3', 0], ['替代方案 - SUB-0402-104K', 1]], '替代方案');
  b.push(titleRow('替代方案', 'SUB-0402-104K', [[1, '已审核']]) + T('最后修改：刘工  2026-11-12 09:32', 1904, 120, 12, 400, '#94A3B8', 'end'));
  b.push(toolbar(X0, 144, [['新增', 0, 'plus'], ['保存', 1, 'save'], ['提交', 'd', 'send'], ['审核', 'd', 'check'], '|', ['禁用', 0, 'stop'], ['复制', 0], '|', ['适用 BOM', 0], ['引出', 0]]));
  // 左：方案列表
  const LW = 264; b.push(card(X0, 188, LW, 876, '方案列表', '42 个', '#64748B'));
  b.push(R(X0 + 12, 224, LW - 24, 30, '#F8FAFC', 6, ' stroke="#E2E8F0"') + ic('search', X0 + 22, 231, '#94A3B8') + T('方案 / 主料编码 / 名称', X0 + 46, 239, 13, 400, '#94A3B8'));
  const L = [['SUB-0402-104K', 'MLCC 0402 104K 16V', '3 个替代', '已审核', 1], ['SUB-0832', 'nRF52832 蓝牙 SoC', '1 个替代', '已审核'], ['SUB-0603-10K', '电阻 0603 10kΩ 1%', '2 个替代', '已审核'], ['SUB-0402-0R', '电阻 0402 0Ω', '2 个替代', '已审核'], ['SUB-2016-32M', '晶振 2016 32MHz', '1 个替代', '已审核'], ['SUB-0402-10NH', '电感 0402 10nH', '1 个替代', '已审核'], ['SUB-0603-LEDG', 'LED 0603 绿色', '2 个替代', '已审核'], ['SUB-1117-33', 'LDO LM1117-3.3', '2 个替代', '已审核'], ['SUB-3215-32K', '晶振 3215 32.768kHz', '1 个替代', '已审核'], ['SUB-0603-105K', 'MLCC 0603 105K 25V', '2 个替代', '已审核'], ['SUB-0805-106K', 'MLCC 0805 106K 10V', '2 个替代', '审核中'], ['SUB-SAC305', '锡膏 SAC305 T4', '1 个替代', '创建']];
  L.forEach(([c, n, k, st, on], i) => { const y = 266 + i * 64; if (on) b.push(R(X0 + 8, y, LW - 16, 58, '#E6F0FF', 8) + R(X0 + 8, y + 12, 3, 34, '#2563EB', 1.5)); else if (i) b.push(R(X0 + 16, y - 3, LW - 32, 1, '#EEF2F7'));
    b.push(T(c, X0 + 22, y + 19, 13, 700, on ? '#1D4ED8' : '#1E293B') + tag1(st, X0 + LW - 16 - W(st, 12, 500) - 16, y + 19) + T(n, X0 + 22, y + 41, 12, 400, '#64748B') + T(k, X0 + LW - 16, y + 41, 12, 400, '#94A3B8', 'end')); });
  // 主区
  const MX = X0 + LW + 16, MW = 1904 - MX;
  b.push(card(MX, 188, MW, 140, '方案信息'));
  const F = [['方案编码', 'SUB-0402-104K', { lock: 1 }], ['方案名称', 'MLCC 0402 104K 16V 替代', { req: 1 }], ['替代策略', '优先级替代', { sel: 1, req: 1 }], ['替代方式', '不足时替代 · 整批', { sel: 1 }],
    ['适用范围', '指定 BOM（3 个）', { sel: 1 }], ['生效日期', '2026-11-12', { req: 1 }], ['失效日期', '2027-12-31', {}], ['来源变更', 'ECN-20261112-003', { lock: 1, c: '#2563EB' }]];
  const fw = (MW - 32) / 4; F.forEach(([l, v, o], i) => b.push(field(MX + 16 + (i % 4) * fw, 230 + Math.floor(i / 4) * 44, l, v, { lw: 80, iw: fw - 96, ...o })));
  // 优先级流程
  const PY = 344; b.push(card(MX, PY, MW, 212, '替代优先级', '主料库存不足时，按优先级依次替代', '#64748B'));
  const P = [[1, '主料', '2.02.0402', '村田 GRM155R71C104KA88D', '52,000', '已承认', '#16A34A'], [2, '替代 1', '2.02.0403', '风华 0402B104K160NT', '30,000', '已承认', '#16A34A'], [3, '替代 2', '2.02.0404', '国巨 CC0402KRX7R7BB104', '18,000', '已承认', '#16A34A'], [4, '替代 3', '2.02.0405', '三星 CL05B104KO5NNNC', '0', '承认中', '#D97706']];
  const pw = (MW - 32 - 3 * 56) / 4;
  P.forEach(([n, lab, c, m, q, st, col], i) => { const x = MX + 16 + i * (pw + 56), y = PY + 50, off = n === 4;
    b.push(R(x, y, pw, 146, n === 1 ? '#F0FDF4' : off ? '#F8FAFC' : '#FFFFFF', 10, ` stroke="${n === 1 ? '#86EFAC' : off ? '#E2E8F0' : '#CBD5E1'}"${off ? ' stroke-dasharray="5 4"' : ''}`));
    b.push(pill('P' + n, x + 14, y + 24, n === 1 ? '#15803D' : off ? '#64748B' : '#B45309', n === 1 ? '#DCFCE7' : off ? '#F1F5F9' : '#FEF3C7', 13, 700, 8, 22).svg + T(lab, x + 54, y + 24, 14, 700, off ? '#94A3B8' : '#0F172A') + pill(st, x + pw - 14, y + 24, off ? '#B45309' : '#15803D', off ? '#FFFBEB' : '#ECFDF5', 12, 500, 8, 22, 'end').svg);
    b.push(T(c, x + 14, y + 56, 15, 700, off ? '#94A3B8' : '#2563EB') + T(m, x + 14, y + 78, 12, 400, '#475569') + R(x + 14, y + 96, pw - 28, 1, '#EEF2F7'));
    b.push(T('即时库存', x + 14, y + 118, 12, 400, '#64748B') + T(q + ' Pcs', x + pw - 14, y + 118, 15, 700, off ? '#DC2626' : '#0F172A', 'end') + T('比例 1 : 1 · 0402 X7R 16V', x + 14, y + 136, 11, 400, '#94A3B8'));
    if (i < 3) { const ax = x + pw + 6, ay = y + 73; b.push(arrow([[ax, ay], [ax + 44, ay]], '#94A3B8', 1.6, i === 2) + T('不足', ax + 22, ay - 12, 11, 500, '#64748B', 'middle')); } });
  // 主料 / 替代料 表
  const TY = 572, TW = MW - 400 - 16;
  b.push(card(MX, TY, TW, 1064 - TY, '主料', '', ''));
  const c1 = [['物料编码', 108], ['物料名称', 186], ['品牌', 70], ['制造商料号', 200], ['用量', 70, 'r'], ['单位', 56], ['即时库存', 110, 'r']]; const u1 = c1.reduce((a, c) => a + c[1], 0); c1.push(['备注', TW - 32 - u1]);
  b.push(tableX(MX + 16, TY + 44, TW - 32, c1, [[{ t: '2.02.0402', c: '#2563EB' }, 'MLCC 0402 104K 16V X7R', '村田', 'GRM155R71C104KA88D', '1', 'Pcs', '52,000', '主选']], { id: 'pt10a', rh: 36, hh: 36 }).svg);
  b.push(R(MX + 16, TY + 140, 4, 16, '#2563EB', 2) + T('替代料', MX + 28, TY + 148, 15, 700, '#0F172A') + row(MX + TW - 16 - 196, TY + 132, [['新增行', 0, 'plus'], ['删除行', 0]], 6).svg);
  const c2 = [['优先级', 70], ['物料编码', 104], ['物料名称', 170], ['品牌', 60], ['制造商料号', 176], ['替代比例', 84, 'r'], ['即时库存', 96, 'r'], ['承认', 84]]; const u2 = c2.reduce((a, c) => a + c[1], 0); c2.push(['生效日期', TW - 32 - u2]);
  const ap = t => (x, cy) => pill(t, x + 10, cy, t === '已承认' ? '#15803D' : '#B45309', t === '已承认' ? '#ECFDF5' : '#FFFBEB', 12, 500, 8, 22).svg;
  b.push(tableX(MX + 16, TY + 172, TW - 32, c2, [[prio(2), { t: '2.02.0403', c: '#2563EB' }, 'MLCC 0402 104K 16V X7R', '风华', '0402B104K160NT', '1 : 1', '30,000', ap('已承认'), '2026-11-12'], [prio(3), { t: '2.02.0404', c: '#2563EB' }, 'MLCC 0402 104K 16V X7R', '国巨', 'CC0402KRX7R7BB104', '1 : 1', '18,000', ap('已承认'), '2026-11-12'], [(x, cy) => pill('P4', x + 10, cy, '#64748B', '#F1F5F9', 12, 700, 7, 20).svg, { t: '2.02.0405', c: '#94A3B8' }, { t: 'MLCC 0402 104K 16V X7R', c: '#94A3B8' }, { t: '三星', c: '#94A3B8' }, { t: 'CL05B104KO5NNNC', c: '#94A3B8' }, { t: '1 : 1', c: '#94A3B8' }, { t: '0', c: '#94A3B8' }, ap('承认中'), { t: '承认后启用', c: '#B45309' }]], { id: 'pt10b', rh: 38, hh: 36 }).svg);
  b.push(T('适用 BOM', MX + 16, TY + 372, 13, 700, '#334155')); { let x = MX + 90; ['BT52-BOM V2.3 · C1–C12', 'BT52C-BOM V1.1 · C1–C10', 'WM6200-BOM V1.0 · C3–C18'].forEach(t => { const o = pill(t, x, TY + 372, '#1D4ED8', '#E6F0FF', 12, 500, 10, 26); b.push(o.svg); x += o.w + 8; }); }
  b.push(T('规则：同一位号整批替代，不允许混贴；替代料必须已承认且在有效期内；领料时按优先级自动分配。', MX + 16, TY + 408, 12, 400, '#64748B'));
  b.push(T('变更记录：ECN-20261112-003 新增替代 1（风华）用于 C12 · 刘工 2026-11-12', MX + 16, TY + 434, 12, 400, '#64748B'));
  // 发料模拟
  const SX = MX + TW + 16, SW = 400; b.push(card(SX, TY, SW, 1064 - TY, '发料模拟', '按优先级分配', '#64748B'));
  b.push(T('MO-20261112-002 分录 1 · BT-52 6,000 套', SX + 16, TY + 58, 13, 500, '#334155') + T('需求数量', SX + 16, TY + 90, 12, 400, '#64748B') + T('73,180', SX + 16, TY + 122, 28, 700, '#0F172A') + T('Pcs（含阶梯损耗 1.5% + 固定 100）', SX + 20 + W('73,180', 28, 700), TY + 126, 12, 400, '#64748B'));
  const bw = SW - 32, a1 = bw * 52000 / 73180; b.push(R(SX + 16, TY + 150, bw, 18, '#F1F5F9', 4) + R(SX + 16, TY + 150, a1, 18, '#10B981', 4) + R(SX + 16 + a1, TY + 150, bw - a1, 18, '#F59E0B', 4) + R(SX + 16 + a1 - 1, TY + 150, 2, 18, '#FFFFFF'));
  [['P1', '主料 2.02.0402 村田', '52,000', '库存全部分配', '#10B981'], ['P2', '替代 1 2.02.0403 风华', '21,180', '剩余 8,820', '#F59E0B'], ['P3', '替代 2 2.02.0404 国巨', '0', '无需动用', '#CBD5E1'], ['P4', '替代 3 2.02.0405 三星', '—', '未启用', '#E2E8F0']].forEach(([p, n, q, d, c], i) => { const y = TY + 196 + i * 50; b.push(R(SX + 16, y, 10, 10, c, 2) + T(p, SX + 34, y + 5, 12, 700, '#334155') + T(n, SX + 62, y + 5, 13, 500, '#1E293B') + T(q, SX + SW - 16, y + 5, 14, 700, '#0F172A', 'end') + T(d, SX + 62, y + 25, 12, 400, '#94A3B8')); });
  b.push(R(SX + 16, TY + 400, SW - 32, 64, '#F0FDF4', 8, ' stroke="#BBF7D0"') + ic('check', SX + 28, TY + 412, '#16A34A') + T('可满足需求，缺口 0', SX + 52, TY + 420, 13, 700, '#15803D') + T('生成领料时自动拆分为 2 行，位号 C1–C12 不混贴', SX + 52, TY + 444, 12, 400, '#166534'));
  return SVG(1920, 1080, b.join(''));
}

// ======================= UI11 工艺路线 =======================
function ui11() {
  const b = frame([['工作台', 0], ['物料清单 - BT52-BOM V2.3', 0], ['工艺路线 - RT-BT52-02', 1]], '工艺路线');
  b.push(titleRow('工艺路线', 'RT-BT52-02', [[1, '已审核']]) + T('最后修改：刘工  2026-10-08 15:12', 1904, 120, 12, 400, '#94A3B8', 'end'));
  b.push(toolbar(X0, 144, [['保存', 1, 'save'], ['提交', 'd', 'send'], ['审核', 'd', 'check'], '|', ['新增版本', 0, 'plus'], ['复制', 0], '|', ['工序计划', 0, 'down'], ['标准工时', 0], ['引出', 0], ['打印', 0]]));
  b.push(card(X0, 188, CW, 104, ''));
  const F = [['路线编码', 'RT-BT52-02', { lock: 1 }], ['路线名称', 'BT-52 SMT 标准工艺 V2', { req: 1 }], ['产品', '3.01.0052  BLE5.0 蓝牙模块', { lock: 1 }], ['生产车间', 'SMT二车间', { sel: 1 }], ['默认路线', '是', { sel: 1 }],
    ['生效日期', '2026-10-08', {}], ['基准批量', '1,000 Pcs', {}], ['单件工时', '110.4 s', { lock: 1 }], ['BOM 版本', 'BT52-BOM V2.3', { find: 1, c: '#2563EB' }], ['数据状态', '已审核', { lock: 1, c: '#15803D' }]];
  const fw = (CW - 32) / 5; F.forEach(([l, v, o], i) => b.push(field(X0 + 16 + (i % 5) * fw, 204 + Math.floor(i / 5) * 42, l, v, { lw: 80, iw: fw - 92, ...o })));
  // 工序图
  const GY = 308, GH = 316; b.push(card(X0, GY, CW, GH, '工序流程', '', ''));
  { let x = X0 + CW - 16; [['入库点', '#7C3AED', '#F5F3FF'], ['汇报点', '#2563EB', '#E6F0FF'], ['质检', '#0E7490', '#ECFEFF'], ['首检', '#C2410C', '#FFF7ED']].forEach(([t, c, bg]) => { const o = pill(t, x, GY + 25, c, bg, 12, 500, 8, 22, 'end'); b.push(o.svg); x -= o.w + 8; }); b.push(T('控制码', x, GY + 25, 12, 400, '#64748B', 'end')); }
  const CC = { 首检: ['#C2410C', '#FFF7ED'], 质检: ['#0E7490', '#ECFEFF'], 汇报点: ['#2563EB', '#E6F0FF'], 入库点: ['#7C3AED', '#F5F3FF'] };
  const OPS = [['10', '锡膏印刷', 'SMT2-印刷', '16.0 s', '准备 15 min', ['首检', '汇报点'], 'DEK-02 印刷机'], ['20', 'SPI 检测', 'SMT2-SPI', '16.0 s', '准备 5 min', ['质检'], 'KY8030 SPI'], ['30', '贴片', 'SMT2-贴片', '16.8 s', '准备 25 min', ['首检', '汇报点'], '贴片机 01 / 02'], ['40', '回流焊', 'SMT2-回流', '16.8 s', '准备 30 min', ['汇报点'], 'RF-2 十温区'], ['50', 'AOI 检测', 'SMT2-AOI', '16.8 s', '准备 5 min', ['质检'], 'AOI-2'], ['60', '功能测试', 'TEST-FCT', '22.0 s', '准备 10 min', ['质检', '汇报点'], 'FCT 治具 × 4'], ['70', '包装入库', 'PACK-02', '6.0 s', '准备 5 min', ['入库点'], '扫码装盘 50 位']];
  const nw = 206, gap = (CW - 32 - 7 * nw) / 6, ny = GY + 52, nh = 156;
  OPS.forEach(([no, n, wc, t, pr, cc, res], i) => { const x = X0 + 16 + i * (nw + gap), cur = no === '30';
    b.push(R(x, ny, nw, nh, '#FFFFFF', 10, ` stroke="${cur ? '#2563EB' : '#D6E2EF'}"${cur ? ' stroke-width="1.5"' : ''} filter="url(#sh)"`) + R(x, ny, nw, 36, cur ? '#2563EB' : '#F1F5F9', 10) + R(x, ny + 26, nw, 10, cur ? '#2563EB' : '#F1F5F9'));
    b.push(T(no, x + 14, ny + 18, 13, 700, cur ? '#BFDBFE' : '#64748B') + T(n, x + 42, ny + 18, 14, 700, cur ? '#FFFFFF' : '#0F172A') + T(t, x + nw - 12, ny + 18, 12, 500, cur ? '#DBEAFE' : '#475569', 'end'));
    b.push(T('工作中心', x + 14, ny + 56, 12, 400, '#94A3B8') + T(wc, x + nw - 12, ny + 56, 12, 500, '#334155', 'end') + T('资源', x + 14, ny + 80, 12, 400, '#94A3B8') + T(res, x + nw - 12, ny + 80, 12, 500, '#334155', 'end') + T(pr, x + 14, ny + 104, 12, 400, '#64748B'));
    { let px = x + 14; cc.forEach(c => { const o = pill(c, px, ny + 134, CC[c][0], CC[c][1], 12, 500, 8, 22); b.push(o.svg); px += o.w + 6; }); }
    if (i < 6) b.push(arrow([[x + nw + 2, ny + 78], [x + nw + gap - 2, ny + 78]], '#64748B', 1.8)); });
  // 返修支线
  { const x50 = X0 + 16 + 4 * (nw + gap), rw = 250, rx = x50 + (nw - rw) / 2, ry = ny + nh + 44, rh2 = 44;
    b.push(R(rx, ry, rw, rh2, '#FFF7ED', 8, ' stroke="#FDBA74" stroke-dasharray="5 4"') + T('55', rx + 14, ry + 22, 13, 700, '#C2410C') + T('维修', rx + 42, ry + 22, 14, 700, '#9A3412') + T('SMT2-维修 · 120 s/块', rx + rw - 12, ry + 22, 12, 400, '#9A3412', 'end'));
    const l = x50 + 56, r2 = x50 + nw - 56;
    b.push(arrow([[l, ny + nh + 2], [l, ry - 2]], '#EA580C', 1.6, true) + T('NG', l - 8, ny + nh + 22, 11, 700, '#EA580C', 'end'));
    b.push(arrow([[r2, ry - 2], [r2, ny + nh + 2]], '#EA580C', 1.6, true) + T('复判', r2 + 8, ny + nh + 22, 11, 700, '#EA580C'));
    b.push(T('返修工序不计入主线工时', rx + rw + 16, ry + 22, 12, 400, '#94A3B8')); }
  // 表
  const TY = 640; b.push(card(X0, TY, CW, 1064 - TY, '工序列表', '', ''));
  { const it = [['新增工序', 0, 'plus'], ['插入', 0], ['删除', 0], ['上移', 0], ['下移', 0]]; const w0 = row(0, 0, it, 6).x; const r = row(X0 + CW - 16 - w0, TY + 10, it, 6); b.push(r.svg); }
  const cols = [['工序号', 72], ['工序名称', 120], ['工作中心', 130], ['加工车间', 110], ['控制码', 170], ['准备时间', 96, 'r'], ['标准工时', 100, 'r'], ['移转批量', 96, 'r'], ['首检', 70], ['汇报方式', 96], ['关键工序', 88], ['前置工序', 90]];
  const used = cols.reduce((a, c) => a + c[1], 0); cols.push(['资源 / 设备', CW - 32 - used]);
  const ccs = list => (x, cy) => { let px = x + 10, s2 = ''; list.forEach(c => { const o = pill(c, px, cy, CC[c][0], CC[c][1], 12, 500, 7, 22); s2 += o.svg; px += o.w + 5; }); return s2; };
  const yn = v => v ? (x, cy) => ic('check', x + 10, cy - 8, '#16A34A') : '—';
  const R11 = [['10', '锡膏印刷', 'SMT2-印刷', 'SMT二车间', ['首检', '汇报点'], '15 min', '16.0 s', '50', 1, '自动采集', '—', '—', 'DEK-02 印刷机 · 钢网 ST-BT52-02'],
    ['20', 'SPI 检测', 'SMT2-SPI', 'SMT二车间', ['质检'], '5 min', '16.0 s', '50', 0, '自动采集', '—', '10', 'KY8030 SPI'],
    ['30', '贴片', 'SMT2-贴片', 'SMT二车间', ['首检', '汇报点'], '25 min', '16.8 s', '50', 1, '自动采集', '关键', '20', '贴片机 01 / 02 · 程序 BT52_V2.3 · 0.35 s/点'],
    ['40', '回流焊', 'SMT2-回流', 'SMT二车间', ['汇报点'], '30 min', '16.8 s', '50', 0, '自动采集', '关键', '30', 'RF-2 十温区 · 曲线 SAC305-BT52'],
    ['50', 'AOI 检测', 'SMT2-AOI', 'SMT二车间', ['质检'], '5 min', '16.8 s', '50', 0, '自动采集', '—', '40', 'AOI-2 · NG 转 55 维修'],
    [{ t: '55', c: '#C2410C' }, { t: '维修', c: '#C2410C' }, 'SMT2-维修', 'SMT二车间', [], '—', '120 s', '1', 0, '手工汇报', '—', '50', '维修工位 RW-1（返修工序，不计入主线）'],
    ['60', '功能测试', 'TEST-FCT', '测试编带车间', ['质检', '汇报点'], '10 min', '22.0 s', '100', 1, 'PDA 扫码', '关键', '50', 'FCT 治具 × 4 · 程序 BT52-FCT-1.6'],
    ['70', '包装入库', 'PACK-02', '测试编带车间', ['入库点'], '5 min', '6.0 s', '500', 0, 'PDA 扫码', '—', '60', '扫码装盘 50 位 / 盘 · 生成入库']];
  const rows = R11.map(r => [r[0], r[1], r[2], r[3], ccs(r[4]), r[5], r[6], r[7], yn(r[8]), r[9], r[10] === '关键' ? (x, cy) => pill('关键', x + 10, cy, '#B91C1C', '#FEF2F2', 12, 500, 8, 22).svg : '—', r[11], r[12]]);
  const tb = tableX(X0 + 16, TY + 48, CW - 32, cols, rows, { id: 'pt11', rh: 36, sel: 2, total: (cx, cy) => T('合计（主线 7 道）', cx[0] + 10, cy, 13, 700, '#0F172A') + T('95 min', cx[5] + 96 - 12, cy, 13, 700, '#0F172A', 'end') + T('110.4 s', cx[6] + 100 - 12, cy, 13, 700, '#0F172A', 'end') + T('瓶颈节拍 16.8 s（FCT 4 治具并行）· 线体 UPH ≈ 214', cx[8] + 10, cy, 12, 400, '#64748B') });
  b.push(tb.svg);
  return SVG(1920, 1080, b.join(''));
}

// ==== MAIN ====
const ALL = { UI01: ui01, UI02: ui02, UI05: ui05, UI06: ui06, UI07: ui07, UI08: ui08, UI09: ui09, UI10: ui10, UI11: ui11 };
const want = process.argv.slice(2);
if (process.argv[1] && process.argv[1].endsWith('gen_b1.mjs')) for (const [k, fn] of Object.entries(ALL)) { if (want.length && !want.includes(k)) continue; fs.writeFileSync(OUT + k + '.svg', fn()); }

export { X0, CW, arrow, card, inner, dim, tabsBar, field, sw, radio, titleRow, dis, toolbar, tree, modal, secT, prio, tagF2, stF2 };
