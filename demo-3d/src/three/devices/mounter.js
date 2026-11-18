// src/three/devices/mounter.js
// SMT 贴片机 — 模块化机身（Fuji NXT III 风格）+ 龙门 XY 贴装头
import * as THREE from 'three';
import { M, lampMat, statusColor } from '../materials.js';
import { PartBuilder, roundedBoxGeo, textTexture } from '../builder.js';
import { signalTower, applyLamps, statusRing, setRingStatus, monitorArm, feet, vents } from '../common.js';

export const meta = {
  type: 'mounter',
  name: 'SMT贴片机',
  refs: [
    'Fuji NXT III — modular multi-beam placement machine',
    'Yamaha YSM20 — high-speed inline mounter',
    'https://www.fuji-global.com/products/placement/nxt/',
    'https://global.yamaha-motor.com/business/smt/products/ysm20/',
  ],
  size: { w: 1.85, d: 1.80, h: 1.52 },
};

// ─── 整机尺寸 ────────────────────────────────────────────────────
const W       = 1.85;   // 机身宽（X）
const D       = 1.80;   // 整机深（Z，含飞达）
const H       = 1.52;   // 机身高（不含灯塔）

const BODY_D  = 1.10;   // 机身本体深（Z），飞达在前后各伸出
const BASE_H  = 0.14;   // 下机柜底座高
const BELT_Y  = 0.85;   // 腰线高度（下机柜顶 / 上罩底）
const BELT_H  = 0.06;   // 腰线饰条高
const TOP_H   = 1.45;   // 上罩顶高（从地面计）
const PCB_Y   = 0.90;   // PCB 传送高度（规范）

const NUM_MOD = 3;
const MOD_W   = (W - 0.08) / NUM_MOD;

// 飞达区参数（供料台车：顶面约 0.84 m，飞达水平插在台车上）
const FEEDER_OVERHANG = 0.26;   // 台车/飞达/料盘外伸量（≤0.35 m）
const FEEDER_Z_FRONT  =  BODY_D / 2 + FEEDER_OVERHANG / 2;   // 飞达中心 Z（前）
const FEEDER_Z_BACK   = -BODY_D / 2 - FEEDER_OVERHANG / 2;   // 飞达中心 Z（后）
const FEEDER_COUNT    = 14;
const FEEDER_W        = (W - 0.10) / FEEDER_COUNT;
const CART_TOP_Y      = 0.84;   // 台车顶面高度（≈台面高）
const CART_DEPTH      = FEEDER_OVERHANG + 0.04; // 台车 Z 深度（含内插段）

// 龙门参数
const GANTRY_Y_BEAM   = 1.28;   // 横梁中心高度（世界坐标）
const GANTRY_Z_MIN    = -BODY_D / 2 + 0.06;   // 靠近后供料口
const GANTRY_Z_MAX    =  BODY_D / 2 - 0.06;   // 靠近前供料口
const GANTRY_X_MIN    = -W / 2 + 0.12;
const GANTRY_X_MAX    =  W / 2 - 0.12;

// ─── 局部材质 ────────────────────────────────────────────────────
const matModBody = new THREE.MeshStandardMaterial({ color: 0xedf0f4, roughness: 0.42, metalness: 0.06 });
const matBelt    = new THREE.MeshStandardMaterial({ color: 0x2d3540, roughness: 0.50, metalness: 0.30 });
const matGantry  = new THREE.MeshStandardMaterial({ color: 0xb8c4cf, roughness: 0.28, metalness: 0.82 });
const matNozzle  = new THREE.MeshStandardMaterial({ color: 0x7a8898, roughness: 0.25, metalness: 0.90 });

const matCable   = new THREE.MeshStandardMaterial({ color: 0x1d2127, roughness: 0.90, metalness: 0.00 });
const matFrame   = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.35, metalness: 0.70 });

// ─── 双传送导轨（沿 X）──────────────────────────────────────────
function buildRails(pb, x0, x1, zOffset = 0, gap = 0.26) {
  const L = x1 - x0, cx = (x0 + x1) / 2;
  for (const s of [-1, 1]) {
    pb.boxC(L, 0.040, 0.030, cx, PCB_Y - 0.015, zOffset + s * gap / 2, M.metal);
    pb.boxC(L, 0.010, 0.010, cx, PCB_Y + 0.005, zOffset + s * (gap / 2 - 0.015), M.belt);
  }
}

