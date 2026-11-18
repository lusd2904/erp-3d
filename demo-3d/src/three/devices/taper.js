// src/three/devices/taper.js
// 片式元件编带机 / 全自动转盘式测试编带机（Turret Test & Taping Machine）
import * as THREE from 'three';
import { M, lampMat, statusColor } from '../materials.js';
import { PartBuilder, roundedBoxGeo, textTexture } from '../builder.js';
import { signalTower, applyLamps, statusRing, setRingStatus, feet, vents, estop, handle } from '../common.js';

export const meta = {
  type: 'taper',
  name: '片式元件编带机',
  refs: [
    'Hon Precision / 台湾万润 全自动转盘式测试编带机',
    'SMD Turret Test & Taping Machine — 碗式振动盘 + 转盘测试 + 热封编带',
    '通用国产转盘式编带机结构参考（振动盘→直振轨→转盘测试→载带→封带→收料卷）',
  ],
  size: { w: 1.60, d: 1.00, h: 1.70 },
};

// ─── 整机关键尺寸 ────────────────────────────────────────────────
const W = 1.60;
const D = 1.00;
const H = 1.70;

const BASE_H     = 0.12;
const TABLE_H    = 0.90;
const BELT_H     = 0.04;
const BELT_BEVEL = 0.02;
const UPPER_H    = H - TABLE_H - BELT_H;
const UPPER_TOP  = TABLE_H + BELT_H + UPPER_H;

// 振动盘
const BOWL_R     = 0.16;
const BOWL_H     = 0.14;
const BOWL_BASE_H = 0.05;
const BOWL_X     = -W / 2 + 0.28;
const BOWL_Z     = -D / 2 + 0.22;
const BOWL_BOTTOM_Y = TABLE_H + BOWL_BASE_H;
const BOWL_CENTER_Y = BOWL_BOTTOM_Y + BOWL_H / 2;

// 直振轨
const TRACK_W    = 0.042;
const TRACK_H    = 0.022;
const TRACK_Y    = TABLE_H + TRACK_H / 2;
const TRACK_Z    = BOWL_Z;
const TRACK_X1   = BOWL_X + BOWL_R + 0.015;
const TRACK_X2   = -0.05;

// 转盘
const TURRET_R   = 0.20;
const TURRET_H   = 0.05;
const TURRET_POST_H = 0.12;
const TURRET_Y   = TABLE_H + TURRET_POST_H + TURRET_H / 2;
const TURRET_X   = 0.15;
const TURRET_Z   = 0.0;
const STATION_COUNT = 12;
const NOZZLE_R   = 0.007;
const NOZZLE_H   = 0.045;
const NOZZLE_CIRCLE_R = TURRET_R - 0.025;
const TEST_STATION_R = NOZZLE_CIRCLE_R;

// 载带与封带头
const TAPE_W     = 0.024;
const TAPE_H     = 0.003;
const TAPE_Y     = TABLE_H + TAPE_H / 2;
const TAPE_Z     = TURRET_Z + TURRET_R + 0.025;
const TAPE_X1    = TURRET_X + TURRET_R + 0.02;
const TAPE_X2    = 0.0;
const SEAL_W     = 0.07;
const SEAL_H     = 0.05;
const SEAL_D     = 0.06;
const SEAL_X     = TAPE_X2;
const SEAL_Y     = TABLE_H + TAPE_H + SEAL_H / 2 + 0.005;
const SEAL_Z     = TAPE_Z;

// 收料卷盘
const REEL_R     = 0.15;
const REEL_W     = 0.036;
const plateZ     = D / 2 + 0.033;
const REEL_Z     = plateZ + 0.012 + REEL_W / 2 + 0.01;
const REEL_X     = TAPE_X2;
const REEL_Y     = TAPE_Y + REEL_R;

// 上罩玻璃
const GLASS_THK  = 0.006;
const FRAME_T    = 0.022;

