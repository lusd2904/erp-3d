// SMT 线体设备精细建模：上板机、锡膏印刷机、SPI、贴片机（NXT 模组式 / 整机式）、回流焊、AOI、接驳台
import * as THREE from 'three';
import { PartBuilder, roundedBoxGeo } from './builder.js';
import { M } from './materials.js';
import { signalTower, monitorArm, feet, vents, estop, handle } from './common.js';

export const PCB_Y = 0.92; // 传送轨道高度
const REEL_MATS = [M.reel, M.reelWhite, M.black, M.reel, M.reelWhite];

// 双轨传送机构（局部坐标，沿 x）
function rails(pb, x0, x1, z = 0, gap = 0.26) {
  const L = x1 - x0, cx = (x0 + x1) / 2;
  for (const s of [-1, 1]) {
    pb.boxC(L, 0.05, 0.03, cx, PCB_Y - 0.02, z + s * gap / 2, M.metal);
    pb.boxC(L, 0.012, 0.012, cx, PCB_Y + 0.008, z + s * (gap / 2 - 0.02), M.belt);
  }
}

// ---------- 接驳台 / 上下板机 ----------
export function buildConveyor(len = 0.8) {
  const g = new THREE.Group(), pb = new PartBuilder();
  rails(pb, -len / 2, len / 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pb.box(0.04, PCB_Y - 0.05, 0.04, sx * (len / 2 - 0.06), 0, sz * 0.14, M.metal);
  pb.boxC(len - 0.1, 0.04, 0.3, 0, 0.35, 0, M.gray);
  pb.box(0.12, 0.08, 0.1, len / 2 - 0.1, PCB_Y - 0.1, 0.2, M.darkGray); // 小控制盒
  pb.build(g, { cloneMaterials: false });
  return g;
}
export function buildLoader(unload = false) {
  const g = new THREE.Group(), pb = new PartBuilder();
  const w = 0.9, d = 0.85;
  pb.box(w, 0.6, d, 0, 0.08, 0, M.white); feet(pb, w, d);
  pb.box(w + 0.02, 0.03, d + 0.02, 0, 0.68, 0, M.gray);
  // 立柱框架
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pb.box(0.05, 1.05, 0.05, sx * (w / 2 - 0.03), 0.7, sz * (d / 2 - 0.03), M.metal);
  pb.box(w, 0.06, d, 0, 1.75, 0, M.gray);
  // 料框（magazine）
  for (let i = 0; i < 2; i++) {
    const y = 0.72 + i * 0.5;
    pb.box(0.55, 0.42, 0.4, 0, y, 0, M.blue);
    for (let k = 0; k < 9; k++) pb.boxC(0.56, 0.006, 0.41, 0, y + 0.05 + k * 0.04, 0, M.navy);
  }
  pb.add(new THREE.BoxGeometry(w - 0.06, 1.0, 0.01), M.glass, 0, 1.22, d / 2 - 0.02);
  rails(pb, -w / 2, w / 2 + 0.05);
  pb.box(0.3, 0.2, 0.05, unload ? -0.2 : 0.2, 0.3, d / 2 + 0.01, M.darkGray);
  const lamps = signalTower(g, w / 2 - 0.06, 1.81, -d / 2 + 0.06, 0.18);
  pb.build(g);
  return { group: g, size: { w, h: 2.0, d }, lamps };
}

// ---------- 锡膏印刷机（仿 DEK 风格）----------
export function buildPrinter() {
  const g = new THREE.Group(), pb = new PartBuilder();
  const w = 1.5, d = 1.55;
  // 下机柜
  pb.box(w, 0.07, d, 0, 0.06, 0, M.graphite);
  pb.box(w, 0.72, d, 0, 0.13, 0, M.white); feet(pb, w, d);
  for (const sx of [-0.37, 0.37]) { pb.boxC(0.7, 0.62, 0.012, sx, 0.49, d / 2 + 0.005, M.ivory); pb.boxC(0.02, 0.14, 0.02, sx + (sx < 0 ? 0.3 : -0.3), 0.55, d / 2 + 0.018, M.metal); }
  vents(pb, 0.37, 0.18, d / 2 + 0.012, 0.45, 0.14, 5);
  // 中腰深色饰带
  pb.box(w + 0.01, 0.08, d + 0.01, 0, 0.85, 0, M.navy);
  // 上罩：前倾大玻璃窗
  pb.box(w, 0.1, d, 0, 0.93, 0, M.white);
  pb.add(new THREE.BoxGeometry(w, 0.5, 0.06), M.white, 0, 1.28, -d / 2 + 0.03);
  for (const sx of [-1, 1]) pb.add(new THREE.BoxGeometry(0.06, 0.5, d), M.white, sx * (w / 2 - 0.03), 1.28, 0);
  pb.add(new THREE.BoxGeometry(w - 0.12, 0.48, 0.01), M.glassTint, 0, 1.27, d / 2 - 0.06, -0.18, 0, 0);
  pb.add(roundedBoxGeo(w, 0.12, d - 0.1, 0.05), M.white, 0, 1.58, 0, Math.PI / 2, 0, 0);
  pb.box(w * 0.7, 0.02, 0.3, 0, 1.64, -0.3, M.gray);
  // 内部：钢网框架与 PCB 支撑台
  for (const s2 of [-1, 1]) { pb.boxC(0.8, 0.03, 0.04, 0, 1.06, s2 * 0.38, M.metal); pb.boxC(0.04, 0.03, 0.8, s2 * 0.38, 1.06, 0, M.metal); }
  rails(pb, -w / 2 - 0.02, w / 2 + 0.02);
  pb.box(0.6, 0.1, 0.5, 0, 0.98, 0, M.steel);
  // 品牌铭牌条
  pb.boxC(0.32, 0.05, 0.005, -0.5, 0.85, d / 2 + 0.01, M.white);
  monitorArm(pb, w / 2 + 0.05, 0.98, d / 2 - 0.15, { ry: 0.5 });
  estop(pb, -w / 2 + 0.12, 0.8, d / 2 + 0.02);
  const lamps = signalTower(g, -w / 2 + 0.1, 1.65, -d / 2 + 0.12);
  pb.build(g);
  // 钢网（水平）
  const stencil = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.006, 0.72), M.chrome.clone()); stencil.position.set(0, 1.07, 0); g.add(stencil);
  // 刮刀头（动画沿 z 往复）
  const head = new THREE.Group(); const hpb = new PartBuilder();
  hpb.boxC(1.3, 0.08, 0.12, 0, 0, 0, M.blue); hpb.boxC(0.66, 0.06, 0.02, 0, -0.07, 0.03, M.chrome); hpb.boxC(0.66, 0.06, 0.02, 0, -0.07, -0.03, M.chrome);
  hpb.cyl(0.03, 0.12, -0.4, 0.09, 0, M.metal, 10); hpb.cyl(0.03, 0.12, 0.4, 0.09, 0, M.metal, 10);
  hpb.build(head); head.position.set(0, 1.2, 0); g.add(head);
  for (const sx of [-1, 1]) pb.boxC(0.05, 0.05, d - 0.2, sx * 0.68, 1.3, 0, M.darkGray);
  pb.build(g);
  return { group: g, size: { w, h: 1.95, d }, lamps, anim: (t) => { head.position.z = Math.sin(t * 1.3) * 0.28; } };
}