// ─── 单排飞达 + 料盘 + 供料台车 ──────────────────────────────────
// 参考 Fuji NXT：飞达水平插在台车顶面，料盘竖直挂在飞达外端下方
// side: +1 = 前排(+Z)  -1 = 后排(-Z)
// 外伸定义：飞达/料盘/台车最外点到机身面板(z=±BODY_D/2)的距离
function buildFeeders(pb, zCenter, side) {
  // ── 尺寸计算 ──────────────────────────────────────────────────
  const fW      = FEEDER_W * 0.80;          // 飞达宽（X）
  const fH      = 0.038;                    // 飞达体高（扁平，水平插在台车上）
  const fD_in   = 0.12;                     // 飞达插入机身内侧长度（-Z方向）
  const fD_out  = FEEDER_OVERHANG - 0.02;   // 飞达伸出台车外端长度（约0.24m）
  const fD_total = fD_in + fD_out;          // 飞达总深度
  // 飞达几何中心 Z（内外平衡点）
  const fZc     = side * (BODY_D / 2 - fD_in + fD_total / 2);
  const fTopY   = CART_TOP_Y + fH / 2;     // 飞达中心 Y（放在台车顶面上）

  // 外端 Z（料盘挂在此处）
  const outerZ  = side * (BODY_D / 2 + fD_out);

  // 料盘参数（盘面垂直 X 轴，轴沿 X，即 rx=π/2 → CylinderGeometry 轴沿 Y → 旋转后轴沿 X）
  const reelR   = 0.095;
  const reelHangY = CART_TOP_Y - 0.10;     // 料盘盘心 Y（台车顶面下方 0.10 m）
  // reelHangY - reelR = 0.84-0.10-0.095 = 0.645 ≥ 0.25 ✓

  for (let i = 0; i < FEEDER_COUNT; i++) {
    const fx = -W / 2 + 0.05 + (i + 0.5) * FEEDER_W;

    // 飞达主体（扁平长条，水平）
    pb.boxC(fW, fH, fD_total, fx, fTopY, fZc, M.ivory);
    // 飞达顶面走带槽（细条）
    pb.boxC(fW * 0.35, 0.010, fD_total * 0.70, fx, fTopY + fH / 2 + 0.005, fZc, M.darkGray);
    // 飞达内端插口（插入机身供料口一侧）
    pb.boxC(fW * 0.60, fH * 1.20, 0.014,
      fx, fTopY, side * (BODY_D / 2 - fD_in), M.steel);

    // 料盘（盘面垂直 X 轴 → rx=π/2，挂在飞达外端下方）
    const reelMat = i % 2 === 0 ? M.reel : M.reelWhite;
    // 料盘悬挂支架（竖杆，从飞达外端底面向下）
    pb.boxC(fW * 0.30, reelR * 1.60, 0.008,
      fx, fTopY - reelR * 0.80 - fH / 2, outerZ - side * 0.015, M.gray);
    // 料盘盘面（CylinderGeometry 轴默认沿 Y，rx=π/2 → 轴转为 Z，再 rz=π/2 → 轴沿 X）
    pb.add(
      new THREE.CylinderGeometry(reelR, reelR, 0.022, 18),
      reelMat,
      fx, reelHangY, outerZ,
      0, 0, Math.PI / 2   // rx=0,ry=0,rz=π/2 → 轴沿 X
    );
    // 料盘轮毂
    pb.add(
      new THREE.CylinderGeometry(0.026, 0.026, 0.028, 10),
      M.metal,
      fx, reelHangY, outerZ,
      0, 0, Math.PI / 2
    );
  }

  // ── 供料台车框架 ──────────────────────────────────────────────
  // 台车覆盖整机宽，Z 方向从机身面板向外延伸 FEEDER_OVERHANG
  const cartW   = W - 0.04;
  const cartD   = FEEDER_OVERHANG + 0.05; // 台车 Z 深（含少量插入机身内侧）
  const cartH   = CART_TOP_Y - BASE_H;    // 台车总高
  // 台车 Z 中心：外壁在 side*(BODY_D/2+FEEDER_OVERHANG)，内壁贴近机身面板
  const cartZc  = side * (BODY_D / 2 + FEEDER_OVERHANG / 2 - 0.025);

  // 顶面横梁（承托飞达）
  pb.boxC(cartW, 0.025, cartD, 0, CART_TOP_Y - 0.012, cartZc, M.gray);
  // 左右端竖立柱
  for (const sx of [-1, 1]) {
    pb.boxC(0.030, cartH, 0.028,
      sx * (cartW / 2 - 0.015), BASE_H + cartH / 2, cartZc, M.darkGray);
  }
  // 中间立柱（机宽中点）
  pb.boxC(0.025, cartH, 0.025, 0, BASE_H + cartH / 2, cartZc, M.darkGray);
  // 底部两根横撑（取代整块底板）
  pb.boxC(cartW, 0.022, 0.028, 0, BASE_H + 0.016, side * (BODY_D / 2 + 0.022),        M.gray);
  pb.boxC(cartW, 0.022, 0.028, 0, BASE_H + 0.016, side * (BODY_D / 2 + FEEDER_OVERHANG - 0.022), M.gray);
  // 中部两根细横撑（取代实心挡板，保持开放式框架）
  pb.boxC(cartW, 0.018, 0.020, 0, BASE_H + cartH * 0.35, cartZc, M.gray);
  pb.boxC(cartW, 0.018, 0.020, 0, BASE_H + cartH * 0.68, cartZc, M.gray);

  // 脚轮（4 个：左右 × 内外）
  const wheelR  = 0.028;
  const wheelY  = BASE_H - wheelR - 0.004;
  const wxArr   = [cartW / 2 - 0.06, -(cartW / 2 - 0.06)];
  const wzArr   = [
    side * (BODY_D / 2 + 0.04),
    side * (BODY_D / 2 + FEEDER_OVERHANG - 0.04),
  ];
  for (const wx of wxArr) {
    for (const wz of wzArr) {
      // 脚轮支架
      pb.boxC(0.014, wheelR * 1.6, 0.010, wx, wheelY + wheelR * 0.80, wz, M.metal);
      // 脚轮轮体（CylinderGeometry 轴沿 Y，rx=0，轴默认 Y → 需 rz=π/2 变为轴沿 X）
      pb.cyl(wheelR, 0.018, wx, wheelY, wz, M.black, 10, 0, 0, Math.PI / 2);
    }
  }

  // 供料台导轨（从台车内端到 PCB 轨道，在机身内侧）
  for (let i = 0; i < FEEDER_COUNT; i++) {
    const fx = -W / 2 + 0.05 + (i + 0.5) * FEEDER_W;
    pb.boxC(fW * 0.42, 0.007, 0.10,
      fx, PCB_Y - 0.010, side * (BODY_D / 2 - fD_in / 2), M.steel);
  }
}