// ─── 局部材质 ────────────────────────────────────────────────────
const matFrame   = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.45, metalness: 0.30 });
const matBowl    = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.35, metalness: 0.15, side: THREE.DoubleSide });
const matBowlBase= new THREE.MeshStandardMaterial({ color: 0x8e99a6, roughness: 0.5, metalness: 0.2 });
const matTrack   = new THREE.MeshStandardMaterial({ color: 0xb8c4cf, roughness: 0.30, metalness: 0.75 });
const matTurret  = new THREE.MeshStandardMaterial({ color: 0xe6e9ee, roughness: 0.40, metalness: 0.15 });
const matNozzle  = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.25, metalness: 0.85 });
const matStation = new THREE.MeshStandardMaterial({ color: 0x1d3f72, roughness: 0.4, metalness: 0.2 });
const matTape    = new THREE.MeshStandardMaterial({ color: 0x1d2127, roughness: 0.85, metalness: 0.05 });
const matSeal    = new THREE.MeshStandardMaterial({ color: 0x8f9aa6, roughness: 0.30, metalness: 0.80 });
const matReel    = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.40, metalness: 0.10 });
const matReelFlg = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.42, metalness: 0.05 });
const matHeat    = new THREE.MeshStandardMaterial({ color: 0xff7a3d, roughness: 0.4, metalness: 0.1, emissive: 0xff5a1f, emissiveIntensity: 0.6 });
const matCable   = new THREE.MeshStandardMaterial({ color: 0x1d2127, roughness: 0.90, metalness: 0.00 });
const matSpiral  = new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.5, metalness: 0.1 });

// ─── 螺旋轨道段（振动盘内壁，相对碗中心坐标）────────────────────
function buildSpiralTrackRelative(pb, r, h, turns = 2.3, segs = 28) {
  const pieceH = 0.006;
  const pieceW = 0.01;
  const pieceD = r * 0.25;
  for (let t = 0; t < turns; t++) {
    for (let i = 0; i < segs; i++) {
      const k = (t + i / segs) / turns;
      if (k > 1) continue;
      const ang = (t + i / segs) * Math.PI * 2;
      const rr  = r - 0.008 - pieceD / 2;
      const y   = 0.01 + k * h;
      const x   = rr * Math.cos(ang);
      const z   = rr * Math.sin(ang);
      const ry  = ang + Math.PI / 2;
      pb.boxC(pieceW, pieceH, pieceD, x, y, z, matSpiral, 0, ry, 0);
    }
  }
}

// ─── 转盘组（独立 Group，run 时绕 Y 转）──────────────────────────
function buildTurretGroup() {
  const g = new THREE.Group();
  g.name = 'turret';
  const pb = new PartBuilder();

  pb.cyl(TURRET_R, TURRET_H, 0, TURRET_H / 2, 0, matTurret, 32);
  pb.cyl(0.025, TURRET_H + 0.01, 0, TURRET_H / 2, 0, matFrame, 16, 0, 0, 0, 0.02);
  for (let i = 0; i < STATION_COUNT; i++) {
    const ang = (i / STATION_COUNT) * Math.PI * 2;
    const nx = NOZZLE_CIRCLE_R * Math.cos(ang);
    const nz = NOZZLE_CIRCLE_R * Math.sin(ang);
    pb.cyl(NOZZLE_R, NOZZLE_H, nx, -NOZZLE_H / 2, nz, matNozzle, 10);
  }
  pb.cyl(TURRET_R + 0.003, 0.005, 0, TURRET_H + 0.0025, 0, matFrame, 32, 0, 0, 0, TURRET_R + 0.001);

  pb.build(g, { cloneMaterials: false });
  g.position.y = -TURRET_H / 2;
  return g;
}

// ─── 收料卷盘组（独立 Group，run 时绕 Z 轴转）─────────────────────
function buildReelWinderGroup() {
  const g = new THREE.Group();
  g.name = 'reelWinder';
  const pb = new PartBuilder();

  pb.cyl(REEL_R, REEL_W, 0, 0, 0, matReel, 24, Math.PI / 2, 0, 0);
  pb.cyl(REEL_R + 0.012, 0.005, 0, 0, REEL_W / 2 + 0.0025, matReelFlg, 24, Math.PI / 2, 0, 0);
  pb.cyl(REEL_R + 0.012, 0.005, 0, 0, -REEL_W / 2 - 0.0025, matReelFlg, 24, Math.PI / 2, 0, 0);
  pb.cyl(0.01, REEL_W + 0.01, 0, 0, 0, matFrame, 12, Math.PI / 2, 0, 0);

  pb.build(g, { cloneMaterials: false });
  return g;
}

