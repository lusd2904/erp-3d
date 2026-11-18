// 第 3 批页面：UI21 UI22 UI23 UI26 UI27 UI28(+err) UI29 UI30 UI31   (node gen_b3.mjs [UIxx ...])
import { fs, OUT, W, T, R, pill, bar, ring, g, ic, chk, btn, row, tag1, tag2, ST1, ST2, frame, tableX, SVG, PROD, LL } from './gen_full.mjs';
import { X0, CW, arrow, card, inner, dim, tabsBar, field, sw, radio, titleRow, toolbar, tree, modal, secT, prio, tagF2, stF2 } from './gen_b1.mjs';
ST2['结案'] = ['#334155', '#E2E8F0']; ST2['挂起'] = ['#B45309', '#FEF3C7'];
const MW = 1316, PX = 1556, PW = 348;
const okI = (x, cy, c = '#16A34A') => ic('check', x, cy - 8, c);
const warnI = (x, cy, s = 1) => `<g transform="translate(${x},${cy}) scale(${s})"><path d="M0 -8 L8.5 7 H-8.5 Z" fill="#F59E0B" stroke="#F59E0B" stroke-width="2" stroke-linejoin="round"/><rect x="-1" y="-3.5" width="2" height="6" rx="1" fill="#FFFFFF"/><circle cx="0" cy="4.6" r="1.1" fill="#FFFFFF"/></g>`;
const errI = (x, cy, s = 1) => `<g transform="translate(${x},${cy}) scale(${s})"><circle r="8" fill="#DC2626"/><path d="M-3.2 -3.2 L3.2 3.2 M3.2 -3.2 L-3.2 3.2" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/></g>`;
const fields = (x, y, w, n, F, o = {}) => { const fw = w / n, lw = o.lw || 80; return F.map(([l, v, op = {}], i) => field(x + (i % n) * fw, y + Math.floor(i / n) * (o.rh || 44), l, v, { lw, iw: fw - lw - 14, ...op })).join(''); };
const lastMod = s => T(s, 1904, 120, 12, 400, '#94A3B8', 'end');

// ======================= PDA 公共 =======================
const tick = (cx, cy, s, c = '#FFFFFF', wdt = 3) => `<path d="M${cx - s} ${cy} L${cx - s * 0.3} ${cy + s * 0.7} L${cx + s} ${cy - s * 0.75}" fill="none" stroke="${c}" stroke-width="${wdt}" stroke-linecap="round" stroke-linejoin="round"/>`;
function pdaTop(b, title, sub, time, batt = '86%', red = false) {
  b.push(red ? R(0, 0, 720, 1280, 'url(#errG)') + `<circle cx="620" cy="300" r="260" fill="#FFFFFF" fill-opacity="0.06"/><circle cx="80" cy="1040" r="220" fill="#FFFFFF" fill-opacity="0.05"/>` : R(0, 0, 720, 1280, '#F1F5F9') + R(0, 0, 720, 152, '#2563EB'));
  const sb = '#FFFFFF';
  b.push(T(time, 32, 26, 22, 700, sb) + [0, 1, 2, 3].map(i => R(560 + i * 9, 32 - i * 5 - 6, 6, 6 + i * 5, sb, 1)).join('') + R(610, 15, 44, 22, 'none', 5, ` stroke="${sb}" stroke-width="2"`) + R(614, 19, 30 * parseInt(batt) / 86, 14, sb, 2) + R(656, 22, 4, 8, sb, 1) + T(batt, 704, 26, 16, 500, sb, 'end'));
  b.push(`<path d="M44 100 L30 86 M30 86 L44 72" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" transform="translate(0,14)"/>`);
  b.push(T(title, 76, 100, 32, 700, '#FFFFFF') + T(sub, 76, 136, 18, 400, '#FFFFFF', 'start', ' fill-opacity="0.85"') + ic('more', 660, 88, '#FFFFFF', 28));
}
const pc = (y, h, ex = '') => R(24, y, 672, h, '#FFFFFF', 20, ex || ' stroke="#E2E8F0" filter="url(#sh)"');
const scanIc = (x, cy, c = '#2563EB', s = 26) => { const h = s / 2; return `<path d="M${x} ${cy - h + 7} V${cy - h} H${x + 7} M${x + s - 7} ${cy - h} H${x + s} V${cy - h + 7} M${x + s} ${cy + h - 7} V${cy + h} H${x + s - 7} M${x + 7} ${cy + h} H${x} V${cy + h - 7}" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` + R(x + 5, cy - 1.2, s - 10, 2.4, c, 1.2); };
const scanBox = (y, ph, val, st) => { // st: ok / warn / err / null
  const bc = st === 'ok' ? '#16A34A' : st === 'warn' ? '#F59E0B' : st === 'err' ? '#DC2626' : '#2563EB';
  return R(24, y, 672, 76, '#FFFFFF', 16, ` stroke="${bc}" stroke-width="2"`) + scanIc(48, y + 38, bc) + (val ? T(val, 92, y + 28, 22, 700, '#0F172A') + T(ph, 92, y + 56, 15, 400, '#64748B') : T(ph, 92, y + 38, 20, 400, '#94A3B8')) + R(600, y + 14, 80, 48, '#EFF6FF', 12) + T('扫码', 640, y + 38, 18, 700, '#1D4ED8', 'middle'); };
const kv = (y, k, v, c = '#0F172A', o = {}) => T(k, 48, y, 18, 400, '#64748B') + T(v, o.x || 196, y, o.s || 19, o.w || 700, c) + (o.line === 0 ? '' : R(48, y + 22, 624, 1, '#EEF2F7'));
const bigBtn = (x, w, s, kind) => { const y = 1160; // kind: p 蓝 g 绿 w 白 r 红字 t 透明
  const f = { p: '#2563EB', g: '#16A34A', w: '#FFFFFF', r: '#FFFFFF', t: '#FFFFFF' }[kind];
  const ex = kind === 'w' ? ' stroke="#CBD5E1" stroke-width="2"' : kind === 't' ? ' fill-opacity="0.12" stroke="#FFFFFF" stroke-width="2"' : ' filter="url(#sh)"';
  return R(x, y, w, 92, f, 18, ex) + T(s, x + w / 2, y + 46, kind === 'w' || kind === 't' ? 26 : 29, kind === 'w' || kind === 't' ? 500 : 700, { p: '#FFFFFF', g: '#FFFFFF', w: '#334155', r: '#DC2626', t: '#FFFFFF' }[kind], 'middle'); };
const taskCard = (y, no, tag, line2, prog, p, tc) => pc(y, 140) + T(no, 48, y + 34, 24, 700, '#0F172A') + pill(tag[0], 672, y + 34, tag[1], tag[2], 16, 700, 12, 30, 'end').svg + T(line2, 48, y + 70, 18, 400, '#64748B') + T(prog[0], 48, y + 110, 19, 500, '#0F172A') + bar(prog[2] || 232, y + 105, 672 - (prog[2] || 232) - 76, 10, p, tc || '#2563EB') + T(prog[1], 672, y + 110, 19, 700, '#0F172A', 'end');
const pdaWrap = (id, body) => `<clipPath id="${id}c"><rect width="720" height="1280"/></clipPath><g clip-path="url(#${id}c)">${body}</g>`;

// ======================= UI26 PDA 收料 / 入库 =======================
function ui26() {
  const b = []; pdaTop(b, '采购收料 · 扫码入库', '仓管 李娜 · 原材料一号仓', '13:52', '74%');
  b.push(taskCard(168, '收料通知 RN-20261113-005', ['需 IQC', '#B45309', '#FEF3C7'], 'PO-20261111-012 · 深圳润芯科技 · 到货 13:40', ['已收 2 / 3 盘', '4,000 / 6,000'], 2 / 3, '#2563EB'));
  // 分段
  b.push(R(24, 324, 672, 60, '#E2E8F0', 14) + R(28, 328, 332, 52, '#FFFFFF', 11, ' filter="url(#sh)"') + T('收料', 194, 354, 20, 700, '#1D4ED8', 'middle') + T('上架入库', 526, 354, 20, 500, '#64748B', 'middle') + `<circle cx="590" cy="344" r="11" fill="#94A3B8"/>` + T('2', 590, 344, 13, 700, '#FFFFFF', 'middle'));
  b.push(scanBox(400, '卷盘标签 · 13:52:18', 'R26111306-00051', 'ok'));
  // 识别结果
  const y0 = 492; b.push(pc(y0, 448));
  b.push(`<clipPath id="u26h"><rect x="24" y="${y0}" width="672" height="448" rx="20"/></clipPath><g clip-path="url(#u26h)">` + R(24, y0, 672, 64, '#F0FDF4') + R(24, y0 + 63, 672, 1, '#BBF7D0') + '</g>');
  b.push(`<circle cx="66" cy="${y0 + 32}" r="16" fill="#16A34A"/>` + tick(66, y0 + 33, 7, '#FFFFFF', 3) + T('料号与采购订单一致 · 第 3 盘', 94, y0 + 32, 21, 700, '#15803D') + T('0.21 s', 672, y0 + 32, 16, 400, '#16A34A', 'end'));
  let y = y0 + 96;
  [['料号', '2.03.0915  RTL8720DN', '#0F172A'], ['物料名称', 'Wi-Fi / BLE 双模 SoC · QFN48', '#334155'], ['数量', '2,000 pcs（订单余量 2,000）', '#0F172A'], ['批号 / D/C', 'L2643-R11 · 2643', '#0F172A'], ['包装', 'MSL 3 · 真空包装完好 · 湿度卡 < 10%', '#15803D'], ['原厂', 'Realtek · 原厂标签已校验', '#334155']].forEach(([k, v, c], i) => { b.push(kv(y, k, v, c, { line: i < 5 ? 1 : 0 })); y += 56; });
  // 上架库位
  y = 956; b.push(pc(y, 112));
  b.push(T('上架库位', 48, y + 32, 18, 400, '#64748B') + pill('系统推荐', 672, y + 32, '#1D4ED8', '#E6F0FF', 15, 700, 10, 28, 'end').svg);
  b.push(T('Q-01-03  来料待检区', 48, y + 74, 26, 700, '#0F172A') + T('IQC 合格后转 A-03-15', 672, y + 76, 16, 400, '#64748B', 'end'));
  // 已收清单（微型）
  y = 1084; b.push(T('已收', 48, y + 22, 16, 500, '#64748B'));
  [['-00049', 1], ['-00050', 1], ['-00051', 2]].forEach(([s, st], i) => { const x = 104 + i * 196; b.push(R(x, y + 4, 184, 36, st === 2 ? '#DCFCE7' : '#FFFFFF', 10, st === 2 ? ' stroke="#86EFAC"' : ' stroke="#E2E8F0"') + `<circle cx="${x + 18}" cy="${y + 22}" r="8" fill="#16A34A"/>` + tick(x + 18, y + 22.5, 3.6, '#FFFFFF', 2) + T(s + ' · 2,000', x + 34, y + 22, 15, 500, '#1E293B')); });
  b.push(bigBtn(24, 420, '确认收料（3 / 3）', 'p') + bigBtn(460, 236, '差异登记', 'w'));
  return SVG(720, 1280, pdaWrap('u26', b.join('')));
}

