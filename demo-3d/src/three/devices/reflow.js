// src/three/devices/reflow.js
// SMT 回流焊炉 — Heller 1936 MK7 / Rehm VisionXP+ 风格，10 温区分段上盖
import * as THREE from 'three';
import { M, lampMat, statusColor } from '../materials.js';
import { PartBuilder, roundedBoxGeo, textTexture } from '../builder.js';
import { signalTower, applyLamps, statusRing, setRingStatus, monitorArm, feet, vents, estop } from '../common.js';

export const meta = {
  type: 'reflow',
  name: '回流焊炉',
  refs: [
    'Heller 1936 MK7 — 10-zone reflow oven',
    'Rehm VisionXP+ — convection reflow oven',
    'https://www.hellerindustries.com/reflow-ovens/',
    'https://www.rehm-group.com/en/products/soldering-systems/convection-reflow-soldering/',
  ],
  size: { w: 5.5, d: 1.5, h: 1.5 },
};

// ─── 整机尺寸 ────────────────────────────────────────────────────
const W = 5.5;        // 长（X）
const D = 1.5;        // 宽（Z）
const H = 1.5;        // 高（Y，不含灯塔）
const BODY_D = 1.34;  // 炉体深（Z），输送段略宽
const BASE_H = 0.12;  // 底座高
const LOWER_TOP = 0.62;   // 下机柜顶
const BELT_Y = 0.90;      // 传送面高（规范）
const CHAMBER_BOT = 0.66; // 炉膛底
const CHAMBER_TOP = 1.18; // 炉膛顶
const HOOD_TOP = 1.50;    // 上盖顶

const NUM_ZONES = 10;               // 8 加热 + 2 冷却
const ZONE_W = (W - 0.30) / NUM_ZONES; // 每温区沿 X 宽
const ZONE_X0 = -W / 2 + 0.15;      // 第 1 区起始 x

const EXT = 0.45;                 // 入/出口外伸长度
const CONV_X0 = -W / 2 - EXT;     // 输送段起点
const CONV_X1 =  W / 2 + EXT;     // 输送段终点

// ─── 局部材质 ────────────────────────────────────────────────────
const matOrange = new THREE.MeshStandardMaterial({ color: 0xfb923c, roughness: 0.45, metalness: 0.1 });
const matHood   = new THREE.MeshStandardMaterial({ color: 0xeef2f7, roughness: 0.4, metalness: 0.06 });
const matInner  = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.8, metalness: 0.1 });
const matRail   = new THREE.MeshStandardMaterial({ color: 0x9aa5b1, roughness: 0.3, metalness: 0.85 });
const matBeltS  = new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.7, metalness: 0.25 });
// removed  // matGlow 改为在 build() 内 per-instance 创建
const matGlassW = new THREE.MeshStandardMaterial({
  color: 0xbae6fd, roughness: 0.05, metalness: 0.2,
  transparent: true, opacity: 0.30, depthWrite: false,
});

// ─── 下机柜 ──────────────────────────────────────────────────────
function buildCabinet(pb) {
  // 底座
  pb.add(roundedBoxGeo(W, BASE_H, BODY_D + 0.06, 0.03), M.graphite, 0, BASE_H / 2, 0);
  feet(pb, W, BODY_D, 0.10);
  // 下机柜盖板（左右两扇，中间留缝）
  const cabH = LOWER_TOP - BASE_H - 0.02;
  const cabY = BASE_H + 0.01 + cabH / 2;
  const halfW = (W - 0.06) / 2;
  for (const sx of [-1, 1]) {
    const cx = sx * (halfW / 2 + 0.015);
    pb.add(roundedBoxGeo(halfW - 0.01, cabH, BODY_D - 0.02, 0.035), matHood, cx, cabY, 0);
    // 散热格栅（正面）
    vents(pb, cx, BASE_H + 0.06, BODY_D / 2 + 0.006, halfW * 0.55, 0.30, 7, M.darkGray, 'z');
    // 柜门把手
    pb.boxC(0.016, 0.10, 0.022, cx + sx * (halfW / 2 - 0.06), cabY + 0.05, BODY_D / 2 + 0.012, M.metal);
  }
  // 腰线饰条
  pb.add(roundedBoxGeo(W + 0.02, 0.05, BODY_D + 0.04, 0.02), M.blue, 0, LOWER_TOP, 0);
  // 背面格栅
  vents(pb, 0, BASE_H + 0.06, -BODY_D / 2 - 0.006, W * 0.5, 0.30, 8, M.darkGray, 'z');
  // 线缆槽（底部后侧）
  pb.boxC(W - 0.4, 0.05, 0.06, 0, BASE_H + 0.02, -BODY_D / 2 - 0.045, M.darkGray);
}

