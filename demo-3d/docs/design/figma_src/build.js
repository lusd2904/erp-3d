const av = await figma.listAvailableFontsAsync();
const has = f => av.some(x => x.fontName.family === f);
const FAM = ['Noto Sans SC','Source Han Sans SC','Noto Sans CJK SC','PingFang SC','Microsoft YaHei'].find(has) || 'Inter';
const st = av.filter(x => x.fontName.family === FAM).map(x => x.fontName.style);
const ps = (...c) => ({ family: FAM, style: c.find(s => st.includes(s)) || st[0] });
const FR = ps('Regular'), FM = ps('Medium','Regular'), FB = ps('Bold','SemiBold','Semi Bold','Medium','Regular');
const NB = has('Inter') ? { family: 'Inter', style: 'Bold' } : FB;
const NM = has('Inter') ? { family: 'Inter', style: 'Medium' } : FM;
const P = h => [figma.util.solidPaint(h)];
const SH = (a = 0.07, r = 24, y = 6) => [{ type: 'DROP_SHADOW', color: { r: 0.12, g: 0.25, b: 0.45, a }, offset: { x: 0, y }, radius: r, spread: 0, visible: true, blendMode: 'NORMAL' }];
const tx = (s, x, y, size, font = FR, col = '#1E293B', o = {}) => $fig.text({ characters: String(s), x, y, fontSize: size, fontName: font, fills: P(col), ...o });
const tw = (s, x, y, w, size, font, col, align = 'LEFT') => tx(s, x, y, size, font, col, { width: w, textAutoResize: 'HEIGHT', textAlignHorizontal: align });
const rc = (x, y, w, h, col, r = 0, o = {}) => $fig.rectangle({ x, y, width: w, height: h, fills: P(col), cornerRadius: r, ...o });
const fr = (o, ch = []) => $fig.frame({ fills: [], clipsContent: false, ...o }, ch);
const card = (name, x, y, w, h, ch, bg = '#FFFFFFE0') => fr({ name, x, y, width: w, height: h, fills: P(bg), cornerRadius: 14, strokes: P('#D6E2EF'), strokeWeight: 1, effects: SH() }, ch);
const SV = (s, w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${s}</svg>`;
const sv = (s, x, y, w, h, name = 'svg') => $fig.svg(SV(s, w, h), { x, y, name });
const pill = (s, x, y, fg, bg, size = 13, font = FM, px = 10, py = 3) => $fig.autoLayout({ name: 'tag ' + s, x, y, paddingLeft: px, paddingRight: px, paddingTop: py, paddingBottom: py, cornerRadius: 999, fills: P(bg), counterAxisAlignItems: 'CENTER' }, [tx(s, 0, 0, size, font, fg)]);
const bar = (x, y, w, h, p, col, bgc = '#E2E8F0') => [rc(x, y, w, h, bgc, h / 2), rc(x, y, Math.max(h, w * p), h, col, h / 2)];
const f1 = v => Math.round(v * 10) / 10;
// ---------- iso engine ----------
const C30 = Math.cos(Math.PI / 6);
const WH = ['#FFFFFF', '#E8EEF5', '#CDD9E6'], GR = ['#E2E8F0', '#CBD5E1', '#A3B1C2'], BL = ['#93C5FD', '#60A5FA', '#3B82F6'], BLD = ['#60A5FA', '#3B82F6', '#2563EB'], CY = ['#A5F3FC', '#67E8F9', '#22D3EE'], GL = ['#E0F2FE', '#BAE6FD', '#7DD3FC'], OR = ['#FED7AA', '#FDBA74', '#FB923C'], LT = ['#F8FAFC', '#E2E8F0', '#CBD5E1'];
const STK = '#8FA6BF';
function bx(L, x, y, z, w, d, h, c, op = 1, s = STK) {
  L.push({ p: [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], f: c[1], o: op, s });
  L.push({ p: [[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], f: c[2], o: op, s });
  L.push({ p: [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], f: c[0], o: op, s });
}
const fy = (L, x0, x1, y, z0, z1, f, o = 1, s = 'none') => L.push({ p: [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], f, o, s });
const fx = (L, x, y0, y1, z0, z1, f, o = 1, s = 'none') => L.push({ p: [[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]], f, o, s });
const ft = (L, x0, x1, y0, y1, z, f, o = 1, s = 'none', dash) => L.push({ p: [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], f, o, s, dash });
const ln = (L, pts, s, sw = 1.2, dash) => L.push({ p: pts, line: 1, s, sw, dash });
const circ = (cx, cy, cz, r, pl, n = 30) => { const a = []; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2, u = Math.cos(t) * r, v = Math.sin(t) * r; a.push(pl === 'xy' ? [cx + u, cy + v, cz] : pl === 'xz' ? [cx + u, cy, cz + v] : [cx, cy + u, cz + v]); } return a; };
function cyl(L, cx, cy, z, r, h, c, op = 1) { const b = circ(cx, cy, z, r, 'xy', 24), t = circ(cx, cy, z + h, r, 'xy', 24); L.push({ p: b.concat(t), hull: 1, f: c[1], o: op, s: STK }); L.push({ p: t, f: c[0], o: op, s: STK }); }
function hull(pts) { pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = []; for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (const p of pts.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); } return lo.slice(0, -1).concat(up.slice(0, -1)); }
const mk = (ox, oy, s) => ([X, Y, Z]) => [ox + (X - Y) * C30 * s, oy + (X + Y) * 0.5 * s - Z * s];
function render(L, pr, sc = 1) {
  return L.map(q => { let pts = q.p.map(pr); if (q.hull) pts = hull(pts); const ps2 = pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const st2 = q.s && q.s !== 'none' ? ` stroke="${q.s}" stroke-width="${q.sw || 0.8}" stroke-linejoin="round"` + (q.dash ? ` stroke-dasharray="${q.dash}"` : '') : '';
    if (q.line) return `<polyline points="${ps2}" fill="none"${st2} stroke-linecap="round"/>`;
    return `<polygon points="${ps2}" fill="${q.f}"${q.o < 1 ? ` fill-opacity="${q.o}"` : ''}${st2}/>`; }).join('');
}
// ---------- devices (local origin x, line axis yc) ----------
function tower(L, x, y, z) { bx(L, x, y, z, 0.35, 0.35, 0.9, GR); bx(L, x, y, z + 0.9, 0.35, 0.35, 0.35, ['#86EFAC', '#4ADE80', '#22C55E']); bx(L, x, y, z + 1.25, 0.35, 0.35, 0.35, ['#FDE68A', '#FCD34D', '#F59E0B']); bx(L, x, y, z + 1.6, 0.35, 0.35, 0.35, ['#FECACA', '#FCA5A5', '#EF4444']); }
function printer(L, x, yc) { bx(L, x, yc - 2.5, 0, 5, 5, 3.2, WH); bx(L, x + 0.3, yc - 2.2, 3.2, 4.4, 4.4, 0.7, BL, 0.9); fy(L, x + 0.8, x + 3.4, yc + 2.51, 1.5, 2.7, '#BFDBFE', 0.9, '#60A5FA'); fy(L, x, x + 5, yc + 2.52, 0.3, 0.6, '#2563EB'); tower(L, x + 4.4, yc - 2.3, 3.9); return 5; }
function spi(L, x, yc) { bx(L, x, yc - 2.3, 0, 4, 4.6, 3, WH); bx(L, x + 0.4, yc - 1.9, 3, 3.2, 3.8, 1, GL, 0.6, '#38BDF8'); fy(L, x + 0.6, x + 3.4, yc + 2.31, 1.4, 2.5, '#93C5FD', 0.8); fy(L, x, x + 4, yc + 2.32, 0.3, 0.6, '#06B6D4'); return 4; }
function mounter(L, x, yc) { bx(L, x, yc - 3, 0, 8, 6, 3, WH); bx(L, x + 0.8, yc - 2.6, 3, 0.5, 5.2, 1.6, GR); bx(L, x + 6.7, yc - 2.6, 3, 0.5, 5.2, 1.6, GR); bx(L, x + 0.8, yc - 0.4, 4.4, 6.4, 0.8, 0.4, BLD); bx(L, x + 3.5, yc - 0.6, 3.3, 1, 1.2, 1.1, CY); bx(L, x + 0.3, yc - 2.7, 3, 7.4, 5.4, 2, GL, 0.3, '#38BDF8');
  for (let i = 0; i < 10; i++) { const fx0 = x + 0.45 + i * 0.72; bx(L, fx0, yc + 3, 1.2, 0.6, 1.7, 1.6, ['#F1F5F9', '#D5DEE8', '#AAB8C8']); ft(L, fx0 + 0.1, fx0 + 0.5, yc + 3.2, yc + 4.4, 2.81, i % 3 ? '#67E8F9' : '#60A5FA'); }
  fy(L, x, x + 8, yc + 3.01, 0.3, 0.6, '#2563EB'); tower(L, x + 7.4, yc - 2.8, 5); return 8; }
function reflow(L, x, yc, len = 16) { for (const lx of [0.3, len - 0.8]) for (const ly of [-2, 1.4]) bx(L, x + lx, yc + ly, 0, 0.5, 0.5, 0.8, GR); bx(L, x, yc - 2.2, 0.8, len, 4.4, 2.6, WH); bx(L, x + 0.3, yc - 2, 3.4, len - 0.6, 4, 0.5, LT); const zw = (len - 0.6) / 8;
  for (let i = 0; i < 8; i++) { const x0 = x + 0.3 + i * zw; if (i) ln(L, [[x0, yc - 2, 3.9], [x0, yc + 2, 3.9]], '#94A3B8', 0.8); fy(L, x0 + zw * 0.25, x0 + zw * 0.75, yc + 2.21, 2.4, 2.9, i < 6 ? '#FDBA74' : '#7DD3FC'); }
  cyl(L, x + 3, yc, 3.9, 0.45, 0.8, LT); cyl(L, x + len - 4, yc, 3.9, 0.45, 0.8, LT); fy(L, x, x + len, yc + 2.21, 1, 1.3, '#2563EB'); fy(L, x + 0.6, x + 1.8, yc + 2.22, 1.5, 2.2, '#60A5FA'); return len; }
function aoi(L, x, yc) { bx(L, x, yc - 2.5, 0, 6, 5, 3.2, WH); bx(L, x + 0.2, yc - 2.3, 3.2, 5.6, 4.6, 2, LT); fy(L, x + 0.9, x + 5.1, yc + 2.31, 3.55, 4.85, '#60A5FA', 0.55, '#3B82F6'); fy(L, x, x + 6, yc + 2.51, 0.3, 0.6, '#06B6D4'); bx(L, x + 6, yc + 1.2, 2.6, 0.25, 0.3, 1, GR); bx(L, x + 6.25, yc + 0.6, 2.6, 0.2, 1.6, 1.1, BL); tower(L, x + 5.3, yc - 2.2, 5.2); return 6; }
function conveyor(L, x0, x1, yc, z = 1.9) { bx(L, x0, yc - 0.8, z, x1 - x0, 1.6, 0.3, GR); }
function taping(L, x, yc) { bx(L, x, yc - 2, 0, 8, 4, 2.8, WH); cyl(L, x + 1.4, yc, 2.8, 1.1, 0.7, BL); cyl(L, x + 1.4, yc, 3.5, 0.5, 0.25, GL); bx(L, x + 2.4, yc - 0.3, 2.85, 3.4, 0.6, 0.2, GR); bx(L, x + 3.8, yc - 0.8, 2.8, 1.2, 1.6, 1.3, BLD); bx(L, x + 5, yc + 1.5, 2.8, 3.2, 0.3, 3.4, WH);
  L.push({ p: circ(x + 6.6, yc + 1.85, 4.5, 1.4, 'xz', 32), f: '#DBEAFE', o: 1, s: '#3B82F6', sw: 1.2 }); L.push({ p: circ(x + 6.6, yc + 1.86, 4.5, 0.95, 'xz', 28), f: '#BFDBFE', o: 1, s: '#60A5FA' }); L.push({ p: circ(x + 6.6, yc + 1.87, 4.5, 0.3, 'xz', 16), f: '#2563EB', o: 1, s: 'none' });
  fy(L, x, x + 8, yc + 2.01, 0.3, 0.6, '#06B6D4'); return 8; }
function tester(L, x, yc) { bx(L, x, yc - 2.5, 0, 7, 5, 3, WH); cyl(L, x + 3.5, yc - 0.3, 3, 1.7, 0.35, BL); for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2; cyl(L, x + 3.5 + Math.cos(t) * 1.25, yc - 0.3 + Math.sin(t) * 1.25, 3.35, 0.18, 0.15, CY); }
  bx(L, x + 0.2, yc - 2.3, 3, 6.6, 4.6, 1.8, GL, 0.28, '#38BDF8'); for (let i = 0; i < 6; i++) bx(L, x + 0.5 + i * 1.02, yc + 2.5, 1, 0.85, 0.8, 0.8, i === 5 ? OR : CY); fy(L, x + 5.6, x + 6.7, yc + 2.51, 1.9, 2.8, '#60A5FA'); fy(L, x, x + 7, yc + 2.52, 0.2, 0.5, '#2563EB'); tower(L, x + 6.4, yc - 2.3, 4.8); return 7; }
function stacker(L, xc, yc, H, hc, r0, r1) { bx(L, r0, yc - 0.3, 0, r1 - r0, 0.6, 0.2, GR); bx(L, xc - 1.6, yc - 0.7, 0.2, 3.2, 1.4, 0.9, BL); bx(L, xc - 1, yc - 0.45, 1.1, 0.55, 0.9, H, BLD); bx(L, xc + 0.45, yc - 0.45, 1.1, 0.55, 0.9, H, BLD); bx(L, xc - 1.3, yc - 0.6, H + 1.1, 2.6, 1.2, 0.4, BL);
  bx(L, xc - 1.5, yc - 1.9, hc, 3, 3.6, 0.35, CY); bx(L, xc - 1, yc - 1.4, hc + 0.35, 2, 2.6, 1.1, OR); }
function agv(L, x, y, load, rot) { const w = rot ? 2.8 : 4, d = rot ? 4 : 2.8; bx(L, x, y, 0.25, w, d, 0.85, WH); fy(L, x, x + w, y + d + 0.01, 0.45, 0.7, '#06B6D4'); fx(L, x + w + 0.01, y, y + d, 0.45, 0.7, '#22D3EE'); bx(L, x + 0.4, y + 0.4, 1.1, w - 0.8, d - 0.8, 0.15, CY); if (rot) cyl(L, x + w / 2, y + d - 0.4, 1.1, 0.25, 0.3, GR); else cyl(L, x + w - 0.4, y + d / 2, 1.1, 0.25, 0.3, GR); if (load) bx(L, x + 0.6, y + 0.6, 1.25, w - 1.2, d - 1.2, 1.1, OR); }
function rack(L, x0, x1, y0, y1, H) { bx(L, x0, y0, 0, x1 - x0, y1 - y0, H, LT); const cw = 2.5, lh = 2.15, nc = Math.round((x1 - x0) / cw), nl = Math.round(H / lh); let k = 7;
  for (let i = 0; i < nc; i++) for (let j = 0; j < nl; j++) { k = (k * 37 + 11) % 100; const cx0 = x0 + i * (x1 - x0) / nc, cx1 = cx0 + (x1 - x0) / nc, z0 = j * H / nl, z1 = z0 + H / nl; fy(L, cx0 + 0.2, cx1 - 0.2, y1 + 0.02, z0 + 0.25, z1 - 0.2, k < 62 ? '#BFDBFE' : k < 82 ? '#FED7AA' : '#F1F5F9', 1, '#93C5FD'); }
  for (let i = 0; i <= nc; i++) { const cx = x0 + i * (x1 - x0) / nc; ln(L, [[cx, y1 + 0.03, 0], [cx, y1 + 0.03, H]], '#3B82F6', 1.6); }
  for (let j = 0; j <= nl; j++) ln(L, [[x0, y1 + 0.03, j * H / nl], [x1, y1 + 0.03, j * H / nl]], '#60A5FA', 1.2);
  for (let j = 0; j < nl; j++) fx(L, x1 + 0.02, y0 + 0.2, y1 - 0.2, j * H / nl + 0.25, (j + 1) * H / nl - 0.2, '#DBEAFE', 1, '#93C5FD'); }
// ================= PAGE 1: cockpit =================
const S1 = 12.6, pr1 = mk(843, 298, S1);
const BG = [], IT = [];
const add = (k, fn) => { const L = []; fn(L); IT.push({ k, L }); };
ft(BG, -1, 60, -1, 38.5, 0, '#FFFFFF', 0.92, '#B9CDE2');
for (let g = 3; g < 60; g += 4) ln(BG, [[g, -1, 0], [g, 38.5, 0]], '#E6EEF6', 0.8);
for (let g = 3; g < 38; g += 4) ln(BG, [[-1, g, 0], [60, g, 0]], '#E6EEF6', 0.8);
ft(BG, 3, 35, -0.6, 5.6, 0.01, '#E0F2FE', 0.7, '#7DD3FC', '6 4');
const LINES = [10.5, 20.5];
for (const yc of LINES) ft(BG, 3.2, 57.6, yc - 3.6, yc + 5, 0.01, '#DBEAFE', 0.45, '#93C5FD', '6 4');
ft(BG, 3.2, 38.4, 26.9, 33.8, 0.01, '#CFFAFE', 0.45, '#67E8F9', '6 4');
const lanes = [[[1.5, 6.5, 0.02], [58.6, 6.5, 0.02], [58.6, 35.8, 0.02], [1.5, 35.8, 0.02], [1.5, 6.5, 0.02]], [[1.5, 16.6, 0.02], [58.6, 16.6, 0.02]], [[1.5, 26.2, 0.02], [58.6, 26.2, 0.02]]];
for (const l of lanes) ln(BG, l, '#06B6D4', 2.4, '9 6');
add(-100, L => rack(L, 4, 34, -0.3, 3.4, 12.9));
add(-99, L => stacker(L, 20, 4.6, 12.6, 6.4, 4, 34));
const smtPos = [];
for (const yc of LINES) { let x = 4; const ds = [printer, spi, mounter, mounter, reflow, aoi]; ds.forEach((d, i) => { const x0 = x; const Lm = []; const w = d(Lm, x0, yc); IT.push({ k: x0 + w / 2 + yc, L: Lm }); if (yc === LINES[0]) smtPos.push([x0 + w / 2, yc]); x += w; if (i < ds.length - 1) { const a = x, b = x + 1.2; add(a + 0.6 + yc, L => conveyor(L, a, b, yc)); x = b; } }); }
const tapePos = []; { let x = 4; const yc = 30; [tester, tester, taping, taping].forEach((d, i) => { const x0 = x; const Lm = []; const w = d(Lm, x0, yc); IT.push({ k: x0 + w / 2 + yc, L: Lm }); tapePos.push([x0 + w / 2, yc, d === taping]); x += w; if (i < 3) { const a = x, b = x + 1.2; add(a + 0.6 + yc, L => conveyor(L, a, b, yc, 1.6)); x = b; } }); }
add(58.6 + 22, L => agv(L, 57.2, 20, 1, 1));
add(48 + 35.8, L => agv(L, 46, 34.4, 1, 0));
add(46 + 16.6, L => agv(L, 44, 15.2, 0, 0));
add(10 + 6.5, L => agv(L, 8, 5.1, 1, 0));
IT.sort((a, b) => a.k - b.k);
const sceneSvg = render(BG, pr1) + IT.map(i => render(i.L, pr1)).join('');
// cards content
const ring = (p, col, r = 42, w = 11) => { const cx = 48, cy = 48, a0 = -Math.PI / 2, a1 = a0 + p * Math.PI * 2; const ex = cx + r * Math.cos(a1), ey = cy + r * Math.sin(a1); return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#E2E8F0" stroke-width="${w}"/><path d="M ${cx} ${cy - r} A ${r} ${r} 0 ${p > 0.5 ? 1 : 0} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`; };
const donut = (vals, cols, R = 62, w = 22) => { let a = -Math.PI / 2, s = ''; const tot = vals.reduce((p, c) => p + c, 0); vals.forEach((v, i) => { const b = a + v / tot * Math.PI * 2 - 0.03; const c = 75; s += `<path d="M ${(c + R * Math.cos(a)).toFixed(2)} ${(c + R * Math.sin(a)).toFixed(2)} A ${R} ${R} 0 ${b - a > Math.PI ? 1 : 0} 1 ${(c + R * Math.cos(b)).toFixed(2)} ${(c + R * Math.sin(b)).toFixed(2)}" fill="none" stroke="${cols[i]}" stroke-width="${w}"/>`; a = b + 0.03; }); return s; };
const hrs = [8.6, 15.2, 16.8, 17.1, 12.4, 16.5, 17.3, 14.6], hb = hrs.map((v, i) => `<rect x="${i * 43 + 4}" y="${(48 - v * 2.6).toFixed(1)}" width="30" height="${(v * 2.6).toFixed(1)}" rx="4" fill="${i === 7 ? '#22D3EE' : '#93C5FD'}"/>`).join('');
const tr = [118.2, 122.5, 115.3, 126.1, 131.4, 124.7, 128.5], tp = tr.map((v, i) => [10 + i * 53, 150 - (v - 105) * 4.2]);
const trSvg = [0, 1, 2, 3].map(i => `<line x1="0" x2="340" y1="${20 + i * 40}" y2="${20 + i * 40}" stroke="#E8EEF5"/>`).join('') + `<polygon points="${tp.map(p => p.join(',')).join(' ')} 328,160 10,160" fill="#3B82F6" fill-opacity="0.12"/><polyline points="${tp.map(p => p.join(',')).join(' ')}" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linejoin="round"/>` + tp.map((p, i) => `<circle cx="${p[0]}" cy="${p[1].toFixed(1)}" r="${i === 6 ? 5 : 3.5}" fill="#FFFFFF" stroke="${i === 6 ? '#06B6D4' : '#2563EB'}" stroke-width="2"/>`).join('');
const ttl = (s, x = 20, y = 16) => tx(s, x, y, 18, FB, '#0F172A');
const dot = (x, y, c, r = 5) => $fig.ellipse({ x, y, width: r * 2, height: r * 2, fills: P(c) });
const wos = [['MO-20261112-001', 'SMT-1', 0.76], ['MO-20261112-002', 'SMT-2', 0.64], ['MO-20261112-004', '编带测试线', 0.38], ['MO-20261112-005', 'SMT-1', 0.22]];
const stock = [['0603 10kΩ 贴片电阻', '当前 12.4k / 安全 50k', '紧缺'], ['nRF52832 蓝牙芯片', '当前 860 / 安全 2,000', '紧缺'], ['MLCC 0402 104K', '当前 38k / 安全 80k', '偏低'], ['8mm 纸质载带', '当前 46 卷 / 安全 80 卷', '偏低'], ['锡膏 SAC305', '当前 18 瓶 / 安全 30 瓶', '偏低']];
const dev = [['运行', 42, '#10B981'], ['待机', 7, '#3B82F6'], ['维护', 3, '#F59E0B'], ['故障', 2, '#EF4444']];
const lineSt = [['SMT-1 线', '运行中', '#10B981', '#E7F8F1', 0.852, '今日 46,820 pcs · 节拍 0.32 s/点'], ['SMT-2 线', '运行中', '#10B981', '#E7F8F1', 0.804, '今日 44,150 pcs · 节拍 0.35 s/点'], ['编带/测试分选线', '换线中', '#EA580C', '#FFF1E6', 0.796, '今日 37,490 pcs · UPH 18,600']];
const machLbl = ['锡膏印刷机', 'SPI', '贴片机', '贴片机', '回流焊', 'AOI'], machZ = [5.8, 5, 6.6, 6.6, 6, 7.4];
const lbl = (s, X, Y, Z, w) => { const [px, py] = pr1([X, Y, Z]); return pill(s, Math.round(px - w / 2), Math.round(py - 12), '#1E3A8A', '#FFFFFFF0', 13, FM, 9, 3).set({ strokes: P('#93C5FD'), strokeWeight: 1, effects: SH(0.1, 8, 2) }); };
const cw = s => s.length * 13 + 20;
const p1 = fr({ name: '驾驶舱', x: 0, y: 0, width: 1920, height: 1080, clipsContent: true, fills: P('#F3F7FB') }, [
  (() => { const r = $fig.rectangle({ name: 'bg', x: 0, y: 0, width: 1920, height: 1080, fills: P('#F3F7FB') }); $fig.gradient(r, 'LINEAR', [{ pos: 0, color: figma.util.rgba('#FAFCFE') }, { pos: 1, color: figma.util.rgba('#E3ECF6') }]); return r; })(),
  sv(sceneSvg, 0, 0, 1920, 1080, '三维车间场景'),
  ...[['SMT-1 线', 3.3, 12.5], ['SMT-2 线', 3.3, 22.5], ['编带/测试线', 3.3, 32]].map(([s, X, Y]) => { const [px, py] = pr1([X, Y, 0]); const w = s.length * 15 + 34; return pill(s, Math.round(px - w), Math.round(py - 16), '#FFFFFF', '#2563EB', 15, FB, 14, 5); }),
  ...smtPos.map((p, i) => lbl(machLbl[i], p[0], p[1], machZ[i], cw(machLbl[i]))),
  ...tapePos.map(p => { const s = p[2] ? '编带机' : '测试分选机'; const [px, py] = pr1([p[0], p[1] + 3.6, 0]); return pill(s, Math.round(px - cw(s) / 2), Math.round(py + 8), '#1E3A8A', '#FFFFFFF0', 13, FM, 9, 3).set({ strokes: P('#93C5FD'), strokeWeight: 1, effects: SH(0.1, 8, 2) }); }),
  lbl('立体仓库', 6, 1.5, 14.2, cw('立体仓库')), lbl('堆垛机', 20, 4.6, 15.6, cw('堆垛机')), lbl('AGV', 48, 35.8, 3.4, 52),
  fr({ name: '顶栏', x: 0, y: 0, width: 1920, height: 76, fills: P('#FFFFFFEB'), effects: SH(0.06, 16, 2) }, [
    sv('<rect width="40" height="40" rx="10" fill="#2563EB"/><path d="M10 26 L20 12 L30 26 Z" fill="#67E8F9"/><rect x="10" y="27" width="20" height="3" rx="1.5" fill="#FFFFFF"/>', 28, 18, 40, 40, 'logo'),
    $fig.autoLayout({ name: '标题', x: 84, y: 18, itemSpacing: 16, counterAxisAlignItems: 'CENTER', fills: [] }, [tx('电子元器件生产管理ERP · 三维驾驶舱', 0, 0, 28, FB, '#0F172A'), pill('演示数据', 0, 0, '#FFFFFF', '#F97316', 15, FB, 12, 4)]),
    tw('一号厂区 · 白班　|　2026-11-12 星期四 14:58:36', 1280, 26, 470, 16, FM, '#475569', 'RIGHT'),
    pill('● 系统运行正常', 1772, 22, '#059669', '#E7F8F1', 13, FM, 10, 5),
    rc(0, 75, 1920, 1, '#D6E2EF')]),
  card('今日产量', 24, 96, 380, 214, [ttl('今日产量'), tx('截至 14:58', 282, 19, 13, FR, '#64748B'),
    $fig.autoLayout({ x: 20, y: 50, itemSpacing: 8, counterAxisAlignItems: 'MAX', fills: [] }, [tx('128,460', 0, 0, 42, NB, '#1D4ED8'), tx('pcs', 0, 0, 16, NM, '#64748B')]),
    tx('计划 140,000 · 达成率 91.8%', 20, 104, 14, FR, '#475569'), ...bar(20, 130, 340, 8, 0.918, '#2563EB'),
    sv(hb, 16, 150, 344, 48, '分时产量')]),
  card('良率', 24, 326, 182, 196, [ttl('良率'), sv(ring(0.986, '#10B981'), 43, 48, 96, 96, 'ring'), tw('98.6%', 23, 83, 136, 22, NB, '#0F172A', 'CENTER'), tw('目标 98.0%　+0.3%', 10, 160, 162, 13, FR, '#64748B', 'CENTER')]),
  card('OEE', 222, 326, 182, 196, [ttl('OEE'), sv(ring(0.82, '#2563EB'), 43, 48, 96, 96, 'ring'), tw('82.0%', 23, 83, 136, 22, NB, '#0F172A', 'CENTER'), tw('较昨日 +1.6%', 10, 160, 162, 13, FR, '#64748B', 'CENTER')]),
  card('在制工单', 24, 538, 380, 262, [ttl('在制工单'), $fig.autoLayout({ x: 20, y: 46, itemSpacing: 6, counterAxisAlignItems: 'MAX', fills: [] }, [tx('36', 0, 0, 36, NB, '#1D4ED8'), tx('单', 0, 0, 15, FM, '#64748B')]),
    tw('生产中 24 · 待开工 9 · 暂停 3', 150, 60, 210, 13, FR, '#475569', 'RIGHT'),
    ...wos.flatMap((w, i) => { const y = 112 + i * 36; return [tx(w[0], 20, y, 13, NM, '#334155'), tx(w[1], 146, y, 13, FR, '#64748B'), ...bar(232, y + 6, 92, 6, w[2], i === 2 ? '#F97316' : '#3B82F6'), tw(Math.round(w[2] * 100) + '%', 326, y, 36, 13, NM, '#334155', 'RIGHT')]; })]),
  card('近7日产量趋势', 24, 816, 380, 240, [ttl('近 7 日产量趋势'), tx('单位：千件', 286, 19, 13, FR, '#94A3B8'), sv(trSvg, 20, 46, 340, 162, 'trend'),
    ...['11-06', '11-07', '11-08', '11-09', '11-10', '11-11', '11-12'].map((d, i) => tw(d, 20 + 10 + i * 53 - 22, 210, 44, 12, NM, '#64748B', 'CENTER')), tw('128.5', 20 + tp[6][0] - 40, 46 + tp[6][1] - 26, 44, 13, NB, '#0891B2', 'RIGHT')]),
  card('设备状态分布', 1516, 96, 380, 296, [ttl('设备状态分布'), sv(donut(dev.map(d => d[1]), dev.map(d => d[2])), 20, 66, 150, 150, 'donut'), tw('54', 20, 116, 150, 30, NB, '#0F172A', 'CENTER'), tw('设备总数（台）', 20, 154, 150, 12, FR, '#64748B', 'CENTER'),
    ...dev.flatMap((d, i) => { const y = 74 + i * 40; return [dot(196, y + 5, d[2]), tx(d[0], 214, y, 15, FM, '#334155'), tx(d[1] + ' 台', 268, y, 15, NM, '#0F172A'), tw(f1(d[1] / 54 * 100) + '%', 306, y, 54, 14, NM, '#64748B', 'RIGHT')]; }),
    tx('设备综合利用率 77.8% · 本班停机 2 次', 20, 248, 13, FR, '#64748B')]),
  card('库存预警', 1516, 408, 380, 296, [ttl('库存预警'), pill('5 项', 316, 17, '#C2410C', '#FFEDD5', 13, FB),
    ...stock.flatMap((s, i) => { const y = 56 + i * 46; return [tx(s[0], 20, y, 14, FM, '#1E293B'), tx(s[1], 20, y + 21, 12, FR, '#64748B'), pill(s[2], 306, y + 6, s[2] === '紧缺' ? '#DC2626' : '#C2410C', s[2] === '紧缺' ? '#FDECEC' : '#FFF1E6', 13, FB), ...(i < 4 ? [rc(20, y + 42, 340, 1, '#EEF2F7')] : [])]; })]),
  card('产线运行状态', 1516, 720, 380, 336, [ttl('产线运行状态'),
    ...lineSt.flatMap((l, i) => { const y = 56 + i * 70; return [tx(l[0], 20, y, 15, FB, '#1E293B'), pill(l[1], 20 + l[0].length * 15 + 16, y - 1, l[2], l[3], 12, FB, 8, 2), tw('OEE ' + f1(l[4] * 100) + '%', 250, y, 110, 14, NB, '#1D4ED8', 'RIGHT'), ...bar(20, y + 28, 340, 6, l[4], i === 2 ? '#F97316' : '#22D3EE'), tx(l[5], 20, y + 42, 12, FR, '#64748B')]; }),
    rc(20, 266, 340, 1, '#EEF2F7'), tx('AGV 在线 6/6 · 执行任务 12 · 平均响应 38 s', 20, 282, 13, FM, '#334155'), tx('堆垛机 2 台 · 今日出入库 1,286 托', 20, 304, 13, FR, '#64748B')]),
  fr({ name: '图例', x: 452, y: 1002, width: 560, height: 40, fills: P('#FFFFFFD9'), cornerRadius: 10, strokes: P('#D6E2EF'), strokeWeight: 1 }, [
    sv('<line x1="0" y1="8" x2="34" y2="8" stroke="#06B6D4" stroke-width="2.5" stroke-dasharray="7 5"/>', 16, 12, 34, 16), tx('AGV 行驶路线', 58, 10, 14, FR, '#475569'),
    rc(184, 13, 22, 14, '#DBEAFE', 3, { strokes: P('#93C5FD'), strokeWeight: 1, dashPattern: [4, 3] }), tx('产线区域', 214, 10, 14, FR, '#475569'),
    rc(300, 13, 22, 14, '#E0F2FE', 3, { strokes: P('#7DD3FC'), strokeWeight: 1, dashPattern: [4, 3] }), tx('立体仓库区', 330, 10, 14, FR, '#475569'),
    dot(432, 15, '#22C55E'), tx('运行', 448, 10, 14, FR, '#475569'), dot(492, 15, '#F59E0B'), tx('换线', 508, 10, 14, FR, '#475569')]),
  $fig.autoLayout({ name: '视角切换', x: 1036, y: 1002, itemSpacing: 4, paddingLeft: 4, paddingRight: 4, paddingTop: 4, paddingBottom: 4, cornerRadius: 10, fills: P('#FFFFFFD9'), strokes: P('#D6E2EF'), strokeWeight: 1 },
    ['全景', 'SMT-1', 'SMT-2', '编带测试', '仓储物流'].map((s, i) => $fig.autoLayout({ paddingLeft: 14, paddingRight: 14, paddingTop: 6, paddingBottom: 6, cornerRadius: 7, fills: i ? [] : P('#2563EB') }, [tx(s, 0, 0, 14, FM, i ? '#475569' : '#FFFFFF')])))
]);
// ================= PAGE 2: list =================
const ico = c => sv(`<rect x="2" y="2" width="14" height="14" rx="4" fill="none" stroke="${c}" stroke-width="1.8"/><rect x="6" y="6" width="6" height="6" rx="1.5" fill="${c}"/>`, 0, 0, 18, 18, 'icon');
const NAV = ['销售订单', '物料与BOM', '生产订单', '领料', '生产汇报', '入库', '库存', '质检', '追溯', '报表'];
const STS = { 待排产: ['#475569', '#EEF2F6', '#94A3B8'], 生产中: ['#1D4ED8', '#E6F0FF', '#3B82F6'], 已完工: ['#15803D', '#E5F6EC', '#22C55E'], 异常: ['#DC2626', '#FDECEC', '#EF4444'] };
const ROWS = [['MO-20261112-001', 'DC-DC 电源模块 PM-0520', '5,000', 'SMT-1', '2026-11-12', '生产中', 0.76], ['MO-20261112-002', 'BLE5.0 蓝牙模块 BT-52', '8,000', 'SMT-2', '2026-11-12', '生产中', 0.64], ['MO-20261112-003', 'MLCC 0603 X7R 104K', '200,000', '编带测试线', '2026-11-12', '生产中', 0.47], ['MO-20261111-018', '功率电感 CD54-4R7', '60,000', '编带测试线', '2026-11-11', '已完工', 1], ['MO-20261111-017', 'LDO 模块 LM-1117', '12,000', 'SMT-1', '2026-11-11', '已完工', 1], ['MO-20261112-004', 'TVS 二极管 SMBJ5.0A', '150,000', '编带测试线', '2026-11-12', '异常', 0.38], ['MO-20261113-001', 'Wi-Fi 模块 WM-6200', '6,000', 'SMT-2', '2026-11-13', '待排产', 0], ['MO-20261113-002', 'DC-DC 电源模块 PM-1230', '4,000', 'SMT-1', '2026-11-13', '待排产', 0], ['MO-20261110-022', '晶振 3225 24MHz', '300,000', '编带测试线', '2026-11-10', '已完工', 1], ['MO-20261112-005', '电机驱动模块 MD-8833', '3,500', 'SMT-1', '2026-11-12', '生产中', 0.22], ['MO-20261114-001', 'MLCC 0402 X5R 105K', '500,000', '编带测试线', '2026-11-14', '待排产', 0], ['MO-20261111-015', 'BLE5.0 蓝牙模块 BT-52', '8,000', 'SMT-2', '2026-11-11', '异常', 0.81]];
const CX = [24, 204, 434, 534, 654, 784, 904], HD = ['单号', '产品型号', '数量', '产线', '计划日期', '状态', '进度'];
const inp = (x, y, w, s, ph = true) => fr({ x, y, width: w, height: 36, fills: P('#FFFFFF'), cornerRadius: 8, strokes: P('#CBD5E1'), strokeWeight: 1 }, [tx(s, 12, 8, 14, FR, ph ? '#94A3B8' : '#334155')]);
const sel = (x, y, w, s) => fr({ x, y, width: w, height: 36, fills: P('#FFFFFF'), cornerRadius: 8, strokes: P('#CBD5E1'), strokeWeight: 1 }, [tx(s, 12, 8, 14, FR, '#334155'), sv('<path d="M2 4 L6 8 L10 4" fill="none" stroke="#64748B" stroke-width="1.6" stroke-linecap="round"/>', w - 24, 12, 12, 12, 'chev')]);
const btn = (x, y, w, s, pri) => fr({ x, y, width: w, height: 36, fills: P(pri ? '#2563EB' : '#FFFFFF'), cornerRadius: 8, strokes: pri ? [] : P('#CBD5E1'), strokeWeight: 1 }, [tw(s, 0, 8, w, 14, FM, pri ? '#FFFFFF' : '#334155', 'CENTER')]);
const tag = (s, x, y) => pill(s, x, y, STS[s][0], STS[s][1], 13, FM, 10, 3);
const p2 = fr({ name: '业务列表页', x: 0, y: 1080, width: 1920, height: 1080, clipsContent: true, fills: P('#F4F7FB') }, [
  fr({ name: '顶栏', x: 0, y: 0, width: 1920, height: 64, fills: P('#FFFFFF') }, [sv('<rect width="34" height="34" rx="9" fill="#2563EB"/><path d="M8 23 L17 10 L26 23 Z" fill="#67E8F9"/>', 24, 15, 34, 34, 'logo'), tx('电子元器件生产管理ERP', 70, 18, 20, FB, '#0F172A'), pill('演示数据', 318, 19, '#FFFFFF', '#F97316', 13, FB, 10, 3),
    fr({ x: 1280, y: 14, width: 360, height: 36, fills: P('#F1F5F9'), cornerRadius: 18 }, [tx('搜索单号、物料、批次…', 40, 8, 14, FR, '#94A3B8'), sv('<circle cx="7" cy="7" r="5.5" fill="none" stroke="#94A3B8" stroke-width="1.8"/><line x1="11" y1="11" x2="15" y2="15" stroke="#94A3B8" stroke-width="1.8" stroke-linecap="round"/>', 14, 10, 16, 16, 'search')]),
    $fig.ellipse({ x: 1700, y: 14, width: 36, height: 36, fills: P('#DBEAFE') }), tw('张', 1700, 21, 36, 15, FB, '#1D4ED8', 'CENTER'), tx('张工 · 生产计划员', 1746, 21, 14, FM, '#334155'), rc(0, 63, 1920, 1, '#E2E8F0')]),
  fr({ name: '左侧导航', x: 0, y: 64, width: 220, height: 1016, fills: P('#FFFFFF'), strokes: P('#E2E8F0'), strokeWeight: 1 }, [tx('业务导航', 24, 20, 13, FM, '#94A3B8'),
    ...NAV.flatMap((n, i) => { const y = 48 + i * 50, on = n === '生产订单'; return [...(on ? [rc(12, y, 196, 42, '#E6F0FF', 8), rc(0, y + 6, 4, 30, '#2563EB', 2)] : []), ico(on ? '#2563EB' : '#94A3B8').set({ x: 32, y: y + 12 }), tx(n, 62, y + 10, 15, on ? FB : FR, on ? '#1D4ED8' : '#334155')]; })]),
  tx('生产管理  /  生产订单', 244, 84, 13, FR, '#64748B'), tx('生产订单', 244, 106, 24, FB, '#0F172A'), btn(1150, 104, 110, '+ 新建订单', 1), btn(1270, 104, 90, '导出', 0),
  fr({ name: '筛选栏', x: 244, y: 158, width: 1136, height: 72, fills: P('#FFFFFF'), cornerRadius: 12, strokes: P('#E2E8F0'), strokeWeight: 1 }, [
    tx('单号', 20, 26, 14, FM, '#334155'), inp(56, 18, 150, '请输入单号'), tx('产品', 226, 26, 14, FM, '#334155'), sel(262, 18, 160, '全部产品'), tx('状态', 442, 26, 14, FM, '#334155'), sel(478, 18, 120, '全部'), tx('日期', 618, 26, 14, FM, '#334155'),
    fr({ x: 654, y: 18, width: 250, height: 36, fills: P('#FFFFFF'), cornerRadius: 8, strokes: P('#CBD5E1'), strokeWeight: 1 }, [tx('2026-11-01  ~  2026-11-30', 12, 8, 14, NM, '#334155')]), btn(928, 18, 88, '查询', 1), btn(1028, 18, 88, '重置', 0)]),
  $fig.autoLayout({ name: '状态页签', x: 244, y: 246, itemSpacing: 8, fills: [] }, [['全部', 128], ['待排产', 18], ['生产中', 42], ['已完工', 63], ['异常', 5]].map(([s, n], i) => $fig.autoLayout({ paddingLeft: 14, paddingRight: 14, paddingTop: 6, paddingBottom: 6, cornerRadius: 8, itemSpacing: 6, fills: P(i ? '#FFFFFF' : '#2563EB'), strokes: i ? P('#E2E8F0') : [], strokeWeight: 1 }, [tx(s, 0, 0, 14, FM, i ? '#334155' : '#FFFFFF'), tx(String(n), 0, 0, 14, NB, i ? (STS[s] ? STS[s][2] : '#334155') : '#FFFFFF')]))),
  fr({ name: '生产订单表格', x: 244, y: 294, width: 1136, height: 716, fills: P('#FFFFFF'), cornerRadius: 12, strokes: P('#E2E8F0'), strokeWeight: 1, clipsContent: true }, [rc(0, 0, 1136, 48, '#F8FAFC'), rc(0, 47, 1136, 1, '#E2E8F0'),
    ...HD.map((h, i) => tx(h, CX[i], 14, 14, FB, '#475569')),
    ...ROWS.flatMap((r, i) => { const y = 48 + i * 55, on = i === 1, c = STS[r[5]]; return [...(on ? [rc(0, y, 1136, 55, '#EEF5FF'), rc(0, y, 3, 55, '#2563EB')] : []), tx(r[0], CX[0], y + 17, 14, NM, on ? '#1D4ED8' : '#2563EB'), tx(r[1], CX[1], y + 17, 14, FR, '#1E293B'), tx(r[2], CX[2], y + 17, 14, NM, '#1E293B'), tx(r[3], CX[3], y + 17, 14, FR, '#334155'), tx(r[4], CX[4], y + 17, 14, NM, '#334155'), tag(r[5], CX[5], y + 15), ...bar(CX[6], y + 24, 160, 7, r[6], c[2]), tw(Math.round(r[6] * 100) + '%', CX[6] + 164, y + 17, 44, 14, NM, '#334155', 'RIGHT'), rc(0, y + 54, 1136, 1, '#EEF2F7')]; })]),
  tx('共 128 条', 244, 1030, 14, FR, '#64748B'), $fig.autoLayout({ name: '分页', x: 1040, y: 1022, itemSpacing: 6, fills: [] }, ['‹', '1', '2', '3', '…', '11', '›'].map((s, i) => $fig.autoLayout({ width: 36, height: 34, layoutSizingHorizontal: 'FIXED', layoutSizingVertical: 'FIXED', primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER', cornerRadius: 7, fills: P(i === 1 ? '#2563EB' : '#FFFFFF'), strokes: i === 1 ? [] : P('#E2E8F0'), strokeWeight: 1 }, [tx(s, 0, 0, 14, NM, i === 1 ? '#FFFFFF' : '#334155')]))),
  fr({ name: '详情抽屉', x: 1400, y: 64, width: 520, height: 1016, fills: P('#FFFFFF'), effects: [{ type: 'DROP_SHADOW', color: { r: 0.1, g: 0.2, b: 0.35, a: 0.14 }, offset: { x: -8, y: 0 }, radius: 32, spread: 0, visible: true, blendMode: 'NORMAL' }] }, [
    tx('生产订单详情', 24, 20, 20, FB, '#0F172A'), sv('<path d="M3 3 L13 13 M13 3 L3 13" stroke="#64748B" stroke-width="1.8" stroke-linecap="round"/>', 480, 24, 16, 16, 'close'), rc(0, 63, 520, 1, '#E2E8F0'),
    tx('MO-20261112-002', 24, 80, 22, NB, '#1D4ED8'), tag('生产中', 222, 84), tx('BLE5.0 蓝牙模块 BT-52 · 当前工序：贴片', 24, 116, 14, FR, '#64748B'),
    rc(24, 148, 4, 18, '#2563EB', 2), tx('基本信息', 36, 146, 16, FB, '#0F172A'),
    ...[['产品型号', 'BLE5.0 蓝牙模块 BT-52'], ['订单数量', '8,000 pcs'], ['产线', 'SMT-2'], ['BOM 版本', 'BT52-BOM V2.3'], ['计划开工', '2026-11-12 08:00'], ['计划完工', '2026-11-13 20:00'], ['关联销售单', 'SO-20261105-021'], ['客户', '华东智联电子']].flatMap(([k, v], i) => { const x = 24 + (i % 2) * 240, y = 178 + Math.floor(i / 2) * 50; return [tx(k, x, y, 13, FR, '#94A3B8'), tx(v, x, y + 20, 15, FM, '#1E293B')]; }),
    rc(24, 386, 4, 18, '#2563EB', 2), tx('工序进度', 36, 384, 16, FB, '#0F172A'), tx('总进度 64%', 404, 386, 14, NB, '#1D4ED8'),
    ...[['锡膏印刷', 1, '已完成'], ['SPI 检测', 1, '已完成'], ['贴片', 0.72, '进行中'], ['回流焊', 0.66, '进行中'], ['AOI 检测', 0.64, '进行中'], ['包装入库', 0, '待开始']].flatMap(([n, p, s], i) => { const y = 418 + i * 44, c = s === '已完成' ? '#22C55E' : s === '进行中' ? '#3B82F6' : '#CBD5E1'; return [$fig.ellipse({ x: 26, y: y + 4, width: 14, height: 14, fills: P(c) }), ...(i < 5 ? [rc(32, y + 20, 2, 26, '#E2E8F0')] : []), tx(n, 52, y + 1, 14, FM, '#1E293B'), ...bar(150, y + 8, 220, 7, p, c), tw(Math.round(p * 100) + '%', 374, y + 1, 44, 14, NM, '#334155', 'RIGHT'), tx(s, 430, y + 1, 13, FR, s === '进行中' ? '#2563EB' : '#64748B')]; }),
    rc(24, 690, 4, 18, '#2563EB', 2), tx('物料', 36, 688, 16, FB, '#0F172A'), tx('齐套率 75%', 410, 690, 14, NB, '#C2410C'),
    fr({ x: 24, y: 720, width: 472, height: 200, fills: P('#FFFFFF'), cornerRadius: 10, strokes: P('#E2E8F0'), strokeWeight: 1, clipsContent: true }, [rc(0, 0, 472, 38, '#F8FAFC'),
      ...['物料编码', '名称', '需求', '已领', '状态'].map((h, i) => tx(h, [14, 104, 260, 330, 400][i], 10, 13, FB, '#475569')),
      ...[['M-10521', 'PCB BT52 V2.1', '8,000', '8,000', '齐套'], ['M-20318', 'nRF52832 芯片', '8,000', '5,200', '欠料'], ['M-30104', 'MLCC 0402 104K', '96,000', '96,000', '齐套'], ['M-40032', '晶振 2016 32MHz', '8,000', '8,000', '齐套']].flatMap((r, i) => { const y = 38 + i * 40; return [rc(0, y, 472, 1, '#EEF2F7'), tx(r[0], 14, y + 11, 13, NM, '#334155'), tx(r[1], 104, y + 11, 13, FR, '#1E293B'), tx(r[2], 260, y + 11, 13, NM, '#334155'), tx(r[3], 330, y + 11, 13, NM, '#334155'), pill(r[4], 398, y + 9, r[4] === '欠料' ? '#C2410C' : '#15803D', r[4] === '欠料' ? '#FFF1E6' : '#E5F6EC', 12, FM, 8, 2)]; })]),
    rc(0, 944, 520, 1, '#E2E8F0'), btn(24, 960, 140, '生产汇报', 1), btn(176, 960, 100, '领料', 0), btn(288, 960, 100, '编辑', 0), btn(400, 960, 96, '关闭', 0)])
]);
// ================= PAGE 3: equipment =================
const DEVS = [
  ['01', 'SMT贴片机', '透明顶盖可见龙门横梁与贴装头 · 前侧一排供料器 · 传送带左进右出 · 顶部三色灯', L => { conveyor(L, -1.5, 0, 0, 1.9); mounter(L, 0, 0); conveyor(L, 8, 9.5, 0, 1.9); }],
  ['02', '回流焊炉', '长条炉体 · 8 温区（橙色加热区 / 蓝色冷却区） · 网带传送带贯穿两端 · 顶部排风口', L => { conveyor(L, -2, 0, 0, 2.2); reflow(L, 0, 0); conveyor(L, 16, 18, 0, 2.2); }],
  ['03', 'AOI检测机', '箱体上部带检测窗 · 侧挂显示器 · 顶部三色灯 · 传送带贯穿', L => { conveyor(L, -1.5, 0, 0, 1.9); aoi(L, 0, 0); conveyor(L, 6, 7.5, 0, 1.9); }],
  ['04', '编带机', '振动盘上料 · 直线送料轨 · 封带头 · 前板收料卷盘', L => taping(L, 0, 0)],
  ['05', '测试分选机', '转塔测试盘 · 透明观察罩 · 前侧一排分选料盒 · 操作屏', L => tester(L, 0, 0)],
  ['06', '立体仓库堆垛机', '双立柱 + 顶梁 · 载货台沿立柱升降 · 底部地轨行走 · 后方为货架', L => { rack(L, -6, 6, -4.6, -1.6, 10.8); stacker(L, 0, 0, 10.4, 4.6, -6, 6); }],
  ['07', 'AGV', '低矮车体 · 顶部顶升板 · 前端激光雷达 · 侧面青色状态灯带', L => { agv(L, 0, 0, 0, 0); }]];
let devSvg = ''; const cards3 = [];
DEVS.forEach((d, i) => { const cx = 60 + (i % 4) * 456, cy = 150 + Math.floor(i / 4) * 457, L = []; d[3](L);
  const pts = L.flatMap(q => q.p.map(mk(0, 0, 1))); const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys); const s = Math.min(360 / bw, 270 / bh, 34);
  const ox = cx + 216 - (Math.min(...xs) + bw / 2) * s, oy = cy + 168 - (Math.min(...ys) + bh / 2) * s; const pr = mk(ox, oy, s);
  devSvg += `<ellipse cx="${cx + 216}" cy="${(oy + (Math.max(...ys)) * s - 6).toFixed(1)}" rx="${(bw * s * 0.42).toFixed(1)}" ry="16" fill="#DCE6F1" fill-opacity="0.6"/>` + render(L, pr);
  cards3.push(fr({ name: d[1], x: cx, y: cy, width: 432, height: 433, fills: P('#FFFFFF'), cornerRadius: 16, strokes: P('#DCE5EF'), strokeWeight: 1, effects: SH(0.06, 20, 4) }, [rc(0, 0, 432, 320, '#F7FAFD', 16), pill(d[0], 20, 338, '#FFFFFF', '#2563EB', 13, NB, 9, 3), tx(d[1], 62, 334, 21, FB, '#0F172A'), tw(d[2], 20, 372, 392, 14, FR, '#64748B')])); });
const sw = [['机身白', '#F4F7FB'], ['机身灰', '#CBD5E1'], ['主色蓝', '#2563EB'], ['强调青', '#22D3EE'], ['玻璃罩 30%', '#BAE6FD'], ['告警/货物橙', '#FB923C']];
const p3 = fr({ name: '设备参考图', x: 0, y: 2160, width: 1920, height: 1080, clipsContent: true, fills: P('#F1F5F9') }, [
  tx('设备外观参考图', 60, 44, 32, FB, '#0F172A'), tx('电子元器件生产管理ERP · 三维建模参考 · 等距视角 · 浅色材质 · 各设备比例为示意，不按同一比例尺', 60, 94, 16, FR, '#64748B'), pill('演示数据', 1772, 50, '#FFFFFF', '#F97316', 14, FB, 12, 4),
  ...cards3,
  fr({ name: '建模配色参考', x: 60 + 3 * 456, y: 607, width: 432, height: 433, fills: P('#FFFFFF'), cornerRadius: 16, strokes: P('#DCE5EF'), strokeWeight: 1, effects: SH(0.06, 20, 4) }, [tx('建模配色与材质参考', 24, 24, 20, FB, '#0F172A'),
    ...sw.flatMap(([n, c], i) => { const x = 24 + (i % 2) * 196, y = 70 + Math.floor(i / 2) * 64; return [rc(x, y, 44, 44, c, 10, { strokes: P('#CBD5E1'), strokeWeight: 1 }), tx(n, x + 56, y + 2, 14, FM, '#1E293B'), tx(c.toUpperCase(), x + 56, y + 23, 12, NM, '#64748B')]; }),
    rc(24, 268, 384, 1, '#E2E8F0'),
    tw('• 视角：标准等距（30°），光源左上，顶面最亮\n• 机身哑光白 + 浅灰侧面，蓝色腰线标识产线\n• 透明罩体 30% 不透明度，可见内部机构\n• 三色灯：绿 运行 / 黄 待机 / 红 故障', 24, 284, 384, 14, FR, '#475569')]),
  sv(devSvg, 0, 0, 1920, 1080, '设备等距图')]);
const all = fr({ name: 'ERP设计图_全部', x: 0, y: 0, width: 1920, height: 3240, clipsContent: true, fills: P('#FFFFFF') }, [p1, p2, p3]);
await $fig.done();
return { font: FAM, styles: st, all: all.node.id, p1: p1.node.id, p2: p2.node.id, p3: p3.node.id };