// ─── 急停按钮 ────────────────────────────────────────────────────
function buildEStop(pb, x, y, z) {
  pb.cyl(0.038, 0.025, x, y,         z, M.yellow, 16);
  pb.cyl(0.028, 0.030, x, y + 0.025, z, M.red,    16);
  pb.cyl(0.015, 0.012, x, y + 0.012, z, M.black,  10);
}

// ─── 线缆拖链 ────────────────────────────────────────────────────
function buildCableChain(pb, side) {
  // 沿 X 方向排列，紧贴侧板内侧底部
  const y  = BASE_H + 0.05;
  const x0 = -0.28;
  const z  = side * (BODY_D / 2 - 0.055);
  for (let i = 0; i < 7; i++) {
    pb.boxC(0.065, 0.038, 0.038, x0 + i * 0.09, y, z, matCable);
  }
}

// ─── 吸嘴组（贴装头正下方，6 个）────────────────────────────────
function buildNozzleGroup() {
  const g  = new THREE.Group();
  g.name   = 'nozzleGroup';
  const pb = new PartBuilder();
  const count   = 6;
  const spacing = 0.062;
  for (let i = 0; i < count; i++) {
    const nx = (i - (count - 1) / 2) * spacing;
    pb.cyl(0.008, 0.065, nx, -0.0325, 0, matNozzle, 10);
    pb.add(new THREE.CylinderGeometry(0.003, 0.008, 0.016, 8),
      matNozzle, nx, -0.073, 0);
  }
  pb.build(g, { cloneMaterials: false });
  return g;
}