// ======================= UI27 PDA 领料（FIFO） =======================
function ui27() {
  const b = []; pdaTop(b, '生产领料 · 按单拣货', '仓管 李娜 · 原材料一号仓', '10:36', '85%');
  b.push(taskCard(168, '领料单 PICK-20261113-004', ['严格 FIFO', '#1D4ED8', '#E6F0FF'], '工单 MO-20261112-002 · 分录 2 · BT-52 × 2,000', ['已扫 8 / 12 盘', '67%'], 8 / 12, '#10B981'));
  // 当前物料
  let y = 324; b.push(pc(y, 132));
  b.push(T('当前物料 4 / 7', 48, y + 30, 16, 500, '#64748B') + T('需发 24,480 · 已发 10,000', 672, y + 30, 16, 500, '#334155', 'end'));
  b.push(T('2.02.0402  MLCC 0402 104K 16V', 48, y + 68, 23, 700, '#0F172A') + T('位号 C1–C12 · 12 / 板 · 损耗 2% · 每盘 10,000', 48, y + 104, 17, 400, '#64748B'));
  b.push(scanBox(472, '卷盘标签 · 10:36:02 · 库位 B-02-07', 'R26110518-00412', 'warn'));
  // FIFO 警告
  y = 564; b.push(pc(y, 236, ' stroke="#FCD34D" stroke-width="2" filter="url(#sh)"'));
  b.push(`<clipPath id="u27h"><rect x="24" y="${y}" width="672" height="236" rx="20"/></clipPath><g clip-path="url(#u27h)">` + R(24, y, 672, 72, '#FFFBEB') + R(24, y + 71, 672, 1, '#FDE68A') + '</g>');
  b.push(warnI(66, y + 36, 1.8) + T('先进先出提示：非最早批次', 98, y + 26, 23, 700, '#B45309') + T('料号正确，但仓内还有 2 盘更早入库的同料号卷盘', 98, y + 54, 16, 400, '#92400E'));
  b.push(T('本次扫描', 48, y + 104, 17, 400, '#64748B') + T('入库 2026-11-05 · L2645-F02 · B-02-07', 196, y + 104, 19, 700, '#B45309'));
  b.push(T('处理方式', 48, y + 148, 17, 400, '#64748B') + T('按推荐顺序重扫，或申请跳批（需班组长授权）', 196, y + 148, 17, 500, '#334155'));
  b.push(T('时间差', 48, y + 192, 17, 400, '#64748B') + T('较最早批次晚入库 28 天', 196, y + 192, 17, 500, '#334155'));
  // FIFO 推荐顺序
  y = 816; b.push(pc(y, 328));
  b.push(T('FIFO 推荐顺序', 48, y + 32, 20, 700, '#0F172A') + T('按入库日期升序', 672, y + 32, 16, 400, '#64748B', 'end'));
  const FL = [['1', 'R26100811-00102', '10-08', 'B-02-04', '10,000', 'done'], ['2', 'R26101520-00233', '10-15', 'B-02-05', '10,000', 'next'], ['3', 'R26102214-00310', '10-22', 'B-02-05', '发 4,480', 'todo'], ['4', 'R26110518-00412', '11-05', 'B-02-07', '暂不发', 'scan']];
  FL.forEach(([n, r, d, loc, q, st], i) => { const yy = y + 64 + i * 64, cy = yy + 28;
    if (st === 'next') b.push(R(36, yy, 648, 56, '#EFF6FF', 12, ' stroke="#93C5FD" stroke-width="1.5"'));
    if (st === 'scan') b.push(R(36, yy, 648, 56, '#FFFBEB', 12, ' stroke="#FDE68A"'));
    const cc = st === 'done' ? '#16A34A' : st === 'next' ? '#2563EB' : st === 'scan' ? '#F59E0B' : '#CBD5E1';
    b.push(`<circle cx="66" cy="${cy}" r="15" fill="${st === 'todo' ? '#FFFFFF' : cc}" stroke="${cc}" stroke-width="2"/>` + (st === 'done' ? tick(66, cy + 0.5, 6, '#FFFFFF', 2.6) : T(n, 66, cy, 15, 700, st === 'todo' ? '#64748B' : '#FFFFFF', 'middle')));
    b.push(T(r, 96, cy - 10, 18, 700, st === 'todo' ? '#475569' : '#0F172A') + T('入库 ' + d + ' · ' + loc, 96, cy + 14, 15, 400, '#64748B'));
    b.push(T(q, 666, cy - 10, 17, 700, st === 'scan' ? '#B45309' : '#1E293B', 'end') + T(st === 'done' ? '已拣 10:31' : st === 'next' ? '下一盘 · 推荐' : st === 'scan' ? '本次扫描' : '待拣', 666, cy + 14, 15, st === 'next' ? 700 : 400, st === 'next' ? '#1D4ED8' : st === 'scan' ? '#B45309' : '#94A3B8', 'end')); });
  b.push(bigBtn(24, 420, '去 B-02-05 重扫', 'p') + bigBtn(460, 236, '申请跳批', 'w'));
  return SVG(720, 1280, pdaWrap('u27', b.join('')));
}

// ======================= UI28 PDA SMT 上料防错 =======================
function pda28(ok) {
  const b = [], id = ok ? 'u28' : 'u28e', red = !ok;
  pdaTop(b, 'SMT 上料 · 防错核对', '上料员 王磊 · SMT-2 线 · PDA-07', '14:41', '62%', red);
  // 任务卡
  const tc = red ? '#FFFFFF' : '#0F172A', tm = red ? '#FEE2E2' : '#64748B';
  b.push(R(24, 168, 672, 140, '#FFFFFF', 20, red ? ' fill-opacity="0.14" stroke="#FFFFFF" stroke-opacity="0.35"' : ' stroke="#E2E8F0" filter="url(#sh)"'));
  b.push(T('换料 · ZW-BT52-SMT2-02', 48, 202, 24, 700, tc) + pill('站位 × 卷盘', 672, 202, red ? '#DC2626' : '#1D4ED8', red ? '#FFFFFF' : '#E6F0FF', 16, 700, 12, 30, 'end').svg);
  b.push(T('MO-20261112-002 · 分录 1 · BT-52 · 叫料单 14:12', 48, 238, 18, 400, tm));
  b.push(T('核对顺序', 48, 278, 18, 500, tc));
  { let x = 150; ['设备', '轨道', '飞达', '料盘'].forEach((t, i) => { const last = i === 3, st = last ? (ok ? 'ok' : 'err') : 'ok';
    const f = red ? (last ? '#FFFFFF' : '#FFFFFF33') : (last ? '#DCFCE7' : '#F0FDF4'), fc = red ? (last ? '#DC2626' : '#FFFFFF') : '#15803D';
    const w = W(t, 16, 700) + 50; b.push(R(x, 262, w, 32, f, 16) + (st === 'ok' ? tick(x + 18, 278.5, 5, fc, 2.4) : `<path d="M${x + 13} 273 L${x + 23} 283 M${x + 23} 273 L${x + 13} 283" stroke="#DC2626" stroke-width="2.6" stroke-linecap="round"/>`) + T(t, x + 32, 278, 16, 700, fc)); x += w; if (i < 3) { b.push(R(x + 6, 277, 14, 2, red ? '#FFFFFF88' : '#86EFAC', 1)); x += 26; } }); }
  // 站位 × 卷盘 对照
  const CY = 324, CH = 556;
  b.push(R(24, CY, 672, CH, '#FFFFFF', 22, ' filter="url(#shP)"'));
  b.push(`<clipPath id="${id}h"><rect x="24" y="${CY}" width="672" height="${CH}" rx="22"/></clipPath><g clip-path="url(#${id}h)">` + (ok ? R(24, CY, 672, 88, 'url(#okG)') : R(24, CY, 672, 88, '#FEF2F2') + R(24, CY + 87, 672, 1, '#FECACA')) + '</g>');
  if (ok) b.push(`<circle cx="74" cy="${CY + 44}" r="24" fill="#FFFFFF"/>` + tick(74, CY + 45, 11, '#16A34A', 5) + T('核对通过 · 允许上料', 112, CY + 34, 28, 700, '#FFFFFF') + T('站位 F-07 与卷盘料号一致 · 已记录上料履历', 112, CY + 66, 17, 400, '#FFFFFF', 'start', ' fill-opacity="0.92"'));
  else b.push(`<path d="M74 ${CY + 20} L100 ${CY + 66} H48 Z" fill="#DC2626" stroke="#DC2626" stroke-width="4" stroke-linejoin="round"/><rect x="71.5" y="${CY + 36}" width="5" height="16" rx="2.5" fill="#FFFFFF"/><circle cx="74" cy="${CY + 58}" r="3" fill="#FFFFFF"/>` + T('错料！禁止上料', 116, CY + 34, 28, 700, '#B91C1C') + T('错误码 E-301 站位料号不符 · 贴片机已暂停供料', 116, CY + 66, 17, 400, '#B91C1C'));
  // 两列标题
  const LX = 48, MX = 360, colW = 296; let y = CY + 116;
  b.push(R(LX, y - 18, colW, 40, '#F1F5F9', 10) + T('站位（上料表）', LX + 14, y + 2, 17, 700, '#334155') + T('F-07', LX + colW - 14, y + 2, 17, 700, '#1D4ED8', 'end'));
  b.push(R(MX + 16, y - 18, colW, 40, ok ? '#F0FDF4' : '#FEF2F2', 10) + T('卷盘（扫描）', MX + 30, y + 2, 17, 700, ok ? '#15803D' : '#B91C1C') + T(ok ? '-00318' : '-01164', MX + 16 + colW - 14, y + 2, 17, 700, ok ? '#15803D' : '#B91C1C', 'end'));
  const rows = ok ? [['料号', '2.03.0832', '2.03.0832', 1], ['型号', 'nRF52832-QFAA', 'nRF52832-QFAA', 1], ['封装', 'QFN48', 'QFN48', 1], ['编带 / 飞达', '16 mm · FD16-0218', '16 mm', 1], ['MSL', '3 级 · ≤ 168 h', '已暴露 39.7 h', 1], ['数量', '本单余 1,880', '3,000 pcs', 1]]
    : [['料号', '2.03.0832', '2.03.0840', 0], ['型号', 'nRF52832-QFAA', 'nRF52840-QIAA', 0], ['封装', 'QFN48', 'aQFN73', 0], ['编带 / 飞达', '16 mm · FD16-0218', '16 mm', 1], ['MSL', '3 级 · ≤ 168 h', '已暴露 162.0 h', 2], ['数量', '本单余 1,880', '1,500 pcs', 1]];
  y += 46;
  rows.forEach(([k, a, c2, st]) => { const cy = y + 26;
    b.push(T(k, LX, cy - 12, 14, 400, '#94A3B8') + T(a, LX, cy + 12, 19, 700, '#0F172A'));
    const col = st === 1 ? '#0F172A' : st === 2 ? '#C2410C' : '#DC2626';
    if (st === 0) b.push(R(MX + 16, y + 2, colW, 50, '#FEF2F2', 8));
    b.push(T(k, MX + 30, cy - 12, 14, 400, '#94A3B8') + T(c2, MX + 30, cy + 12, 19, 700, col));
    b.push(st === 1 ? `<circle cx="${MX - 4}" cy="${cy}" r="13" fill="#DCFCE7"/>` + tick(MX - 4, cy + 0.5, 5.5, '#16A34A', 2.4) : st === 2 ? warnI(MX - 4, cy, 1.3) : `<circle cx="${MX - 4}" cy="${cy}" r="13" fill="#DC2626"/><path d="M${MX - 9} ${cy - 5} L${MX + 1} ${cy + 5} M${MX + 1} ${cy - 5} L${MX - 9} ${cy + 5}" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>`);
    if (k !== '数量') b.push(R(LX, y + 55, 624, 1, '#EEF2F7')); y += 58; });
  if (!ok) b.push(T('已播放错误提示音 · 防错日志 #E301-0142', 360, CY + CH - 22, 15, 500, '#B91C1C', 'middle'));
  else b.push(T('位号 U1 · 吸嘴 CN065 · 接料方式：拼接', 360, CY + CH - 22, 15, 400, '#64748B', 'middle'));
  // 站位图
  y = 896; const gh = 236;
  b.push(R(24, y, 672, gh, '#FFFFFF', 20, red ? ' fill-opacity="0.14" stroke="#FFFFFF" stroke-opacity="0.35"' : ' stroke="#E2E8F0" filter="url(#sh)"'));
  b.push(T('料站状态 · SMT-2', 48, y + 30, 18, 700, tc) + T(ok ? '12 / 12 核对通过' : 'SMT-2-02 已锁定', 672, y + 30, 16, 500, red ? '#FFFFFF' : '#15803D', 'end'));
  const ST = [['01', 'F-01'], ['01', 'F-02'], ['01', 'F-03'], ['01', 'F-04'], ['01', 'F-05'], ['01', 'F-06'], ['02', 'F-07'], ['02', 'F-08'], ['02', 'F-09'], ['02', 'F-10'], ['02', 'F-11'], ['02', 'F-12']];
  ST.forEach(([m, f], i) => { const cx = 48 + (i % 6) * 104, cyy = y + 56 + Math.floor(i / 6) * 84, cur = f === 'F-07', empty = ['F-10', 'F-11', 'F-12'].includes(f);
    let fill, st2, fc; if (cur) { fill = ok ? '#16A34A' : '#FFFFFF'; st2 = ''; fc = ok ? '#FFFFFF' : '#DC2626'; } else if (empty) { fill = red ? '#FFFFFF1F' : '#F8FAFC'; st2 = red ? '' : ' stroke="#E2E8F0"'; fc = red ? '#FECACA' : '#A3B1C2'; } else { fill = red ? '#FFFFFF33' : '#F0FDF4'; st2 = red ? '' : ' stroke="#BBF7D0"'; fc = red ? '#FFFFFF' : '#15803D'; }
    b.push(R(cx, cyy, 96, 72, fill, 12, st2 + (cur ? ' stroke="' + (ok ? '#15803D' : '#FFFFFF') + '" stroke-width="3"' : '')) + T(f, cx + 48, cyy + 26, 18, 700, fc, 'middle') + T(cur ? (ok ? '本次通过' : '错料') : empty ? '空站' : m === '01' ? '贴片 01' : '贴片 02', cx + 48, cyy + 52, 13, 500, fc, 'middle')); });
  if (ok) b.push(bigBtn(24, 420, '完成上料 · 下一站', 'g') + bigBtn(460, 236, '查看履历', 'w'));
  else b.push(bigBtn(24, 420, '重新扫描', 'r') + bigBtn(460, 236, '呼叫班组长', 't'));
  return SVG(720, 1280, pdaWrap(id, b.join('')));
}

