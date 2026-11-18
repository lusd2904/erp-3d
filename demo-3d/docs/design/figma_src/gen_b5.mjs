// 第 5 批页面：UI41 UI42 UI43 UI44 UI45 UI46 UI47 UI48   (node gen_b5.mjs [UIxx ...])
import { fs, OUT, W, T, R, pill, bar, ring, g, ic, chk, btn, row, tag1, tag2, ST1, frame, tableX, logo, SVG, f1 } from './gen_full.mjs';
import { X0, CW, arrow, card, tabsBar, field, sw, radio, titleRow, toolbar, tree, secT, tagF2, stF2 } from './gen_b1.mjs';
import { MW, PX, PW, okI, warnI, errI, fields, lastMod, tick } from './gen_b3.mjs';
const cell = (t, c, w = 400) => (x, cy) => T(t, x + 10, cy, 13, w, c);
const cellR = (t, c, w = 400) => (x, cy, cw) => T(t, x + cw - 12, cy, 13, w, c, 'end');
const n0 = v => Math.round(v).toLocaleString('en-US');
const legend = (x, cy, items, size = 12) => { let s = '', cx = x; items.forEach(([t, c, k]) => { s += k === 'l' ? R(cx, cy - 1.5, 14, 3, c, 1.5) : R(cx, cy - 5, 10, 10, c, 2); cx += (k ? 20 : 16); s += T(t, cx, cy, size, 400, '#475569'); cx += W(t, size) + 18; }); return s; };
const legendW = (items, size = 12) => items.reduce((a, [t, c, k]) => a + (k ? 20 : 16) + W(t, size) + 18, -18);
const line = (pts, c, w2 = 2, ex = '') => `<polyline points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none" stroke="${c}" stroke-width="${w2}" stroke-linejoin="round" stroke-linecap="round"${ex}/>`;
const okRes = (t = '合格') => (x, cy) => `<circle cx="${x + 18}" cy="${cy}" r="8" fill="#16A34A"/>` + tick(x + 18, cy + 0.5, 3.6, '#FFFFFF', 2) + T(t, x + 32, cy, 13, 700, '#15803D');
const dot = (x, cy, c, r = 3) => `<circle cx="${x}" cy="${cy}" r="${r}" fill="${c}"/>`;
const bul = (x, cy, t, c = '#334155', s = 12) => dot(x + 3, cy, '#94A3B8', 2.5) + T(t, x + 12, cy, s, 400, c);
// 系统管理类页面：顶栏当前用户换成系统管理员（只覆盖右上角用户区，菜单不变）
const adminUser = () => R(1696, 0, 224, 51, '#FFFFFF') + `<circle cx="1712" cy="26" r="15" fill="#E0E7FF"/>` + T('张', 1712, 26, 14, 700, '#4338CA', 'middle') + T('张工', 1736, 19, 13, 500, '#0F172A') + T('系统管理员 · 信息部', 1736, 35, 11, 400, '#64748B');
const seg = (x, y, items, act, h = 32) => { const ws = items.map(t => W(t, 13, 700) + 28), tot = ws.reduce((a, c) => a + c, 0) + 6; let s = R(x, y, tot, h, '#F1F5F9', 8), cx = x + 3; items.forEach((t, i) => { if (i === act) s += R(cx, y + 3, ws[i], h - 6, '#FFFFFF', 6, ' filter="url(#sh)"'); s += T(t, cx + ws[i] / 2, y + h / 2, 13, i === act ? 700 : 500, i === act ? '#1D4ED8' : '#475569', 'middle'); cx += ws[i]; }); return { svg: s, w: tot }; };
const chip = (x, cy, t, on) => { const w = W(t, 13, 500) + (on ? 40 : 24); return { w, svg: R(x, cy - 16, w, 32, on ? '#EFF6FF' : '#FFFFFF', 16, ` stroke="${on ? '#93C5FD' : '#CBD5E1'}"`) + T(t, x + 12, cy, 13, 500, on ? '#1D4ED8' : '#475569') + (on ? ic('close', x + w - 24, cy - 7, '#1D4ED8', 14) : '') }; };

// ======================= UI41 检验单（来料 IQC） =======================
function ui41() {
  const b = frame([['工作台', 0], ['收料通知 - RN-20261113-005', 0], ['检验单 - IQC-20261113-007', 1]], '检验单');
  b.push(titleRow('检验单', 'IQC-20261113-007', [[1, '创建']]));
  { const x = X0 + 130 + W('IQC-20261113-007', 16, 500) + W('创建', 12, 500) + 26; b.push(pill('来料检验', x, 120, '#0E7490', '#ECFEFF', 12, 700, 8, 22, 'start', ' stroke="#A5F3FC"').svg + pill('判定：合格', x + W('来料检验', 12, 700) + 26, 120, '#15803D', '#F0FDF4', 12, 700, 8, 22, 'start', ' stroke="#BBF7D0"').svg); }
  b.push(lastMod('检验员：陈静  2026-11-13 15:05 · 检验用时 39 min'));
  b.push(toolbar(X0, 144, [['保存', 1, 'save'], ['提交', 0, 'send'], ['审核', 'd'], '|', ['使用决策', 0, 'check'], ['生成不良处理单', 0], ['打印检验报告', 0], '|', ['上查', 0, 'up'], ['下查', 0, 'down'], ['附件 3', 0, 'clip']]));
  b.push(card(X0, 188, MW, 108, ''));
  b.push(fields(X0 + 16, 200, MW - 32, 4, [['源单', 'RN-20261113-005', { lock: 1, c: '#2563EB' }], ['采购订单', 'PO-20261111-012', { lock: 1, c: '#2563EB' }], ['供应商', 'SUP-0064 深圳润芯科技', { lock: 1 }], ['质检方案', 'QS-IC-QFN-02 · 封装 IC', { sel: 1 }],
    ['物料', '2.03.0915 RTL8720DN', { lock: 1, c: '#2563EB' }], ['批号 / D/C', 'L2643-R11 · 2643', { lock: 1 }], ['送检数量', '6,000 pcs · 3 盘', { lock: 1 }], ['存放', 'Q-01-03 来料待检区', { lock: 1 }]], { lw: 72, rh: 46 }));
  // 抽样
  const SY = 312, SH = 196; b.push(card(X0, SY, MW, SH, '抽样方案（AQL）', 'GB/T 2828.1 · 正常检验 · 一次抽样', '#64748B'));
  const P = [['批量', '6,000', 'pcs'], ['检验水平', 'II', '一般'], ['样本量字码', 'L', '3,201–10,000'], ['样本量', '200', 'pcs'], ['AQL', '0.65', '外观主项'], ['Ac / Re', '3 / 4', '允收 / 拒收']];
  const pw = (MW - 32 - 5 * 10) / 6; P.forEach(([k, v, s2], i) => { const x = X0 + 16 + i * (pw + 10), on = i === 3 || i === 5; b.push(R(x, SY + 46, pw, 72, on ? '#EFF6FF' : '#F8FAFC', 8, ` stroke="${on ? '#BFDBFE' : '#E2E8F0'}"`) + T(k, x + 14, SY + 64, 12, 400, '#64748B') + T(v, x + 14, SY + 94, 22, 700, on ? '#1D4ED8' : '#0F172A') + T(s2, x + pw - 14, SY + 96, 12, 400, '#94A3B8', 'end')); });
  // 抽样分配
  { const y = SY + 140; b.push(T('样本分配', X0 + 16, y, 13, 700, '#334155'));
    let x = X0 + 96; [['-00049', 67, '开袋抽样'], ['-00050', 67, ''], ['-00051', 66, '']].forEach(([r, n, t]) => { b.push(R(x, y - 14, 196, 28, '#F8FAFC', 6, ' stroke="#E2E8F0"') + T('R26111306' + r, x + 10, y, 12, 500, '#334155') + T(n + ' pcs', x + 186, y, 12, 700, '#0F172A', 'end')); x += 206; });
    b.push(T('= 200 pcs', x, y, 13, 700, '#1D4ED8'));
    b.push(warnI(X0 + 24, y + 32, 0.8) + T('只开 1 盘：-00049 14:26 开袋，15:02 重新抽真空，暴露 0.6 h，已计入 MSL；其余 2 盘真空未拆，样本取自原厂托盘', X0 + 38, y + 32, 12, 400, '#92400E')); }
  // 检验项目
  const IY = SY + SH + 16, IH = 1064 - IY; b.push(card(X0, IY, MW, IH, ''));
  b.push(tabsBar(X0 + 16, IY + 24, ['检验项目 7', '不良明细 1', '检测数据', '附件 3'], 0) + T('全部 7 项已录入 · 合格 7', X0 + MW - 16, IY + 24, 12, 400, '#15803D', 'end') + R(X0 + 16, IY + 46, MW - 32, 1, '#E2E8F0'));
  const cols = [['#', 36], ['检验项目', 96], ['方法 / 量具', 150], ['标准', 236], ['抽样', 116], ['样本', 60, 'r'], ['Ac / Re', 70, 'r'], ['实测 / 不良', 228]]; const u = cols.reduce((a, c) => a + c[1], 0); cols.push(['结果', MW - 32 - u]);
  const bad = (t) => (x, cy) => T(t, x + 10, cy, 13, 500, '#B45309');
  const rows = [
    ['1', '包装与标识', '目视 · 扫码核对', '料号 / 数量 / D/C 与订单一致', '全检', '3 盘', '0 / 1', '一致 · 不良 0', okRes()],
    ['2', '防潮包装', '目视 · 湿度卡', '真空完好，HIC 10% 点未变色', '全检', '3 盘', '0 / 1', 'HIC 5% · 不良 0', okRes()],
    ['3', '外观', '10× 放大镜', '引脚无氧化、变形、缺损', 'II 级 · AQL 0.65', '200', '3 / 4', bad('不良 1 · 引脚轻微氧化（-00050）'), okRes()],
    ['4', '尺寸', '千分尺', '6.00±0.10 × 6.00±0.10 × 0.85±0.05', 'S-2 · AQL 2.5', '5', '0 / 1', '5.98–6.02 · 厚 0.84–0.86', okRes()],
    ['5', '可焊性', '浸锡 245 ℃ × 5 s', '润湿面积 ≥ 95%', 'S-2 · AQL 2.5', '5', '0 / 1', '最低 98% · 不良 0 · 破坏 5', okRes()],
    ['6', '电性能', '烧录器读芯片 ID', 'ID 正确，Flash 读写校验通过', 'S-2 · AQL 2.5', '5', '0 / 1', '5 / 5 通过', okRes()],
    ['7', '真伪核验', '原厂标签 + X-Ray', '晶粒尺寸、键合线与金样一致', '定量', '2', '0 / 1', '一致 · 报告 XR-1113-02', okRes()]];
  const tb = tableX(X0 + 16, IY + 56, MW - 32, cols, rows, { id: 'pt41', rh: 40, hh: 34, sel: 2 }); b.push(tb.svg);
  { const y = IY + 56 + tb.h + 18; b.push(T('不良明细', X0 + 16, y, 13, 700, '#334155') + T('外观 · 引脚轻微氧化 · 1 pcs · R26111306-00050 · 轻缺陷', X0 + 92, y, 13, 400, '#475569'));
    // 照片缩略（矢量占位）
    [0, 1].forEach(k => { const x = X0 + 16 + k * 100; b.push(R(x, y + 18, 88, 66, '#F1F5F9', 6, ' stroke="#E2E8F0"') + R(x + 26, y + 33, 36, 36, '#94A3B8', 3) + [0, 1, 2, 3, 4].map(j => R(x + 29 + j * 7, y + 29, 3, 4, '#CBD5E1') + R(x + 29 + j * 7, y + 69, 3, 4, '#CBD5E1')).join('') + (k ? `<circle cx="${x + 61}" cy="${y + 71}" r="7" fill="none" stroke="#DC2626" stroke-width="1.5"/>` : '')); });
    b.push(T('照片 2 张 · 检验员 陈静 · 15:01', X0 + 224, y + 42, 12, 400, '#64748B') + T('处理建议：轻缺陷，计入 AQL 判定，不单独挑选', X0 + 224, y + 66, 12, 400, '#64748B'));
    b.push(T('检测仪器：千分尺 MC-07（校准至 2027-03）· 烧录器 PR-02 · X-Ray XR-01', X0 + MW - 16, y + 66, 12, 400, '#94A3B8', 'end')); }
  // 右侧：使用决策
  let y = 188; b.push(card(PX, y, PW, 404, '使用决策', '待提交', '#B45309'));
  b.push(R(PX + 16, y + 44, PW - 32, 64, '#F0FDF4', 10, ' stroke="#BBF7D0"') + `<circle cx="${PX + 48}" cy="${y + 76}" r="16" fill="#16A34A"/>` + tick(PX + 48, y + 77, 7, '#FFFFFF', 3) + T('检验结论：合格', PX + 74, y + 68, 16, 700, '#15803D') + T('7 / 7 项合格 · 外观不良 1 ≤ Ac 3', PX + 74, y + 92, 12, 400, '#166534'));
  [['接收', '全部入库', 1], ['让步接收', '需质量经理审批', 0], ['挑选使用', '生成挑选任务', 0], ['拒收退货', '生成退料单', 0]].forEach(([t, s2, on], i) => { const yy = y + 136 + i * 34; b.push(radio(PX + 16, yy, on) + T(t, PX + 42, yy, 13, on ? 700 : 400, on ? '#0F172A' : '#475569') + T(s2, PX + PW - 16, yy, 12, 400, '#94A3B8', 'end')); });
  b.push(R(PX + 16, y + 270, PW - 32, 1, '#EEF2F7'));
  [['合格数量', '5,995', '#15803D'], ['破坏性样品', '5（可焊性，转报废）', '#B45309'], ['入库库位', 'Q-01-03 → A-03-15', '#0F172A']].forEach(([k, v, c], i) => { const yy = y + 294 + i * 28; b.push(T(k, PX + 16, yy, 13, 400, '#64748B') + T(v, PX + PW - 16, yy, 13, 700, c, 'end')); });
  b.push(btn(PX + 16, y + 360, '提交决策', 1, 'send', 32, 13).svg + T('审核后自动下推采购入库单', PX + 124, y + 376, 12, 400, '#64748B'));
  // 供应商质量
  y += 420; b.push(card(PX, y, PW, 236, '供应商来料质量', 'SUP-0064 · 近 90 天', '#64748B'));
  [['来料批次', '14 批'], ['批合格率', '92.9%'], ['外观不良', '420 PPM']].forEach(([k, v], i) => { const x = PX + 16 + i * 108; b.push(R(x, y + 44, 100, 56, '#F8FAFC', 8, ' stroke="#E2E8F0"') + T(k, x + 10, y + 60, 12, 400, '#64748B') + T(v, x + 10, y + 84, 15, 700, '#0F172A')); });
  b.push(T('放宽检验进度', PX + 16, y + 124, 13, 700, '#334155') + T('连续合格 6 / 10 批', PX + PW - 16, y + 124, 12, 500, '#2563EB', 'end'));
  for (let i = 0; i < 10; i++) b.push(R(PX + 16 + i * 31.6, y + 140, 27, 10, i < 6 ? '#22C55E' : '#E2E8F0', 3));
  b.push(T('10-09 拒收 1 批（标签不符）后重新计数', PX + 16, y + 172, 12, 400, '#64748B') + T('满 10 批自动转放宽检验（样本量 80）', PX + 16, y + 198, 12, 400, '#64748B'));
  // 审批
  y += 252; b.push(card(PX, y, PW, 1064 - y, '审批流程', '', ''));
  [['检验员', '陈静 · 录入结果', '15:05', 2], ['品质主管审核', '孙悦', '待处理', 1], ['使用决策生效', '自动下推采购入库', '—', 0]].forEach(([t, who, st, k], i, arr) => { const yy = y + 62 + i * 54, c = k === 2 ? '#10B981' : k === 1 ? '#2563EB' : '#CBD5E1';
    if (i < arr.length - 1) b.push(R(PX + 25, yy + 10, 2, 44, '#E2E8F0'));
    b.push(`<circle cx="${PX + 26}" cy="${yy}" r="8" fill="${k ? c : '#FFFFFF'}" stroke="${c}" stroke-width="2"/>` + (k === 2 ? tick(PX + 26, yy + 0.5, 3.6, '#FFFFFF', 2) : '') + T(t, PX + 44, yy - 8, 13, 700, '#0F172A') + T(who, PX + 44, yy + 12, 12, 400, '#64748B') + T(st, PX + PW - 16, yy - 8, 12, 500, k === 1 ? '#2563EB' : '#94A3B8', 'end')); });
  return SVG(1920, 1080, b.join(''));
}