// ─── 炉膛外壳侧板：正面拆块围出 3 条观察窗开口 ──────────────
function buildChamberShell(pb) {
  const shTop = HOOD_TOP - 0.06;      // 外壳顶
  const shBot = LOWER_TOP;            // 外壳底（腰线顶）
  const shH = shTop - shBot;
  const shY = shBot + shH / 2;
  const shW = W - 0.10;
  const shellT = 0.03;
  // 背面外壳板（整块）
  pb.boxC(shW, shH, shellT, 0, shY, -BODY_D / 2 + shellT / 2, matHood);
  // 正面外壳板：拆成 上条 / 下条 / 窗间立柱，围出 3 个观察窗开口
  // 窗参数：y 0.95–1.03（中心 0.99，高 0.08），宽 1.0，3 条位于加热区
  const winY0 = 0.95, winY1 = 1.03, winH = winY1 - winY0;
  const winW = 1.0;
  const winXs = [ZONE_X0 + 1.5 * ZONE_W, ZONE_X0 + 4.5 * ZONE_W, ZONE_X0 + 6.5 * ZONE_W];
  // 上条（窗顶以上）
  pb.boxC(shW, shTop - winY1, shellT, 0, winY1 + (shTop - winY1) / 2, BODY_D / 2 - shellT / 2, matHood);
  // 下条（窗底以下）
  pb.boxC(shW, winY0 - shBot, shellT, 0, shBot + (winY0 - shBot) / 2, BODY_D / 2 - shellT / 2, matHood);
  // 窗间立柱（4 根：左右边 + 2 根窗间）
  const edges = [-shW / 2, ...winXs.map(x => x - winW / 2), ...winXs.map(x => x + winW / 2), shW / 2].sort((a, b) => a - b);
  for (let i = 0; i < edges.length - 1; i++) {
    const x0 = edges[i], x1 = edges[i + 1];
    const cw = x1 - x0;
    if (cw <= 0.001) continue;
    // 若该区间与某窗重叠则跳过（窗区无白板）
    let inWin = false;
    for (const wx of winXs) if (x0 >= wx - winW / 2 - 0.001 && x0 < wx + winW / 2) { inWin = true; break; }
    if (inWin) continue;
    pb.boxC(cw, winH, shellT, x0 + cw / 2, winY0 + winH / 2, BODY_D / 2 - shellT / 2, matHood);
  }
  // 端板（±X）：网带高度开口加宽，并向外伸出短门框，入口更清楚；侧板不到输送面
  const opH = 0.16, opW = 0.72;
  const opY0 = BELT_Y - 0.06;         // 开口底
  const opY1 = opY0 + opH;            // 开口顶
  const endT = 0.03;
  const lip = 0.08;
  for (const sx of [-1, 1]) {
    const ex = sx * (W / 2 - endT / 2);
    // 开口下方
    pb.boxC(endT, opY0 - shBot, BODY_D - 0.06, ex, shBot + (opY0 - shBot) / 2, 0, matHood);
    // 开口上方
    pb.boxC(endT, shTop - opY1, BODY_D - 0.06, ex, opY1 + (shTop - opY1) / 2, 0, matHood);
    // 开口两侧立柱（停在洞口左右，不挡网带）
    for (const sz of [-1, 1]) {
      pb.boxC(endT, opH, (BODY_D - 0.06 - opW) / 2, ex, opY0 + opH / 2, sz * (opW / 2 + (BODY_D - 0.06 - opW) / 4), matHood);
    }
    // 开口过梁（深色门洞内衬）
    pb.boxC(0.035, opH, opW, ex - sx * 0.012, opY0 + opH / 2, 0, matInner);
    // 外伸短门框：只做洞口框，不形成封闭侧墙
    const lx = sx * (W / 2 + lip / 2);
    pb.boxC(lip, 0.03, opW + 0.06, lx, opY1 + 0.015, 0, matHood);
    pb.boxC(lip, 0.03, opW + 0.06, lx, opY0 - 0.015, 0, matHood);
    for (const sz of [-1, 1]) {
      pb.boxC(lip, opH + 0.06, 0.03, lx, opY0 + opH / 2, sz * (opW / 2 + 0.015), matHood);
    }
  }
  // 外壳顶板（承托上盖段，盖板底面贴合于此，留 2mm 缝）
  pb.boxC(shW, 0.025, BODY_D - 0.06, 0, shTop - 0.0125, 0, matHood);
}