// ---------- SPI / AOI 光学检测机 ----------
export function buildInspector(kind = 'aoi') {
  const g = new THREE.Group(), pb = new PartBuilder();
  const w = kind === 'spi' ? 1.0 : 1.15, d = 1.35;
  pb.box(w, 0.07, d, 0, 0.06, 0, M.graphite);
  pb.box(w, 0.74, d, 0, 0.13, 0, M.white); feet(pb, w, d);
  pb.boxC(w - 0.1, 0.6, 0.012, 0, 0.5, d / 2 + 0.005, M.ivory);
  pb.boxC(0.16, 0.02, 0.02, 0, 0.72, d / 2 + 0.02, M.metal);
  vents(pb, 0, 0.18, d / 2 + 0.012, w * 0.6, 0.12, 4);
  pb.box(w + 0.01, 0.06, d + 0.01, 0, 0.87, 0, kind === 'spi' ? M.cyan : M.blue);
  // 上部检测罩
  const hh = 0.62;
  pb.box(w, hh, 0.06, 0, 0.93, -d / 2 + 0.03, M.white);
  for (const sx of [-1, 1]) pb.box(0.05, hh, d, sx * (w / 2 - 0.025), 0.93, 0, M.white);
  pb.add(new THREE.BoxGeometry(w - 0.1, hh - 0.06, 0.01), kind === 'aoi' ? M.glassTint : M.glass, 0, 0.93 + hh / 2, d / 2 - 0.04, -0.1, 0, 0);
  pb.add(roundedBoxGeo(w, 0.1, d, 0.05), M.ivory, 0, 0.93 + hh + 0.05, 0, Math.PI / 2, 0, 0);
  // 顶部相机舱
  pb.box(w * 0.55, 0.14, d * 0.45, 0, 0.93 + hh + 0.1, -0.1, M.gray);
  vents(pb, 0, 0.93 + hh + 0.12, -0.1 + d * 0.225 + 0.003, w * 0.4, 0.1, 3);
  rails(pb, -w / 2 - 0.02, w / 2 + 0.02);
  monitorArm(pb, -w / 2 + 0.25, 0.93, d / 2 + 0.05, { ry: 0, armH: 0.25 });
  estop(pb, w / 2 - 0.12, 0.8, d / 2 + 0.02); handle(pb, w / 2 - 0.15, 0.5, d / 2 + 0.02);
  pb.boxC(w * 0.5, 0.05, 0.006, 0, 1.0, d / 2 - 0.02, M.navy);
  const lamps = signalTower(g, w / 2 - 0.1, 0.93 + hh + 0.1, -d / 2 + 0.12);
  pb.build(g);
  // 内部 XY 相机龙门
  const gantry = new THREE.Group(), gp = new PartBuilder();
  gp.boxC(w - 0.14, 0.06, 0.08, 0, 0, 0, M.graphite);
  const cam = new THREE.Group(), cp = new PartBuilder();
  cp.boxC(0.12, 0.18, 0.12, 0, -0.08, 0.06, M.darkGray); cp.cyl(0.04, 0.06, 0, -0.2, 0.06, M.black, 16);
  cp.add(new THREE.TorusGeometry(0.06, 0.01, 6, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: kind === 'aoi' ? 0x7fd3ff : 0x9cffd9, emissiveIntensity: 1.2 }), 0, -0.24, 0.06, Math.PI / 2, 0, 0);
  cp.build(cam); gantry.add(cam); gp.build(gantry);
  gantry.position.set(0, 1.35, 0); g.add(gantry);
  return { group: g, size: { w, h: 1.85, d }, lamps, anim: (t) => { gantry.position.z = Math.sin(t * 0.9) * 0.35; cam.position.x = Math.sin(t * 2.1) * (w / 2 - 0.2); } };
}