// ======================= UI42 批号 / 卷盘追溯 =======================
function ui42() {
  const b = frame([['工作台', 0], ['即时库存', 0], ['批号 / 卷盘追溯', 1]], '批号 / 卷盘追溯');
  b.push(titleRow('批号 / 卷盘追溯', '', []) + lastMod('查询时间 2026-11-13 16:25 · 数据来自库存流水与条码事务'));
  b.push(R(X0, 144, 300, 36, '#FFFFFF', 8, ' stroke="#2563EB" stroke-width="1.5"') + T('批号', X0 + 12, 162, 13, 500, '#64748B') + ic('chev', X0 + 44, 154, '#94A3B8') + R(X0 + 66, 152, 1, 20, '#E2E8F0') + T('L2639-A07', X0 + 78, 162, 14, 700, '#0F172A') + ic('search', X0 + 272, 154, '#2563EB'));
  { const s1 = seg(X0 + 316, 146, ['溯源', '去向', '双向'], 2); b.push(s1.svg); let x = X0 + 316 + s1.w + 12; [['物料：2.03.0832 nRF52832-QFAA-R', 1], ['层级：全部', 0], ['含已发货', 1]].forEach(([t, on]) => { const c = chip(x, 162, t, on); b.push(c.svg); x += c.w + 8; }); }
  b.push(row(1904 - 330, 146, [['一键冻结', 0, 'lock'], ['追溯报告', 0, 'doc'], ['导出', 0, 'down']]).svg);
  // KPI
  const K = [['来料', '21,000', 'pcs · 7 盘'], ['已投产', '10,890', 'pcs · 2 张生产订单'], ['原材料在库', '7,260', 'pcs · 3 盘'], ['线边在用', '2,850', 'pcs · SMT-2 F-07'], ['成品', '12,800', 'pcs · 2 个成品批'], ['已发货', '6,000', 'pcs · 1 家客户']];
  const kw = (CW - 5 * 12) / 6; K.forEach(([k, v, s2], i) => { const x = X0 + i * (kw + 12); b.push(card(x, 196, kw, 64, '') + T(k, x + 14, 216, 12, 400, '#64748B') + T(v, x + 14, 240, 18, 700, i === 5 ? '#C2410C' : '#0F172A') + T(s2, x + 22 + W(v, 18, 700), 242, 12, 400, '#94A3B8')); });
  // 图
  const GY = 276, GH = 520; b.push(card(X0, GY, CW, GH, '追溯图', '', ''));
  { const items = [['采购 / 来料', '#7C3AED'], ['批次 / 卷盘', '#2563EB'], ['生产', '#0E7490'], ['成品 / 发货', '#C2410C']]; b.push(legend(X0 + CW - 16 - legendW(items), GY + 25, items)); }
  const COLX = [X0 + 24, X0 + 270, X0 + 516, X0 + 790, X0 + 1046, X0 + 1302], NW = 220, NW3 = 228;
  const heads = ['供应商 / 采购', '收料 / 检验', '批次', '卷盘', '生产订单', '成品 / 去向'];
  heads.forEach((h, i) => b.push(T(h, COLX[i] + (i === 3 ? NW3 : NW) / 2, GY + 62, 12, 700, '#94A3B8', 'middle')));
  b.push(R(X0 + 16, GY + 76, CW - 32, 1, '#EEF2F7'));
  const node = (x, y, w, h, c, t1, t2, t3, o = {}) => R(x, y, w, h, o.sel ? '#EFF6FF' : '#FFFFFF', 8, ` stroke="${o.sel ? '#2563EB' : '#CBD5E1'}"${o.sel ? ' stroke-width="2"' : ''}`) + R(x, y + 8, 4, h - 16, c, 2) + T(t1, x + 14, y + (t3 ? 18 : h / 2 - 9), 13, 700, '#0F172A') + T(t2, x + 14, y + (t3 ? 38 : h / 2 + 10), 12, 400, '#475569') + (t3 ? T(t3, x + 14, y + 58, 12, 500, o.c3 || '#64748B') : '') + (o.tag ? pill(o.tag[0], x + w - 10, y + 18, o.tag[1], o.tag[2], 11, 700, 6, 18, 'end').svg : '');
  const link = (x1, y1, x2, y2, c = '#94A3B8', lab) => { const mx = (x1 + x2) / 2; return `<path d="M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2 - 6} ${y2}" fill="none" stroke="${c}" stroke-width="1.5"/><path d="M${x2 - 7} ${y2 - 4} L${x2} ${y2} L${x2 - 7} ${y2 + 4} Z" fill="${c}"/>` + (lab ? T(lab, x2 - 10, y2 - 10, 11, 500, '#64748B', 'end') : ''); };
  const Y0 = GY + 96;
  // col0
  const n0y = [Y0 + 120, Y0 + 220];
  b.push(node(COLX[0], n0y[0], NW, 72, '#7C3AED', 'SUP-0012 芯联科技', 'Nordic 授权代理', '原厂批 NRD-2639-77A1'));
  b.push(node(COLX[0], n0y[1], NW, 72, '#7C3AED', 'PO-20260921-006', '21,000 pcs · 18.40', '已关闭 · 门户确认 09-22'));
  // col1
  b.push(node(COLX[1], n0y[0], NW, 72, '#7C3AED', 'RN-20261002-011', '收料 10-02 09:30', '21,000 pcs · 7 盘'));
  b.push(node(COLX[1], n0y[1], NW, 72, '#7C3AED', 'IQC-20261002-014', '来料检验 · 合格', '外观 AQL 0.65 · 0 不良', { c3: '#15803D' }));
  b.push(arrow([[COLX[0] + NW / 2, n0y[0] + 72], [COLX[0] + NW / 2, n0y[1]]], '#94A3B8', 1.5) + arrow([[COLX[1] + NW / 2, n0y[0] + 72], [COLX[1] + NW / 2, n0y[1]]], '#94A3B8', 1.5) + link(COLX[0] + NW, n0y[1] + 36, COLX[1], n0y[0] + 36));
  b.push(T('下单', COLX[0] + NW / 2 + 8, n0y[0] + 86, 11, 500, '#94A3B8') + T('送检', COLX[1] + NW / 2 + 8, n0y[0] + 86, 11, 500, '#94A3B8'));
  // col2 批次
  const by = Y0 + 150; b.push(node(COLX[2], by, NW, 112, '#2563EB', '批次 L2639-A07', '2.03.0832 nRF52832-QFAA-R', 'D/C 2639 · 21,000 pcs', { sel: 1, tag: ['当前', '#FFFFFF', '#2563EB'] }));
  b.push(T('入库 RK-20261002-008 · 10-02', COLX[2] + 14, by + 84, 12, 400, '#64748B'));
  b.push(link(COLX[1] + NW, n0y[1] + 36, COLX[2], by + 56, '#94A3B8'));
  // col3 卷盘
  const RL = [['R26110907-00195', '3,000 → 0', '已用完', '#64748B', 0], ['R26110907-00196', '3,000 → 0', '已用完', '#64748B', 0], ['R26110907-00197', '3,000 → 1,260', '退料回库 A-03-12', '#15803D', 0], ['R26110907-00198', '3,000 → 0', '已用完', '#64748B', 1], ['R26111304-00318', '3,000 → 2,850', '在线 SMT-2 F-07', '#2563EB', 1], ['R26111304-00319', '3,000', '在库 A-03-12', '#15803D', -1], ['R26111304-00320', '3,000', '在库 A-03-12', '#15803D', -1]];
  const rh = 54, ry0 = Y0 + 6; RL.forEach(([r, q, st, c, mo], i) => { const y = ry0 + i * rh; b.push(R(COLX[3], y, NW3, rh - 8, '#FFFFFF', 8, ` stroke="${i === 4 ? '#93C5FD' : '#E2E8F0'}"`) + R(COLX[3], y + 8, 4, rh - 24, '#60A5FA', 2) + T(r, COLX[3] + 14, y + 14, 12, 700, '#0F172A') + T(q, COLX[3] + NW3 - 10, y + 14, 12, 700, '#334155', 'end') + T(st, COLX[3] + 14, y + 32, 11, 500, c));
    b.push(link(COLX[2] + NW, by + 56, COLX[3], y + 23, '#CBD5E1')); });
  // col4 生产订单
  const m1 = Y0 + 46, m2 = Y0 + 196;
  b.push(node(COLX[4], m1, NW, 84, '#0E7490', 'MO-20261111-015', 'BT-52 V2.3 · 8,000 · 完工', '耗用 7,740（3 盘）', { tag: ['完工', '#15803D', '#DCFCE7'] }));
  b.push(node(COLX[4], m2, NW, 84, '#0E7490', 'MO-20261112-002', 'BT-52 V2.3 · 8,000 · 开工', '耗用 3,150 · 在制', { tag: ['开工', '#0E7490', '#CFFAFE'] }));
  [0, 1, 2].forEach(i => b.push(link(COLX[3] + NW3, ry0 + i * rh + 23, COLX[4], m1 + 42, '#67E8F9')));
  [3, 4].forEach(i => b.push(link(COLX[3] + NW3, ry0 + i * rh + 23, COLX[4], m2 + 42, '#67E8F9')));
  // col5 去向
  const f1y = Y0 + 6, f2y = Y0 + 96, f3y = Y0 + 196, f4y = Y0 + 300;
  b.push(node(COLX[5], f1y, NW + 116, 72, '#C2410C', '销售出库 XSCK-20261112-003', '华东智联电子 · SO-20261101-004', '6,000 pcs · 11-12 16:40 发货', { c3: '#C2410C', tag: ['已发货', '#C2410C', '#FFF7ED'] }));
  b.push(node(COLX[5], f2y, NW + 116, 72, '#C2410C', '成品批 BT52-L261111', '成品仓 B-02-04 · 2,000 pcs', '待发 SO-20261101-004 第 2 批'));
  b.push(node(COLX[5], f3y, NW + 116, 72, '#C2410C', '成品批 BT52-L261112', '成品仓 B-02-05 · 4,800 pcs', '生产入库 3 次 · 含其他批次物料'));
  b.push(node(COLX[5], f4y, NW + 116, 72, '#0E7490', '在制 3,200 pcs', 'SMT-2 线 · 工序 30 贴片', '贴片机 02 15:28 已复产', { c3: '#0E7490' }));
  b.push(link(COLX[4] + NW, m1 + 30, COLX[5], f1y + 36, '#FDBA74') + link(COLX[4] + NW, m1 + 54, COLX[5], f2y + 36, '#FDBA74') + link(COLX[4] + NW, m2 + 30, COLX[5], f3y + 36, '#FDBA74') + link(COLX[4] + NW, m2 + 54, COLX[5], f4y + 36, '#67E8F9'));
  b.push(T('缩放 100% · 拖动平移 · 点击节点查看单据', X0 + 16, GY + GH - 18, 12, 400, '#94A3B8'));
  // 底部：事务明细 + 影响评估
  const DY = GY + GH + 16, DW = CW - 420 - 16; b.push(card(X0, DY, DW, 1064 - DY, ''));
  b.push(tabsBar(X0 + 16, DY + 24, ['条码事务 9', '单据链路', '质检记录'], 0) + R(X0 + 16, DY + 46, DW - 32, 1, '#E2E8F0'));
  const cols = [['时间', 100], ['事务', 76], ['单据', 170], ['卷盘', 150], ['数量', 80, 'r'], ['位置 / 去向', 220]]; const u = cols.reduce((a, c) => a + c[1], 0); cols.push(['操作人', DW - 32 - u]);
  const lk = t => cell(t, '#2563EB');
  b.push(tableX(X0 + 16, DY + 56, DW - 32, cols, [
    ['11-13 14:41', '上料', lk('ZW-BT52-SMT2-02'), 'R26111304-00318', '3,000', 'SMT-2 贴片机 02 · F-07', '林峰 · PDA'],
    ['11-13 10:31', '领料', lk('PICK-20261113-004'), 'R26111304-00318', cellR('−3,000', '#DC2626'), 'A-03-12 → 线边仓 SMT-2', '李娜 · PDA'],
    ['11-12 07:50', '领料', lk('PICK-20261112-002'), 'R26110907-00198', cellR('−3,000', '#DC2626'), 'MO-20261112-002', '李娜 · PDA'],
    ['11-11 18:20', '退料', lk('RT-20261111-006'), 'R26110907-00197', cellR('+1,260', '#15803D'), '线边仓 → A-03-12', '何俊'],
    ['11-10 08:12', '领料', lk('PICK-20261110-009'), '-00195 / -00196 / -00197', cellR('−9,000', '#DC2626'), 'MO-20261111-015', '李娜 · PDA']], { id: 'pt42', rh: 30, hh: 30 }).svg);
  const AX = X0 + DW + 16, AW = 420; b.push(card(AX, DY, AW, 1064 - DY, '冻结影响评估', '按当前批次', '#64748B'));
  [['原材料（在库 + 线边）', '10,110 pcs', '#0F172A'], ['在制', '3,200 pcs', '#0F172A'], ['成品在库', '6,800 pcs', '#0F172A'], ['已发货 · 需通知客户', '6,000 pcs · 1 家', '#C2410C']].forEach(([k, v, c], i) => { const yy = DY + 60 + i * 30; b.push(T(k, AX + 16, yy, 13, 400, '#475569') + T(v, AX + AW - 16, yy, 13, 700, c, 'end')); });
  b.push(R(AX + 16, DY + 174, AW - 32, 40, '#F8FAFC', 8, ' stroke="#E2E8F0"') + T('同批另有 PO-20261113-004 在途 3,000 pcs 为新批次，不受影响', AX + 28, DY + 194, 12, 400, '#475569'));
  return SVG(1920, 1080, b.join(''));
}