// ─── 炉膛内腔（深色，只在观察窗后与进出口洞口可见）────────────────
function buildChamber(pb) {
  const chH = CHAMBER_TOP - CHAMBER_BOT;
  const chY = CHAMBER_BOT + chH / 2;
  const chW = W - 0.24;
  // 炉膛内胆（深色盒，前后被外壳遮住，两端开口处可见）
  pb.boxC(chW, chH, BODY_D - 0.14, 0, chY, 0, matInner);
  // 炉膛顶板 / 底板
  pb.boxC(chW + 0.02, 0.02, BODY_D - 0.10, 0, CHAMBER_TOP - 0.01, 0, matInner);
  pb.boxC(chW + 0.02, 0.02, BODY_D - 0.10, 0, CHAMBER_BOT + 0.01, 0, matInner);
  // 炉膛内两侧导轨槽（深色内腔里的金属导轨）
  for (const sz of [-1, 1]) {
    pb.boxC(chW, 0.015, 0.03, 0, BELT_Y - 0.012, sz * (BODY_D / 2 - 0.18), matRail);
  }
}

// ─── 分段上盖（每温区一段，盖板底面贴外壳顶，段间留缝；第 4 段微掀）──
function buildHood(pb) {
  const shellTop = HOOD_TOP - 0.06 + 0.025; // 外壳顶板顶面 ≈ HOOD_TOP-0.035
  const segT = HOOD_TOP - shellTop - 0.003; // 盖板厚：保证盖板顶面 = HOOD_TOP
  const segBot = shellTop + 0.003;          // 盖板底面（留 3mm 缝）
  const segY = segBot + segT / 2;
  const segW = ZONE_W - 0.018;              // 段间留 18mm 缝
  for (let i = 0; i < NUM_ZONES; i++) {
    const zx = ZONE_X0 + (i + 0.5) * ZONE_W;
    const lifted = (i === 3); // 第 4 段微微掀开
    if (lifted) {
      // 铰链在后侧（-Z 边），铰链座落在外壳顶板实体上
      const ang = 0.26;
      const hz = -BODY_D / 2 + 0.06;
      const hy = segBot; // 铰链轴高度 = 盖板底面
      pb.boxC(0.06, 0.035, 0.06, zx, shellTop + 0.017, hz, M.metal);
      // 掀开的盖板：先把盖板几何移到相对铰链轴的位置，绕铰链旋转，再移回世界坐标
      const g = roundedBoxGeo(segW, segT, BODY_D - 0.12, 0.03);
      g.translate(0, segY - hy, 0 - hz);
      g.rotateX(-ang);
      g.translate(0, hy, hz);
      pb.add(g, matHood, zx, 0, 0);
      // 盖板前缘把手（闭合位置在盖板顶面前缘，随盖板一起绕铰链旋转）
      const handleZ = BODY_D / 2 - 0.16;
      const hb = new THREE.BoxGeometry(0.10, 0.02, 0.03);
      hb.translate(0, segY + segT / 2 + 0.01 - hy, handleZ - hz);
      hb.rotateX(-ang);
      hb.translate(0, hy, hz);
      pb.add(hb, matOrange, zx, 0, 0);
      // 气弹簧：下端顶在外壳顶板实体，上端顶在掀起盖板下表面（前侧）
      const botZ = BODY_D / 2 - 0.10, botY = shellTop + 0.06;
      // 盖板下表面前缘点（闭合时 (segBot, botZ)，绕铰链转 -ang 后的位置）
      const relY = segBot - hy, relZ = botZ - hz;
      const topY = hy + relY * Math.cos(ang) + relZ * Math.sin(ang);
      const topZ = hz - relY * Math.sin(ang) + relZ * Math.cos(ang);
      const dy = topY - botY, dz = topZ - botZ;
      const len = Math.hypot(dy, dz);
      const tilt = Math.atan2(dz, dy);
      pb.add(new THREE.CylinderGeometry(0.006, 0.006, len, 8), M.steel,
        zx, (topY + botY) / 2, (topZ + botZ) / 2, tilt, 0, 0);
    } else {
      pb.add(roundedBoxGeo(segW, segT, BODY_D - 0.12, 0.03), matHood, zx, segY, 0);
      // 段间铰链座（后侧，落在外壳顶板上）
      pb.boxC(0.05, 0.025, 0.05, zx + segW / 2, shellTop + 0.012, -BODY_D / 2 + 0.06, M.metal);
      // 收起的气弹簧（贴在盖板下方，两端都接触实体）
      pb.add(new THREE.CylinderGeometry(0.005, 0.005, 0.14, 8), M.steel,
        zx - segW / 2 + 0.06, segBot + 0.045, BODY_D / 2 - 0.14, 0.55, 0, 0);
      // 盖板前缘小把手
      pb.boxC(0.08, 0.018, 0.025, zx, segBot + segT + 0.009, BODY_D / 2 - 0.12, matOrange);
    }
  }
}