// ======================= UI29 PDA 盘点 =======================
function ui29() {
  const b = []; pdaTop(b, '库存盘点 · 扫码实盘', '仓管 李娜 · 原材料一号仓', '16:05', '41%');
  b.push(taskCard(168, '盘点单 PD-20261113-001', ['盲盘', '#6D28D9', '#F5F3FF'], '周期盘点 · A-03 区 IC 类 · 截止 17:30', ['已盘 38 / 52 库位', '73%'], 38 / 52, '#2563EB'));
  b.push(scanBox(324, '库位码 · 16:04:40', 'A-03-12', 'ok'));
  // 当前库位
  let y = 416; b.push(pc(y, 468));
  b.push(T('库位 A-03-12 · 已扫 3 盘', 48, y + 34, 21, 700, '#0F172A') + T('系统数量已隐藏', 672, y + 34, 16, 400, '#94A3B8', 'end'));
  const RL = [['R26111304-00319', '2.03.0832 nRF52832-QFAA', '3,000', '整盘 · 未开封', 0], ['R26111304-00320', '2.03.0832 nRF52832-QFAA', '3,000', '整盘 · 未开封', 0], ['R26110907-00197', '2.03.0832 nRF52832-QFAA', '1,260', '散盘 · 点料机读数', 1]];
  RL.forEach(([r, m, q, d, edit], i) => { const yy = y + 66 + i * 104;
    b.push(R(40, yy, 640, 92, edit ? '#F5F9FF' : '#F8FAFC', 14, edit ? ' stroke="#93C5FD" stroke-width="1.5"' : ' stroke="#E2E8F0"'));
    b.push(T(r, 60, yy + 28, 19, 700, '#0F172A') + T(m, 60, yy + 62, 15, 400, '#64748B'));
    if (edit) b.push(R(470, yy + 18, 190, 56, '#FFFFFF', 10, ' stroke="#2563EB" stroke-width="2"') + T(q, 640, yy + 46, 26, 700, '#0F172A', 'end') + R(644, yy + 32, 2, 28, '#2563EB'));
    else b.push(T(q, 660, yy + 28, 22, 700, '#0F172A', 'end') + T(d, 660, yy + 62, 15, 400, '#64748B', 'end')); });
  b.push(T('点料机 XC-01 读数 1,260 · 已回填，可手改', 60, y + 66 + 3 * 104 + 8, 15, 500, '#1D4ED8'));
  b.push(R(48, y + 412, 624, 1, '#EEF2F7') + T('本库位实盘合计', 48, y + 442, 18, 400, '#64748B') + T('3 盘 · 7,260 pcs', 672, y + 442, 22, 700, '#0F172A', 'end'));
  // 库位进度
  y = 900; b.push(pc(y, 244));
  b.push(T('A-03 区库位', 48, y + 30, 18, 700, '#0F172A') + T('差异需复盘 1', 672, y + 30, 16, 500, '#C2410C', 'end'));
  const LOC = [['A-03-08', 'ok'], ['A-03-09', 'diff'], ['A-03-10', 'ok'], ['A-03-11', 'ok'], ['A-03-12', 'cur'], ['A-03-13', 'todo'], ['A-03-14', 'todo'], ['A-03-15', 'todo'], ['A-03-16', 'todo'], ['A-03-17', 'todo']];
  LOC.forEach(([l, st], i) => { const cx = 40 + (i % 5) * 128, cy = y + 60 + Math.floor(i / 5) * 86;
    const S = { ok: ['#F0FDF4', '#BBF7D0', '#15803D', '已盘'], diff: ['#FFF7ED', '#FDBA74', '#C2410C', '-500 复盘'], cur: ['#2563EB', '#2563EB', '#FFFFFF', '盘点中'], todo: ['#F8FAFC', '#E2E8F0', '#64748B', '待盘'] }[st];
    b.push(R(cx, cy, 120, 74, S[0], 12, ` stroke="${S[1]}"`) + T(l, cx + 60, cy + 26, 17, 700, S[2], 'middle') + T(S[3], cx + 60, cy + 52, 14, st === 'diff' || st === 'cur' ? 700 : 400, S[2], 'middle')); });
  b.push(bigBtn(24, 420, '提交本库位', 'p') + bigBtn(460, 236, '新增卷盘', 'w'));
  return SVG(720, 1280, pdaWrap('u29', b.join('')));
}