// ─── 贴装头本体 ──────────────────────────────────────────────────
function buildMountHead() {
  const g  = new THREE.Group();
  g.name   = 'mountHead';
  const pb = new PartBuilder();
  pb.boxC(0.18, 0.13, 0.11, 0, 0, 0, matGantry);
  pb.boxC(0.17, 0.022, 0.09, 0, -0.076, 0, matGantry);
  pb.cyl(0.021, 0.048, 0.068, -0.054, -0.040, matGantry, 12, Math.PI / 2, 0, 0);
  pb.boxC(0.014, 0.085, 0.085, -0.097, 0.008, 0, matGantry);
  pb.build(g, { cloneMaterials: false });

  const nozzles = buildNozzleGroup();
  nozzles.position.set(0, -0.076, 0);
  g.add(nozzles);
  g.userData.nozzles = nozzles;
  return g;
}

// ─── 龙门横梁（X 向）────────────────────────────────────────────
function buildGantryBeam() {
  const g  = new THREE.Group();
  g.name   = 'gantryBeam';
  const pb = new PartBuilder();
  const beamL = W - 0.14;
  pb.boxC(beamL, 0.062, 0.052, 0, 0, 0, matGantry);
  pb.boxC(beamL, 0.014, 0.011, 0, -0.038,  0.024, matGantry);
  pb.boxC(beamL, 0.014, 0.011, 0, -0.038, -0.024, matGantry);
  for (const sx of [-1, 1]) {
    pb.boxC(0.052, 0.110, 0.075, sx * (beamL / 2 + 0.022), 0, 0, matGantry);
  }
  pb.build(g, { cloneMaterials: false });
  return g;
}