// ─── 振动盘碗体组（独立 Group，run 时高频微震）───────────────────
function buildBowlGroup() {
  const g = new THREE.Group();
  g.name = 'bowl';
  const pb = new PartBuilder();

  // 碗壁（开口圆柱，相对碗中心）
  pb.add(
    new THREE.CylinderGeometry(BOWL_R, BOWL_R * 0.85, BOWL_H, 28, 1, true),
    matBowl,
    0, BOWL_H / 2, 0
  );
  // 碗口翻边环
  pb.add(
    new THREE.TorusGeometry(BOWL_R + 0.004, 0.006, 6, 28),
    matFrame,
    0, BOWL_H + 0.004, 0,
    Math.PI / 2, 0, 0
  );
  // 螺旋轨道（相对碗中心，底部留 0.01 间隙）
  buildSpiralTrackRelative(pb, BOWL_R - 0.02, BOWL_H - 0.02, 2.3, 28); // [人工修改] 半径 -0.01→-0.02，避免底部薄片穿出锥形碗壁

  pb.build(g, { cloneMaterials: false });
  // 组原点在碗底中心（碗壁底面 y=0）
  return g;
}

// ─── 收料卷盘支撑架（静态，从下机柜正面立起）────────────────────
function buildReelSupport(pb) {
  const plateBottomY = 0.60;
  const plateTopY = TAPE_Y + REEL_R + 0.04;
  const plateH = plateTopY - plateBottomY;
  const plateY = plateBottomY + plateH / 2;

  pb.boxC(0.30, plateH, 0.012, 0, plateY, plateZ, matFrame);

  const bracketY = plateBottomY + 0.025;
  const bracketZ = D / 2 + 0.0135;
  pb.boxC(0.04, 0.05, 0.027, -0.11, bracketY, bracketZ, matFrame);
  pb.boxC(0.04, 0.05, 0.027,  0.11, bracketY, bracketZ, matFrame);

  const armY = TAPE_Y + REEL_R;
  pb.boxC(0.08, 0.04, 0.06, 0, armY, plateZ + 0.006, matFrame);

  pb.boxC(0.025, 0.045, 0.03, 0, armY, plateZ + 0.006 + REEL_W / 2 + 0.01, matFrame);
  pb.boxC(0.025, 0.045, 0.03, 0, armY, plateZ + 0.006 - REEL_W / 2 - 0.01, matFrame);
}

// ─── 封带头──────────────────────────────────────────────────────
function buildSealingHead(pb) {
  pb.boxC(SEAL_W, SEAL_H, SEAL_D, SEAL_X, SEAL_Y, SEAL_Z, matSeal);
  pb.boxC(SEAL_W * 0.7, 0.012, SEAL_D * 0.5, SEAL_X, SEAL_Y - SEAL_H / 2 - 0.006, SEAL_Z, matHeat);
  pb.boxC(0.018, 0.035, 0.025, SEAL_X - SEAL_W / 2 - 0.009, SEAL_Y, SEAL_Z, matFrame);
  pb.boxC(0.018, 0.035, 0.025, SEAL_X + SEAL_W / 2 + 0.009, SEAL_Y, SEAL_Z, matFrame);
}

// ─── 测试站──────────────────────────────────────────────────────
function buildTestStations(pb) {
  const count = 4;
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + Math.PI / 4;
    const x = TURRET_X + TEST_STATION_R * Math.cos(ang);
    const z = TURRET_Z + TEST_STATION_R * Math.sin(ang);
    pb.boxC(0.035, 0.06, 0.04, x, TABLE_H + 0.03, z, matStation);
    pb.cyl(0.006, 0.015, x, TABLE_H + 0.068, z, M.cyan, 8);
  }
}