// ======================= UI21 委外订单编辑 =======================
const tagS = (s, x, cy, c, bg) => pill(s, x, cy, c, bg, 12, 500, 8, 22).svg;
const cell = (t, c, w = 400) => (x, cy) => T(t, x + 10, cy, 13, w, c);
const cellR = (t, c, w = 400) => (x, cy, cw) => T(t, x + cw - 12, cy, 13, w, c, 'end');
const prog = (a, b2, c = '#10B981') => (x, cy, cw) => bar(x + 10, cy - 3, cw - 84, 6, a / b2, c) + T(Math.round(a / b2 * 100) + '%', x + cw - 12, cy, 12, 700, '#334155', 'end');
function ui21() {
  const b = frame([['工作台', 0], ['委外订单列表', 0], ['委外订单 - OS-20261113-002', 1]], '委外订单');
  b.push(titleRow('委外订单', 'OS-20261113-002', [[1, '已审核'], [2, '下达']]) + lastMod('审核：陈立  2026-11-13 10:05'));
  b.push(toolbar(X0, 144, [['保存', 1, 'save'], ['提交', 'd', 'send'], ['审核', 'd', 'check'], '|', ['执行至', 0, 'chevR'], ['反执行至', 0], ['变更', 0], '|', ['下推', 0, 'push'], ['上查', 0, 'up'], ['下查', 0, 'down'], ['打印', 0]]));
  // 表头
  b.push(card(X0, 188, MW, 152, ''));
  b.push(fields(X0 + 16, 204, MW - 32, 4, [['单据类型', '标准委外订单', { lock: 1 }], ['供应商', 'SUP-0057 东莞华涂电子', { lock: 1, c: '#2563EB' }], ['委外组织', '一号工厂', { lock: 1 }], ['采购员', '吴婷', { sel: 1 }],
    ['结算币别', 'CNY · 含税 13%', { lock: 1 }], ['交货地点', 'SMT二车间 收料口', { sel: 1 }], ['来源', 'MRP-20261113-01 委外建议', { lock: 1, c: '#2563EB' }], ['付款条件', '月结 60 天', { sel: 1 }],
    ['委外类型', '工序委外 · 我方供料', { lock: 1 }], ['质检方式', '委外收料 IQC 抽检', { sel: 1 }], ['发料方式', '委外领料单', { lock: 1 }], ['备注', '涂覆后 24 h 内回厂', {}]], { lw: 76, rh: 44 }));
  // 分录
  let y = 356; const EH2 = 228;
  b.push(card(X0, y, MW, EH2, ''));
  b.push(tabsBar(X0 + 16, y + 24, ['委外明细 3', '价格明细', '交货计划', '其他'], 0));
  b.push(R(X0 + 16, y + 46, MW - 32, 1, '#E2E8F0'));
  const c1 = [['#', 34], ['产品编码', 112], ['产品名称', 188], ['加工内容', 136], ['数量', 74, 'r'], ['单价', 70, 'r'], ['价税合计', 98, 'r'], ['交货日期', 84], ['业务状态', 90], ['发料', 128], ['收料', 128]];
  const u1 = c1.reduce((a, c) => a + c[1], 0); c1.push(['来源单据', MW - 32 - u1]);
  b.push(tableX(X0 + 16, y + 56, MW - 32, c1, [
    ['1', '1.01.0052-C', 'BT52 PCBA（三防涂覆）', '三防漆涂覆 · 单面', '5,800', '0.38', '2,204.00', '11-17', tagF2('下达'), prog(5800, 5800), prog(0, 5800, '#3B82F6'), cell('PLN-20261113-008', '#2563EB')],
    ['2', '1.01.0034-G', 'PM1230 PCBA（灌封）', '有机硅灌封 · 固化', '3,500', '1.20', '4,200.00', '11-18', tagF2('下达'), prog(1400, 3500), prog(0, 3500, '#3B82F6'), cell('PLN-20261113-010', '#2563EB')],
    ['3', '1.01.0072-X', 'MD8833 PCBA（X-Ray）', 'BGA X-Ray 全检', '3,000', '0.15', '450.00', '11-16', tagF2('计划确认'), prog(0, 3000), prog(0, 3000, '#3B82F6'), cell('MO-20261112-005', '#2563EB')]],
    { id: 'pt21a', rh: 38, hh: 34, sel: 0, total: (cx, cy) => T('合计', cx[1] + 10, cy, 13, 700, '#0F172A') + T('12,300', cx[5] - 12, cy, 13, 700, '#0F172A', 'end') + T('6,854.00', cx[7] - 12, cy, 13, 700, '#0F172A', 'end') + T('不含税 6,065.49 · 税额 788.51', cx[8] + 10, cy, 12, 400, '#64748B') }).svg);
  // 子分录：用料清单
  y += EH2 + 16; const SH2 = 1064 - y;
  b.push(card(X0, y, MW, SH2, ''));
  b.push(tabsBar(X0 + 16, y + 24, ['委外用料清单', '收料 / 入库进度', '工序要求', '附件 2'], 0) + T('分录 1 · BT52 PCBA（三防涂覆）· 5,800 Pcs', X0 + MW - 16, y + 24, 12, 500, '#475569', 'end'));
  b.push(R(X0 + 16, y + 46, MW - 32, 1, '#E2E8F0'));
  const c2 = [['#', 34], ['子项物料', 100], ['名称 / 规格', 220], ['供料方式', 104], ['用量', 92, 'r'], ['应发', 86, 'r'], ['已发', 86, 'r'], ['已退', 64, 'r'], ['发料仓库', 116], ['批号 / 卷盘', 160]];
  const u2 = c2.reduce((a, c) => a + c[1], 0); c2.push(['状态', MW - 32 - u2]);
  const sup = (t, our) => (x, cy) => tagS(t, x + 10, cy, our ? '#1D4ED8' : '#475569', our ? '#E6F0FF' : '#F1F5F9');
  b.push(tableX(X0 + 16, y + 56, MW - 32, c2, [
    ['1', '1.01.0052', 'BT52 PCBA 半成品 · 已测试', sup('我方供料', 1), '1 / 1', '5,800', '5,800', '0', '半成品仓 B 区', 'WIP-L1112-02', stF2('已全部发料', '#15803D')],
    ['2', '2.15.0003', '三防漆 HumiSeal 1B31 · 5 L', sup('我方供料', 1), '0.8 g', '4.64 kg', '5.00 kg', '0', '辅料仓', 'L2610-H03', stF2('已发 · 余料退回', '#0E7490')],
    ['3', '2.15.0011', '高温保护胶贴 10×6 mm', sup('供应商自备'), '3 / 1', '17,400', '—', '—', '—', '—', { t: '不发料', c: '#94A3B8' }],
    ['4', '2.15.0020', '防静电周转托盘 50 位', sup('我方供料', 1), '1 / 50', '116', '116', '0', '周转器具库', '—', stF2('需回收', '#B45309')],
    ['5', '2.16.0102', '防潮真空袋 + 干燥剂 + 湿度卡', sup('供应商自备'), '1 / 50', '116', '—', '—', '—', '—', { t: '不发料', c: '#94A3B8' }]],
    { id: 'pt21b', rh: 40, hh: 34 }).svg);
  const ny = y + 56 + 34 + 40 * 5 + 22;
  b.push(R(X0 + 16, ny, MW - 32, 1, '#EEF2F7'));
  [['发料', 'PICK-OS-20261113-002', '11-13 10:40', '#2563EB'], ['出厂', '放行单 GP-20261113-011 · 车辆 粤S·7K21X', '11-13 11:20', '#334155'], ['开工', '供应商门户回报：涂覆线 2 已开工，首件膜厚 42 μm 合格', '11-13 13:30', '#334155'], ['预计回厂', '11-16 14:00 · 委外收料 → IQC → 委外入库', '待执行', '#94A3B8']].forEach(([k, v, t, c], i) => { const yy = ny + 30 + i * 32; b.push(`<circle cx="${X0 + 24}" cy="${yy}" r="4" fill="${i < 3 ? '#10B981' : '#CBD5E1'}"/>` + T(k, X0 + 38, yy, 13, 700, '#334155') + T(v, X0 + 118, yy, 13, 400, c) + T(t, X0 + MW - 16, yy, 12, 400, '#94A3B8', 'end')); });
  // 右：供应商
  y = 188; b.push(card(PX, y, PW, 300, '供应商', 'SUP-0057', '#64748B'));
  b.push(T('东莞华涂电子有限公司', PX + 16, y + 58, 15, 700, '#0F172A') + tagS('合格供应商', PX + 16, y + 86, '#15803D', '#DCFCE7') + tagS('三防 / 灌封', PX + 110, y + 86, '#475569', '#F1F5F9'));
  [['近 90 天准交率', '96.4%', '#15803D'], ['来料 PPM', '220', '#0F172A'], ['涂覆产能', '30,000 片 / 天', '#0F172A'], ['在途委外单', '2 张 · 9,300 Pcs', '#0F172A'], ['对账', '10 月已对账 · 发票已收', '#64748B'], ['供应商门户', '订单已确认 11-13 10:22', '#2563EB']].forEach(([k, v, c], i) => b.push(T(k, PX + 16, y + 124 + i * 28, 13, 400, '#64748B') + T(v, PX + PW - 16, y + 124 + i * 28, 13, 500, c, 'end')));
  y += 316; b.push(card(PX, y, PW, 1064 - y, '委外流程', '分录 1', '#64748B'));
  const FL = [['下达', '11-13 10:05 · 陈立 审核', 2], ['委外领料', 'PICK-OS-20261113-002', 2], ['发料出厂', '11-13 11:20 · 5,800 Pcs', 2], ['供应商加工', '门户回报：已开工 13:30', 1], ['委外收料', '预计 11-16 14:00', 0], ['IQC 检验', 'AQL 0.65 · 外观 / 膜厚', 0], ['委外入库', '入 半成品仓 B 区', 0], ['结算', '月结 · 加工费 2,204.00', 0]];
  FL.forEach(([t, d, st], i) => { const yy = y + 62 + i * 52, c = st === 2 ? '#10B981' : st === 1 ? '#2563EB' : '#CBD5E1';
    if (i < FL.length - 1) b.push(R(PX + 25, yy + 10, 2, 42, st === 2 ? '#A7F3D0' : '#E2E8F0'));
    b.push(`<circle cx="${PX + 26}" cy="${yy}" r="${st === 1 ? 8 : 6}" fill="${st === 0 ? '#FFFFFF' : c}" stroke="${c}" stroke-width="2"/>` + T(t, PX + 46, yy - 1, 14, st ? 700 : 500, st === 0 ? '#94A3B8' : '#0F172A') + T(d, PX + 46, yy + 20, 12, 400, st === 1 ? '#2563EB' : '#64748B') + (st === 1 ? pill('进行中', PX + PW - 16, yy, '#1D4ED8', '#DBEAFE', 12, 700, 8, 22, 'end').svg : '')); });
  return SVG(1920, 1080, b.join(''));
}

// ======================= UI22 工序计划 =======================
const OPS22 = [ // 工序号, 名称, 工作中心, 设备, 状态, 合格, 不良, 在制(转入未完成), 实际开工, 计划完工
  ['10', '锡膏印刷', 'SMT2-印刷', 'DEK-02', '开工', 5260, 0, 20, '11-12 08:05', '11-13 18:40'],
  ['20', 'SPI 检测', 'SMT2-SPI', 'KY8030', '开工', 5240, 0, 20, '11-12 08:12', '11-13 18:50'],
  ['30', '贴片', 'SMT2-贴片', '贴片机 01 / 02', '暂停', 5200, 0, 40, '11-12 08:20', '11-13 19:10'],
  ['40', '回流焊', 'SMT2-回流', 'RF-2', '开工', 5180, 0, 20, '11-12 08:35', '11-13 19:20'],
  ['50', 'AOI 检测', 'SMT2-AOI', 'AOI-2', '开工', 5150, 12, 18, '11-12 08:45', '11-13 19:30'],
  ['60', '功能测试', 'TEST-FCT', 'FCT 治具 × 4', '开工', 5120, 6, 24, '11-12 09:30', '11-13 20:00'],
  ['70', '包装入库', 'PACK-02', 'PDA 扫码', '开工', 4800, 0, 320, '11-12 10:10', '11-13 20:30']];