// ─── 温区色块（贴在外壳外表面之外 3mm：z=±(BODY_D/2+0.003+厚度/2)）────
function buildZoneBands(pb) {
  const bandH = 0.10, bandY = LOWER_TOP + 0.16;
  const bandT = 0.014;
  for (let i = 0; i < NUM_ZONES; i++) {
    const zx = ZONE_X0 + (i + 0.5) * ZONE_W;
    const isCool = i >= NUM_ZONES - 2;
    const mat = isCool ? M.blue : matOrange;
    for (const sz of [-1, 1]) {
      pb.boxC(ZONE_W - 0.03, bandH, bandT, zx, bandY, sz * (BODY_D / 2 + 0.003 + bandT / 2), mat);
    }
  }
}

// ─── 真观察窗：窗框 + 玻璃（玻璃在外壳内表面 z=0.64 与内胆前表面 z=0.60 之间的开口内）──
function buildWindows(pb, winXs) {
  const winY0 = 0.95, winH = 0.08, winW = 1.0;
  const winYc = winY0 + winH / 2;
  const ft = 0.012; // 窗框边条截面
  const fz = BODY_D / 2 + 0.003; // 贴外壳外表面之外
  for (const wx of winXs) {
    // 四根细边条窗框（上/下/左/右），中间留空
    pb.boxC(winW + ft, ft, 0.008, wx, winY0 + winH + ft / 2, fz, M.gray);
    pb.boxC(winW + ft, ft, 0.008, wx, winY0 - ft / 2, fz, M.gray);
    pb.boxC(ft, winH, 0.008, wx - (winW / 2 + ft / 2), winYc, fz, M.gray);
    pb.boxC(ft, winH, 0.008, wx + (winW / 2 + ft / 2), winYc, fz, M.gray);
    // 玻璃：#BAE6FD、opacity 0.30，放在开口内，前表面贴近外壳内表面留 4mm
    pb.boxC(winW, winH, 0.004, wx, winYc, BODY_D / 2 - shellTRef - 0.004, matGlassW);
  }
}

// ─── 排风口（入口端 / 出口端顶部圆柱风管 + 法兰；冷却区上方风扇罩）──
function buildExhaust(pb) {
  for (const sx of [-1, 1]) {
    const ex = sx * (W / 2 - 0.55);
    // 法兰
    pb.cyl(0.09, 0.02, ex, HOOD_TOP + 0.01, 0, M.gray, 20);
    // 风管（竖直向上）
    pb.cyl(0.065, 0.16, ex, HOOD_TOP + 0.10, 0, matRail, 20);
    pb.cyl(0.075, 0.02, ex, HOOD_TOP + 0.20, 0, M.gray, 20);
  }
  // 冷却区上方风扇罩（2 个）
  for (let i = 0; i < 2; i++) {
    const fx = ZONE_X0 + (NUM_ZONES - 1.5 + i) * ZONE_W;
    pb.cyl(0.11, 0.05, fx, HOOD_TOP + 0.025, 0, M.gray, 24);
    pb.cyl(0.09, 0.012, fx, HOOD_TOP + 0.052, 0, M.darkGray, 24);
  }
}