// ---------- 贴片机（NXT 模组式：多模组共用底座）----------
export function buildMounter({ modules = 4, style = 'nxt' } = {}) {
  if (style === 'yamaha') return buildMounterYamaha();
  const g = new THREE.Group(), pb = new PartBuilder();
  const modW = modules >= 4 ? 0.38 : 0.72, w = modW * modules + 0.06, d = 1.9;
  // 底座
  pb.box(w, 0.08, d - 0.5, 0, 0.05, 0, M.graphite);
  pb.box(w, 0.66, d - 0.5, 0, 0.13, 0, M.ivory); feet(pb, w, d - 0.5);
  pb.box(w + 0.01, 0.05, d - 0.48, 0, 0.79, 0, M.darkGray);
  const anims = [];
  for (let m = 0; m < modules; m++) {
    const mx = -w / 2 + 0.03 + modW * (m + 0.5);
    // 模组上部：机身 + 透明上盖
    pb.box(modW - 0.02, 0.2, d - 0.55, mx, 0.84, 0, M.white);
    pb.boxC(modW - 0.03, 0.012, 0.01, mx, 0.95, (d - 0.55) / 2 + 0.002, M.blue);
    pb.add(new THREE.BoxGeometry(modW - 0.04, 0.42, d - 0.62), M.glass, mx, 1.25, 0);
    pb.frame(modW - 0.03, 0.42, d - 0.62, mx, 1.25, -(d - 0.62) / 2, 0.025, M.gray);
    pb.frame(modW - 0.03, 0.42, 0.001, mx, 1.25, (d - 0.62) / 2 - 0.001, 0.025, M.gray);
    pb.add(roundedBoxGeo(modW - 0.02, 0.08, d - 0.55, 0.03), M.white, mx, 1.5, 0, Math.PI / 2, 0, 0);
    pb.box(modW * 0.5, 0.05, 0.25, mx, 1.54, -0.15, M.gray);
    // 模组操作屏
    pb.add(new THREE.BoxGeometry(Math.min(0.24, modW - 0.1), 0.16, 0.025), M.graphite, mx, 1.12, (d - 0.55) / 2 + 0.04, -0.35, 0, 0);
    pb.add(new THREE.BoxGeometry(Math.min(0.21, modW - 0.13), 0.13, 0.005), M.screen, mx, 1.12, (d - 0.55) / 2 + 0.055, -0.35, 0, 0);
    // XY 龙门 + 贴装头（可动）
    const gantry = new THREE.Group(), gp = new PartBuilder();
    gp.boxC(modW - 0.06, 0.05, 0.07, 0, 0, 0, M.graphite);
    const head = new THREE.Group(), hp = new PartBuilder();
    hp.boxC(0.09, 0.14, 0.1, 0, -0.06, 0.06, M.blue);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; hp.cyl(0.006, 0.09, Math.cos(a) * 0.03, -0.17, 0.06 + Math.sin(a) * 0.03, M.chrome, 6); }
    hp.cyl(0.04, 0.03, 0, -0.14, 0.06, M.darkGray, 16);
    hp.build(head); gantry.add(head); gp.build(gantry);
    gantry.position.set(mx, 1.38, 0); g.add(gantry);
    const ph = m * 1.7;
    anims.push(t => { gantry.position.z = Math.sin(t * 2.4 + ph) * 0.42; head.position.x = Math.sin(t * 3.1 + ph) * (modW / 2 - 0.08); head.position.y = Math.max(0, Math.sin(t * 9 + ph)) * -0.03; });
    // 前后供料器（Feeder 车 + 料盘）
    for (const sz of [-1, 1]) {
      const fz = sz * ((d - 0.5) / 2 + 0.2);
      pb.box(modW - 0.03, 0.62, 0.34, mx, 0.16, fz, M.gray); // 供料车
      pb.box(modW - 0.03, 0.05, 0.36, mx, 0.1, fz, M.darkGray);
      for (const wx of [-1, 1]) pb.cyl(0.035, 0.03, mx + wx * (modW / 2 - 0.06), 0.05, fz + sz * 0.12, M.black, 12, 0, 0, Math.PI / 2);
      const nF = Math.round((modW - 0.04) / 0.042);
      for (let f = 0; f < nF; f++) {
        const fx = mx - (modW - 0.04) / 2 + 0.021 + f * 0.042;
        pb.add(new THREE.BoxGeometry(0.03, 0.12, 0.42), f % 2 ? M.darkGray : M.graphite, fx, 0.86, fz - sz * 0.04, sz * 0.12, 0, 0);
        pb.cyl(0.085, 0.022, fx, 0.66, fz + sz * 0.2, REEL_MATS[(f + m) % REEL_MATS.length], 18, 0, 0, Math.PI / 2);
        pb.cyl(0.02, 0.026, fx, 0.66, fz + sz * 0.2, M.white, 8, 0, 0, Math.PI / 2);
      }
    }
  }
  rails(pb, -w / 2 - 0.03, w / 2 + 0.03);
  const lamps = signalTower(g, w / 2 - 0.08, 1.56, -0.25);
  pb.build(g);
  return { group: g, size: { w, h: 1.85, d: d + 0.25 }, lamps, anim: t => anims.forEach(f => f(t)) };
}
// 整机式高速贴片机（仿 Yamaha 风格：白色机身 + 蓝色饰带 + 大视窗）
function buildMounterYamaha() {
  const g = new THREE.Group(), pb = new PartBuilder();
  const w = 1.45, d = 1.75;
  pb.box(w, 0.08, d - 0.4, 0, 0.05, 0, M.graphite);
  pb.box(w, 0.72, d - 0.4, 0, 0.13, 0, M.white); feet(pb, w, d - 0.4);
  pb.boxC(w + 0.005, 0.12, d - 0.39, 0, 0.62, 0, M.blue);
  pb.add(roundedBoxGeo(w, 0.55, d - 0.4, 0.08), M.white, 0, 1.12, 0, 0, 0, 0);
  // 大视窗（前/后）
  for (const sz of [-1, 1]) {
    pb.boxC(w - 0.3, 0.36, 0.01, 0, 1.14, sz * ((d - 0.4) / 2 + 0.023), M.glassTint);
    pb.frame(w - 0.28, 0.38, 0.001, 0, 1.14, sz * ((d - 0.4) / 2 + 0.02) - 0.001, 0.02, M.gray);
  }
  pb.box(w - 0.1, 0.1, d - 0.5, 0, 1.4, 0, M.ivory);
  pb.boxC(0.5, 0.06, 0.006, -0.35, 0.95, (d - 0.4) / 2 + 0.03, M.navy);
  for (const sz of [-1, 1]) {
    const fz = sz * ((d - 0.4) / 2 + 0.18);
    pb.box(w - 0.1, 0.58, 0.3, 0, 0.16, fz, M.gray);
    for (let f = 0; f < 30; f++) {
      const fx = -(w - 0.16) / 2 + 0.022 + f * 0.044;
      pb.add(new THREE.BoxGeometry(0.032, 0.1, 0.38), M.graphite, fx, 0.82, fz - sz * 0.03, sz * 0.12, 0, 0);
      pb.cyl(0.08, 0.02, fx, 0.62, fz + sz * 0.17, REEL_MATS[f % 5], 18, 0, 0, Math.PI / 2);
    }
  }
  monitorArm(pb, -w / 2 + 0.2, 1.47, 0.35, { ry: 0, armH: 0.08, keyboard: false });
  rails(pb, -w / 2 - 0.03, w / 2 + 0.03);
  const lamps = signalTower(g, w / 2 - 0.12, 1.5, -0.3);
  pb.build(g);
  return { group: g, size: { w, h: 1.9, d }, lamps, anim: () => {} };
}