const OS = { 开工: ['#0E7490', '#CFFAFE'], 暂停: ['#B45309', '#FEF3C7'], 完工: ['#15803D', '#DCFCE7'], 未开工: ['#475569', '#EEF2F6'] };
function ui22() {
  const b = frame([['工作台', 0], ['生产订单 - MO-20261112-002', 0], ['工序计划 - OP-20261112-002', 1]], '工序计划');
  b.push(titleRow('工序计划', 'OP-20261112-002', [[1, '已审核'], [2, '开工']]) + lastMod('数据截至 2026-11-13 14:30'));
  b.push(toolbar(X0, 144, [['保存', 1, 'save'], ['审核', 'd', 'check'], '|', ['派工', 0, 'push'], ['开工', 0], ['暂停', 0, 'stop'], ['恢复', 0], ['完工', 0, 'check'], '|', ['工序转移', 0], ['工序汇报', 0], '|', ['上查', 0, 'up'], ['下查', 0, 'down'], ['打印', 0]]));
  b.push(card(X0, 188, MW, 108, ''));
  b.push(fields(X0 + 16, 200, MW - 32, 4, [['生产订单', 'MO-20261112-002 · 分录 1', { lock: 1, c: '#2563EB' }], ['产品', '3.01.0052  BT-52 蓝牙模块', { lock: 1 }], ['数量', '6,000 Pcs', { lock: 1 }], ['工艺路线', 'RT-BT52-02', { lock: 1, c: '#2563EB' }],
    ['生产车间', 'SMT二车间', { lock: 1 }], ['计划开工', '2026-11-12 08:00', { lock: 1 }], ['计划完工', '2026-11-13 20:30', { lock: 1 }], ['计划员', '王敏', { lock: 1 }]], { lw: 72, rh: 46 }));
  // 工序序列
  const SY = 312, SHh = 268; b.push(card(X0, SY, MW, SHh, '工序序列', '', ''));
  { let x = X0 + MW - 16; [['未开工', '#94A3B8'], ['暂停', '#F59E0B'], ['开工', '#06B6D4'], ['完工', '#10B981']].forEach(([t, c]) => { b.push(T(t, x, SY + 25, 12, 400, '#475569', 'end')); x -= W(t, 12) + 8; b.push(`<circle cx="${x - 4}" cy="${SY + 25}" r="4" fill="${c}"/>`); x -= 24; }); }
  const nw = 140, gap = (MW - 32 - nw * 7) / 6, ny = SY + 62, nh = 124;
  OPS22.forEach(([no, nm, wc, eq, st, q, ng, wip], i) => { const x = X0 + 16 + i * (nw + gap), c = OS[st], pause = st === '暂停', p = q / 6000;
    b.push(R(x, ny, nw, nh, pause ? '#FFFBEB' : '#FFFFFF', 10, ` stroke="${pause ? '#F59E0B' : '#BAE6FD'}"${pause ? ' stroke-width="2"' : ''}`) + R(x, ny, nw, 4, pause ? '#F59E0B' : '#06B6D4', 2));
    b.push(T(no, x + 12, ny + 24, 12, 700, '#64748B') + T(nm, x + 36, ny + 24, 14, 700, '#0F172A') + pill(st, x + nw - 10, ny + 48, c[0], c[1], 11, 700, 6, 20, 'end').svg);
    b.push(T(wc, x + 12, ny + 48, 12, 400, '#64748B') + T(q.toLocaleString('en-US'), x + 12, ny + 78, 20, 700, pause ? '#B45309' : '#0F172A'));
    b.push(bar(x + 12, ny + 98, nw - 24, 6, p, pause ? '#F59E0B' : '#06B6D4') + T(Math.round(p * 1000) / 10 + '%', x + nw - 12, ny + 78, 12, 700, '#334155', 'end'));
    if (i < 6) { const ax = x + nw + 4, bx2 = x + nw + gap - 4; b.push(arrow([[ax, ny + nh / 2], [bx2, ny + nh / 2]], '#94A3B8', 1.6)); }
    // 在制 WIP 标签（工序之间）
    if (i > 0) { const mx = x - gap / 2; b.push(T('在制 ' + wip, mx, ny + nh / 2 - 14, 11, 500, wip >= 100 ? '#B45309' : '#64748B', 'middle')); } });
  // 维修分支
  { const ax = X0 + 16 + 4 * (nw + gap), rx = ax + 12, ry = ny + nh + 34, rw = nw - 24;
    b.push(arrow([[ax + 40, ny + nh], [ax + 40, ry]], '#F97316', 1.5, '4 3') + T('NG 12', ax + 46, ny + nh + 17, 11, 700, '#EA580C'));
    b.push(R(rx, ry, rw, 34, '#FFF7ED', 8, ' stroke="#FDBA74" stroke-dasharray="5 4"') + T('55 维修 RW-1', rx + rw / 2, ry + 17, 12, 700, '#C2410C', 'middle'));
    b.push(arrow([[ax + nw - 40, ry], [ax + nw - 40, ny + nh]], '#10B981', 1.5, '4 3') + T('修复 10', ax + nw - 34, ny + nh + 17, 11, 700, '#15803D') + T('报废 2 · 待判 0', rx + rw + 10, ry + 17, 11, 400, '#94A3B8')); }
  b.push(R(X0 + 16, ny + nh + 34, 520, 34, '#FFFBEB', 8, ' stroke="#FDE68A"') + warnI(X0 + 34, ny + nh + 51) + T('30 贴片 14:21 起暂停：设备安灯 AD-20261113-008 · 贴片机 02 吸嘴真空异常', X0 + 50, ny + nh + 51, 12, 500, '#92400E'));
  // 工序明细
  const TY = SY + SHh + 16; b.push(card(X0, TY, MW, 1064 - TY, '工序明细', '合格数为本工序累计转出 · 在制为已转入未转出', '#64748B'));
  const cols = [['工序', 56], ['名称', 84], ['工作中心', 92], ['设备 / 资源', 104], ['状态', 70], ['实际开工', 98], ['计划完工', 98], ['转入', 70, 'r'], ['合格', 70, 'r'], ['不良', 52, 'r'], ['在制', 56, 'r'], ['标准工时', 70, 'r'], ['操作员', 92]];
  const u = cols.reduce((a, c) => a + c[1], 0); cols.push(['完成进度', MW - 32 - u]);
  const OPR = ['张浩', '刘敏', '陈刚 · 何俊', '杨帆', '赵琳', '孙涛 等 4 人', '周雪'], STD = ['16.0 s', '16.0 s', '16.8 s', '16.8 s', '16.8 s', '22.0 s', '6.0 s'];
  const rows = OPS22.map(([no, nm, wc, eq, st, q, ng, wip, a, f], i) => { const tin = q + ng + wip - (i === 4 ? 0 : 0); return [no, nm, wc, eq, (x, cy) => pill(st, x + 10, cy, OS[st][0], OS[st][1], 12, 500, 8, 22).svg, a, f, tin.toLocaleString('en-US'), { t: q.toLocaleString('en-US'), c: '#0F172A', b: 1 }, ng ? { t: String(ng), c: '#DC2626', b: 1 } : '0', wip >= 100 ? { t: String(wip), c: '#B45309', b: 1 } : String(wip), STD[i], OPR[i], prog(q, 6000, st === '暂停' ? '#F59E0B' : '#06B6D4')]; });
  b.push(tableX(X0 + 16, TY + 48, MW - 32, cols, rows, { id: 'pt22', rh: 46, hh: 36, sel: 2, total: (cx, cy) => T('汇总', cx[0] + 10, cy, 13, 700, '#0F172A') + T('入库 4,800 · 在制 462 · AOI 不良 12（修复 10，报废 2）· FCT 不良 6 待维修 · 直通率 99.7%', cx[2] + 10, cy, 13, 400, '#334155') }).svg);
  // 右侧
  let y = 188; b.push(card(PX, y, PW, 420, '工序 30 · 贴片', '暂停 9 min', '#B45309'));
  [['工作中心', 'SMT2-贴片'], ['设备', '贴片机 SMT-2-01 / 02'], ['程序', 'BT52_V2.3 · 0.35 s/点'], ['站位表', 'ZW-BT52-SMT2-02'], ['实际开工', '11-12 08:20'], ['首检', 'FAI 11-12 08:35 合格'], ['累计合格', '5,200 / 6,000'], ['剩余工时', '约 3.7 h（单台运行）']].forEach(([k, v], i) => b.push(T(k, PX + 16, y + 58 + i * 30, 13, 400, '#64748B') + T(v, PX + PW - 16, y + 58 + i * 30, 13, 500, i === 3 ? '#2563EB' : '#1E293B', 'end')));
  b.push(R(PX + 16, y + 300, PW - 32, 1, '#EEF2F7') + T('暂停原因', PX + 16, y + 326, 13, 700, '#334155') + T('设备安灯 · 一级 · 14:21 呼叫', PX + PW - 16, y + 326, 12, 500, '#B45309', 'end'));
  b.push(T('李工 14:27 已签到处理，贴片机 01 单台运行', PX + 16, y + 354, 12, 400, '#475569') + btn(PX + 16, y + 372, '查看安灯单', 0, null, 30, 13).svg + btn(PX + 130, y + 372, '恢复开工', 0, null, 30, 13).svg);
  y += 436; b.push(card(PX, y, PW, 1064 - y, '工序转移记录', '今日 64 次', '#64748B'));
  [['14:28', '60 → 70', '转移 120', 'FCT 批次 T-1113-41'], ['14:25', '50 → 60', '转移 100', 'AOI 合格'], ['14:22', '40 → 50', '转移 100', '回流完成'], ['14:21', '30', '暂停', '设备安灯 AD-20261113-008'], ['14:18', '30 → 40', '转移 100', '贴片完成'], ['14:15', '20 → 30', '转移 100', 'SPI 合格'], ['14:10', '55 → 60', '返修转回 4', 'RW-1 维修完成']].forEach(([t, o, a, d], i) => { const yy = y + 58 + i * 50, w = a === '暂停';
    b.push(`<circle cx="${PX + 22}" cy="${yy}" r="4" fill="${w ? '#F59E0B' : '#06B6D4'}"/>` + (i < 6 ? R(PX + 21.5, yy + 6, 1, 38, '#E2E8F0') : '') + T(t + '  工序 ' + o, PX + 36, yy, 13, 700, '#1E293B') + T(a, PX + PW - 16, yy, 12, 700, w ? '#B45309' : '#0E7490', 'end') + T(d, PX + 36, yy + 20, 12, 400, '#64748B')); });
  return SVG(1920, 1080, b.join(''));
}

// ======================= UI23 调度派工工作台 =======================
const TS = { 开工: ['#0E7490', '#CFFAFE', '#06B6D4'], 暂停: ['#B45309', '#FEF3C7', '#F59E0B'], 已派工: ['#1D4ED8', '#DBEAFE', '#3B82F6'], 待派工: ['#475569', '#EEF2F6', '#94A3B8'], 挂起: ['#B45309', '#FEF3C7', '#F59E0B'], 维修: ['#C2410C', '#FFEDD5', '#F97316'] };
function taskC(x, y, w, [mo, prod, op, q, done, tot, st, who, tm], o = {}) {
  const c = TS[st], h = 136; let s = '';
  s += R(x, y, w, h, o.ghost ? '#FFFFFF' : st === '挂起' ? '#F8FAFC' : '#FFFFFF', 10, o.ghost ? ' stroke="#2563EB" stroke-width="2" filter="url(#shP)"' : ` stroke="#E2E8F0"${o.fade ? ' stroke-dasharray="5 4"' : ''}`) + R(x, y + 8, 3, h - 16, c[2], 1.5);
  const op2 = o.fade ? ' fill-opacity="0.45"' : '';
  s += `<g${o.fade ? ' opacity="0.45"' : ''}>`;
  s += T(mo, x + 14, y + 20, 13, 700, '#2563EB') + pill(st, x + w - 10, y + 20, c[0], c[1], 11, 700, 6, 20, 'end').svg;
  s += T(prod, x + 14, y + 44, 13, 500, '#0F172A') + T(op, x + 14, y + 66, 12, 400, '#64748B') + T(q, x + w - 12, y + 66, 12, 700, '#334155', 'end');
  s += bar(x + 14, y + 86, w - 28, 6, done / tot, c[2]) + T(done.toLocaleString('en-US') + ' / ' + tot.toLocaleString('en-US'), x + 14, y + 106, 11, 400, '#64748B') + T(Math.round(done / tot * 100) + '%', x + w - 12, y + 106, 11, 700, '#334155', 'end');
  s += ic('user', x + 14, y + 114, '#94A3B8', 13) + T(who, x + 32, y + 121, 11, 400, '#475569') + T(tm, x + w - 12, y + 121, 11, 400, '#94A3B8', 'end');
  return s + '</g>'; }