// ======================= UI43 报表通用模板（RP04 销售订单准交率） =======================
function ui43() {
  const b = frame([['工作台', 0], ['驾驶舱', 0], ['报表 - RP04 销售订单准交率', 1]], '报表中心');
  b.push(titleRow('销售订单准交率', 'RP04', []));
  { const it = [['订阅推送', 0, 'bell'], ['打印', 0], ['导出 PDF', 0, 'down'], ['导出 Excel', 1, 'down']], tw = it.reduce((a, [t, k, i2]) => a + W(t, 14, 500) + (i2 ? 22 : 0) + 28 + 8, -8); b.push(row(1904 - tw, 104, it).svg + T('数据截至 2026-11-13 16:00 · 每小时刷新', 1904 - tw - 16, 120, 12, 400, '#94A3B8', 'end')); }
  // 左：报表目录
  const LW = 232, MX = X0 + LW + 16, MW2 = CW - LW - 16;
  b.push(card(X0, 144, LW, 920, '报表目录', '14 张', '#64748B'));
  b.push(R(X0 + 12, 184, LW - 24, 30, '#F1F5F9', 6) + ic('search', X0 + 22, 191, '#94A3B8') + T('搜索报表', X0 + 44, 199, 13, 400, '#94A3B8'));
  b.push(tree(X0 + 8, 224, [[0, '销售', 1, 4], [1, 'RP01 销售日报', -1], [1, 'RP02 订单执行跟踪', -1], [1, 'RP03 应收账龄', -1], [1, 'RP04 销售订单准交率', -1, null, 1], [0, '生产', 1, 3], [1, 'RP05 生产日报', -1], [1, 'RP06 工单达成率', -1], [1, 'RP07 OEE 日报', -1], [0, '采购', 1, 2], [1, 'RP08 到货及时率', -1], [1, 'RP09 采购价格趋势', -1], [0, '库存', 1, 3], [1, 'RP10 收发存汇总', -1], [1, 'RP11 库龄分析', -1], [1, 'RP12 呆滞料', -1], [0, '质量', 1, 2], [1, 'RP13 来料质量', -1], [1, 'RP14 不良柏拉图', -1]], { w: LW - 16, rh: 34 }));
  b.push(R(X0 + 16, 892, LW - 32, 1, '#EEF2F7') + T('我的收藏', X0 + 16, 914, 13, 700, '#334155'));
  ['RP04 销售订单准交率', 'RP07 OEE 日报', 'RP11 库龄分析'].forEach((t, i) => b.push(ic('star', X0 + 16, 930 + i * 30, '#F59E0B', 14) + T(t, X0 + 38, 937 + i * 30, 13, 400, '#475569')));
  // 过滤
  b.push(card(MX, 144, MW2, 100, ''));
  const F = [['统计期间', '2026-11-01 ~ 2026-11-13', { sel: 1 }], ['客户', '全部（12 家）', { sel: 1 }], ['产品线', '全部', { sel: 1 }], ['口径', '按订单行 · 承诺交期', { sel: 1 }]];
  b.push(fields(MX + 16, 156, MW2 - 260, 4, F, { lw: 72 }));
  b.push(btn(MX + MW2 - 232, 156, '查询', 1, 'search').svg + btn(MX + MW2 - 140, 156, '重置', 0).svg + T('更多条件', MX + MW2 - 16, 172, 13, 500, '#2563EB', 'end'));
  { let x = MX + 16; b.push(T('方案', x + 10, 220, 13, 400, '#475569')); x += 72; [['本月 · 按客户', 1], ['上周', 0], ['重点客户', 0], ['按产品线', 0]].forEach(([t, on]) => { const w = W(t, 13, 500) + 28; b.push(R(x, 206, w, 28, on ? '#EFF6FF' : '#FFFFFF', 14, ` stroke="${on ? '#93C5FD' : '#E2E8F0'}"`) + T(t, x + 14, 220, 13, 500, on ? '#1D4ED8' : '#475569')); x += w + 8; }); b.push(T('+ 保存当前为方案', x + 6, 220, 13, 500, '#2563EB'));
    b.push(T('分组', MX + MW2 - 300, 220, 13, 400, '#475569')); const s1 = seg(MX + MW2 - 260, 204, ['客户', '产品线', '销售员', '月份'], 0, 30); b.push(s1.svg); }
  // KPI
  const KY = 260, K = [['订单行', '124', '行', '本期承诺交期内'], ['准时交付', '118', '行', '含提前交付 9 行'], ['准交率', '95.2', '%', '目标 ≥ 95% · 上月 93.8%'], ['平均延期', '1.8', '天', '延期 6 行 · 最长 3 天'], ['延期金额', '426,380', '元', '占本期 2.9%']];
  const kw = (MW2 - 4 * 12) / 5; K.forEach(([k, v, u2, s2], i) => { const x = MX + i * (kw + 12); b.push(card(x, KY, kw, 84, '') + T(k, x + 16, KY + 22, 12, 400, '#64748B') + T(v, x + 16, KY + 52, 24, 700, i === 2 ? '#15803D' : i >= 3 ? '#C2410C' : '#0F172A') + T(u2, x + 22 + W(v, 24, 700), KY + 56, 12, 400, '#64748B') + T(s2, x + 16, KY + 72, 11, 400, '#94A3B8')); });
  // 图表
  const CY = KY + 100, CH = 316, C1W = MW2 - 400 - 16;
  b.push(card(MX, CY, C1W, CH, '按客户', '', ''));
  { const items = [['订单行', '#BFDBFE'], ['准时', '#2563EB'], ['准交率', '#F59E0B', 'l']]; b.push(legend(MX + C1W - 16 - legendW(items), CY + 25, items)); }
  const DATA = [['华东智联电子', 38, 37], ['东莞拓普电子', 26, 24], ['杭州云柏科技', 22, 21], ['苏州恒力电气', 18, 17], ['其他 8 家', 20, 19]];
  const gx = MX + 56, gw = C1W - 112, gy = CY + 56, gh = 200, YB = gy + gh, sx = gw / DATA.length;
  [0, 10, 20, 30, 40, 50].forEach(v => { const y = YB - v / 50 * gh; b.push(R(gx, y, gw, 1, v ? '#EEF2F7' : '#CBD5E1') + T(String(v), gx - 8, y, 11, 400, '#94A3B8', 'end')); });
  [60, 70, 80, 90, 100].forEach(v => { const y = YB - (v - 60) / 40 * gh; b.push(T(v + '%', gx + gw + 8, y, 11, 400, '#B45309')); });
  const tgt = YB - (95 - 60) / 40 * gh; b.push(`<line x1="${gx}" y1="${tgt}" x2="${gx + gw}" y2="${tgt}" stroke="#F59E0B" stroke-width="1" stroke-dasharray="4 4"/>` + T('目标 95%', gx + gw - 6, tgt - 10, 11, 500, '#B45309', 'end'));
  const pts = [];
  DATA.forEach(([n, a, ok], i) => { const cx = gx + sx * (i + 0.5), bw = 34; b.push(R(cx - bw - 2, YB - a / 50 * gh, bw, a / 50 * gh, '#BFDBFE', 3) + R(cx + 2, YB - ok / 50 * gh, bw, ok / 50 * gh, '#2563EB', 3) + T(String(a), cx - bw / 2 - 2, YB - a / 50 * gh - 10, 11, 500, '#64748B', 'middle') + T(String(ok), cx + bw / 2 + 2, YB - ok / 50 * gh - 10, 11, 700, '#1D4ED8', 'middle') + T(n, cx, YB + 18, 12, 500, '#334155', 'middle'));
    const r = ok / a * 100; pts.push([cx, YB - (r - 60) / 40 * gh, r]); });
  b.push(line(pts.map(p => [p[0], p[1]]), '#F59E0B', 2));
  pts.forEach(([x, y, r]) => b.push(`<circle cx="${x}" cy="${y}" r="4" fill="#FFFFFF" stroke="#F59E0B" stroke-width="2"/>` + T(f1(r) + '%', x, y - 14, 11, 700, r < 95 ? '#C2410C' : '#B45309', 'middle')));
  b.push(T('点击柱子钻取延期明细', MX + 16, CY + CH - 16, 11, 400, '#94A3B8'));
  const C2X = MX + C1W + 16; b.push(card(C2X, CY, 400, CH, '延期原因', '6 行', '#64748B'));
  const RS = [['缺料', 3, '#EF4444', '0603 10kΩ · nRF52832'], ['产能', 1, '#F59E0B', 'SMT-2 贴片机 02 故障'], ['质量返工', 1, '#8B5CF6', 'TVS 返工 MO-20261113-003'], ['客户变更', 1, '#64748B', '交期前 2 天改数量']];
  { const cx = C2X + 100, cy = CY + 160, r = 62; let a0 = -Math.PI / 2; RS.forEach(([, n, c]) => { const a1 = a0 + n / 6 * Math.PI * 2, big = a1 - a0 > Math.PI ? 1 : 0; b.push(`<path d="M${(cx + r * Math.cos(a0)).toFixed(1)} ${(cy + r * Math.sin(a0)).toFixed(1)} A${r} ${r} 0 ${big} 1 ${(cx + r * Math.cos(a1)).toFixed(1)} ${(cy + r * Math.sin(a1)).toFixed(1)}" fill="none" stroke="${c}" stroke-width="22"/>`); a0 = a1; }); b.push(T('6', cx, cy - 6, 24, 700, '#0F172A', 'middle') + T('延期行', cx, cy + 18, 11, 400, '#64748B', 'middle')); }
  RS.forEach(([t, n, c, d], i) => { const y = CY + 80 + i * 52, x = C2X + 196; b.push(R(x, y - 6, 10, 10, c, 2) + T(t, x + 16, y, 13, 700, '#334155') + T(n + ' 行', C2X + 384, y, 13, 700, '#0F172A', 'end') + T(d, x + 16, y + 20, 11, 400, '#64748B')); });
  // 表
  const TY = CY + CH + 16; b.push(card(MX, TY, MW2, 1064 - TY, ''));
  b.push(tabsBar(MX + 16, TY + 24, ['按客户汇总', '延期明细 6', '原始数据'], 0) + T('列设置', MX + MW2 - 16, TY + 24, 13, 500, '#2563EB', 'end') + ic('cols', MX + MW2 - 76, TY + 16, '#2563EB') + R(MX + 16, TY + 46, MW2 - 32, 1, '#E2E8F0'));
  const cols = [['客户', 180], ['订单行', 90, 'r'], ['准时', 90, 'r'], ['延期', 90, 'r'], ['准交率', 200], ['平均延期（天）', 120, 'r'], ['最长延期', 100, 'r'], ['订单金额（元）', 150, 'r'], ['延期金额（元）', 140, 'r']]; const u = cols.reduce((a, c) => a + c[1], 0); cols.push(['主要原因', MW2 - 32 - u]);
  const rate = (ok, a) => (x, cy, cw) => { const r = ok / a; return bar(x + 10, cy - 3, cw - 76, 6, r, r < 0.95 ? '#F59E0B' : '#10B981') + T(f1(r * 100) + '%', x + cw - 12, cy, 12, 700, r < 0.95 ? '#C2410C' : '#15803D', 'end'); };
  const TR = [['华东智联电子', 38, 37, 1, '1.0', '1 天', '5,286,400', '98,600', '缺料'], ['东莞拓普电子', 26, 24, 2, '2.5', '3 天', '3,412,800', '143,050', '缺料 · 客户变更'], ['杭州云柏科技', 22, 21, 1, '2.0', '2 天', '2,465,200', '72,400', '产能'], ['苏州恒力电气', 18, 17, 1, '1.0', '1 天', '1,918,600', '56,330', '质量返工'], ['其他 8 家', 20, 19, 1, '2.0', '2 天', '1,604,500', '56,000', '缺料']];
  b.push(tableX(MX + 16, TY + 56, MW2 - 32, cols, TR.map(([n, a, ok, l, av, mx, amt, la, rs]) => [{ t: n, c: '#2563EB' }, String(a), String(ok), l ? { t: String(l), c: '#C2410C', b: 1 } : '0', rate(ok, a), av, mx, amt, la, rs]), { id: 'pt43', rh: 34, hh: 32, total: (cx, cy) => T('合计', cx[0] + 10, cy, 13, 700, '#0F172A') + T('124', cx[2] - 12, cy, 13, 700, '#0F172A', 'end') + T('118', cx[3] - 12, cy, 13, 700, '#0F172A', 'end') + T('6', cx[4] - 12, cy, 13, 700, '#C2410C', 'end') + T('95.2%', cx[5] - 12, cy, 13, 700, '#15803D', 'end') + T('1.8', cx[6] - 12, cy, 13, 700, '#0F172A', 'end') + T('3 天', cx[7] - 12, cy, 13, 700, '#0F172A', 'end') + T('14,687,500', cx[8] - 12, cy, 13, 700, '#0F172A', 'end') + T('426,380', cx[9] - 12, cy, 13, 700, '#C2410C', 'end') }).svg);
  return SVG(1920, 1080, b.join(''));
}