// ─── 主构建函数 ─────────────────────────────────────────────────
export function build(device) {
  const group = new THREE.Group();
  group.name = device.id;

  const pb = new PartBuilder();

  // ══════════════════════════════════════════════════════════════
  // A. 底座与下机柜（白色圆角 + 青色腰线）
  // ══════════════════════════════════════════════════════════════
  pb.add(roundedBoxGeo(W, BASE_H, D, 0.04), M.gray, 0, BASE_H / 2, 0);
  feet(pb, W, D, 0.08);

  const beltCenterY = TABLE_H - BELT_H / 2 - BELT_BEVEL;
  const lowerH = beltCenterY - BASE_H - BELT_H / 2;
  const lowerY = BASE_H + lowerH / 2;
  pb.add(roundedBoxGeo(W - 0.04, lowerH, D - 0.04, 0.04), M.white, 0, lowerY, 0);

  pb.add(roundedBoxGeo(W + 0.01, BELT_H, D + 0.01, 0.02), M.cyan, 0, beltCenterY, 0);

  const doorZ = D / 2 - 0.02;
  pb.boxC(W - 0.12, 0.006, 0.006, 0, lowerY, doorZ, M.gray);
  pb.boxC(W - 0.12, 0.006, 0.006, 0, lowerY - lowerH * 0.4, doorZ, M.gray);
  handle(pb, -0.18, lowerY - lowerH * 0.2, doorZ + 0.008, 0.10);
  handle(pb,  0.18, lowerY - lowerH * 0.2, doorZ + 0.008, 0.10);
  vents(pb, 0, BASE_H + 0.04, doorZ + 0.006, W - 0.2, 0.25, 6, M.darkGray, 'z');
  vents(pb, -W / 2 + 0.005, BASE_H + 0.05, 0, 0.28, lowerH - 0.1, 7, M.darkGray, 'x');

  // ══════════════════════════════════════════════════════════════
  // B. 台面机构
  // ══════════════════════════════════════════════════════════════

  // —— 振动盘底座（静态）——
  const bowlBaseY = TABLE_H + BOWL_BASE_H / 2;
  pb.cyl(BOWL_R + 0.015, BOWL_BASE_H, BOWL_X, bowlBaseY, BOWL_Z, matBowlBase, 16);

  // —— 直振送料轨 ——
  const trackLen = TRACK_X2 - TRACK_X1;
  const trackCx = TRACK_X1 + trackLen / 2;
  pb.boxC(trackLen, TRACK_H, TRACK_W, trackCx, TRACK_Y, TRACK_Z, matTrack);
  pb.boxC(trackLen, 0.01, 0.003, trackCx, TRACK_Y + TRACK_H / 2 + 0.005, TRACK_Z - TRACK_W / 2 - 0.0015, M.darkGray);
  pb.boxC(trackLen, 0.01, 0.003, trackCx, TRACK_Y + TRACK_H / 2 + 0.005, TRACK_Z + TRACK_W / 2 + 0.0015, M.darkGray);
  pb.boxC(0.055, 0.028, 0.045, TRACK_X1 - 0.0275, TRACK_Y, TRACK_Z, matTrack);

  // —— 转盘安装座（静态立柱） ——
  const postY = TABLE_H + TURRET_POST_H / 2;
  pb.cyl(TURRET_R + 0.015, 0.018, TURRET_X, TABLE_H + 0.009, TURRET_Z, M.gray, 32);
  pb.cyl(0.035, TURRET_POST_H, TURRET_X, postY, TURRET_Z, matFrame, 16);

  // —— 载带水平导轨（转盘出口 → 封带头）——
  const tapeLen1 = TAPE_X2 - TAPE_X1;
  if (tapeLen1 > 0) {
    pb.boxC(tapeLen1, 0.007, TAPE_W + 0.005, TAPE_X1 + tapeLen1 / 2, TABLE_H + 0.0035, TAPE_Z, M.darkGray);
    pb.boxC(tapeLen1, 0.01, 0.003, TAPE_X1 + tapeLen1 / 2, TABLE_H + 0.012, TAPE_Z - TAPE_W / 2 - 0.0015, M.gray);
    pb.boxC(tapeLen1, 0.01, 0.003, TAPE_X1 + tapeLen1 / 2, TABLE_H + 0.012, TAPE_Z + TAPE_W / 2 + 0.0015, M.gray);
    pb.boxC(tapeLen1, TAPE_H, TAPE_W, TAPE_X1 + tapeLen1 / 2, TAPE_Y, TAPE_Z, matTape);
  }

  // —— 封带头 ——
  buildSealingHead(pb);

  // —— 载带继续向前穿出正面罩，直达收料卷盘 ——
  const tapeLen2 = REEL_Z - TAPE_Z;
  if (tapeLen2 > 0) {
    const cx2 = REEL_X;
    const cz2 = TAPE_Z + tapeLen2 / 2;
    pb.boxC(TAPE_W, 0.007, tapeLen2, cx2, TABLE_H + 0.0035, cz2, M.darkGray);
    pb.boxC(TAPE_W, TAPE_H, tapeLen2, cx2, TAPE_Y, cz2, matTape);
  }

  // —— 测试站 ——
  buildTestStations(pb);

  // —— 线缆槽 ——
  pb.boxC(W - 0.2, 0.025, 0.035, 0, TABLE_H + 0.012, -D / 2 + 0.05, M.gray);

  // —— 收料卷盘支架（含水平轴） ——
  buildReelSupport(pb);
  const shaftZLen = REEL_Z - (plateZ + 0.012);
  if (shaftZLen > 0) {
    pb.cyl(0.01, shaftZLen, REEL_X, REEL_Y, plateZ + 0.012 + shaftZLen / 2, matFrame, 12, Math.PI / 2, 0, 0);
  }

  // ══════════════════════════════════════════════════════════════
  // C. 上罩：细金属框 + 透明玻璃（前板留槽口给载带）
  // ══════════════════════════════════════════════════════════════
  const frameH = UPPER_H - 0.02;
  const frameY = TABLE_H + BELT_H + frameH / 2;

  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    pb.boxC(FRAME_T, frameH, FRAME_T,
      sx * (W / 2 - FRAME_T / 2), frameY, sz * (D / 2 - FRAME_T / 2), matFrame);
  }
  pb.boxC(W - 0.02, FRAME_T, FRAME_T, 0, UPPER_TOP - FRAME_T / 2,  D / 2 - FRAME_T / 2, matFrame);
  pb.boxC(W - 0.02, FRAME_T, FRAME_T, 0, UPPER_TOP - FRAME_T / 2, -D / 2 + FRAME_T / 2, matFrame);
  pb.boxC(FRAME_T, FRAME_T, D - 0.02,  W / 2 - FRAME_T / 2, UPPER_TOP - FRAME_T / 2, 0, matFrame);
  pb.boxC(FRAME_T, FRAME_T, D - 0.02, -W / 2 + FRAME_T / 2, UPPER_TOP - FRAME_T / 2, 0, matFrame);
  const midY = TABLE_H + BELT_H + FRAME_T / 2;
  pb.boxC(W - 0.02, FRAME_T, FRAME_T, 0, midY,  D / 2 - FRAME_T / 2, matFrame);
  pb.boxC(W - 0.02, FRAME_T, FRAME_T, 0, midY, -D / 2 + FRAME_T / 2, matFrame);
  pb.boxC(FRAME_T, FRAME_T, D - 0.02,  W / 2 - FRAME_T / 2, midY, 0, matFrame);
  pb.boxC(FRAME_T, FRAME_T, D - 0.02, -W / 2 + FRAME_T / 2, midY, 0, matFrame);

  const glassH = frameH - FRAME_T * 2 - 0.02;
  const glassY = TABLE_H + BELT_H + FRAME_T + 0.01 + glassH / 2;
  const glassW = W - 0.02 - FRAME_T * 2 - 0.02;
  const glassD = D - 0.02 - FRAME_T * 2 - 0.02;
  const slotH = 0.04;
  const slotY = TABLE_H + 0.02;

  const upperH = glassH / 2 + (glassY - slotY - slotH / 2);
  const upperY = glassY + (glassH - upperH) / 2;
  pb.add(new THREE.BoxGeometry(glassW, upperH, GLASS_THK), M.glass, 0, upperY, D / 2 - FRAME_T - GLASS_THK / 2);
  const glassLowH = glassH - upperH - slotH;
  const glassLowY = glassY - (glassH - glassLowH) / 2;
  pb.add(new THREE.BoxGeometry(glassW, glassLowH, GLASS_THK), M.glass, 0, glassLowY, D / 2 - FRAME_T - GLASS_THK / 2);
  pb.add(new THREE.BoxGeometry(glassW, glassH, GLASS_THK), M.glass, 0, glassY, -D / 2 + FRAME_T + GLASS_THK / 2);
  pb.add(new THREE.BoxGeometry(GLASS_THK, glassH, glassD), M.glass, -W / 2 + FRAME_T + GLASS_THK / 2, glassY, 0);
  pb.add(new THREE.BoxGeometry(GLASS_THK, glassH, glassD), M.glass,  W / 2 - FRAME_T - GLASS_THK / 2, glassY, 0);
  pb.add(new THREE.BoxGeometry(glassW, GLASS_THK, glassD), M.glass, 0, UPPER_TOP - FRAME_T - GLASS_THK / 2, 0);

  // ══════════════════════════════════════════════════════════════
  // D. 操作屏（右侧 +X 罩外，短支臂 + 浅色屏框 + uiPlane）
  // ══════════════════════════════════════════════════════════════
  const monX = W / 2 + 0.06;
  const monY = TABLE_H + BELT_H + 0.35;
  const monZ = -0.1;
  const monArmH = 0.18;
  const monW = 0.28;
  const monH = 0.18;
  const monRy = Math.PI / 2 - 0.5;

  // 短支臂（从罩右侧立柱伸出）
  const s = Math.sin(monRy), c = Math.cos(monRy);
  pb.cyl(0.018, monArmH, monX, monY + monArmH / 2, monZ, matFrame, 10);
  pb.boxC(0.06, 0.05, 0.06, monX, monY + monArmH, monZ, M.gray);
  // 屏框盒子（浅色，matFrame 即浅灰）
  const mx = monX + s * 0.04;
  const mz = monZ + c * 0.04;
  pb.add(new THREE.BoxGeometry(monW + 0.03, monH + 0.03, 0.035), matFrame, mx, monY + monArmH + monH / 2 + 0.02, mz, -0.12, monRy, 0);
  // uiPlane 稍后在屏框前 0.003m 处创建

  // ══════════════════════════════════════════════════════════════
  // E. 急停按钮
  // ══════════════════════════════════════════════════════════════
  estop(pb, 0.35, 0.80, D / 2 + 0.01, 0);

  // ══════════════════════════════════════════════════════════════
  // F. 铭牌
  // ══════════════════════════════════════════════════════════════
  const badgeTex = textTexture('TAPING  编带机', { w: 512, h: 80, color: '#1f2a3d', bg: '#f4f7fb' });
  const badgeMat = new THREE.MeshStandardMaterial({ map: badgeTex, roughness: 0.4, metalness: 0.05 });
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.055), badgeMat);
  badge.position.set(0, 0.65, D / 2 + 0.003);
  group.add(badge);

  // ══════════════════════════════════════════════════════════════
  // G. 合并所有静态部件
  // ══════════════════════════════════════════════════════════════
  pb.build(group);

  // ══════════════════════════════════════════════════════════════
  // H. 运动部件
  // ══════════════════════════════════════════════════════════════

  const turret = buildTurretGroup();
  turret.position.set(TURRET_X, TABLE_H + TURRET_POST_H + TURRET_H / 2, TURRET_Z);
  group.add(turret);

  const reelWinder = buildReelWinderGroup();
  reelWinder.position.set(REEL_X, REEL_Y, REEL_Z);
  group.add(reelWinder);

  // 振动盘碗体组（放在碗底中心位置）
  const bowlGroup = buildBowlGroup();
  bowlGroup.position.set(BOWL_X, BOWL_BOTTOM_Y, BOWL_Z);
  group.add(bowlGroup);
  // 记录基准位置供动画使用
  bowlGroup.userData.baseY = BOWL_BOTTOM_Y;
  bowlGroup.userData.baseRotY = 0;

  // 操作屏界面贴图（屏框前 0.003 m，朝向与屏框一致）
  {
    const cvs = document.createElement('canvas');
    cvs.width = 512; cvs.height = 340;
    const ctx = cvs.getContext('2d');

    // 背景
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(0, 0, 512, 340);

    // 标题栏
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(0, 0, 512, 52);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('编带机 运行监控', 256, 26);

    // 参数行
    ctx.fillStyle = '#1e293b';
    ctx.font = '20px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let ly = 98;
    ctx.fillText('编带速度：  18,000 颗/小时', 40, ly); ly += 40;
    ctx.fillText('良品率：    99.6%', 40, ly); ly += 40;
    ctx.fillText('卷盘计数：  卷盘 12 / 已编 4,860 颗', 40, ly); ly += 50;

    // 进度条
    const bx = 40, by = ly, bw = 432, bh = 24;
    ctx.fillStyle = '#475569';
    ctx.font = '18px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('当前卷进度', bx, by - 10);
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.fill();
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath(); ctx.roundRect(bx, by, bw * 0.81, bh, 4); ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('81%', bx + bw - 4, by - 10);
    ly += 56;

    // 底部状态栏
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 312, 512, 28);
    ctx.fillStyle = '#64748b';
    ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('● 运行中  设备编号: TPR-001  班次: 白班', 256, 326);

    const uiTex = new THREE.CanvasTexture(cvs);
    uiTex.colorSpace = THREE.SRGBColorSpace;
    const uiMat = new THREE.MeshBasicMaterial({ map: uiTex });
    const uiPlane = new THREE.Mesh(new THREE.PlaneGeometry(monW, monH), uiMat);
    // 屏框前表面在 mx + s*0.019 处，再前移 0.003
    const uiX = mx + s * (0.019 + 0.003);
    const uiY = monY + monArmH + monH / 2 + 0.02;
    const uiZ = mz + c * (0.019 + 0.003);
    uiPlane.position.set(uiX, uiY, uiZ);
    uiPlane.rotation.set(-0.12, monRy, 0);
    group.add(uiPlane);
  }

  // ══════════════════════════════════════════════════════════════
  // I. 信号灯塔
  // ══════════════════════════════════════════════════════════════
  const towerX = W / 2 - 0.08;
  const towerZ = -D / 2 + 0.08;
  const towerY = UPPER_TOP;
  const pb2 = new PartBuilder();
  pb2.cyl(0.025, 0.08, towerX, towerY + 0.04, towerZ, matFrame, 12);
  pb2.build(group, { shadow: false });
  group.userData.lamps = signalTower(group, towerX, towerY, towerZ, 0.10);

  // ══════════════════════════════════════════════════════════════
  // J. 状态光环
  // ══════════════════════════════════════════════════════════════
  group.userData.ring = statusRing(W, D);
  group.add(group.userData.ring);

  applyLamps(group.userData.lamps, device.status);
  setRingStatus(group.userData.ring, device.status);

  // ══════════════════════════════════════════════════════════════
  // K. 动画
  // ══════════════════════════════════════════════════════════════
  group.userData.animate = (t, _dt, status) => {
    if (status !== 'run') {
      turret.rotation.y = 0;
      reelWinder.rotation.z = 0;
      bowlGroup.position.y = bowlGroup.userData.baseY;
      bowlGroup.rotation.y = bowlGroup.userData.baseRotY;
      return;
    }
    // 转盘 ~20 RPM
    turret.rotation.y = t * (20 * 2 * Math.PI / 60);
    // 收料卷盘 ~15 RPM
    reelWinder.rotation.z = t * (15 * 2 * Math.PI / 60);
    // 振动盘碗体高频微震
    bowlGroup.position.y = bowlGroup.userData.baseY + 0.0015 * Math.sin(t * 60);
    bowlGroup.rotation.y = bowlGroup.userData.baseRotY + 0.01 * Math.sin(t * 60);
  };

  group.userData.size = { w: W, d: D, h: H };
  return group;
}