function ui23() {
  const b = frame([['工作台', 0], ['工序计划 - OP-20261112-002', 0], ['调度派工', 1]], '调度派工');
  b.push(titleRow('调度派工', '2026-11-13 白班 08:00–20:00', []) + lastMod('数据截至 14:30 · 每 30 s 刷新'));
  b.push(toolbar(X0, 144, [['刷新', 0, 'refresh'], ['自动派工', 1], ['批量派工', 0, 'push'], ['撤回派工', 0], '|', ['过滤', 0, 'filter'], ['打印派工单', 0]]));
  { const x = 1904 - 300; b.push(R(x, 144, 300, 32, '#F1F5F9', 8) + R(x + 3, 147, 96, 26, '#FFFFFF', 6, ' filter="url(#sh)"') + T('工作中心', x + 51, 160, 13, 700, '#1D4ED8', 'middle') + T('人员', x + 150, 160, 13, 500, '#475569', 'middle') + T('设备', x + 250, 160, 13, 500, '#475569', 'middle'));
    b.push(R(x - 196, 144, 184, 32, '#FFFFFF', 6, ' stroke="#CBD5E1"') + ic('cal', x - 184, 152, '#64748B') + T('11-13 白班', x - 160, 160, 13, 400, '#1E293B') + ic('chev', x - 36, 152, '#94A3B8')); }
  const n = 7, gp = 12, cw = (CW - gp * (n - 1)) / n, top = 192, bot = 1064;
  const COLS = [
    ['待派工', '已下达 · 未派工', null, 4, [['MO-20261111-016', 'PM-1230 电源模块', '工序 10–40 · SMT', '4,000 Pcs', 0, 4000, '待派工', '王敏 下达', '11-14 08:00'], ['MO-20261113-001', 'WM-6200 Wi-Fi 模块', '分录 1 · SMT-2', '3,000 Pcs', 0, 3000, '待派工', '王敏 下达', '11-14 08:00'], ['MO-20261110-021', 'MLCC 0603 104K', '测试 + 编带', '200,000', 60000, 200000, '待派工', '领料 30%', '11-16 08:00'], ['MO-20261113-001', 'WM-6200 Wi-Fi 模块', '分录 3 · 交期待确认', '1,000 Pcs', 0, 1000, '挂起', '王敏', '—']]],
    ['SMT-1 贴片线', '贴片机 3 台 · 6 人', 0.72, 0, [['MO-20261112-005', 'MD-8833 电机驱动', '工序 30 贴片', '3,500 Pcs', 1260, 3500, '开工', '吴强 · 林峰', '08:10–17:40']]],
    ['SMT-2 贴片线', '贴片机 2 台 · 5 人', 0.78, 0, [['MO-20261112-002', 'BT-52 蓝牙模块', '工序 30 贴片 · 安灯中', '6,000 Pcs', 5200, 6000, '暂停', '陈刚 · 何俊', '14:21 起'], ['MO-20261112-002', 'BT-52 蓝牙模块', '分录 2 · 工序 10–50', '2,000 Pcs', 0, 2000, '已派工', '夜班 B 组', '20:00–次日 02:30']]],
    ['TEST-FCT', 'FCT 治具 4 套 · 6 人', 0.85, 0, [['MO-20261112-002', 'BT-52 蓝牙模块', '工序 60 功能测试', '6,000 Pcs', 5120, 6000, '开工', '孙涛 等 4 人', '09:30–20:00'], ['MO-20261112-001', 'PM-0520 电源模块', '工序 60 功能测试', '5,000 Pcs', 3820, 5000, '开工', '郑凯 · 冯丽', '08:00–18:30']]],
    ['PACK-02 包装', '包装台 4 个 · 4 人', 0.64, 0, [['MO-20261112-002', 'BT-52 蓝牙模块', '工序 70 包装入库', '6,000 Pcs', 4800, 6000, '开工', '周雪', '10:10–20:30'], ['MO-20261112-001', 'PM-0520 电源模块', '工序 70 包装入库', '5,000 Pcs', 3600, 5000, '开工', '黄敏', '09:00–19:00']]],
    ['测试编带线', '分选 2 台 · 编带 3 台', 1.12, 0, [['MO-20261112-004', 'TVS SMBJ5.0A', '测试分选 01 + 编带', '150,000', 54300, 150000, '开工', '马超 · 宋佳', '08:00–20:00'], ['MO-20261112-003', 'MLCC 0603 104K', '编带机 03', '200,000', 96200, 200000, '开工', '韩梅', '08:00–20:00']]],
    ['RW-1 维修', '维修工位 2 个 · 2 人', 0.3, 0, [['MO-20261112-002', 'BT-52 蓝牙模块', '工序 55 · AOI / FCT 不良', '8 Pcs', 0, 8, '维修', '罗斌', '14:00–16:00']]]];
  COLS.forEach(([nm, sub, load, cnt, cards], i) => { const x = X0 + i * (cw + gp), pool = i === 0;
    b.push(R(x, top, cw, bot - top, pool ? '#EEF2F7' : '#F8FAFC', 12, ' stroke="#E2E8F0"'));
    b.push(T(nm, x + 14, top + 24, 15, 700, '#0F172A') + T(String(cards.length), x + 22 + W(nm, 15, 700), top + 24, 13, 500, '#94A3B8') + T(sub, x + 14, top + 48, 12, 400, '#64748B'));
    if (load != null) { const lc = load > 1 ? '#DC2626' : load > 0.8 ? '#D97706' : '#10B981'; b.push(T('负荷', x + 14, top + 72, 11, 400, '#64748B') + bar(x + 46, top + 69, cw - 108, 6, Math.min(load, 1), lc) + T(Math.round(load * 100) + '%', x + cw - 14, top + 72, 12, 700, lc, 'end')); }
    else b.push(T('拖到右侧工作中心派工', x + 14, top + 72, 11, 400, '#94A3B8'));
    b.push(R(x + 10, top + 88, cw - 20, 1, '#E2E8F0'));
    let y = top + 100;
    if (i === 5) { b.push(R(x + 10, y, cw - 20, 32, '#FFF7ED', 8, ' stroke="#FED7AA"') + T('分选机 02 保养 10:05–16:00', x + 22, y + 16, 12, 500, '#C2410C')); y += 42; }
    cards.forEach((cd, k) => { b.push(taskC(x + 10, y, cw - 20, cd, { fade: pool && k === 0 })); y += 146; });
    if (i === 1) { // 落位
      b.push(R(x + 10, y, cw - 20, 136, '#EFF6FF', 10, ' stroke="#2563EB" stroke-width="1.5" stroke-dasharray="6 4"') + T('松开以派工到 SMT-1', x + cw / 2, y + 22, 13, 700, '#1D4ED8', 'middle') + T('放入后负荷 72% → 142%', x + cw / 2, y + 42, 12, 500, '#DC2626', 'middle')); }
    // 班次时间轴
    if (!pool) { const BL = [[[8.17, 17.67, '#06B6D4']], [[8.0, 14.35, '#06B6D4'], [14.35, 14.5, '#F59E0B'], [20, 20, '#3B82F6']], [[9.5, 20, '#06B6D4'], [8, 18.5, '#06B6D4']], [[10.17, 20, '#06B6D4'], [9, 19, '#06B6D4']], [[8, 20, '#06B6D4'], [8, 20, '#06B6D4'], [10.08, 16, '#F97316']], [[14, 16, '#F97316']]][i - 1];
      const ty = bot - 236, tx = x + 14, tw = cw - 28, X = h => tx + (h - 8) / 12 * tw;
      b.push(T('班次时间轴', tx, ty, 12, 700, '#334155') + T('08–20', tx + tw, ty, 11, 400, '#94A3B8', 'end'));
      BL.forEach(([a, z, c], k) => { const yy = ty + 16 + k * 14; b.push(R(tx, yy, tw, 8, '#EEF2F7', 4) + (z > a ? R(X(a), yy, Math.max(4, X(Math.min(z, 20)) - X(a)), 8, c, 4) : '')); });

      const nx = X(14.5); b.push(R(nx - 0.75, ty + 10, 1.5, 16 + BL.length * 14, '#DC2626') + T('14:30', nx, ty + 22 + BL.length * 14, 10, 700, '#DC2626', 'middle')); }
    // 人员 / 资源区
    const py = bot - 150; b.push(R(x + 10, py, cw - 20, 1, '#E2E8F0'));
    if (pool) { b.push(T('派工规则', x + 14, py + 24, 12, 700, '#334155')); ['仅「下达」状态可派工', '挂起分录不可派工', '超负荷派工需调度员确认', '派工后推送 HMI 工位终端'].forEach((t, k) => b.push(`<circle cx="${x + 18}" cy="${py + 50 + k * 24}" r="2.5" fill="#94A3B8"/>` + T(t, x + 28, py + 50 + k * 24, 12, 400, '#475569'))); }
    else { const PP = [[['吴强', 1], ['林峰', 1], ['唐亮', 1], ['许静', 0]], [['陈刚', 2], ['何俊', 2], ['王磊', 1], ['邓宇', 1]], [['孙涛', 1], ['郑凯', 1], ['冯丽', 1], ['曹阳', 0]], [['周雪', 1], ['黄敏', 1], ['范婷', 1], ['袁浩', 0]], [['马超', 1], ['宋佳', 1], ['韩梅', 1], ['彭杰', 1]], [['罗斌', 1], ['蒋雯', 0]]][i - 1];
      b.push(T('人员', x + 14, py + 24, 12, 700, '#334155') + T(`在岗 ${PP.filter(p => p[1]).length} / ${PP.length}`, x + cw - 14, py + 24, 11, 400, '#64748B', 'end'));
      PP.forEach(([nm2, st], k) => { const xx = x + 14 + (k % 2) * ((cw - 28) / 2), yy = py + 52 + Math.floor(k / 2) * 34, cc = st === 2 ? '#F59E0B' : st ? '#10B981' : '#CBD5E1';
        b.push(`<circle cx="${xx + 12}" cy="${yy}" r="12" fill="${st ? '#DBEAFE' : '#F1F5F9'}"/>` + T(nm2[0], xx + 12, yy, 11, 700, st ? '#1D4ED8' : '#94A3B8', 'middle') + `<circle cx="${xx + 21}" cy="${yy + 9}" r="3.5" fill="${cc}" stroke="#FFFFFF" stroke-width="1.5"/>` + T(nm2, xx + 30, yy - 7, 12, 500, st ? '#1E293B' : '#94A3B8') + T(st === 2 ? '安灯处理' : st ? '在岗' : '休假', xx + 30, yy + 9, 10, 400, st === 2 ? '#B45309' : '#94A3B8')); }); } });
  // 拖拽中的卡片 + 提示
  { const x0 = X0 + 1 * (cw + gp) + 10, y0 = top + 100 + 146; const gx = x0 + 40, gy = y0 + 58;
    b.push(`<g transform="rotate(-3 ${gx + (cw - 20) / 2} ${gy + 68})">` + taskC(gx, gy, cw - 20, COLS[0][4][0], { ghost: 1 }) + '</g>');
    b.push(g(gx + cw - 60, gy + 112, `<path d="M0 0 L0 18 L5 13 L9 21 L12 19.5 L8 12 L15 12 Z" fill="#0F172A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round"/>`));
    const tx = gx + cw - 30, ty = gy + 140, tw = 300; b.push(R(tx, ty, tw, 132, '#FFFFFF', 10, ' stroke="#FCA5A5" filter="url(#shP)"') + warnI(tx + 20, ty + 22) + T('超出 SMT-1 白班产能', tx + 36, ty + 22, 13, 700, '#B91C1C'));
    ['PM-1230 4,000 Pcs 需 8.4 h', 'SMT-1 白班剩余可用 3.4 h（已排 MD-8833）', '建议：11-14 白班 08:00 开始'].forEach((t, k) => b.push(T(t, tx + 16, ty + 50 + k * 22, 12, k === 2 ? 700 : 400, k === 2 ? '#1D4ED8' : '#475569')));
    b.push(T('Shift 强制派工 · Esc 取消', tx + 16, ty + 116, 11, 400, '#94A3B8')); }
  return SVG(1920, 1080, b.join(''));
}