// ======================= UI44 流程设计器（bpmn-js） =======================
function ui44() {
  const b = frame([['工作台', 0], ['流程设计器 - 采购订单变更审批', 1]], '流程设计器');
  b.push(adminUser());
  b.push(titleRow('流程设计器', '采购订单变更审批 · PUR_POC_APPROVE', []));
  { const x = X0 + 124 + W('采购订单变更审批 · PUR_POC_APPROVE', 16, 500) + 12; b.push(pill('V3 已发布', x, 120, '#15803D', '#F0FDF4', 12, 700, 8, 22, 'start', ' stroke="#BBF7D0"').svg + pill('V4 草稿', x + W('V3 已发布', 12, 700) + 26, 120, '#C2410C', '#FFF7ED', 12, 700, 8, 22, 'start', ' stroke="#FED7AA"').svg); }
  b.push(lastMod('张工 编辑中 · 自动保存 16:32 · V3 使用中 6 个流程实例'));
  b.push(toolbar(X0, 144, [['保存草稿', 1, 'save'], ['校验', 0, 'check'], ['发布 V4', 0, 'send'], '|', ['导入 XML', 0, 'up'], ['导出 XML', 0, 'down'], ['导出 SVG', 0, 'down'], '|', ['撤销', 0], ['重做', 0], '|', ['模拟运行', 0], ['版本历史', 0]]));
  // 画布
  const CX = X0, CY = 188, CWd = 1316, CH = 876;
  b.push(R(CX, CY, CWd, CH, '#FFFFFF', 10, ' stroke="#E2E8F0"'));
  let dots = ''; for (let x = CX + 20; x < CX + CWd; x += 20) for (let y = CY + 20; y < CY + CH; y += 20) dots += `M${x} ${y}h1`; b.push(`<path d="${dots}" stroke="#E2E8F0" stroke-width="1.5" stroke-linecap="round"/>`);
  // 调色板（bpmn-js palette）
  const PX0 = CX + 16, PY0 = CY + 16; b.push(R(PX0, PY0, 48, 404, '#FAFAFA', 4, ' stroke="#CCCCCC"'));
  const pal = [
    c => `<path d="M-6 -2 v-4 a1.5 1.5 0 0 1 3 0 v4 M-3 -6 v-2 a1.5 1.5 0 0 1 3 0 v6 M0 -7 a1.5 1.5 0 0 1 3 0 v7 M3 -5 a1.5 1.5 0 0 1 3 0 v8 c0 4 -3 7 -6 7 c-3 0 -5 -2 -7 -5 l-3 -4 a1.5 1.5 0 0 1 2.5 -1.5 l1.5 2" fill="none" stroke="${c}" stroke-width="1.4"/>`,
    c => `<rect x="-8" y="-8" width="16" height="16" fill="none" stroke="${c}" stroke-width="1.4" stroke-dasharray="3 2"/>`,
    c => `<path d="M-9 0 H9 M-6 -3 L-9 0 L-6 3 M6 -3 L9 0 L6 3 M-9 -9 V9 M9 -9 V9" fill="none" stroke="${c}" stroke-width="1.4"/>`,
    c => `<path d="M-8 6 L6 -6 M1 -6 H6 V-1" fill="none" stroke="${c}" stroke-width="1.6"/>`,
    null,
    c => `<circle r="9" fill="none" stroke="${c}" stroke-width="1.4"/>`,
    c => `<circle r="9" fill="none" stroke="${c}" stroke-width="1.4"/><circle r="6.5" fill="none" stroke="${c}" stroke-width="1.2"/>`,
    c => `<circle r="9" fill="none" stroke="${c}" stroke-width="3.2"/>`,
    c => `<path d="M0 -10 L10 0 L0 10 L-10 0 Z" fill="none" stroke="${c}" stroke-width="1.4"/>`,
    c => `<rect x="-11" y="-8" width="22" height="16" rx="3" fill="none" stroke="${c}" stroke-width="1.4"/>`,
    c => `<rect x="-11" y="-8" width="22" height="16" rx="3" fill="none" stroke="${c}" stroke-width="1.4"/><rect x="-3" y="2" width="6" height="6" fill="none" stroke="${c}" stroke-width="1"/>`,
    c => `<path d="M-6 -9 H3 L7 -5 V9 H-6 Z" fill="none" stroke="${c}" stroke-width="1.4"/>`,
    c => `<path d="M-8 -6 C-8 -10 8 -10 8 -6 V6 C8 10 -8 10 -8 6 Z M-8 -6 C-8 -2 8 -2 8 -6" fill="none" stroke="${c}" stroke-width="1.4"/>`,
    c => `<rect x="-11" y="-8" width="22" height="16" fill="none" stroke="${c}" stroke-width="1.4"/><path d="M-6 -8 V8" stroke="${c}" stroke-width="1.4"/>`];
  let py = PY0 + 20; pal.forEach(f => { if (!f) { b.push(R(PX0 + 8, py - 8, 32, 1, '#CCCCCC')); py += 8; return; } b.push(g(PX0 + 24, py, f('#333333'))); py += 30; });
  // 节点
  const K = '#22242A', task = (x, y, t, t2, o = {}) => { let s = R(x, y, 120, 80, '#FFFFFF', 10, ` stroke="${o.sel ? '#2563EB' : K}" stroke-width="2"`); if (o.user) s += g(x + 8, y + 8, `<circle cx="7" cy="5" r="3.5" fill="none" stroke="${K}" stroke-width="1.2"/><path d="M1 15 C1 9 13 9 13 15 Z" fill="none" stroke="${K}" stroke-width="1.2"/>`); if (o.svc) s += g(x + 8, y + 8, `<circle cx="7" cy="7" r="5" fill="none" stroke="${K}" stroke-width="1.2"/><circle cx="7" cy="7" r="2" fill="none" stroke="${K}" stroke-width="1.2"/>` + [0, 45, 90, 135, 180, 225, 270, 315].map(a => `<line x1="${7 + 5 * Math.cos(a * Math.PI / 180)}" y1="${7 + 5 * Math.sin(a * Math.PI / 180)}" x2="${7 + 7 * Math.cos(a * Math.PI / 180)}" y2="${7 + 7 * Math.sin(a * Math.PI / 180)}" stroke="${K}" stroke-width="1.6"/>`).join('')); if (o.rcv) s += g(x + 8, y + 9, `<rect x="0" y="0" width="16" height="11" fill="none" stroke="${K}" stroke-width="1.2"/><path d="M0 0 L8 6 L16 0" fill="none" stroke="${K}" stroke-width="1.2"/>`); if (o.multi) s += [0, 5, 10].map(d => R(x + 54 + d, y + 64, 2, 10, K)).join('');
    s += T(t, x + 60, y + (t2 ? 34 : 40), 13, 500, K, 'middle') + (t2 ? T(t2, x + 60, y + 52, 11, 400, '#64748B', 'middle') : ''); if (o.sel) s += `<rect x="${x - 6}" y="${y - 6}" width="132" height="92" rx="12" fill="none" stroke="#2563EB" stroke-width="1.2" stroke-dasharray="4 3"/>`; return s; };
  const flow = (pts, lab, lx, ly, c = K) => arrow(pts, c, 1.6) + (lab ? R(lx - 4, ly - 10, W(lab, 12, 500) + 8, 20, '#FFFFFF') + T(lab, lx, ly, 12, 500, '#475569') : '');
  const ev = (cx, cy, end, lab) => `<circle cx="${cx}" cy="${cy}" r="18" fill="#FFFFFF" stroke="${K}" stroke-width="${end ? 4 : 2}"/>` + T(lab, cx, cy + 36, 12, 400, K, 'middle');
  const gw = (cx, cy, lab, lx) => `<path d="M${cx} ${cy - 25} L${cx + 25} ${cy} L${cx} ${cy + 25} L${cx - 25} ${cy} Z" fill="#FFFFFF" stroke="${K}" stroke-width="2"/><path d="M${cx - 8} ${cy - 8} L${cx + 8} ${cy + 8} M${cx + 8} ${cy - 8} L${cx - 8} ${cy + 8}" stroke="${K}" stroke-width="3"/>` + (lab ? T(lab, lx ?? cx, cy - 40, 12, 400, K, 'middle') : '');
  const MY = CY + 300; // 主轴中心
  const xS = CX + 130, xT1 = CX + 200, xG1 = CX + 410, xT2 = CX + 520, xG2 = CX + 740, xT3 = CX + 820, xT4 = CX + 1010, xE = CX + 1220;
  b.push(ev(xS, MY, 0, '提交变更'));
  b.push(flow([[xS + 18, MY], [xT1, MY]]));
  b.push(task(xT1, MY - 40, '采购主管审批', '周海', { user: 1 }));
  b.push(flow([[xT1 + 120, MY], [xG1 - 25, MY]], '同意', xT1 + 132, MY - 14));
  b.push(gw(xG1, MY) + T('金额增加 > 5 万？', xG1, MY + 42, 12, 400, K, 'middle'));
  b.push(flow([[xG1 + 25, MY], [xT2, MY]], '是', xG1 + 36, MY - 14));
  b.push(task(xT2, MY - 40, '财务会签', '财务主管', { user: 1, multi: 1, sel: 1 }));
  // 边界计时事件
  b.push(`<circle cx="${xT2 + 96}" cy="${MY + 40}" r="13" fill="#FFFFFF" stroke="${K}" stroke-width="1.5"/><circle cx="${xT2 + 96}" cy="${MY + 40}" r="10" fill="none" stroke="${K}" stroke-width="1"/><circle cx="${xT2 + 96}" cy="${MY + 40}" r="6.5" fill="none" stroke="${K}" stroke-width="1.2"/><path d="M${xT2 + 96} ${MY + 35.5} V${MY + 40} L${xT2 + 99} ${MY + 42}" fill="none" stroke="${K}" stroke-width="1.2"/>`);
  b.push(flow([[xT2 + 96, MY + 53], [xT2 + 96, MY + 120], [xT2 + 140, MY + 120]], '24 h 超时', xT2 + 104, MY + 66));
  b.push(task(xT2 + 140, MY + 80, '超时提醒并升级', '通知 周海', { svc: 1 }));
  b.push(gw(xG2, MY));
  b.push(flow([[xT2 + 120, MY], [xG2 - 25, MY]], '同意', xT2 + 132, MY - 14));
  b.push(flow([[xG1, MY - 25], [xG1, MY - 120], [xG2, MY - 120], [xG2, MY - 25]], '否（≤ 5 万）', xG1 + 120, MY - 120));
  b.push(flow([[xG2 + 25, MY], [xT3, MY]]));
  b.push(task(xT3, MY - 40, '推送供应商门户', '生成 V2 待确认', { svc: 1 }));
  b.push(flow([[xT3 + 120, MY], [xT4, MY]]));
  b.push(task(xT4, MY - 40, '供应商确认', '芯联科技', { rcv: 1 }));
  b.push(flow([[xT4 + 120, MY], [xE - 18, MY]], '确认', xT4 + 132, MY - 14));
  b.push(ev(xE, MY, 1, '变更生效'));
  // 驳回 / 拒绝 回路
  const RY = MY + 250; b.push(task(xT1, RY - 40, '发起人修改', '吴婷（发起人）', { user: 1 }));
  b.push(flow([[xT1 + 40, MY + 40], [xT1 + 40, RY - 40]], '驳回', xT1 + 48, MY + 120));
  b.push(flow([[xT1 + 80, RY - 40], [xT1 + 80, MY + 40]], '重新提交', xT1 + 88, MY + 160));
  b.push(flow([[xT4 + 60, MY + 40], [xT4 + 60, RY], [xT1 + 120, RY]], '拒绝 · 退回采购', xT4 - 260, RY - 14));
  b.push(flow([[xT2 + 30, MY + 40], [xT2 + 30, RY - 20], [xT1 + 120, RY - 20]], '驳回', xT2 - 64, RY - 34));
  // 上下文工具条（选中元素）
  { const x = xT2 + 132, y = MY - 62; b.push(R(x, y, 26, 110, '#FFFFFF', 4, ' stroke="#E2E8F0"')); [c => `<circle r="6" fill="none" stroke="${c}" stroke-width="1.4"/>`, c => `<path d="M0 -7 L7 0 L0 7 L-7 0 Z" fill="none" stroke="${c}" stroke-width="1.4"/>`, c => `<rect x="-7" y="-5" width="14" height="10" rx="2" fill="none" stroke="${c}" stroke-width="1.4"/>`, c => `<path d="M-6 5 L5 -6 M1 -6 H5 V-2" fill="none" stroke="${c}" stroke-width="1.4"/>`, c => `<path d="M-5 -5 L5 5 M5 -5 L-5 5" stroke="${c}" stroke-width="1.4"/>`].forEach((f, i) => b.push(g(x + 13, y + 14 + i * 21, f('#475569')))); }
  // 缩放 + 水印
  b.push(R(CX + CWd - 160, CY + 16, 144, 32, '#FFFFFF', 6, ' stroke="#E2E8F0"') + T('−', CX + CWd - 144, CY + 32, 16, 500, '#475569', 'middle') + T('100%', CX + CWd - 100, CY + 32, 13, 500, '#334155', 'middle') + T('+', CX + CWd - 56, CY + 32, 16, 500, '#475569', 'middle') + ic('grid', CX + CWd - 38, CY + 24, '#475569'));
  b.push(T('校验通过 · 8 个节点 · 11 条连线 · 选中：财务会签', CX + 76, CY + CH - 20, 12, 400, '#64748B'));
  { const x = CX + CWd - 66, y = CY + CH - 66; b.push(g(x, y, `<rect x="0" y="0" width="50" height="50" rx="6" fill="#FFFFFF" stroke="#404040" stroke-width="2.4"/><path d="M15 11 V38 M15 22 C19 18 33 18 35 27 C36 35 28 39 21 37 C18 36 16 35 15 33" fill="none" stroke="#404040" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>`)); b.push(T('bpmn.io', x - 8, y + 40, 11, 500, '#404040', 'end')); }
  // 属性面板
  let y = 188; b.push(R(PX, y, PW, 876, '#FFFFFF', 10, ' stroke="#E2E8F0"'));
  b.push(g(PX + 16, y + 16, `<rect width="36" height="36" rx="8" fill="#EFF6FF"/><rect x="8" y="10" width="20" height="16" rx="3" fill="none" stroke="#2563EB" stroke-width="1.6"/>`) + T('财务会签', PX + 64, y + 26, 16, 700, '#0F172A') + T('用户任务 · Activity_FinanceSign', PX + 64, y + 46, 12, 400, '#64748B'));
  b.push(R(PX, y + 68, PW, 1, '#E2E8F0'));
  const grp = (yy, t, open = 1) => R(PX + 1, yy, PW - 2, 34, '#F8FAFC') + T(t, PX + 16, yy + 17, 13, 700, '#334155') + ic(open ? 'chev' : 'chevR', PX + PW - 32, yy + 9, '#94A3B8');
  y += 69; b.push(grp(y, '常规'));
  b.push(field(PX + 6, y + 44, 'ID', 'Activity_FinanceSign', { lw: 90, iw: PW - 112, lock: 1 }) + field(PX + 6, y + 84, '名称', '财务会签', { lw: 90, iw: PW - 112 }));
  y += 128; b.push(grp(y, '处理人'));
  b.push(field(PX + 6, y + 44, '处理人类型', '角色', { lw: 90, iw: PW - 112, sel: 1 }) + field(PX + 6, y + 84, '角色', '财务主管（刘芳）', { lw: 90, iw: PW - 112, sel: 1 }));
  b.push(T('多人处理', PX + 16, y + 140, 13, 400, '#475569') + radio(PX + 82, y + 140, 0) + T('或签', PX + 104, y + 140, 13, 400, '#475569') + radio(PX + 150, y + 140, 1) + T('会签 · 全部同意', PX + 172, y + 140, 13, 500, '#0F172A'));
  b.push(T('无处理人时', PX + 16, y + 172, 13, 400, '#475569') + T('转交流程管理员', PX + 96, y + 172, 13, 400, '#1E293B') + T('允许转交 / 加签', PX + 16, y + 202, 13, 400, '#475569') + sw(PX + PW - 54, y + 202, 1));
  y += 226; b.push(grp(y, '字段权限'));
  b.push(tableX(PX + 12, y + 44, PW - 24, [['字段', 140], ['可见', 80], ['可编辑', PW - 24 - 220]], [['价税合计', (x, cy) => chk(x + 10, cy - 8, 1), (x, cy) => chk(x + 10, cy - 8, 0)], ['含税单价', (x, cy) => chk(x + 10, cy - 8, 1), (x, cy) => chk(x + 10, cy - 8, 0)], ['审批意见', (x, cy) => chk(x + 10, cy - 8, 1), (x, cy) => chk(x + 10, cy - 8, 1)], ['附件', (x, cy) => chk(x + 10, cy - 8, 1), (x, cy) => chk(x + 10, cy - 8, 1)]], { id: 'pt44', rh: 30, hh: 30 }).svg);
  y += 210; b.push(grp(y, '时限与超时'));
  b.push(field(PX + 6, y + 44, '处理时限', '24 小时（工作日）', { lw: 90, iw: PW - 112, sel: 1 }) + field(PX + 6, y + 84, '超时动作', '提醒 + 升级至周海', { lw: 90, iw: PW - 112, sel: 1 }));
  y += 128; b.push(grp(y, '进入条件', 0) + T('${amountDelta > 50000}', PX + PW - 56, y + 17, 12, 400, '#64748B', 'end'));
  y += 35; b.push(grp(y, '监听器', 0) + T('2', PX + PW - 56, y + 17, 12, 400, '#64748B', 'end'));
  return SVG(1920, 1080, b.join(''));
}