/*
网格数明细（isMesh 计数，PartBuilder 按材质合并 + 独立 Group/网格）：

【静态 PartBuilder 合并（13 个 Mesh）】
1. M.white        → 下机柜主体
2. M.gray         → 底座(原 M.graphite) + 柜门缝 + 格栅 + 线缆槽 + 其它灰色件
3. M.cyan         → 底部青条 + 腰线
4. matFrame       → 立柱、顶框、横梁、碗口翻边、中心柱、封带头夹持、支架、轴、地脚钢管、急停黄座、碗底座、转盘立柱、导轨挡边、屏支臂、屏框
5. matBowlBase    → 振动盘底座
6. matSpiral      → 直振轨挡边？实际上螺旋轨道已移入 bowl Group，静态里只剩直振轨主体用 matTrack；此材质静态已无用，但 PartBuilder 仍可能生成（若有其它用 matSpiral 的件）。本文件静态不再使用 matSpiral → 此项为 0
7. matTrack       → 直振轨、漏斗
8. matSeal        → 封带头主体
9. matHeat        → 加热压头
10. matStation    → 测试站块体+指示灯柱
11. M.glass       → 四面侧玻璃+前板上下两段+顶盖玻璃(原 M.glassTint 合并)
12. matTape       → 载带
13. badgeMat      → 铭牌

【动态部件】
14-16. turret Group          → matTurret(盘) + matFrame(中柱) + matNozzle(12根合并) = 3
17-19. reelWinder Group      → matReel(筒) + matReelFlg(两法兰合并) + matFrame(轴) = 3
20-22. bowl Group            → matBowl(碗壁) + matSpiral(螺旋轨道) + matFrame(碗口环) = 3
23.    uiPlane               → 1
24-29. signalTower           → pole + 4 lamps + cap = 6
30-31. statusRing            → ring + fill = 2

合计 = 13 + 3 + 3 + 3 + 1 + 6 + 2 = 31 ≤ 40 ✓
*/