// ======================= UI30 安灯看板（浅色大屏） =======================
const LV = { 正常: ['#16A34A', '#F0FDF4', '#BBF7D0'], 预警: ['#CA8A04', '#FEFCE8', '#FDE68A'], 超时: ['#EA580C', '#FFF7ED', '#FDBA74'], 严重超时: ['#DC2626', '#FEF2F2', '#FCA5A5'] };
const AT = { 设备: '#7C3AED', 物料: '#2563EB', 质量: '#DB2777', 工艺: '#0891B2' };
function ui30() {
  const b = [R(0, 0, 1920, 1080, '#EEF3F8')];
  b.push(R(0, 0, 1920, 84, '#FFFFFF') + R(0, 83, 1920, 1, '#DCE5EF'));
  b.push(g(32, 18, `<rect width="48" height="48" rx="12" fill="url(#logoG)"/><g transform="scale(1.2)"><rect x="11" y="11" width="18" height="18" rx="3" fill="none" stroke="#FFFFFF" stroke-width="2.2"/><rect x="16" y="16" width="8" height="8" rx="1.5" fill="#67E8F9"/></g>`));
  b.push(T('安灯看板', 96, 34, 28, 700, '#0F172A') + T('芯程电子 · 一号工厂 · 全部产线', 96, 64, 15, 400, '#64748B'));
  b.push(R(760, 22, 400, 40, '#F1F5F9', 20) + `<circle cx="784" cy="42" r="6" fill="#10B981"/>` + T('实时 · 每 5 s 刷新 · 新呼叫语音播报已开启', 798, 42, 15, 500, '#334155'));
  b.push(T('15:20:12', 1888, 36, 34, 700, '#0F172A', 'end') + T('2026-11-13 星期五 · 白班', 1888, 66, 15, 400, '#64748B', 'end'));
  // KPI
  const K = [['今日呼叫', '12', '#0F172A', '较昨日 -3'], ['未关闭', '5', '#DC2626', '待处理 3 · 处理中 2'], ['超时', '2', '#EA580C', '响应 1 · 处理 1'], ['平均响应', '3.6', '#0F172A', 'min · 目标 ≤ 5'], ['平均处理', '18.4', '#0F172A', 'min · 已关闭 7 单'], ['今日停机', '96', '#C2410C', 'min · 设备类安灯']];
  const kw = (1920 - 48 - 5 * 16) / 6; K.forEach(([k, v, c, sub], i) => { const x = 24 + i * (kw + 16); b.push(R(x, 100, kw, 92, '#FFFFFF', 14, ' stroke="#DCE5EF"') + T(k, x + 20, 124, 15, 500, '#64748B') + T(v, x + 20, 164, 36, 700, c) + T(sub, x + 28 + W(v, 36, 700), 168, 14, 400, '#64748B')); });
  // 列
  const CY0 = 208, CB = 1004, C1 = 24, C2 = 800, CWd = 760;
  const colHead = (x, t, n, c, rule) => R(x, CY0, CWd, CB - CY0, '#F8FAFC', 16, ' stroke="#DCE5EF"') + R(x + 20, CY0 + 18, 6, 26, c, 3) + T(t, x + 38, CY0 + 31, 24, 700, '#0F172A') + pill(String(n), x + 46 + W(t, 24, 700), CY0 + 31, '#FFFFFF', c, 16, 700, 10, 28).svg + T(rule, x + CWd - 20, CY0 + 31, 14, 400, '#64748B', 'end');
  b.push(colHead(C1, '待处理', 3, '#EA580C', '颜色 = 等待响应时长（≤5 / 5–10 / 10–30 / >30 min）'));
  b.push(colHead(C2, '处理中', 2, '#2563EB', '颜色 = 处理时长 ÷ 时限（≤70% / 70–100% / 100–150% / >150%）'));
  const head = (x, y, w, lv, type, grade, no) => { const c = LV[lv]; let s = R(x + 20, y + 18, W(type, 15, 700) + 40, 30, AT[type], 8, ' fill-opacity="0.12"') + `<circle cx="${x + 36}" cy="${y + 33}" r="5" fill="${AT[type]}"/>` + T(type, x + 48, y + 33, 15, 700, AT[type]);
    const gx = x + 32 + W(type, 15, 700) + 40; s += pill(grade, gx, y + 33, grade === '一级' ? '#FFFFFF' : '#334155', grade === '一级' ? '#DC2626' : '#E2E8F0', 14, 700, 10, 28).svg + T(no, gx + W(grade, 14, 700) + 32, y + 33, 15, 500, '#64748B');
    s += pill(lv, x + w - 20, y + 33, '#FFFFFF', c[0], 15, 700, 12, 30, 'end').svg; return s; };
  // 待处理
  const P = [['超时', '物料', '二级', 'AD-20261113-010', 'SMT-1 AOI-1 待料：PCB 2.05.0158 剩 40 片', 'SMT-1 线 · AOI 工位 · 呼叫 吴强 · 15:02:05', '18:07', '已通知 仓管组 3 人 · 15:12 已升级至仓库主管', 0.6],
    ['预警', '质量', '三级', 'AD-20261113-011', '测试编带线 MLCC 0603 104K 编带封合不良', '测试编带线 · 编带机 03 · 呼叫 韩梅 · 15:12:20', '7:52', '已通知 IPQC 孙悦 · 未受理', 0.26],
    ['正常', '工艺', '二级', 'AD-20261113-012', 'SMT-2 回流焊 RF-2 第 7 温区波动 ±4 ℃', 'SMT-2 线 · 回流焊 · 呼叫 杨帆 · 15:16:40', '3:32', '已通知 工艺 刘工 · 未受理', 0.12]];
  P.forEach(([lv, type, grade, no, title, meta, tmr, notify, p], i) => { const x = C1 + 16, w = CWd - 32, y = CY0 + 64 + i * 244, h = 232, c = LV[lv];
    b.push(R(x, y, w, h, c[1], 14, ` stroke="${c[2]}"${lv === '超时' ? ' stroke-width="2"' : ''}`) + R(x, y + 12, 6, h - 24, c[0], 3));
    b.push(head(x, y, w, lv, type, grade, no));
    b.push(T(title, x + 20, y + 86, 25, 700, '#0F172A') + T(meta, x + 20, y + 122, 16, 400, '#475569'));
    b.push(T('等待响应', x + w - 20, y + 86, 15, 400, '#64748B', 'end') + T(tmr, x + w - 20, y + 132, 44, 700, c[0], 'end'));
    b.push(R(x + 20, y + 156, w - 40, 1, c[2]) + T(notify, x + 20, y + 182, 15, 500, lv === '超时' ? '#C2410C' : '#334155'));
    b.push(bar(x + 20, y + 204, w - 40, 8, p, c[0], '#FFFFFF') + T('30 min', x + w - 20, y + 182, 13, 400, '#94A3B8', 'end')); });
  // 处理中
  const Q = [['严重超时', '设备', '一级', 'AD-20261113-008', 'SMT-2 贴片机 02 吸嘴真空异常', 'SMT-2 线 · 贴片工位 02 · 呼叫 王磊 · 14:21:08', '李工', '设备工程师 · 14:52 已升级 设备主管 陈工', '57:32', '时限 30 min', 1.92, [['呼叫', '14:21'], ['受理', '14:22'], ['签到', '14:27'], ['处理中', '57 min']], '贴片机 01 单台运行 · 工序 30 暂停'],
    ['预警', '物料', '二级', 'AD-20261113-009', 'SMT-1 F-12 MLCC 0402 104K 已断料', 'SMT-1 线 · 贴片工位 01 · 呼叫 林峰 · 14:46:30', '李娜', '仓管 · AGV-03 立库出库排队 · 预计 15:24 到线', '21:12', '时限 30 min', 0.71, [['呼叫', '14:46'], ['受理', '14:59'], ['签到', '—'], ['处理中', '21 min']], '15:07 已断料 · 超时 13 min · 贴片机 01 待料']];
  Q.forEach(([lv, type, grade, no, title, meta, who, role, tmr, lim, p, steps, note], i) => { const x = C2 + 16, w = CWd - 32, y = CY0 + 64 + i * 366, h = 354, c = LV[lv];
    b.push(R(x, y, w, h, c[1], 14, ` stroke="${c[2]}"${lv === '严重超时' ? ' stroke-width="2"' : ''}`) + R(x, y + 12, 6, h - 24, c[0], 3));
    b.push(head(x, y, w, lv, type, grade, no));
    b.push(T(title, x + 20, y + 86, 25, 700, '#0F172A') + T(meta, x + 20, y + 122, 16, 400, '#475569'));
    b.push(T('处理时长', x + w - 20, y + 86, 15, 400, '#64748B', 'end') + T(tmr, x + w - 20, y + 132, 44, 700, c[0], 'end'));
    // 处理人
    b.push(R(x + 20, y + 156, w - 40, 64, '#FFFFFF', 12, ` stroke="${c[2]}"`) + `<circle cx="${x + 56}" cy="${y + 188}" r="20" fill="#DBEAFE"/>` + T(who[0], x + 56, y + 188, 17, 700, '#1D4ED8', 'middle') + T(who, x + 88, y + 178, 18, 700, '#0F172A') + T(role, x + 88, y + 202, 14, 400, '#475569'));
    // 步骤
    const sx = x + 40, sw4 = (w - 80) / 3, sy = y + 254;
    steps.forEach(([t, v], k) => { const cx = sx + k * sw4, done = k < 2 || (k === 2 && v !== '—'), cur = k === 3, skip = v === '—';
      if (k < 3) b.push(R(cx + 12, sy - 2, sw4 - 24, 4, k < 2 || (k === 2 && !skip) ? '#94A3B8' : '#E2E8F0', 2));
      const cc = cur ? c[0] : skip ? '#CBD5E1' : '#64748B';
      b.push(`<circle cx="${cx}" cy="${sy}" r="${cur ? 11 : 9}" fill="${cur || done ? cc : '#FFFFFF'}" stroke="${cc}" stroke-width="2"/>` + (done && !cur ? tick(cx, sy + 0.5, 4, '#FFFFFF', 2) : ''));
      b.push(T(t, cx, sy + 28, 15, 700, cur ? c[0] : skip ? '#94A3B8' : '#334155', 'middle') + T(v, cx, sy + 50, 14, 400, cur ? c[0] : '#64748B', 'middle')); });
    b.push(T(note, x + w - 36, y + 188, 14, 500, note.includes('断料') ? '#DC2626' : '#475569', 'end'));
    b.push(T(Math.round(p * 100) + '% · ' + lim, x + 20, y + 330, 14, 700, c[0]) + bar(x + 196, y + 326, w - 216, 8, Math.min(p, 1), c[0], '#FFFFFF')); });
  // 右侧
  const RX = 1576, RW = 320;
  b.push(R(RX, CY0, RW, 312, '#FFFFFF', 16, ' stroke="#DCE5EF"') + T('今日按类型', RX + 20, CY0 + 30, 18, 700, '#0F172A') + T('12 次', RX + RW - 20, CY0 + 30, 14, 400, '#64748B', 'end'));
  [['设备', 4, 1], ['物料', 4, 2], ['质量', 2, 1], ['工艺', 2, 1]].forEach(([t, n, open], i) => { const y = CY0 + 72 + i * 56; b.push(`<circle cx="${RX + 26}" cy="${y}" r="5" fill="${AT[t]}"/>` + T(t, RX + 38, y, 15, 500, '#334155') + T(`${n}`, RX + RW - 20, y, 18, 700, '#0F172A', 'end') + T(`未关闭 ${open}`, RX + RW - 44, y, 13, 400, '#94A3B8', 'end'));
    b.push(R(RX + 20, y + 16, RW - 40, 8, '#EEF2F7', 4) + R(RX + 20, y + 16, (RW - 40) * n / 4, 8, AT[t], 4, ' fill-opacity="0.3"') + R(RX + 20, y + 16, (RW - 40) * open / 4, 8, AT[t], 4)); });
  b.push(T('按产线：SMT-1 4 · SMT-2 4 · 编带 3 · FCT 1', RX + 20, CY0 + 290, 12, 400, '#64748B'));
  const LY2 = CY0 + 328; b.push(R(RX, LY2, RW, CB - LY2, '#FFFFFF', 16, ' stroke="#DCE5EF"') + T('今日已关闭', RX + 20, LY2 + 30, 18, 700, '#0F172A') + T('7 单', RX + RW - 20, LY2 + 30, 14, 400, '#64748B', 'end'));
  [['13:58', '质量', '编带线 2 号 外观抽检不良', '响应 2.6'], ['13:20', '物料', 'SMT-1 F-03 0603 10kΩ 接料', '响应 2.1'], ['11:32', '工艺', 'SMT-2 回流焊 炉温曲线偏移', '响应 4.1'], ['10:05', '设备', '测试分选机 02 计划保养', '响应 1.0'], ['09:41', '物料', 'SMT-2 F-03 上料防错拒绝', '响应 3.0'], ['08:50', '设备', 'SMT-1 DEK-01 刮刀压力报警', '响应 5.2'], ['08:12', '设备', 'FCT 治具 3 探针接触不良', '响应 4.0']].forEach(([t, ty, d, r], i) => { const y = LY2 + 70 + i * 60;
    b.push(T(t, RX + 20, y, 14, 700, '#334155') + R(RX + 66, y - 11, W(ty, 12, 700) + 12, 22, AT[ty], 6, ' fill-opacity="0.12"') + T(ty, RX + 72, y, 12, 700, AT[ty]) + T(r + ' min', RX + RW - 20, y, 13, 400, '#64748B', 'end') + T(d, RX + 20, y + 24, 13, 400, '#475569'));
    if (i < 6) b.push(R(RX + 20, y + 42, RW - 40, 1, '#EEF2F7')); });
  // 底部产线状态
  b.push(R(24, 1020, 1872, 44, '#FFFFFF', 12, ' stroke="#DCE5EF"') + T('产线状态', 44, 1042, 15, 700, '#0F172A'));
  [['SMT-1 线', '部分停机 · 贴片机 01 待料', '#F59E0B'], ['SMT-2 线', '部分停机 · 贴片机 02', '#EF4444'], ['TEST-FCT', '运行', '#10B981'], ['测试编带线', '运行 · 分选机 02 保养', '#F59E0B'], ['PACK-02', '运行', '#10B981'], ['立体仓库', '运行 · AGV 3 / 4 在线', '#10B981']].forEach(([n, st, c], i) => { const x = 150 + i * 290; b.push(`<circle cx="${x}" cy="1042" r="6" fill="${c}"/>` + T(n, x + 14, 1042, 15, 700, '#334155') + T(st, x + 22 + W(n, 15, 700), 1042, 14, 400, '#64748B')); });
  return SVG(1920, 1080, b.join(''));
}