// ======================= UI45 待办中心 =======================
function ui45() {
  const b = frame([['工作台', 0], ['待办中心', 1]], '待办中心');
  b.push(titleRow('待办中心', '', []) + lastMod('王敏 · 2026-11-13 16:20'));
  { const s1 = seg(X0, 144, ['待办 6', '已办 12', '我发起 5', '抄送 3'], 0, 36); b.push(s1.svg); let x = X0 + s1.w + 16; [['类型：全部', 0], ['仅超时', 0], ['今天', 0]].forEach(([t, on]) => { const c = chip(x, 162, t, on); b.push(c.svg); x += c.w + 8; });
    b.push(R(1904 - 680 - 300, 146, 280, 32, '#FFFFFF', 8, ' stroke="#CBD5E1"') + ic('search', 1904 - 980 + 12, 154, '#94A3B8') + T('单号 / 标题 / 发起人', 1904 - 980 + 36, 162, 13, 400, '#94A3B8')); }
  const LW = 980, RX = X0 + LW + 16, RW = CW - LW - 16;
  b.push(card(X0, 196, LW, 868, ''));
  const head = ['', '类型', '标题', '发起人', '到达', '时限'];
  const TD = [
    ['生产订单', '审批', 'MO-20261113-004 · MLCC 0402 X5R 105K 500,000 pcs', '计划审核 · 来源 SO-20261110-003', '赵磊', '13:42', '剩 1.4 h', '#B45309', 1],
    ['工程变更', '会签', 'ECN-20261113-001 · 评估在制和库存影响', '计划会签 · 品质 孙悦 已同意', '刘工', '11:20', '超时 1.0 h', '#DC2626', 0],
    ['计划订单', '投放', 'PLN-20261113-008 · 计划订单确认投放', 'MRP-20261113-01 · 待 ECN-20261113-001 生效后按新料投放', '系统', '12:30', '今天 18:00', '#64748B', 0],
    ['MRP 例外', '处理', 'MRP-20261113-01 · 交期不足 3 条', 'nRF52832 已由采购变更解除 1 条', '系统', '12:30', '今天 18:00', '#64748B', 0],
    ['齐套分析', '提交', 'KIT-20261113-002 · 3 张工单缺料 5 项', '待提交 · 缺料 0603 10kΩ 3,200', '王敏', '09:12', '超时 3.1 h', '#DC2626', 0],
    ['生产订单', '恢复', 'MO-20261113-001 分录 3 挂起 · 客户交期待确认', 'SO-20261108-021 第 3 批', '王敏', '11:40', '11-14 12:00', '#64748B', 0]];
  const TC = { 生产订单: ['#1D4ED8', '#EFF6FF'], 工程变更: ['#7C3AED', '#F5F3FF'], 计划订单: ['#0E7490', '#ECFEFF'], 'MRP 例外': ['#C2410C', '#FFF7ED'], 齐套分析: ['#B45309', '#FFFBEB'] };
  b.push(R(X0 + 1, 197, LW - 2, 36, '#F8FAFC', 0) + R(X0, 232, LW, 1, '#E2E8F0'));
  [[X0 + 44, '类型'], [X0 + 164, '标题'], [X0 + 690, '发起人'], [X0 + 780, '到达'], [X0 + LW - 16, '时限']].forEach(([x, t], i) => b.push(T(t, x, 215, 13, 700, '#475569', i === 4 ? 'end' : 'start')));
  b.push(chk(X0 + 16, 207, 0));
  TD.forEach(([ty, act, t1, t2, who, tm, lim, lc, sel], i) => { const y = 233 + i * 72, cy = y + 36; const c = TC[ty];
    b.push(sel ? R(X0 + 1, y, LW - 2, 72, '#EFF6FF') + R(X0, y, 3, 72, '#2563EB') : '');
    b.push(R(X0 + 1, y + 71, LW - 2, 1, '#EEF2F7') + chk(X0 + 16, cy - 8, sel));
    b.push(pill(ty, X0 + 44, cy - 10, c[0], c[1], 12, 700, 8, 22).svg + T(act, X0 + 44, cy + 14, 12, 400, '#64748B'));
    b.push(T(t1, X0 + 164, cy - 10, 14, 700, '#0F172A') + T(t2, X0 + 164, cy + 13, 12, 400, '#64748B'));
    b.push(T(who, X0 + 690, cy, 13, 400, '#334155') + T(tm, X0 + 780, cy, 13, 400, '#334155') + pill(lim, X0 + LW - 16, cy, lc === '#64748B' ? '#475569' : lc, lc === '#DC2626' ? '#FEF2F2' : lc === '#B45309' ? '#FFFBEB' : '#F1F5F9', 12, 700, 8, 22, 'end').svg); });
  { const y = 233 + 6 * 72 + 12; b.push(T('批量：', X0 + 16, y + 16, 13, 400, '#64748B') + row(X0 + 64, y, [['批量同意', 0, 'check'], ['批量转交', 0]]).svg + T('超时 2 · 今日到期 3 · 共 6 条', X0 + LW - 16, y + 16, 12, 400, '#64748B', 'end')); }
  // 抄送 / 动态
  { const y = 233 + 6 * 72 + 68; b.push(R(X0 + 16, y, LW - 32, 1, '#EEF2F7') + T('最近抄送给我', X0 + 16, y + 26, 13, 700, '#334155') + T('全部 3 条', X0 + LW - 16, y + 26, 12, 500, '#2563EB', 'end'));
    [['安灯', 'AD-20261113-009 · SMT-1 F-12 15:07 断料，影响 MO-20261112-005', '林峰', '14:46'], ['采购变更', 'POC-20261113-002 · PO-20261113-004 nRF52832 改 6,000 / 11-17', '吴婷', '15:40'], ['信用审批', 'SO-20261113-002 · 东莞拓普 超信用额度 55,450.00', '周凯', '16:05']].forEach(([t, d, who, tm], i) => { const yy = y + 60 + i * 34; b.push(dot(X0 + 22, yy, i ? '#94A3B8' : '#2563EB', 3.5) + T(t, X0 + 34, yy, 13, 700, '#334155') + T(d, X0 + 110, yy, 13, 400, '#475569') + T(who + ' · ' + tm, X0 + LW - 16, yy, 12, 400, '#94A3B8', 'end')); }); }
  { const y = 233 + 6 * 72 + 214; b.push(R(X0 + 16, y, LW - 32, 1, '#EEF2F7') + T('今日已办', X0 + 16, y + 26, 13, 700, '#334155') + T('全部 12 条', X0 + LW - 16, y + 26, 12, 500, '#2563EB', 'end'));
    [['处理', 'MRP-20261113-02 · 选单运算完成，生成计划订单 3 张', '14:33'], ['同意', 'MRP-20261113-01 · 运算结果确认，生成计划订单 14 张', '12:36'], ['驳回', 'MO-20261113-006 · WM-6200 数量与 SO 不符，退回修改', '10:47']].forEach(([a2, d, tm], i) => { const yy = y + 58 + i * 32; b.push(pill(a2, X0 + 16, yy, a2 === '驳回' ? '#B91C1C' : '#15803D', a2 === '驳回' ? '#FEF2F2' : '#F0FDF4', 12, 700, 8, 22).svg + T(d, X0 + 70, yy, 13, 400, '#475569') + T(tm, X0 + LW - 16, yy, 12, 400, '#94A3B8', 'end')); }); }
  // 右：详情
  let y = 196; b.push(card(RX, y, RW, 868, ''));
  b.push(pill('生产订单 · 审批', RX + 16, y + 26, '#1D4ED8', '#EFF6FF', 12, 700, 8, 22).svg + T('剩 1.4 h · 时限 4 h', RX + RW - 16, y + 26, 12, 500, '#B45309', 'end'));
  b.push(T('MO-20261113-004', RX + 16, y + 62, 20, 700, '#0F172A') + tag1('审核中', RX + 28 + W('MO-20261113-004', 20, 700), y + 62) + T('打开单据', RX + RW - 16, y + 62, 13, 500, '#2563EB', 'end'));
  const KV = [['产品', '3.02.0105 MLCC 0402 X5R 105K'], ['数量', '500,000 pcs'], ['计划开工 / 完工', '11-14 ~ 11-15'], ['车间', '测试编带车间'], ['来源', 'SO-20261110-003'], ['计划员', '赵磊']];
  KV.forEach(([k, v], i) => { const x = RX + 16 + (i % 2) * ((RW - 32) / 2), yy = y + 100 + Math.floor(i / 2) * 30; b.push(T(k, x, yy, 13, 400, '#64748B') + T(v, x + 96, yy, 13, 500, k === '来源' ? '#2563EB' : '#0F172A')); });
  y += 196; b.push(R(RX + 16, y, RW - 32, 1, '#EEF2F7') + secT(RX + 16, y + 26, '审核要点'));
  [['齐套', '用料 3 项全部有货，可直接领料', 1], ['产能', '测试编带线 11-14 负荷 86% → 加单后 97%', 2], ['交期', '客户需求 11-17，完工 11-15，余 2 天', 1], ['冲突', '与 MO-20261110-021 同线，建议 11-15 白班切换', 2]].forEach(([k, v, st], i) => { const yy = y + 60 + i * 32; b.push((st === 1 ? okI(RX + 16, yy) : warnI(RX + 24, yy, 0.8)) + T(k, RX + 44, yy, 13, 700, '#334155') + T(v, RX + 92, yy, 13, 400, st === 1 ? '#334155' : '#92400E')); });
  y += 196; b.push(R(RX + 16, y, RW - 32, 1, '#EEF2F7') + secT(RX + 16, y + 26, '审批流程'));
  [['赵磊 · 提交', '11-13 13:42', 2], ['王敏 · 计划审核', '当前节点', 1], ['陈立 · 生产经理', '待处理', 0], ['自动下达', '审核后', 0]].forEach(([t, st, k], i) => { const x = RX + 64 + i * ((RW - 128) / 3), yy = y + 74, c = k === 2 ? '#10B981' : k === 1 ? '#2563EB' : '#CBD5E1';
    if (i < 3) b.push(R(x + 10, yy - 1, (RW - 128) / 3 - 20, 2, k === 2 ? '#10B981' : '#E2E8F0'));
    b.push(`<circle cx="${x}" cy="${yy}" r="9" fill="${k ? c : '#FFFFFF'}" stroke="${c}" stroke-width="2"/>` + (k === 2 ? tick(x, yy + 0.5, 4, '#FFFFFF', 2) : '') + T(t, x, yy + 26, 12, 700, '#334155', 'middle') + T(st, x, yy + 46, 11, 400, k === 1 ? '#2563EB' : '#94A3B8', 'middle')); });
  y += 150; b.push(R(RX + 16, y, RW - 32, 1, '#EEF2F7') + secT(RX + 16, y + 26, '审批意见'));
  b.push(R(RX + 16, y + 46, RW - 32, 96, '#FFFFFF', 8, ' stroke="#CBD5E1"') + T('同意。11-15 白班先切 MO-20261110-021，注意编带机 03 封合问题（AD-20261113-011）。', RX + 28, y + 66, 13, 400, '#1E293B'));
  b.push(T('常用：', RX + 28, y + 122, 12, 400, '#94A3B8')); { let x = RX + 70; ['同意', '请补充说明', '数量需复核'].forEach(t => { const w = W(t, 12) + 16; b.push(R(x, y + 112, w, 20, '#F1F5F9', 10) + T(t, x + 8, y + 122, 12, 400, '#475569')); x += w + 6; }); }
  y += 164; b.push(R(RX + 16, y, RW - 32, 1, '#EEF2F7') + secT(RX + 16, y + 26, '相关单据'));
  { let x = RX + 16; [['销售订单', 'SO-20261110-003'], ['用料清单', 'PPBOM-20261113-004'], ['日排产', '测试编带线 11-14']].forEach(([k, v]) => { const w = W(k, 12, 400) + W(v, 12, 500) + 30; b.push(R(x, y + 46, w, 28, '#F8FAFC', 6, ' stroke="#E2E8F0"') + T(k, x + 10, y + 60, 12, 400, '#64748B') + T(v, x + 20 + W(k, 12, 400), y + 60, 12, 500, '#2563EB')); x += w + 8; }); }
  b.push(row(RX + 16, 1064 - 52, [['同意', 1, 'check'], ['驳回', 0], ['转交', 0], ['加签', 0]]).svg + T('同意后流转至 陈立', RX + RW - 16, 1064 - 36, 12, 400, '#64748B', 'end'));
  return SVG(1920, 1080, b.join(''));
}