// ─── 输送段（两端外伸网带 + 导轨）────────────────────────────
function buildConveyor(pb) {
  const convL = CONV_X1 - CONV_X0;
  const cx = (CONV_X0 + CONV_X1) / 2;
  // 网带面（薄板，y 顶面 = BELT_Y）
  pb.boxC(convL, 0.012, 0.46, cx, BELT_Y - 0.012, 0, matBeltS);
  // 网带加强筋（横向细条，示意链条）
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const rx = CONV_X0 + (i / n) * convL;
    pb.boxC(0.006, 0.014, 0.46, rx, BELT_Y - 0.013, 0, M.darkGray);
  }
  // 两侧导轨（两端露出 x=±W/2）
  for (const sz of [-1, 1]) {
    pb.boxC(convL, 0.035, 0.035, cx, BELT_Y + 0.002, sz * 0.26, matRail);
    pb.boxC(convL, 0.012, 0.012, cx, BELT_Y + 0.037, sz * 0.26, matBeltS);
  }
  // 端部支撑架（外伸段下方）
  for (const sx of [-1, 1]) {
    const ex = sx * (W / 2 + EXT / 2 - 0.05);
    for (const sz of [-1, 1]) {
      pb.boxC(0.04, BELT_Y - 0.05, 0.04, ex, (BELT_Y - 0.05) / 2, sz * 0.22, M.gray);
    }
    pb.boxC(0.04, 0.03, 0.48, ex, 0.015, 0, M.graphite);
  }
}

const shellTRef = 0.03; // 与 buildChamberShell 的 shellT 一致

// ─── 加热区窗后发光条（每扇窗后一条，z 介于内胆前表面 0.60 与玻璃之间，独立材质由调用方传入）
function buildGlowStrips(pb, glowMat, winXs) {
  for (const wx of winXs) {
    // 发光条：紧贴内胆前表面之后（z=0.615），不与玻璃（z≈0.632）接触，留 ~1.7cm
    pb.boxC(winXs ? 0.9 : 0.9, 0.05, 0.02, wx, 0.99, BODY_D / 2 - 0.055, glowMat);
  }
  // 炉膛顶部加热区灯带（保留，仍位于内胆内，仅作内部氛围）
  const n = NUM_ZONES - 2;
  for (let i = 0; i < n; i++) {
    const zx = ZONE_X0 + (i + 0.5) * ZONE_W;
    pb.boxC(ZONE_W * 0.7, 0.012, 0.05, zx, CHAMBER_TOP - 0.05, 0, glowMat);
  }
}