// ======================= UI31 安灯处理单 =======================
function ui31() {
  const b = frame([['工作台', 0], ['安灯看板', 0], ['安灯处理单 - AD-20261113-008', 1]], '安灯处理单');
  b.push(T('安灯处理单', X0, 120, 20, 700, '#0F172A') + T('AD-20261113-008', X0 + 112, 121, 16, 500, '#475569'));
  { let x = X0 + 124 + W('AD-20261113-008', 16, 500); b.push(pill('已关闭', x, 120, '#334155', '#E2E8F0', 12, 700, 8, 22).svg); x += W('已关闭', 12, 700) + 24; b.push(pill('处理超时 35 min', x, 120, '#B91C1C', '#FEE2E2', 12, 700, 8, 22).svg); }
  b.push(lastMod('关闭：何俊（班组长）2026-11-13 15:31'));
  b.push(toolbar(X0, 144, [['保存', 'd', 'save'], ['受理', 'd'], ['签到', 'd'], ['处理完成', 'd', 'check'], ['关闭', 'd'], '|', ['重新打开', 0], ['生成维修工单', 0, 'push'], ['转质量问题', 0], '|', ['上查', 0, 'up'], ['下查', 0, 'down'], ['打印', 0]]));
  b.push(card(X0, 188, MW, 108, ''));
  b.push(fields(X0 + 16, 200, MW - 32, 4, [['安灯类型', '设备 · 一级', { lock: 1 }], ['产线 / 工位', 'SMT-2 线 · 贴片工位 02', { lock: 1 }], ['设备', 'EQ-SMT2-0402 贴片机 SMT-2-02', { lock: 1, c: '#2563EB' }], ['呼叫来源', 'HMI 工位终端 · 王磊', { lock: 1 }],
    ['关联工单', 'MO-20261112-002 · 分录 1', { lock: 1, c: '#2563EB' }], ['关联工序', 'OP-20261112-002 · 30 贴片', { lock: 1, c: '#2563EB' }], ['响应人', '李工（设备工程师）', { lock: 1 }], ['升级至', '陈工（设备主管）', { lock: 1 }]], { lw: 80, rh: 46 }));
  // 时间轴
  const TY = 312, TH = 284; b.push(card(X0, TY, MW, TH, '处理时间轴', '呼叫 14:21:08 → 关闭 15:31:02 · 总时长 69.9 min', '#64748B'));
  const NS = [['呼叫', '14:21:08', '王磊 · HMI 长按 2 s', '#64748B'], ['受理', '14:22:40', '李工 · 手机 App', '#2563EB'], ['签到', '14:27:15', '李工 · 扫工位码到场', '#2563EB'], ['处理完成', '15:28:05', '李工 · 填写处理记录', '#EA580C'], ['关闭', '15:31:02', '何俊 · 复产确认', '#15803D']];
  const SEG = [['响应 1.5 min', '时限 5 min', 1], ['到场 4.6 min', '时限 10 min', 1], ['维修 60.8 min', '处理时限 30 min（自受理起）', 0], ['确认 3.0 min', '时限 10 min', 1]];
  const lx = X0 + 90, lw = MW - 180, ly = TY + 124;
  // 按实际时间比例
  const tm = [0, 1.53, 6.12, 66.95, 69.9], X = m => lx + m / 69.9 * lw;
  // 但前两段太短，改用分段刻度：给每段最小宽度
  const pos = [lx, lx + 150, lx + 330, lx + lw - 200, lx + lw];
  SEG.forEach(([a, lim, ok], i) => { const x1 = pos[i], x2 = pos[i + 1], c = ok ? '#10B981' : '#EF4444';
    b.push(R(x1 + 14, ly - 4, x2 - x1 - 28, 8, ok ? '#D1FAE5' : '#FEE2E2', 4) + R(x1 + 14, ly - 4, i === 2 ? (x2 - x1 - 28) * 25.4 / 60.8 : x2 - x1 - 28, 8, c, 4));
    if (i === 2) { const xm = x1 + 14 + (x2 - x1 - 28) * 25.4 / 60.8; b.push(R(xm - 1, ly - 14, 2, 28, '#B91C1C') + T('14:52:40 处理超时 · 已升级 陈工', xm + 8, ly - 22, 12, 700, '#B91C1C')); }
    b.push(T(a, (x1 + x2) / 2, ly + 30, 13, 700, ok ? '#15803D' : '#B91C1C', 'middle') + T(lim, (x1 + x2) / 2, ly + 50, 11, 400, '#94A3B8', 'middle')); });
  NS.forEach(([t, ts, who, c], i) => { const x = pos[i];
    b.push(`<circle cx="${x}" cy="${ly}" r="14" fill="${c}"/>` + tick(x, ly + 0.5, 5.5, '#FFFFFF', 2.4));
    b.push(T(t, x, ly - 58, 14, 700, '#0F172A', 'middle') + T(ts, x, ly - 36, 13, 500, '#334155', 'middle') + T(who, x, ly + 80, 12, 400, '#64748B', 'middle')); });
  b.push(R(X0 + 16, TY + TH - 44, MW - 32, 30, '#F8FAFC', 6) + T('停机 67 min（14:21–15:28）· 影响 SMT-2 贴片产能约 240 Pcs · 贴片机 01 单台运行，工序 30 未完全停线', X0 + 30, TY + TH - 29, 12, 400, '#475569'));
  // 处理记录
  const RY = TY + TH + 16, LW2 = 780; b.push(card(X0, RY, LW2, 1064 - RY, '处理记录', '李工 填写 15:28', '#64748B'));
  const blk = (y, k, v, lines) => { let s2 = T(k, X0 + 16, y, 13, 700, '#334155'); lines.forEach((l, i) => s2 += T(l, X0 + 120, y + i * 22, 13, 400, '#1E293B')); return s2; };
  b.push(blk(RY + 62, '故障现象', 0, ['吸嘴 CN065 真空值 -38 kPa（标准 ≤ -75 kPa），连续抛料 F-07 U1', '14:21 设备报警 E-217 后停机']));
  b.push(blk(RY + 120, '原因分析', 0, ['吸嘴孔被锡膏残渣堵塞，真空过滤棉脏污导致负压不足', '上次保养 11-06，过滤棉超出 7 天更换周期']));
  b.push(blk(RY + 178, '处理措施', 0, ['更换 CN065 吸嘴 2 支，清洗真空发生器，更换过滤棉', '真空值恢复 -82 kPa，试贴 20 片无抛料']));
  b.push(R(X0 + 16, RY + 216, LW2 - 32, 1, '#EEF2F7') + T('更换备件', X0 + 16, RY + 238, 13, 700, '#334155'));
  b.push(tableX(X0 + 16, RY + 254, LW2 - 32, [['备件编码', 120], ['名称', 220], ['数量', 70, 'r'], ['领用单', 170], ['金额', LW2 - 32 - 580, 'r']], [['SP-NZ-065', '吸嘴 CN065', '2', 'SPO-20261113-006', '360.00'], ['SP-FT-210', '真空过滤棉 φ21', '1', 'SPO-20261113-006', '18.00']], { id: 'pt31', rh: 34, hh: 32 }).svg);
  b.push(T('复产确认', X0 + 16, RY + 380, 13, 700, '#334155') + okI(X0 + 120, RY + 380) + T('15:29 首件复检合格 · IPQC 孙悦', X0 + 142, RY + 380, 13, 400, '#15803D') + okI(X0 + 400, RY + 380) + T('15:31 班组长 何俊 确认关闭', X0 + 422, RY + 380, 13, 400, '#15803D'));
  // 事件日志
  const EX = X0 + LW2 + 16, EW = MW - LW2 - 16; b.push(card(EX, RY, EW, 1064 - RY, '事件日志', '10 条', '#64748B'));
  [['14:21:08', '呼叫', 'HMI 发起一级设备安灯，工序 30 暂停', '#64748B'], ['14:21:10', '推送', '设备组 3 人 · 安灯看板 · 三维车间告警', '#64748B'], ['14:22:40', '受理', '李工 受理（响应 1.5 min）', '#2563EB'], ['14:27:15', '签到', '李工 扫码签到（到场 4.6 min）', '#2563EB'], ['14:30:02', '调度', '贴片机 01 单台运行，派工看板更新', '#64748B'], ['14:52:40', '升级', '处理超 30 min，通知设备主管 陈工', '#DC2626'], ['14:58:00', '备件', '领用 SPO-20261113-006', '#64748B'], ['15:28:05', '处理完成', '真空值恢复，试贴 20 片无抛料', '#EA580C'], ['15:29:30', '首检', 'IPQC 孙悦 复检合格', '#15803D'], ['15:31:02', '关闭', '班组长 何俊 确认，工序 30 恢复开工', '#15803D']].forEach(([t, a, d, c], i, arr) => { const y = RY + 58 + i * 38;
    b.push(`<circle cx="${EX + 22}" cy="${y}" r="4" fill="${c}"/>` + (i < arr.length - 1 ? R(EX + 21.5, y + 6, 1, 26, '#E2E8F0') : '') + T(t, EX + 36, y, 12, 500, '#94A3B8') + T(a, EX + 106, y, 13, 700, c) + T(d, EX + 176, y, 12, 400, '#334155')); });
  // 右侧 KPI
  let y = 188; b.push(card(PX, y, PW, 330, '时效', '对比安灯规则 AR-设备-一级', '#64748B'));
  [['响应', '1.5 min', '≤ 5 min', 1], ['到场', '4.6 min', '≤ 10 min', 1], ['处理', '65.4 min', '≤ 30 min', 0], ['确认', '3.0 min', '≤ 10 min', 1], ['总时长', '69.9 min', '—', 2]].forEach(([k, v, lim, ok], i) => { const yy = y + 62 + i * 50;
    b.push(T(k, PX + 16, yy, 13, 400, '#64748B') + T(v, PX + 76, yy, 18, 700, ok === 0 ? '#DC2626' : '#0F172A') + T(lim, PX + PW - 60, yy, 12, 400, '#94A3B8', 'end') + (ok === 1 ? okI(PX + PW - 36, yy) : ok === 0 ? errI(PX + PW - 28, yy) : ''));
    if (i < 4) b.push(R(PX + 16, yy + 24, PW - 32, 1, '#EEF2F7')); });
  y += 346; b.push(card(PX, y, PW, 1064 - y, '本设备近 30 天安灯', '4 次', '#64748B'));
  [['11-13', '吸嘴真空异常', '69.9 min', '#DC2626'], ['11-06', '计划保养', '45.0 min', '#64748B'], ['10-29', '飞达 FD16 卡料', '12.4 min', '#334155'], ['10-21', '吸嘴真空异常', '38.2 min', '#DC2626']].forEach(([d, t, v, c], i) => { const yy = y + 60 + i * 44; b.push(T(d, PX + 16, yy, 13, 500, '#94A3B8') + T(t, PX + 70, yy, 13, 500, '#1E293B') + T(v, PX + PW - 16, yy, 13, 700, c, 'end')); });
  b.push(R(PX + 16, y + 236, PW - 32, 96, '#FFF7ED', 8, ' stroke="#FED7AA"') + T('重复故障提醒', PX + 30, y + 260, 13, 700, '#C2410C') + T('30 天内「吸嘴真空异常」2 次', PX + 30, y + 284, 12, 400, '#9A3412') + T('建议过滤棉更换周期改为 5 天', PX + 30, y + 306, 12, 400, '#9A3412'));
  [['MTTR（近 30 天）', '41.4 min'], ['当班 OEE', '74.2%'], ['本班停机累计', '67 min']].forEach(([k, v], i) => b.push(T(k, PX + 16, y + 368 + i * 34, 13, 400, '#64748B') + T(v, PX + PW - 16, y + 368 + i * 34, 13, 700, '#0F172A', 'end')));
  return SVG(1920, 1080, b.join(''));
}

export { MW, PX, PW, okI, warnI, errI, fields, lastMod, tick };
const ALL = { UI21: ui21, UI22: ui22, UI23: ui23, UI30: ui30, UI31: ui31, UI26: ui26, UI27: ui27, UI28: () => pda28(true), UI28_err: () => pda28(false), UI29: ui29 };
const want = process.argv.slice(2);
if (process.argv[1] && process.argv[1].endsWith('gen_b3.mjs')) for (const [k, fn] of Object.entries(ALL)) { if (want.length && !want.includes(k)) continue; fs.writeFileSync(OUT + k + '.svg', fn()); }