// ======================= UI46 用户、角色、权限 =======================
function ui46() {
  const b = frame([['工作台', 0], ['用户角色权限', 1]], '用户角色权限');
  b.push(adminUser());
  b.push(titleRow('用户、角色、权限', '', []) + lastMod('最后修改：张工  2026-11-10 17:20'));
  b.push(toolbar(X0, 144, [['保存', 1, 'save'], ['新增角色', 0, 'plus'], ['复制角色', 0], ['删除', 'd'], '|', ['权限对比', 0, 'cols'], ['按用户查看', 0, 'user'], ['导出', 0, 'down']]));
  const LW = 280, MX = X0 + LW + 16, MW2 = PX - 16 - MX;
  b.push(card(X0, 188, LW, 876, '角色', '11 个', '#64748B'));
  b.push(R(X0 + 12, 228, LW - 24, 30, '#F1F5F9', 6) + ic('search', X0 + 22, 235, '#94A3B8') + T('搜索角色 / 用户', X0 + 44, 243, 13, 400, '#94A3B8'));
  const RL = [['内部角色', null], ['系统管理员', 2], ['计划员', 2, 1], ['生产主管', 3], ['车间班组长', 8], ['仓管员', 6], ['品质 / IQC', 5], ['采购员', 4], ['销售员', 5], ['财务', 3], ['设备工程师', 4], ['外部角色', null], ['供应商门户', 23]];
  RL.forEach(([t, n, on], i) => { const y = 268 + i * 38; if (n == null) { b.push(T(t, X0 + 16, y + 19, 12, 700, '#94A3B8')); return; } b.push((on ? R(X0 + 8, y + 2, LW - 16, 34, '#E6F0FF', 6) : '') + ic('user', X0 + 18, y + 11, on ? '#1D4ED8' : '#64748B') + T(t, X0 + 42, y + 19, 13, on ? 700 : 400, on ? '#1D4ED8' : '#334155') + T(n + ' 人', X0 + LW - 18, y + 19, 12, 400, '#94A3B8', 'end')); });
  b.push(R(X0 + 16, 780, LW - 32, 1, '#EEF2F7') + T('角色继承', X0 + 16, 804, 13, 700, '#334155') + T('计划员 继承「基础资料只读」', X0 + 16, 830, 12, 400, '#64748B') + T('互斥角色：采购员（职责分离）', X0 + 16, 854, 12, 400, '#B45309'));
  b.push(T('用户总数 63 · 在线 21', X0 + 16, 1040, 12, 400, '#94A3B8'));
  // 中：矩阵
  b.push(card(MX, 188, MW2, 876, ''));
  b.push(T('计划员', MX + 16, 214, 18, 700, '#0F172A') + T('ROLE_PLANNER · 生产计划部 · 组织：一号工厂', MX + 28 + W('计划员', 18, 700), 215, 13, 400, '#64748B') + pill('启用', MX + MW2 - 16, 214, '#15803D', '#F0FDF4', 12, 700, 8, 22, 'end').svg);
  b.push(tabsBar(MX + 16, 254, ['功能权限', '数据权限', '字段权限', '成员 2'], 0) + R(MX + 16, 276, MW2 - 32, 1, '#E2E8F0'));
  const OPS = ['查看', '新增', '修改', '删除', '提交', '审核', '反审核', '下推', '打印', '导出'];
  const ow = 62, fw = 196, dw = MW2 - 32 - fw - ow * OPS.length;
  const tx = MX + 16, ty = 290;
  b.push(R(tx, ty, MW2 - 32, 34, '#F8FAFC', 6) + T('功能', tx + 10, ty + 17, 13, 700, '#475569'));
  OPS.forEach((o, i) => b.push(T(o, tx + fw + i * ow + ow / 2, ty + 17, 13, 700, '#475569', 'middle')));
  b.push(T('数据范围', tx + fw + OPS.length * ow + 10, ty + 17, 13, 700, '#475569'));
  // 1 选中, 0 未选, - 不适用, p 部分
  const M = [
    ['计划管理', 'g', 'pppppppppp'],
    ['销售订单', 'i', '1000000011', '本工厂'],
    ['MRP 运算', 'i', '1110100-10', '本工厂'],
    ['MRP 运算结果', 'i', '1-------11', '本工厂'],
    ['计划订单', 'i', '1111110111', '本工厂'],
    ['日排产', 'i', '1110110-11', '本工厂'],
    ['生产管理', 'g', 'pppppppppp'],
    ['生产订单', 'i', '1111111111', '本部门'],
    ['生产用料清单', 'i', '1010100011', '本部门'],
    ['生产领料单', 'i', '1000000011', '本工厂'],
    ['生产汇报单', 'i', '1000000011', '本工厂'],
    ['齐套分析', 'i', '1110100-11', '本部门'],
    ['采购管理', 'g', 'p000p00000'],
    ['采购申请', 'i', '1110100111', '本人'],
    ['采购订单', 'i', '1000000001', '本工厂'],
    ['库存管理', 'g', 'p0000000pp'],
    ['即时库存', 'i', '1-------11', '本工厂'],
    ['卷盘 MSL 管理', 'i', '1-------10', '本工厂'],
    ['基础资料（继承）', 'g', '1000000011', '全部']];
  M.forEach(([n, k, ops, dr], i) => { const y = ty + 34 + i * 34, cy = y + 17, grp = k === 'g';
    b.push((grp ? R(tx, y, MW2 - 32, 34, '#FBFCFE') : '') + R(tx, y + 33, MW2 - 32, 1, '#EEF2F7'));
    b.push(grp ? `<path d="M${tx + 10} ${cy - 2} L${tx + 14} ${cy + 2} L${tx + 18} ${cy - 2}" fill="none" stroke="#64748B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>` + T(n, tx + 26, cy, 13, 700, '#0F172A') : T(n, tx + 30, cy, 13, 400, '#334155'));
    [...ops].forEach((c, j) => { const x = tx + fw + j * ow + ow / 2 - 8; if (c === '-') b.push(T('—', x + 8, cy, 12, 400, '#CBD5E1', 'middle')); else b.push(chk(x, cy - 8, c === '1', c === 'p')); });
    if (dr) b.push(T(dr, tx + fw + OPS.length * ow + 10, cy, 13, 400, dr === '本人' ? '#B45309' : '#334155') + (grp ? '' : ic('chev', tx + MW2 - 32 - 24, cy - 8, '#94A3B8'))); });
  b.push(T('已改未保存：生产订单 · 反审核（新增勾选）', MX + 16, 1040, 12, 500, '#C2410C') + T('勾选分组 = 全选该组 · 灰色「—」表示该单据无此操作', MX + MW2 - 16, 1040, 12, 400, '#94A3B8', 'end'));
  // 已改高亮
  { const i = M.findIndex(r => r[0] === '生产订单'), y = ty + 34 + i * 34; b.push(`<rect x="${tx + fw + 6 * ow + 4}" y="${y + 3}" width="${ow - 8}" height="28" rx="6" fill="none" stroke="#F97316" stroke-width="1.5" stroke-dasharray="3 2"/>`); }
  // 右
  let y = 188; b.push(card(PX, y, PW, 236, '成员', '2 人', '#64748B'));
  [['王', '王敏', 'wang.min · 生产计划部', '在线', '#DBEAFE', '#1D4ED8'], ['赵', '赵磊', 'zhao.lei · 生产计划部', '离线 2 h', '#FEF3C7', '#B45309']].forEach(([a, n, s2, st, bg, fg], i) => { const yy = y + 66 + i * 52; b.push(`<circle cx="${PX + 34}" cy="${yy}" r="17" fill="${bg}"/>` + T(a, PX + 34, yy, 14, 700, fg, 'middle') + T(n, PX + 62, yy - 9, 13, 700, '#0F172A') + T(s2, PX + 62, yy + 11, 12, 400, '#64748B') + T(st, PX + PW - 16, yy, 12, 500, i ? '#94A3B8' : '#15803D', 'end')); });
  b.push(btn(PX + 16, y + 180, '添加成员', 0, 'plus', 32, 13).svg + T('用户可属于多个角色，权限取并集', PX + 132, y + 196, 12, 400, '#94A3B8'));
  y += 252; b.push(card(PX, y, PW, 232, '字段权限摘要', '4 条', '#64748B'));
  [['采购订单', '含税单价', '隐藏'], ['采购订单', '价税合计', '隐藏'], ['销售订单', '单价 / 金额', '只读'], ['物料', '标准成本', '隐藏']].forEach(([o, f, r], i) => { const yy = y + 62 + i * 38; b.push(T(o, PX + 16, yy, 13, 400, '#64748B') + T(f, PX + 96, yy, 13, 500, '#0F172A') + pill(r, PX + PW - 16, yy, r === '隐藏' ? '#B91C1C' : '#475569', r === '隐藏' ? '#FEF2F2' : '#F1F5F9', 12, 700, 8, 22, 'end').svg); });
  y += 248; b.push(card(PX, y, PW, 1064 - y, '变更日志', '', ''));
  [['11-10 17:20', '张工', '齐套分析：增加「提交」'], ['11-03 09:12', '张工', '采购申请：数据范围改为本人'], ['10-21 14:40', '张工', '新增成员 赵磊'], ['10-08 10:05', '系统', '角色创建（模板：计划员）']].forEach(([t, who, d], i) => { const yy = y + 60 + i * 44; b.push(T(t, PX + 16, yy - 8, 12, 500, '#94A3B8') + T(who, PX + PW - 16, yy - 8, 12, 400, '#64748B', 'end') + T(d, PX + 16, yy + 12, 13, 400, '#334155')); });
  return SVG(1920, 1080, b.join(''));
}