// ─── build 主函数 ────────────────────────────────────────────────
export function build(device) {
  const group = new THREE.Group();
  group.name  = device.id;

  const pb = new PartBuilder();

  // ══════════════════════════════════════════════════════════════
  // A. 下机柜（地面 → BELT_Y）：白色圆角盖板，实体
  // ══════════════════════════════════════════════════════════════

  // 底座平台（roundedBoxGeo: w=X, h=Y, d=Z，不旋转）
  pb.add(
    roundedBoxGeo(W, BASE_H, BODY_D + 0.04, 0.04),
    M.graphite,
    0, BASE_H / 2, 0
  );
  // 底座前后踢脚板
  pb.boxC(W - 0.08, 0.040, 0.012, 0, BASE_H * 0.5,  BODY_D / 2 + 0.022, M.darkGray);
  pb.boxC(W - 0.08, 0.040, 0.012, 0, BASE_H * 0.5, -BODY_D / 2 - 0.022, M.darkGray);
  // 调平地脚
  feet(pb, W, BODY_D, 0.08);

  // 下机柜模组盖板（从 BASE_H 到 BELT_Y，白色圆角）
  const lowerH = BELT_Y - BASE_H - BELT_H / 2;
  const lowerY = BASE_H + lowerH / 2;
  for (let i = 0; i < NUM_MOD; i++) {
    const mx = -W / 2 + 0.04 + (i + 0.5) * MOD_W;
    pb.add(
      roundedBoxGeo(MOD_W - 0.022, lowerH, BODY_D - 0.02, 0.040),
      matModBody,
      mx, lowerY, 0
    );
    // 模组间竖向分割饰条
    if (i < NUM_MOD - 1) {
      pb.boxC(0.014, lowerH * 0.92, BODY_D * 0.98, mx + MOD_W / 2, lowerY, 0, matBelt);
    }
    // 正面下半散热格栅
    vents(pb, mx, BASE_H + 0.03, BODY_D / 2 + 0.008, MOD_W * 0.48, 0.16, 6, matBelt, 'z');
  }

  // ── 腰线饰条 ────────────────────────────────────────────────
  pb.add(
    roundedBoxGeo(W + 0.01, BELT_H, BODY_D + 0.01, 0.025),
    matBelt,
    0, BELT_Y, 0
  );

  // ══════════════════════════════════════════════════════════════
  // B. 上罩（BELT_Y → TOP_H）：细框架 + 透明玻璃面板
  // ══════════════════════════════════════════════════════════════

  const upperH = TOP_H - BELT_Y;   // 约 0.60 m
  const upperY = BELT_Y + upperH / 2;

  // 四根垂直立柱（角部）
  const colH = upperH - 0.01;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      pb.boxC(0.030, colH, 0.030,
        sx * (W / 2 - 0.016), upperY, sz * (BODY_D / 2 - 0.016), matFrame);
    }
  }
  // 中间立柱（模组分隔线延伸）
  for (let i = 1; i < NUM_MOD; i++) {
    const cx = -W / 2 + 0.04 + i * MOD_W;
    for (const sz of [-1, 1]) {
      pb.boxC(0.018, colH, 0.018, cx, upperY, sz * (BODY_D / 2 - 0.016), matFrame);
    }
  }

  // 顶部横梁（前后左右各一根）
  pb.boxC(W - 0.030, 0.028, 0.028,  0, TOP_H - 0.014,  BODY_D / 2 - 0.016, matFrame);
  pb.boxC(W - 0.030, 0.028, 0.028,  0, TOP_H - 0.014, -BODY_D / 2 + 0.016, matFrame);
  pb.boxC(0.028, 0.028, BODY_D - 0.030,  W / 2 - 0.016, TOP_H - 0.014, 0, matFrame);
  pb.boxC(0.028, 0.028, BODY_D - 0.030, -W / 2 + 0.016, TOP_H - 0.014, 0, matFrame);
  // 腰线上横梁
  pb.boxC(W - 0.030, 0.022, 0.022,  0, BELT_Y + BELT_H / 2 + 0.014,  BODY_D / 2 - 0.016, matFrame);
  pb.boxC(W - 0.030, 0.022, 0.022,  0, BELT_Y + BELT_H / 2 + 0.014, -BODY_D / 2 + 0.016, matFrame);
  pb.boxC(0.022, 0.022, BODY_D - 0.030,  W / 2 - 0.016, BELT_Y + BELT_H / 2 + 0.014, 0, matFrame);
  pb.boxC(0.022, 0.022, BODY_D - 0.030, -W / 2 + 0.016, BELT_Y + BELT_H / 2 + 0.014, 0, matFrame);

  // 透明侧面玻璃（前/后/左/右）
  const glassH = upperH - 0.055;
  const glassY = BELT_Y + BELT_H / 2 + 0.028 + glassH / 2;

  // 前面板（+Z）：每模组独立玻璃，留出立柱宽度
  for (let i = 0; i < NUM_MOD; i++) {
    const mx    = -W / 2 + 0.04 + (i + 0.5) * MOD_W;
    const panW  = MOD_W - 0.050;
    pb.add(new THREE.BoxGeometry(panW, glassH, 0.006),
      M.glass, mx, glassY, BODY_D / 2 - 0.003);
  }
  // 后面板（-Z）
  for (let i = 0; i < NUM_MOD; i++) {
    const mx    = -W / 2 + 0.04 + (i + 0.5) * MOD_W;
    const panW  = MOD_W - 0.050;
    pb.add(new THREE.BoxGeometry(panW, glassH, 0.006),
      M.glass, mx, glassY, -BODY_D / 2 + 0.003);
  }
  // 左右侧面玻璃
  pb.add(new THREE.BoxGeometry(0.006, glassH, BODY_D - 0.060),
    M.glass,  W / 2 - 0.003, glassY, 0);
  pb.add(new THREE.BoxGeometry(0.006, glassH, BODY_D - 0.060),
    M.glass, -W / 2 + 0.003, glassY, 0);

  // 透明顶盖（每模组一块 glassTint + 金属边框）
  const capY = TOP_H - 0.014;
  for (let i = 0; i < NUM_MOD; i++) {
    const mx    = -W / 2 + 0.04 + (i + 0.5) * MOD_W;
    const capW  = MOD_W - 0.040;
    const capD  = BODY_D - 0.055;
    pb.add(new THREE.BoxGeometry(capW, 0.008, capD),
      M.glassTint, mx, capY, 0);
    // 顶盖金属边框（前/后横框）
    pb.boxC(capW + 0.016, 0.014, 0.014, mx, capY + 0.004,  capD / 2, matFrame);
    pb.boxC(capW + 0.016, 0.014, 0.014, mx, capY + 0.004, -capD / 2, matFrame);
  }

  // ══════════════════════════════════════════════════════════════
  // C. 下机柜铭牌（3 模组合并为 1 个 canvas Mesh）
  // ══════════════════════════════════════════════════════════════
  {
    const badgeLabels = ['NXT-Ⅲ MOUNTER', '贴片机', 'UNIT-3'];
    const bCvs = document.createElement('canvas');
    bCvs.width  = 1536;
    bCvs.height = 50;
    const bCtx = bCvs.getContext('2d');
    bCtx.fillStyle = '#edf0f4';
    bCtx.fillRect(0, 0, bCvs.width, bCvs.height);
    bCtx.fillStyle = '#1f2a3d';
    bCtx.font = 'bold 28px "PingFang SC","Microsoft YaHei",sans-serif';
    bCtx.textBaseline = 'middle';
    for (let i = 0; i < NUM_MOD; i++) {
      bCtx.textAlign = 'center';
      bCtx.fillText(badgeLabels[i] ?? ('UNIT-' + (i + 1)), 256 + i * 512, 25);
    }
    const badgeTex = new THREE.CanvasTexture(bCvs);
    const badgeMat = new THREE.MeshStandardMaterial({ map: badgeTex, roughness: 0.4, metalness: 0.05 });
    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(W - 0.08, 0.058),
      badgeMat
    );
    badge.position.set(0, BASE_H + 0.36, BODY_D / 2 + 0.023);
    group.add(badge);
  }

  // ══════════════════════════════════════════════════════════════
  // D. PCB 传送导轨（贯穿 X，两端露出）
  // ══════════════════════════════════════════════════════════════
  buildRails(pb, -W / 2 - 0.02, W / 2 + 0.02, 0, 0.26);
  for (const sx of [-1, 1]) {
    pb.boxC(0.038, 0.075, 0.28, sx * (W / 2 + 0.010), PCB_Y, 0, M.metal);
  }

  // ══════════════════════════════════════════════════════════════
  // E. 前后飞达
  // ══════════════════════════════════════════════════════════════
  buildFeeders(pb, FEEDER_Z_FRONT, +1);
  buildFeeders(pb, FEEDER_Z_BACK,  -1);

  // ══════════════════════════════════════════════════════════════
  // F. 龙门 Y 向固定梁（左右各一，沿 Z 方向）
  // ══════════════════════════════════════════════════════════════
  const yBeamLen = BODY_D - 0.08;
  for (const sx of [-1, 1]) {
    pb.boxC(0.052, 0.042, yBeamLen, sx * (W / 2 - 0.068), GANTRY_Y_BEAM, 0, matGantry);
    for (const sz of [-1, 1]) {
      pb.boxC(0.068, 0.068, 0.058,
        sx * (W / 2 - 0.068), GANTRY_Y_BEAM, sz * (yBeamLen / 2 - 0.022), M.metal);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // G. 侧面散热格栅（贴合侧板，位于腰线以下）
  // ══════════════════════════════════════════════════════════════
  for (const sx of [-1, 1]) {
    // axis='x' → vents 在 YZ 平面排列，槽条沿 Z；贴合侧面
    // 用 axis='z' 配合 boxC 旋转贴合侧板
    for (let v = 0; v < 7; v++) {
      const vy = BASE_H + 0.06 + v * 0.085;
      pb.boxC(0.008, 0.028, 0.22, sx * (W / 2 + 0.002), vy, 0, matBelt);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // H. 线缆拖链（机身内侧底部前后各一排）
  // ══════════════════════════════════════════════════════════════
  buildCableChain(pb, +1);
  buildCableChain(pb, -1);

  // ══════════════════════════════════════════════════════════════
  // I. 急停按钮（前面板左右各一）
  // ══════════════════════════════════════════════════════════════
  buildEStop(pb,  W / 2 - 0.09, BELT_Y + 0.18, BODY_D / 2 + 0.026);
  buildEStop(pb, -W / 2 + 0.09, BELT_Y + 0.18, BODY_D / 2 + 0.026);

  // ══════════════════════════════════════════════════════════════
  // J. 操作屏支臂（前侧右端，从机身前板伸出，不穿插机身）
  // ══════════════════════════════════════════════════════════════
  const _monArmX  = W / 2 - 0.14;
  const _monArmY  = BELT_Y + 0.04;
  const _monArmZ  = BODY_D / 2 + 0.052;
  const _monRy    = -0.25;
  const _monArmH  = 0.36;
  const _monW     = 0.30;
  const _monH     = 0.20;
  monitorArm(pb, _monArmX, _monArmY, _monArmZ,
    { ry: _monRy, armH: _monArmH, w: _monW, h: _monH });

  // ══════════════════════════════════════════════════════════════
  // K. 合并所有静态部件
  // ══════════════════════════════════════════════════════════════
  pb.build(group);

  // ── 操作屏界面贴图（屏幕前方，与屏幕同位置）──────────────────
  {
    const ry  = _monRy;
    const s   = Math.sin(ry), c = Math.cos(ry);
    const mx  = _monArmX + s * 0.059;
    const my  = _monArmY + _monArmH + _monH / 2 + 0.02;
    const mz  = _monArmZ + c * 0.059;

    // 画 canvas 界面
    const cvs = document.createElement('canvas');
    cvs.width  = 512;
    cvs.height = 360;
    const ctx  = cvs.getContext('2d');

    // 背景
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(0, 0, 512, 360);

    // 标题栏
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(0, 0, 512, 52);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SMT 贴片机 · 运行监控', 256, 26);

    // 产量数字
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 28px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('今日贴装  128,560 点', 256, 102);

    // 状态条数据
    const bars = [
      { label: '吸嘴状态', val: 0.92, color: '#22c55e' },
      { label: '飞达供料', val: 0.78, color: '#3b82f6' },
      { label: 'CPH效率',  val: 0.85, color: '#f59e0b' },
      { label: '贴装精度', val: 0.96, color: '#22c55e' },
    ];
    bars.forEach((b, i) => {
      const bx = 32, by = 148 + i * 54, bw = 448, bh = 22;
      // 标签
      ctx.fillStyle = '#475569';
      ctx.font = '18px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, bx, by - 10);
      // 进度条背景
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(bx, by + 2, bw, bh, 4);
      ctx.fill();
      // 进度条前景
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect(bx, by + 2, bw * b.val, bh, 4);
      ctx.fill();
      // 百分比
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(b.val * 100) + '%', bx + bw, by - 10);
    });

    // 底部状态栏
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 332, 512, 28);
    ctx.fillStyle = '#64748b';
    ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('● 运行中   设备编号: NXT-003   班次: 白班', 256, 346);

    const uiTex = new THREE.CanvasTexture(cvs);
    const uiMat = new THREE.MeshBasicMaterial({ map: uiTex, transparent: false });
    const uiPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(_monW, _monH),
      uiMat
    );
    // 屏幕中心位置，沿法向再前移 0.004
    uiPlane.position.set(
      mx + s * 0.004,
      my,
      mz + c * 0.004
    );
    uiPlane.rotation.set(-0.12, ry, 0);
    group.add(uiPlane);
  }

  // ══════════════════════════════════════════════════════════════
  // 运动部件（独立 Group/Mesh，不合并）
  // ══════════════════════════════════════════════════════════════

  // ── PCB 板（固定芯片位置，不用 random）──────────────────────
  const pcbGroup = new THREE.Group();
  pcbGroup.name  = 'pcb';
  const pcbMesh  = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.004, 0.22), M.pcb.clone());
  pcbMesh.castShadow = true;
  pcbGroup.add(pcbMesh);

  const chipPb = new PartBuilder();
  // 固定芯片布局（不用 Math.random）
  const chipDefs = [
    [-0.080,  0.025, 0.028, 0.020],
    [ 0.000,  0.025, 0.022, 0.018],
    [ 0.080,  0.025, 0.030, 0.022],
    [-0.060, -0.040, 0.020, 0.016],
    [ 0.050, -0.040, 0.025, 0.018],
    [-0.100, -0.060, 0.018, 0.014],
    [ 0.100,  0.000, 0.024, 0.020],
  ];
  for (const [cx, cz, cw, cd] of chipDefs) {
    chipPb.boxC(cw, 0.006, cd, cx, 0.005, cz, M.pcbChip);
  }
  // 电容
  for (const [cx, cz] of [[-0.040, 0.070], [0.060, 0.058], [-0.120, 0.038]]) {
    chipPb.cyl(0.005, 0.012, cx, 0.008, cz, M.metal, 8);
  }
  chipPb.build(pcbGroup, { cloneMaterials: false });
  pcbGroup.position.set(-W / 2 + 0.50, PCB_Y + 0.003, 0);
  group.add(pcbGroup);

  // ── 龙门横梁（沿 Z 滑动）────────────────────────────────────
  const gantryBeam = buildGantryBeam();
  // 世界坐标：y = GANTRY_Y_BEAM，z 由动画驱动
  gantryBeam.position.set(0, GANTRY_Y_BEAM, 0);
  group.add(gantryBeam);

  // ── 贴装头（挂在横梁下方，局部坐标）────────────────────────
  const mountHead = buildMountHead();
  // 局部 y：横梁中心向下半个横梁高(≈0.031) 再下头体半高(≈0.065)，合计约 -0.10
  // 吸嘴尖端在 mountHead 局部 y ≈ -0.076 - 0.073 = -0.149
  // 世界坐标 y ≈ 1.28 - 0.10 - 0.149 ≈ 1.031，高于 PCB(0.90) 约 0.13 m ✓
  mountHead.position.set(0, -0.10, 0);
  gantryBeam.add(mountHead);

  // ── 信号灯塔（机顶右后角，总高 ≤0.35 m，立杆套管加粗）────────
  const towerX = W / 2 - 0.08;
  const towerZ = -BODY_D / 2 + 0.08;
  const towerY = TOP_H;   // 底座置于顶盖顶面
  // 立杆套管（粗底座，r=0.025，高 0.08，复用 matFrame 不增 Mesh）
  // 套管通过 pb2 单独 build 进 group，在 signalTower 调用前先放
  {
    const pb2 = new PartBuilder();
    pb2.cyl(0.025, 0.08, towerX, towerY + 0.04, towerZ, matFrame, 12);
    pb2.build(group, { shadow: false });
  }
  // h=0.10 → 总高 = 0.10 + 0.24 = 0.34 ≤ 0.35 ✓
  group.userData.lamps = signalTower(group, towerX, towerY, towerZ, 0.10);

  // ── 状态光环 ─────────────────────────────────────────────────
  group.userData.ring = statusRing(W, D);
  group.add(group.userData.ring);

  applyLamps(group.userData.lamps, device.status);
  setRingStatus(group.userData.ring, device.status);

  // ══════════════════════════════════════════════════════════════
  // 动画
  // ══════════════════════════════════════════════════════════════
  const BEAM_Z_MID    = (GANTRY_Z_MAX + GANTRY_Z_MIN) / 2;
  const BEAM_Z_AMP    = (GANTRY_Z_MAX - GANTRY_Z_MIN) / 2 * 0.90;
  const HEAD_X_AMP    = (GANTRY_X_MAX - GANTRY_X_MIN) / 2 * 0.78;

  group.userData.animate = (t, _dt, status) => {
    if (status !== 'run') {
      gantryBeam.position.z  = BEAM_Z_MID;
      mountHead.position.x   = 0;
      if (mountHead.userData.nozzles) mountHead.userData.nozzles.position.y = 0;
      return;
    }

    // 横梁 Z 往复（慢周期，模拟取料↔贴装）
    const beamPhase = t * 0.52;
    gantryBeam.position.z = BEAM_Z_MID + BEAM_Z_AMP * Math.sin(beamPhase);

    // 贴装头 X 往复（快周期，不同相位）
    mountHead.position.x = HEAD_X_AMP * Math.sin(t * 1.20 + 1.1);

    // 吸嘴下压：在横梁换向区（sin ≈ ±1）触发下压
    const beamNorm = Math.abs(Math.sin(beamPhase)); // 1 在换向区
    const nozzleDip = beamNorm > 0.90
      ? -0.022 * ((beamNorm - 0.90) / 0.10)
      : 0;
    if (mountHead.userData.nozzles) {
      mountHead.userData.nozzles.position.y = nozzleDip;
    }

    // PCB 沿 +X 缓慢移动循环
    const pcbTravel = W - 0.10;
    pcbGroup.position.x = -W / 2 + 0.25 + ((t * 0.07) % pcbTravel);
  };

  group.userData.size = { w: W, d: D, h: H };
  return group;
}