// ─── build 主函数 ────────────────────────────────────────────────
export function build(device) {
  const group = new THREE.Group();
  group.name = device.id;

  // 本实例独立发光材质（2 台设备互不影响）
  const matGlow = new THREE.MeshStandardMaterial({
    color: 0x3a1a0a, roughness: 0.6, metalness: 0,
    emissive: 0xff6a1f, emissiveIntensity: 1.6,
  });

  const pb = new PartBuilder();

  // 观察窗位置（加热区 Z2/Z5/Z7 中心，共 3 扇）
  const winXs = [ZONE_X0 + 1.5 * ZONE_W, ZONE_X0 + 4.5 * ZONE_W, ZONE_X0 + 6.5 * ZONE_W];

  buildCabinet(pb);
  buildChamberShell(pb);
  buildChamber(pb);
  buildHood(pb);
  buildZoneBands(pb);
  buildWindows(pb, winXs);
  buildExhaust(pb);
  buildConveyor(pb);

  // ── 正面操作面板细节：急停 + 铭牌 ──────────────────────────
  estop(pb, -W / 2 + 0.28, LOWER_TOP + 0.22, BODY_D / 2 + 0.035, 0);
  estop(pb, -W / 2 + 0.42, LOWER_TOP + 0.22, BODY_D / 2 + 0.035, 0);
  // 主铭牌
  {
    const tex = textTexture('REFLOW OVEN · 10-ZONE', { w: 1024, h: 96, font: 'bold 52px "PingFang SC","Microsoft YaHei",sans-serif', color: '#1f2a3d', bg: '#eef2f7' });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.058), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
    m.position.set(-W / 2 + 0.55, LOWER_TOP + 0.10, BODY_D / 2 + 0.016);
    group.add(m);
  }

  // ── 操作屏支臂（入口端正面）───────────────────────────────
  const monX = -W / 2 + 0.85;
  const monY = LOWER_TOP + 0.06;
  const monZ = BODY_D / 2 + 0.055;
  const monRy = -0.18;
  monitorArm(pb, monX, monY, monZ, { ry: monRy, armH: 0.34, w: 0.34, h: 0.23 });

  // 合并静态部件（不含发光条）
  pb.build(group);
  // 发光条单独合并，保留本实例 matGlow 引用（cloneMaterials:false）
  const glowPb = new PartBuilder();
  buildGlowStrips(glowPb, matGlow, winXs);
  glowPb.build(group, { cloneMaterials: false, shadow: false });

  // ── 温区编号贴图（加大字号、加深颜色，独立 Mesh，正面/背面各一）──
  {
    const cvs = document.createElement('canvas');
    cvs.width = 2048; cvs.height = 128;
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, 2048, 128);
    const labels = ['Z1','Z2','Z3','Z4','Z5','Z6','Z7','Z8','C1','C2'];
    for (let i = 0; i < NUM_ZONES; i++) {
      const px = (ZONE_X0 + (i + 0.5) * ZONE_W + W / 2) / W * 2048;
      ctx.fillStyle = i >= NUM_ZONES - 2 ? '#1e3a8a' : '#9a3412';
      ctx.font = 'bold 90px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], px, 64);
    }
    const tex = new THREE.CanvasTexture(cvs);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    for (const sz of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.30, 0.085), mat);
      // 放在温区色块正上方（色块顶 0.83），不与观察窗（0.95–1.03）重叠
      p.position.set(0, 0.83 + 0.0425 + 0.008, sz * (BODY_D / 2 + 0.003 + 0.0035));
      if (sz < 0) p.rotation.y = Math.PI;
      group.add(p);
    }
  }

  // ── 操作屏界面贴图（温度曲线）─────────────────────────────
  {
    const ry = monRy, s = Math.sin(ry), c = Math.cos(ry);
    const mx = monX + s * 0.059;
    const my = monY + 0.34 + 0.23 / 2 + 0.02;
    const mz = monZ + c * 0.059;

    const cvs = document.createElement('canvas');
    cvs.width = 512; cvs.height = 360;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, 512, 360);
    ctx.fillStyle = '#2563eb'; ctx.fillRect(0, 0, 512, 48);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 21px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('回流焊炉 · 温度曲线', 256, 24);

    // 网格
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(40, 60 + i * 32); ctx.lineTo(500, 60 + i * 32); ctx.stroke(); }
    for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(40 + i * 46, 60); ctx.lineTo(40 + i * 46, 320); ctx.stroke(); }
    // 温区分隔
    for (let i = 1; i < 10; i++) {
      ctx.strokeStyle = i >= 8 ? '#2563eb' : '#f59e0b';
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(40 + i * 46, 60); ctx.lineTo(40 + i * 46, 320); ctx.stroke();
      ctx.setLineDash([]);
    }
    // 设定曲线（阶梯状）
    ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2.5; ctx.beginPath();
    const setPts = [140, 170, 200, 220, 240, 250, 260, 250, 180, 120];
    ctx.moveTo(40, 320 - setPts[0] * 0.9);
    for (let i = 1; i < 10; i++) ctx.lineTo(40 + i * 46, 320 - setPts[i] * 0.9);
    ctx.stroke();
    // 实际曲线（橙色，轻微波动）
    ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(40, 320 - setPts[0] * 0.9 + 6);
    for (let i = 1; i < 10; i++) ctx.lineTo(40 + i * 46, 320 - setPts[i] * 0.9 + (i % 2 === 0 ? 5 : -4));
    ctx.stroke();
    // 图例
    ctx.fillStyle = '#22d3ee'; ctx.fillRect(60, 330, 14, 4);
    ctx.fillStyle = '#94a3b8'; ctx.font = '13px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('设定', 80, 333);
    ctx.fillStyle = '#fb923c'; ctx.fillRect(130, 330, 14, 4);
    ctx.fillStyle = '#94a3b8'; ctx.fillText('实际', 150, 333);
    ctx.textAlign = 'right'; ctx.fillText('峰值 245°C · 10 温区', 500, 333);

    const uiTex = new THREE.CanvasTexture(cvs);
    uiTex.colorSpace = THREE.SRGBColorSpace;
    const uiPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.23),
      new THREE.MeshBasicMaterial({ map: uiTex })
    );
    uiPlane.position.set(mx + s * 0.004, my, mz + c * 0.004);
    uiPlane.rotation.set(-0.12, ry, 0);
    group.add(uiPlane);
  }

  // ── PCB 运动件（InstancedMesh，6 块排成一列，本实例独立材质）─
  const PCB_COUNT = 6;
  const pcbGeo = new THREE.BoxGeometry(0.30, 0.004, 0.24);
  const pcbMat = M.pcb.clone();
  const pcbs = new THREE.InstancedMesh(pcbGeo, pcbMat, PCB_COUNT);
  pcbs.name = 'pcbs';
  pcbs.castShadow = true;
  const chipGeo = new THREE.BoxGeometry(0.03, 0.006, 0.02);
  const chips = new THREE.InstancedMesh(chipGeo, M.pcbChip.clone(), PCB_COUNT * 4);
  chips.name = 'pcbChips';
  const _m4 = new THREE.Matrix4();
  const pcbX0 = CONV_X0 + 0.55;
  const pcbGap = 0.55;
  const PCB_SPAN = CONV_X1 - 0.15 - pcbX0; // [人工] PCB 中心可走范围（板长 0.30，留在网带上）
  function layoutPCBs(offset) {
    for (let i = 0; i < PCB_COUNT; i++) {
      const x = pcbX0 + ((i * pcbGap + offset) % PCB_SPAN); // [人工] 每块单独循环，不越过出口网带末端
      _m4.makeTranslation(x, BELT_Y + 0.002, 0);
      pcbs.setMatrixAt(i, _m4);
      for (let c = 0; c < 4; c++) {
        const cx = x + ((c % 2) - 0.5) * 0.12;
        const cz = ((Math.floor(c / 2)) - 0.5) * 0.10;
        _m4.makeTranslation(cx, BELT_Y + 0.007, cz);
        chips.setMatrixAt(i * 4 + c, _m4);
      }
    }
    pcbs.instanceMatrix.needsUpdate = true;
    chips.instanceMatrix.needsUpdate = true;
  }
  layoutPCBs(0);
  group.add(pcbs, chips);

  // ── 信号灯塔（入口端顶部靠后）───────────────────────────────
  const towerX = -W / 2 + 0.35;
  const towerZ = -BODY_D / 2 + 0.18;
  group.userData.lamps = signalTower(group, towerX, HOOD_TOP, towerZ, 0.10);

  // ── 状态光环 ────────────────────────────────────────────────
  group.userData.ring = statusRing(W, D);
  group.add(group.userData.ring);

  applyLamps(group.userData.lamps, device.status);
  setRingStatus(group.userData.ring, device.status);

  // ── 动画（只改本实例材质 matGlow）───────────────────────────
  // 初始发光强度按状态设置
  matGlow.emissiveIntensity = device.status === 'run' ? 1.6 : 0.15;
  group.userData.animate = (t, _dt, status) => {
    if (status === 'run') {
      layoutPCBs(t * 0.12); // [人工] 取模移到 layoutPCBs 内，避免整列跳变
      matGlow.emissiveIntensity = 1.6 + 0.4 * Math.sin(t * 2.4);
    } else {
      layoutPCBs(0);
      matGlow.emissiveIntensity = 0.15;
    }
  };

  group.userData.size = { w: W, d: D, h: H };
  return group;
}