// ======================= UI47 转换 / 反写规则配置 =======================
function ui47() {
  const b = frame([['工作台', 0], ['转换规则', 1]], '转换规则');
  b.push(adminUser());
  b.push(titleRow('转换规则', '采购订单 → 收料通知单 · PUR_PO-PUR_RN', []));
  { const x = X0 + 104 + W('采购订单 → 收料通知单 · PUR_PO-PUR_RN', 16, 500) + 12; b.push(pill('启用', x, 120, '#15803D', '#F0FDF4', 12, 700, 8, 22, 'start', ' stroke="#BBF7D0"').svg + pill('系统预置 · 已调整', x + W('启用', 12, 700) + 26, 120, '#475569', '#F1F5F9', 12, 500, 8, 22).svg); }
  b.push(lastMod('最后修改：张工  2026-11-06 10:30'));
  b.push(toolbar(X0, 144, [['保存', 1, 'save'], ['新增规则', 0, 'plus'], ['复制', 0], ['停用', 0, 'stop'], '|', ['测试转换', 0, 'push'], ['导出', 0, 'down'], ['恢复预置', 0]]));
  const LW = 300, MX = X0 + LW + 16, MW2 = CW - LW - 16;
  b.push(card(X0, 188, LW, 876, '规则列表', '13 条', '#64748B'));
  b.push(R(X0 + 12, 228, LW - 24, 30, '#F1F5F9', 6) + ic('search', X0 + 22, 235, '#94A3B8') + T('搜索单据', X0 + 44, 243, 13, 400, '#94A3B8'));
  const RL = [['计划', null], ['计划订单 → 生产订单'], ['计划订单 → 采购申请'], ['采购', null], ['采购申请 → 采购订单'], ['采购订单 → 收料通知单', 1], ['收料通知单 → 检验单'], ['检验单 → 采购入库单'], ['生产', null], ['生产订单 → 生产用料清单'], ['生产用料清单 → 生产领料单'], ['生产订单 → 生产汇报单'], ['生产汇报单 → 生产入库单'], ['销售', null], ['销售订单 → 发货通知单'], ['发货通知单 → 销售出库单']];
  RL.forEach(([t, on], i) => { const y = 268 + i * 34; if (on === null) { b.push(T(t, X0 + 16, y + 17, 12, 700, '#94A3B8')); return; } b.push((on ? R(X0 + 8, y + 2, LW - 16, 30, '#E6F0FF', 6) : '') + T(t, X0 + 28, y + 17, 13, on ? 700 : 400, on ? '#1D4ED8' : '#334155') + dot(X0 + LW - 22, y + 17, '#22C55E', 3.5)); });
  b.push(R(X0 + 16, 980, LW - 32, 1, '#EEF2F7') + T('今日执行 37 次 · 失败 0', X0 + 16, 1004, 12, 400, '#64748B') + T('绿点 = 启用 · 预置规则可调整不可删除', X0 + 16, 1028, 12, 400, '#94A3B8'));
  // 主区：源→目标
  b.push(card(MX, 188, MW2, 876, ''));
  const box = (x, t, s2, c) => R(x, 204, 220, 52, '#F8FAFC', 8, ` stroke="${c}"`) + R(x, 212, 4, 36, c, 2) + T(t, x + 16, 222, 14, 700, '#0F172A') + T(s2, x + 16, 242, 12, 400, '#64748B');
  b.push(box(MX + 16, '采购订单', 'PUR_PurchaseOrder · 源单', '#7C3AED') + arrow([[MX + 246, 230], [MX + 326, 230]], '#94A3B8', 1.6) + T('下推 / 选单', MX + 286, 216, 11, 500, '#64748B', 'middle') + box(MX + 336, '收料通知单', 'PUR_ReceiveNotice · 目标单', '#2563EB'));
  [['转换方式', '下推 + 选单'], ['分录关联', '按分录 1:1'], ['合并策略', '同供应商 + 同收料组织合并'], ['审核后自动下推', '否']].forEach(([k, v], i) => { const x = MX + 590 + (i % 2) * 380, yy = 218 + Math.floor(i / 2) * 26; b.push(T(k, x, yy, 12, 400, '#64748B') + T(v, x + 100, yy, 12, 700, '#0F172A')); });
  b.push(tabsBar(MX + 16, 290, ['基本', '字段映射 12', '选单条件', '分组合并', '反写规则 4'], 1) + R(MX + 16, 312, MW2 - 32, 1, '#E2E8F0'));
  b.push(btn(MX + MW2 - 16 - 104, 280, '新增映射', 0, 'plus', 30, 13).svg);
  const cols = [['#', 36], ['目标字段（收料通知单）', 210], ['映射类型', 110], ['源字段 / 表达式（采购订单）', 360], ['为空时', 110], ['必填', 60]]; const u = cols.reduce((a, c) => a + c[1], 0); cols.push(['说明', MW2 - 32 - u]);
  const ty = (t) => { const c = { 字段: ['#1D4ED8', '#EFF6FF'], 表达式: ['#7C3AED', '#F5F3FF'], 常量: ['#475569', '#F1F5F9'], 函数: ['#0E7490', '#ECFEFF'], 基础资料属性: ['#B45309', '#FFFBEB'], 不映射: ['#94A3B8', '#F8FAFC'] }[t]; return (x, cy) => pill(t, x + 10, cy, c[0], c[1], 12, 500, 8, 22).svg; };
  const code = t => (x, cy) => T(t, x + 10, cy, 13, 400, '#0F172A');
  const grpRow = t => [null, (x, cy) => T(t, x + 10, cy, 12, 700, '#64748B')];
  const rows = [
    grpRow('表头'),
    ['1', '供应商', ty('字段'), code('供应商 SupplierId'), '—', '是', ''],
    ['2', '收料组织', ty('字段'), code('收料组织 RecOrgId'), '—', '是', ''],
    ['3', '采购员', ty('字段'), code('采购员 PurchaserId'), '当前用户', '否', ''],
    ['4', '单据日期', ty('函数'), code('TODAY()'), '—', '是', '下推当天'],
    ['5', '源单类型', ty('常量'), code("'采购订单'"), '—', '是', '用于上查'],
    grpRow('分录'),
    ['6', '物料', ty('字段'), code('物料 MaterialId'), '—', '是', ''],
    ['7', '交货数量', ty('表达式'), code('数量 − 累计收料数量 + 累计退料数量'), '0 不生成', '是', '剩余可收'],
    ['8', '要求到货日', ty('字段'), code('交货日期 DeliveryDate'), '—', '否', ''],
    ['9', '含税单价', ty('字段'), code('含税单价 TaxPrice'), '—', '否', '字段权限控制可见'],
    ['10', '批号', ty('不映射'), code('—'), '—', '否', '收料时扫码录入'],
    ['11', '来料检验', ty('基础资料属性'), code('物料.质量.来料检验'), '否', '否', '决定是否下推检验单'],
    ['12', '源单分录', ty('字段'), code('分录内码 EntryId'), '—', '是', '关联与反写依据']];
  const tb = tableX(MX + 16, 324, MW2 - 32, cols, rows, { id: 'pt47', rh: 30, hh: 32, sel: 8 }); b.push(tb.svg);
  // 反写 + 测试
  const BY = 324 + tb.h + 16, BW = (MW2 - 32 - 16) * 0.58, TW = MW2 - 32 - 16 - BW;
  b.push(R(MX + 16, BY, BW, 1048 - BY, '#FFFFFF', 8, ' stroke="#E2E8F0"') + secT(MX + 32, BY + 22, '反写规则') + T('目标单审核时执行 · 反审核时回滚', MX + 16 + BW - 16, BY + 22, 12, 400, '#64748B', 'end'));
  const rw = [['累计收料数量', '+=', '交货数量', '审核'], ['收料状态', '=', '全部收料 / 部分收料', '审核'], ['行关闭', '=', '剩余数量 = 0 时自动关闭', '审核'], ['超收控制', '≤', '订单数量 × 105%，超出禁止保存', '保存']];
  rw.forEach(([a, op, c, w2], i) => { const yy = BY + 58 + i * 34; b.push(R(MX + 32, yy - 13, BW - 32, 26, i % 2 ? '#FFFFFF' : '#F8FAFC', 4) + T('采购订单.' + a, MX + 42, yy, 13, 500, '#0F172A') + T(op, MX + 230, yy, 13, 700, '#7C3AED', 'middle') + T(c, MX + 256, yy, 13, 400, '#334155') + T(w2, MX + 16 + BW - 28, yy, 12, 500, '#64748B', 'end')); });
  const TX = MX + 16 + BW + 16; b.push(R(TX, BY, TW, 1048 - BY, '#FFFFFF', 8, ' stroke="#E2E8F0"') + secT(TX + 16, BY + 22, '测试转换') + T('只预览，不生成单据', TX + TW - 16, BY + 22, 12, 400, '#64748B', 'end'));
  b.push(field(TX + 6, BY + 42, '源单', 'PO-20261111-012', { lw: 50, iw: TW - 70, find: 1, c: '#2563EB' }));
  [['供应商', '深圳润芯科技'], ['物料', '2.03.0915 RTL8720DN'], ['交货数量', '6,000 − 0 + 0 = 6,000'], ['预览结果', 'RN-20261113-005 · 校验通过']].forEach(([k, v], i) => { const yy = BY + 98 + i * 26; b.push(T(k, TX + 16, yy, 12, 400, '#64748B') + T(v, TX + 96, yy, 12, i === 3 ? 700 : 500, i === 3 ? '#15803D' : '#0F172A')); });
  return SVG(1920, 1080, b.join(''));
}

// ======================= UI48 供应商门户 =======================
function barcode(x, y, w, h, seed) { let s = '', cx = x, r = seed; while (cx < x + w - 2) { r = (r * 9301 + 49297) % 233280; const bw = 1 + (r % 3); if ((r >> 3) % 2) s += R(cx, y, bw, h, '#0F172A'); cx += bw + 1; } return s; }
function qr(x, y, s, seed) { const n = 21, c = s / n; let o = R(x, y, s, s, '#FFFFFF'), r = seed; const fin = (fx, fy) => R(x + fx * c, y + fy * c, 7 * c, 7 * c, '#0F172A') + R(x + (fx + 1) * c, y + (fy + 1) * c, 5 * c, 5 * c, '#FFFFFF') + R(x + (fx + 2) * c, y + (fy + 2) * c, 3 * c, 3 * c, '#0F172A');
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if ((i < 8 && j < 8) || (i > 12 && j < 8) || (i < 8 && j > 12)) continue; r = (r * 9301 + 49297) % 233280; if (r % 5 < 2) o += R(x + i * c, y + j * c, c, c, '#0F172A'); }
  return o + fin(0, 0) + fin(14, 0) + fin(0, 14); }