// ---------- 回流焊炉（十温区 + 两冷却区）----------
export const REFLOW_ZONES = 12;
export function buildReflow() {
  const g = new THREE.Group(), pb = new PartBuilder();
  const w = 5.6, d = 1.5, x0 = -w / 2 + 0.75, zoneW = (w - 1.5) / REFLOW_ZONES, hoodY = 0.96;
  // 底架、地脚、下机柜（检修门 + 把手 + 格栅）
  pb.box(w, 0.08, d, 0, 0.06, 0, M.graphite); feet(pb, w, d, 0.12);
  pb.box(w - 0.04, 0.66, d - 0.12, 0, 0.14, 0, M.darkGray);
  const nDoor = 7, doorW = (w - 1.6) / nDoor;
  for (let i = 0; i < nDoor; i++) {
    const x = x0 + (i + 0.5) * doorW;
    pb.boxC(doorW - 0.04, 0.56, 0.012, x, 0.45, (d - 0.12) / 2 + 0.006, M.midGray);
    vents(pb, x, 0.2, (d - 0.12) / 2 + 0.013, doorW - 0.18, 0.14, 4, M.graphite);
    handle(pb, x + doorW / 2 - 0.08, 0.5, (d - 0.12) / 2 + 0.02);
  }
  // 炉膛下半体 + 蓝色饰带
  pb.box(w - 1.5, 0.16, d, x0 + (w - 1.5) / 2, 0.78, 0, M.gray);
  pb.boxC(w - 1.5, 0.05, 0.01, x0 + (w - 1.5) / 2, 0.86, d / 2 + 0.005, M.blue);
  pb.box(w - 1.5, 0.018, d + 0.02, x0 + (w - 1.5) / 2, 0.94, 0, M.graphite); // 炉盖分合缝
  // 上炉盖：逐温区圆角盖板 + 顶部热风马达 + 温区显示
  for (let i = 0; i < REFLOW_ZONES; i++) {
    const zx = x0 + (i + 0.5) * zoneW, cool = i >= REFLOW_ZONES - 2;
    pb.add(roundedBoxGeo(zoneW - 0.012, 0.34, d - 0.02, 0.04), cool ? M.ivory : M.white, zx, hoodY + 0.19, 0);
    pb.boxC(zoneW - 0.05, 0.012, d - 0.08, zx, hoodY + 0.37, 0, M.gray);
    if (!cool) { // 热风循环马达（每温区一台）
      pb.box(zoneW * 0.62, 0.035, 0.42, zx, hoodY + 0.375, -0.05, M.midGray);
      pb.cyl(0.075, 0.2, zx, hoodY + 0.51, -0.05, M.navy, 18);
      pb.cyl(0.08, 0.02, zx, hoodY + 0.62, -0.05, M.steel, 18);
      for (let k = 0; k < 6; k++) pb.boxC(0.004, 0.16, 0.16, zx + Math.cos(k) * 0.0, hoodY + 0.51, -0.05, M.darkGray, 0, k * 0.52, 0);
      pb.box(0.09, 0.06, 0.05, zx + 0.07, hoodY + 0.39, 0.2, M.graphite); // 接线盒
    } else { // 冷却区：前侧风扇格栅
      pb.add(new THREE.TorusGeometry(0.1, 0.01, 6, 24), M.darkGray, zx, hoodY + 0.2, d / 2 + 0.01);
      pb.add(new THREE.TorusGeometry(0.06, 0.008, 6, 20), M.darkGray, zx, hoodY + 0.2, d / 2 + 0.01);
      pb.boxC(0.2, 0.012, 0.006, zx, hoodY + 0.2, d / 2 + 0.012, M.darkGray); pb.boxC(0.012, 0.2, 0.006, zx, hoodY + 0.2, d / 2 + 0.012, M.darkGray);
    }
    pb.boxC(0.1, 0.04, 0.006, zx, hoodY + 0.3, d / 2 + 0.003, M.graphite); // 温区编号牌
  }
  // 炉盖顶升气撑（两侧）
  for (const sx of [x0 + 0.3, x0 + (w - 1.5) - 0.3]) for (const sz of [-1, 1]) pb.add(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 8), M.chrome, sx, hoodY + 0.08, sz * (d / 2 + 0.02), 0, 0, 0.5);
  // 入口控制端：电脑柜 + 观察窗 + 急停
  const ex = -w / 2 + 0.37;
  pb.box(0.72, 0.6, d - 0.12, ex, 0.14, 0, M.white);
  pb.add(roundedBoxGeo(0.74, 0.5, d - 0.1, 0.05), M.white, ex, hoodY - 0.02 + 0.25, 0);
  pb.boxC(0.5, 0.22, 0.01, ex, hoodY + 0.25, (d - 0.1) / 2 + 0.008, M.glassTint);
  pb.boxC(0.6, 0.12, 0.01, ex, 0.62, (d - 0.12) / 2 + 0.006, M.navy);
  estop(pb, ex + 0.28, 0.9, (d - 0.1) / 2 + 0.01);
  handle(pb, ex + 0.25, 0.4, (d - 0.12) / 2 + 0.015);
  // 出口端：冷却机柜 + 观察窗
  const ox = w / 2 - 0.37;
  pb.box(0.72, 0.6, d - 0.12, ox, 0.14, 0, M.white);
  pb.add(roundedBoxGeo(0.74, 0.5, d - 0.1, 0.05), M.ivory, ox, hoodY - 0.02 + 0.25, 0);
  pb.boxC(0.5, 0.22, 0.01, ox, hoodY + 0.25, (d - 0.1) / 2 + 0.008, M.glassTint);
  vents(pb, ox, 0.25, (d - 0.12) / 2 + 0.006, 0.5, 0.3, 6);
  estop(pb, ox - 0.28, 0.9, (d - 0.1) / 2 + 0.01);
  // 排风烟囱 + 弯头 + 法兰
  for (const sx of [x0 + 0.9, x0 + (w - 1.5) - 1.0]) {
    pb.cyl(0.1, 0.5, sx, hoodY + 0.64, -0.5, M.metal, 22); pb.cyl(0.12, 0.04, sx, hoodY + 0.4, -0.5, M.steel, 22);
    pb.cyl(0.1, 0.45, sx, hoodY + 0.95, -0.32, M.metal, 22, Math.PI / 2.6, 0, 0); pb.cyl(0.12, 0.04, sx, hoodY + 1.05, -0.12, M.steel, 22, Math.PI / 2.6, 0, 0);
  }
  // 顶部氮气 / 冷却水管路
  pb.cyl(0.02, w - 1.7, x0 + (w - 1.5) / 2, hoodY + 0.42, -0.66, M.chrome, 10, 0, 0, Math.PI / 2);
  pb.cyl(0.016, w - 1.7, x0 + (w - 1.5) / 2, hoodY + 0.42, -0.6, M.copper, 10, 0, 0, Math.PI / 2);
  // 线缆槽（背侧）
  pb.boxC(w - 1.6, 0.08, 0.1, 0, 0.7, -d / 2 - 0.04, M.gray);
  // 进出口导轨与隧道口发光
  rails(pb, -w / 2 - 0.05, w / 2 + 0.05);
  pb.boxC(0.02, 0.07, 0.34, x0 - 0.01, PCB_Y + 0.02, 0, M.heatGlow);
  pb.boxC(0.02, 0.07, 0.34, x0 + (w - 1.5) + 0.01, PCB_Y + 0.02, 0, M.heatGlow);
  monitorArm(pb, ex, hoodY + 0.48, 0.3, { ry: 0, armH: 0.2 });
  const lamps = signalTower(g, ex - 0.25, hoodY + 0.48, -d / 2 + 0.2);
  pb.build(g);
  // 侧面温区色带（独立网格，可按温度更新颜色）
  const zoneStrips = [];
  for (let i = 0; i < REFLOW_ZONES; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(zoneW - 0.05, 0.03, 0.008), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8 }));
    m.position.set(x0 + (i + 0.5) * zoneW, hoodY + 0.06, d / 2 + 0.006); g.add(m); zoneStrips.push(m);
  }
  return { group: g, size: { w, h: 2.1, d }, lamps, zoneStrips, zoneX: i => x0 + (i + 0.5) * zoneW };
}
// 温区温度 → 颜色（蓝→黄→橙红）
export function tempColor(T) {
  const c = new THREE.Color(); const k = Math.min(1, Math.max(0, (T - 40) / 220));
  c.setHSL(0.6 - 0.6 * k, 0.85, 0.5); return c;
}