function ui48() {
  const b = [R(0, 0, 1920, 1080, '#F3F6FA')];
  // 顶栏
  b.push(R(0, 0, 1920, 64, '#FFFFFF') + R(0, 63, 1920, 1, '#E2E8F0'));
  b.push(logo(24, 14, 36) + T('芯程电子', 72, 24, 17, 700, '#0F172A') + T('供应商协同门户', 72, 44, 12, 500, '#64748B'));
  { let x = 260; [['首页', 0], ['订单确认', 1, 1], ['送货管理', 0, 2], ['标签打印', 0], ['对账结算', 0], ['质量反馈', 0, 1]].forEach(([t, on, n]) => { const w = W(t, 15, on ? 700 : 500); b.push(T(t, x, 32, 15, on ? 700 : 500, on ? '#1D4ED8' : '#334155') + (on ? R(x, 60, w, 3, '#2563EB', 1.5) : '') + (n ? `<circle cx="${x + w + 10}" cy="22" r="8" fill="${on ? '#EF4444' : '#94A3B8'}"/>` + T(String(n), x + w + 10, 22.5, 10, 700, '#FFFFFF', 'middle') : '')); x += w + (n ? 56 : 40); }); }
  b.push(ic('bell', 1600, 24, '#475569') + T('SUP-0012 芯联科技', 1640, 32, 13, 500, '#334155') + R(1780, 22, 1, 20, '#E2E8F0') + `<circle cx="1808" cy="32" r="15" fill="#DCFCE7"/>` + T('陈', 1808, 32, 14, 700, '#15803D', 'middle') + T('陈思远', 1830, 25, 13, 500, '#0F172A') + T('销售内勤', 1830, 41, 11, 400, '#64748B'));
  // 标题 + KPI
  b.push(T('订单确认', 24, 96, 20, 700, '#0F172A') + T('2026-11-13 17:20 · 采购方：芯程电子 一号工厂', 1896, 96, 12, 400, '#94A3B8', 'end'));
  const K = [['待确认', '1', '张 · 含变更 1', '#C2410C'], ['待送货', '2', '张 · 6,000 pcs', '#2563EB'], ['在途送货单', '0', '张', '#0F172A'], ['本月准交率', '97.1', '% · 34 / 35 行', '#15803D'], ['来料合格率', '100', '% · 近 90 天 6 批', '#15803D']];
  const kw = (1872 - 4 * 16) / 5; K.forEach(([k, v, s2, c], i) => { const x = 24 + i * (kw + 16); b.push(R(x, 120, kw, 70, '#FFFFFF', 10, ' stroke="#E2E8F0"') + T(k, x + 16, 140, 12, 400, '#64748B') + T(v, x + 16, 170, 24, 700, c) + T(s2, x + 22 + W(v, 24, 700), 174, 12, 400, '#64748B')); });
  // 左：订单列表
  const LX = 24, LW = 400, TOP = 206; b.push(R(LX, TOP, LW, 858, '#FFFFFF', 10, ' stroke="#E2E8F0"') + T('采购订单', LX + 16, TOP + 26, 15, 700, '#0F172A'));
  { const s1 = seg(LX + LW - 16 - 196, TOP + 12, ['待处理', '全部', '已完成'], 0, 28); b.push(s1.svg); }
  const PO = [['PO-20261113-004', 'V2 变更 · 待确认', '#C2410C', '#FFF7ED', 'nRF52832 等 3 行 · 122,180.00', '要求 11-17 · 截止 11-14 12:00', 1], ['PO-20261109-018', '已确认 · 待送货', '#1D4ED8', '#EFF6FF', 'nRF52840-QIAA 4,000 · 98,400.00', '交期 11-14 · 送货单草稿', 0], ['PO-20261028-011', '部分送货', '#0E7490', '#ECFEFF', 'nRF52832 2,000 / 4,000', '剩余 11-21 交', 0], ['PO-20260921-006', '已完成', '#15803D', '#F0FDF4', 'nRF52832 21,000 · L2639-A07', '10-02 收料 · IQC 合格', 0]];
  PO.forEach(([no, st, c, bg, l2, l3, on], i) => { const y = TOP + 52 + i * 104; b.push(R(LX + 12, y, LW - 24, 94, on ? '#EFF6FF' : '#FFFFFF', 8, ` stroke="${on ? '#93C5FD' : '#E2E8F0'}"`) + (on ? R(LX + 12, y + 10, 3, 74, '#2563EB', 1.5) : '') + T(no, LX + 28, y + 24, 14, 700, '#0F172A') + pill(st, LX + LW - 28, y + 24, c, bg, 12, 700, 8, 22, 'end').svg + T(l2, LX + 28, y + 50, 13, 400, '#334155') + T(l3, LX + 28, y + 72, 12, 400, on ? '#C2410C' : '#64748B')); });
  { const y0 = TOP + 488; b.push(R(LX + 16, y0, LW - 32, 1, '#EEF2F7') + T('消息与公告', LX + 16, y0 + 26, 14, 700, '#0F172A'));
    [['变更', '11-13 16:49', 'PO-20261113-004 V2 待确认', '#C2410C'], ['质量', '11-12 10:20', 'QF-20261112-003 外箱破损 1 箱 · 待回复', '#DB2777'], ['对账', '11-10 14:00', '10 月对账单 ¥ 1,284,560.00 已确认', '#0E7490'], ['公告', '11-06 09:00', '11-20 起来料标签须含封袋时间', '#475569']].forEach(([t, tm, d, c], i) => { const yy = y0 + 62 + i * 52; b.push(pill(t, LX + 16, yy - 9, c, '#F8FAFC', 11, 700, 6, 20, 'start', ` stroke="${c}"`).svg + T(tm, LX + LW - 16, yy - 9, 12, 400, '#94A3B8', 'end') + T(d, LX + 16, yy + 14, 13, 400, '#334155')); }); }
  b.push(T('仅显示与芯联科技相关的订单 · 数据实时同步', LX + 16, TOP + 858 - 20, 12, 400, '#94A3B8'));
  // 中：订单确认
  const MX = LX + LW + 16, MWd = 1896 - 440 - 16 - MX; b.push(R(MX, TOP, MWd, 858, '#FFFFFF', 10, ' stroke="#E2E8F0"'));
  b.push(T('PO-20261113-004', MX + 16, TOP + 28, 18, 700, '#0F172A') + pill('V2 · 变更待确认', MX + 28 + W('PO-20261113-004', 18, 700), TOP + 28, '#C2410C', '#FFF7ED', 12, 700, 8, 22, 'start', ' stroke="#FED7AA"').svg + T('下载 PDF', MX + MWd - 16, TOP + 28, 13, 500, '#2563EB', 'end'));
  b.push(R(MX + 16, TOP + 52, MWd - 32, 44, '#FFF7ED', 8, ' stroke="#FED7AA"') + warnI(MX + 36, TOP + 74, 0.85) + T('采购方 11-13 16:49 发起变更 POC-20261113-002（数量加倍、交期提前至 11-17、空运加急），请在 11-14 12:00 前确认', MX + 52, TOP + 74, 13, 500, '#9A3412'));
  b.push(fields(MX + 16, TOP + 112, MWd - 32, 4, [['采购员', '吴婷', { lock: 1 }], ['交货方式', '空运加急', { lock: 1, c: '#C2410C' }], ['收货地址', '原材料一号仓', { lock: 1 }], ['付款条件', '月结 30 天', { lock: 1 }]], { lw: 72 }));
  const cols = [['#', 32], ['物料', 92], ['名称 / 规格', 172], ['数量 V1 → V2', 120, 'r'], ['含税单价', 104, 'r'], ['要求交期', 120], ['确认数量', 100], ['承诺交期', 120]]; const u = cols.reduce((a, c) => a + c[1], 0); cols.push(['行状态', MWd - 32 - u]);
  const chg = (a, c2) => (x, cy, cw) => T(a, x + cw - 12 - W(c2, 13, 700) - 22, cy, 12, 400, '#94A3B8', 'end', ' text-decoration="line-through"') + T('→', x + cw - 12 - W(c2, 13, 700) - 6, cy, 12, 400, '#94A3B8', 'end') + T(c2, x + cw - 12, cy, 13, 700, '#C2410C', 'end');
  const inp = (t, o = {}) => (x, cy, cw) => R(x + 6, cy - 14, cw - 12, 28, '#FFFFFF', 6, ` stroke="${o.foc ? '#2563EB' : '#CBD5E1'}"${o.foc ? ' stroke-width="1.5"' : ''}`) + T(t, x + 14, cy, 13, 500, '#0F172A') + (o.cal ? ic('cal', x + cw - 28, cy - 8, '#94A3B8') : '');
  const rows = [
    ['1', '2.03.0832', 'nRF52832-QFAA-R QFN48', chg('3,000', '6,000'), chg('18.60', '19.20'), chg('11-20', '11-17'), inp('6,000'), inp('11-17', { cal: 1, foc: 1 }), stF2('变更', '#C2410C')],
    ['2', '2.04.2016', '晶振 2016 32MHz 10ppm', '6,000', '0.62', '11-18', { t: '6,000', c: '#94A3B8' }, { t: '11-18', c: '#94A3B8' }, stF2('已确认', '#15803D')],
    ['3', '2.04.3215', '晶振 3215 32.768kHz', (x, cy, cw) => pill('新增', x + cw - 12 - W('6,000', 13, 700) - 10, cy, '#15803D', '#DCFCE7', 11, 700, 6, 18, 'end').svg + T('6,000', x + cw - 12, cy, 13, 700, '#15803D', 'end'), '0.48', '11-18', inp('6,000'), inp('11-18', { cal: 1 }), stF2('新增', '#15803D')]];
  const tb = tableX(MX + 16, TOP + 164, MWd - 32, cols, rows, { id: 'pt48', rh: 48, hh: 34, total: (cx, cy) => T('运费 380.00 · 价税合计', cx[2] + 10, cy, 13, 700, '#0F172A') + T('59,520.00 → 122,180.00', cx[5] - 12, cy, 13, 700, '#C2410C', 'end') + T('确认后 V2 生效并回写采购订单', cx[6] + 10, cy, 12, 400, '#64748B') }); b.push(tb.svg);
  let y = TOP + 164 + tb.h + 20;
  b.push(T('交货安排', MX + 16, y, 14, 700, '#0F172A'));
  b.push(R(MX + 16, y + 18, MWd - 32, 92, '#F8FAFC', 8, ' stroke="#E2E8F0"'));
  [['nRF52832 6,000', '11-15 原厂调货 → 11-16 空运发出 → 11-17 上午到货', '#2563EB'], ['晶振 2 行 12,000', '11-17 快递发出 → 11-18 到货（与原交期一致）', '#64748B']].forEach(([a, d, c], i) => { const yy = y + 46 + i * 36; b.push(dot(MX + 34, yy, c, 4) + T(a, MX + 46, yy, 13, 700, '#0F172A') + T(d, MX + 200, yy, 13, 400, '#334155')); });
  y += 134; b.push(T('备注（采购方可见）', MX + 16, y, 14, 700, '#0F172A'));
  b.push(R(MX + 16, y + 18, MWd - 32, 76, '#FFFFFF', 8, ' stroke="#2563EB" stroke-width="1.5"') + T('同意变更。nRF52832 加急费 0.60/pcs 已含；11-16 发货后上传空运单号。', MX + 28, y + 40, 13, 400, '#1E293B') + R(MX + 28 + W('同意变更。nRF52832 加急费 0.60/pcs 已含；11-16 发货后上传空运单号。', 13) + 2, y + 30, 1.5, 20, '#2563EB'));
  y += 118; b.push(R(MX + 16, y, MWd - 32, 1, '#EEF2F7'));
  b.push(row(MX + 16, y + 20, [['确认全部', 1, 'check'], ['修改交期 / 数量', 0], ['拒绝变更', 0]]).svg + T('确认后采购方 MRP 按 11-17 计入，PLN-20261113-008 不再推迟', MX + MWd - 16, y + 36, 12, 400, '#64748B', 'end'));
  { const yy = y + 76; b.push(T('版本记录', MX + 16, yy, 13, 700, '#334155')); [['V2', '11-13 16:49 采购方变更 · 待确认', '#C2410C'], ['V1', '11-13 09:42 已确认 · 3,000 / 11-20', '#64748B']].forEach(([v, d, c], i) => { const x = MX + 96 + i * 300; b.push(pill(v, x, yy, '#FFFFFF', c, 11, 700, 6, 18).svg + T(d, x + 30, yy, 12, 400, '#475569')); });
    b.push(T('附件', MX + 16, yy + 36, 13, 700, '#334155') + ic('clip', MX + 96, yy + 28, '#64748B') + T('PO-20261113-004_V2.pdf', MX + 118, yy + 36, 12, 500, '#2563EB') + ic('clip', MX + 300, yy + 28, '#64748B') + T('变更说明_POC-20261113-002.pdf', MX + 322, yy + 36, 12, 500, '#2563EB')); }
  // 右：送货 + 标签
  const RX = 1896 - 440, RW = 440; b.push(R(RX, TOP, RW, 360, '#FFFFFF', 10, ' stroke="#E2E8F0"') + T('送货单', RX + 16, TOP + 26, 15, 700, '#0F172A') + pill('草稿', RX + 74, TOP + 26, '#475569', '#F1F5F9', 12, 700, 8, 22).svg + T('ASN-20261113-0012', RX + RW - 16, TOP + 26, 13, 500, '#334155', 'end'));
  [['采购订单', 'PO-20261109-018'], ['物料', '2.03.0840 nRF52840-QIAA'], ['本次送货', '4,000 pcs · 2 盘 × 2,000'], ['原厂批 / D/C', 'NRD-2643-12C · 2643'], ['发货时间', '11-14 09:00'], ['预计到货', '11-14 15:00 · 顺丰同城']].forEach(([k, v], i) => { const yy = TOP + 62 + i * 30; b.push(T(k, RX + 16, yy, 13, 400, '#64748B') + T(v, RX + 116, yy, 13, 500, k === '采购订单' ? '#2563EB' : '#0F172A')); });
  b.push(R(RX + 16, TOP + 238, RW - 32, 56, '#F0FDF4', 8, ' stroke="#BBF7D0"') + okI(RX + 28, TOP + 258) + T('数量未超订单余量（4,000 / 4,000）', RX + 52, TOP + 258, 12, 500, '#166534') + okI(RX + 28, TOP + 280) + T('MSL 3：真空包装 + 湿度卡，标签含封袋时间', RX + 52, TOP + 280, 12, 500, '#166534'));
  b.push(btn(RX + 16, TOP + 310, '提交送货单', 1, 'send', 34, 13).svg + btn(RX + 140, TOP + 310, '打印装箱单', 0, null, 34, 13).svg + T('提交后采购方生成收料通知', RX + RW - 16, TOP + 327, 12, 400, '#64748B', 'end'));
  y = TOP + 376; b.push(R(RX, y, RW, 1064 - y, '#FFFFFF', 10, ' stroke="#E2E8F0"') + T('标签打印', RX + 16, y + 26, 15, 700, '#0F172A') + T('100 × 70 mm · 2 张', RX + RW - 16, y + 26, 12, 400, '#64748B', 'end'));
  const lab = (lx, ly, no, seed) => { let s = R(lx, ly, RW - 32, 168, '#FFFFFF', 4, ' stroke="#334155" stroke-width="1.2"'); s += T('芯程电子 来料标签', lx + 12, ly + 18, 12, 700, '#0F172A') + T('SUP-0012 芯联科技', lx + RW - 44, ly + 18, 11, 400, '#334155', 'end') + R(lx, ly + 32, RW - 32, 1, '#334155');
    [['料号', '2.03.0840'], ['型号', 'nRF52840-QIAA aQFN73'], ['数量', '2,000 PCS'], ['批号 D/C', 'NRD-2643-12C · 2643'], ['PO / ASN', 'PO-20261109-018 / ASN-…-0012'], ['MSL', '3 · 封袋 11-08']].forEach(([k, v], i) => { s += T(k, lx + 12, ly + 46 + i * 16, 10, 400, '#64748B') + T(v, lx + 72, ly + 46 + i * 16, 11, 700, '#0F172A'); });
    s += qr(lx + RW - 32 - 88, ly + 40, 76, seed) + barcode(lx + 12, ly + 138, RW - 32 - 24 - 150, 20, seed) + T(no, lx + RW - 44, ly + 148, 11, 700, '#0F172A', 'end'); return s; };
  b.push(lab(RX + 16, y + 44, 'S0012-261113-0001', 17) + lab(RX + 16, y + 222, 'S0012-261113-0002', 29));
  b.push(T('打印机：斑马 ZD421 · 已连接', RX + 16, 1064 - 26, 12, 400, '#64748B') + btn(RX + RW - 16 - 112, 1064 - 44, '打印 2 张', 1, null, 32, 13).svg);
  return SVG(1920, 1080, b.join(''));
}

const ALL = { UI41: ui41, UI42: ui42, UI43: ui43, UI44: ui44, UI45: ui45, UI46: ui46, UI47: ui47, UI48: ui48 };
// MAIN
const want = process.argv.slice(2);
if (process.argv[1] && process.argv[1].endsWith('gen_b5.mjs')) for (const [k, fn] of Object.entries(ALL)) { if (want.length && !want.includes(k)) continue; fs.writeFileSync(OUT + k + '.svg', fn()); }
