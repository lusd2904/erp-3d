// src/three/devices/spi.js
// 3D 锡膏检测机 SPI — 参考 Koh Young KY8030 外观
import * as THREE from 'three';
import { M, lampMat } from '../materials.js';
import { PartBuilder, roundedBoxGeo, textTexture } from '../builder.js';
import {
  signalTower, applyLamps, statusRing, setRingStatus,
  feet, vents, estop, handle,
} from '../common.js';

export const meta = {
  type: 'spi',
  name: '3D锡膏检测机 SPI',
  refs: [
    'Koh Young KY8030 — 3D SPI 锡膏检测机',
    'https://www.kohyoung.com/en/products/spi',
  ],
  size: { w: 1.00, d: 1.30, h: 1.50 },
};

// ─── 整机尺寸 ───────────────────────────────────────────────
const W = 1.00, D = 1.30, H = 1.50;
const BASE_H = 0.08;
const BELT_Y = 0.86;                       // 下柜顶面 / 上下部交界
const LOWER_H = BELT_Y - BASE_H;           // 0.78
const RAIL_Y = 0.90;                       // PCB 承载面
const RAIL_EXT = 0.07;
const RAIL_LEN = W + 2 * RAIL_EXT;

const RAIL_BASE_CZ = 0.123, RAIL_BASE_W = 0.030, RAIL_BASE_H = 0.032;
const RAIL_SUP_CZ = 0.098, RAIL_SUP_W = 0.020;      // 托边
const RAIL_GUARD_CZ = 0.112, RAIL_GUARD_W = 0.012;  // 挡边，内侧距 0.212

const WIN_Y0 = 0.905, WIN_Y1 = 1.415;
const WIN_H = WIN_Y1 - WIN_Y0, WIN_CY = (WIN_Y0 + WIN_Y1) / 2;
const SIDE_Y0 = 1.000, SIDE_Y1 = 1.440;
const SIDE_H = SIDE_Y1 - SIDE_Y0, SIDE_CY = (SIDE_Y0 + SIDE_Y1) / 2;
const FRONT_Z = D / 2 - 0.035;
const GLASS_CZ = D / 2 - 0.004;
const SIDE_GX = W / 2 - 0.018;

const TOP_T = 0.05, SKY_W = 0.70, SKY_D = 0.90;

const PCB_W = 0.25, PCB_D = 0.20, PCB_T = 0.0016;
const GANTRY_Y = 1.20, GANTRY_X = 0.38, GANTRY_Z = 0.30;
const CAM_XAMP = 0.24;

const matRing = lampMat(0x22d3ee);

// 浅色金属感材质，避免无环境贴图时发黑
const LIGHT_METAL = new THREE.MeshStandardMaterial({
  color: 0xdfe6ee, roughness: 0.35, metalness: 0.25,
});
const MOUTH_MAT = M.midGray ?? new THREE.MeshStandardMaterial({
  color: 0x94a3b8, roughness: 0.55, metalness: 0.12,
});

// roundedBoxGeo 因 bevelSize/bevelThickness 会在三方向各扩 2×min(r,0.02)
// 这里统一换算成“净外形 = 传入尺寸”
const bevelOf = r => Math.min(r, 0.02);
function rbox(w, h, d, r = 0.02) {
  const b = bevelOf(r);
  return roundedBoxGeo(w - 2 * b, h - 2 * b, d - 2 * b, r);
}

// ─── 左右侧导轨口浅色口框 ──────────────────────────────────
function mouthFrame(pb, sx) {
  const x = sx * (W / 2 + 0.008);
  pb.boxC(0.024, 0.025, 0.360, x, 0.8625, 0, MOUTH_MAT);
  pb.boxC(0.024, 0.025, 0.360, x, 0.9375, 0, MOUTH_MAT);
  for (const sz of [-1, 1]) pb.boxC(0.024, 0.075, 0.030, x, 0.900, sz * 0.180, MOUTH_MAT);
}

// ─── 龙门横梁（沿 Z 扫描）──────────────────────────────────
function buildGantryBeam() {
  const g = new THREE.Group(); g.name = 'gantryBeam';
  const pb = new PartBuilder();
  const beamL = W - 0.24;

  pb.boxC(beamL, 0.060, 0.058, 0, 0, 0, M.white);                 // 外罩
  for (const sz of [-1, 1]) {
    pb.boxC(beamL, 0.014, 0.012, 0, -0.034, sz * 0.026, M.blue);  // 饰条
  }
  for (const sx of [-1, 1]) {
    pb.boxC(0.050, 0.120, 0.075, sx * GANTRY_X, 0, 0, M.gray);    // 滑块
  }
  pb.build(g, { cloneMaterials: false });
  return g;
}

// ─── 检测相机头（横梁子对象，沿 X 扫描）────────────────────
function buildCameraHead() {
  const g = new THREE.Group(); g.name = 'cameraHead';
  const pb = new PartBuilder();

  pb.boxC(0.070, 0.100, 0.070, 0, -0.050, 0, M.gray);          // 连接颈
  pb.boxC(0.110, 0.080, 0.110, 0, -0.140, 0, M.white);         // 相机主体
  pb.add(new THREE.TorusGeometry(0.057, 0.005, 6, 20),
         M.blue, 0, -0.140, 0, Math.PI / 2, 0, 0);              // 蓝色圈
  pb.boxC(0.075, 0.045, 0.075, 0, -0.187, 0, M.blue);          // 光学罩
  pb.cyl(0.016, 0.020, 0, -0.207, 0, M.midGray, 12);           // 镜头
  pb.add(new THREE.TorusGeometry(0.045, 0.008, 8, 26),
         matRing, 0, -0.190, 0, Math.PI / 2, 0, 0);             // 环形光源
  pb.build(g, { cloneMaterials: false });
  return g;
}

// ─── PCB 板（含焊盘 / 锡膏点）──────────────────────────────
function buildPCB() {
  const g = new THREE.Group(); g.name = 'pcb';
  const pb = new PartBuilder();

  pb.add(new THREE.BoxGeometry(PCB_W, PCB_T, PCB_D), M.pcb,
         0, RAIL_Y + PCB_T / 2, 0);

  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 3; j++) {
      const px = -0.085 + i * 0.0425;
      const pz = -0.05 + j * 0.05;
      pb.cyl(0.0038, 0.0016, px, RAIL_Y + PCB_T + 0.0008, pz, M.copper, 10);
    }
  }
  for (const [cx, cz] of [[-0.05, 0.0], [0.03, -0.03], [0.06, 0.045]]) {
    pb.cyl(0.0060, 0.0012, cx, RAIL_Y + PCB_T + 0.0006, cz, M.copper, 10);
  }

  pb.build(g, { cloneMaterials: false });
  g.position.set(-W / 2 - 0.05, 0, 0);
  return g;
}

// ─── 操作屏 UI ─────────────────────────────────────────────
function makeScreenUI() {
  const cvs = document.createElement('canvas');
  cvs.width = 512; cvs.height = 340;
  const ctx = cvs.getContext('2d');

  ctx.fillStyle = '#f0f4f8'; ctx.fillRect(0, 0, 512, 340);
  ctx.fillStyle = '#2563eb'; ctx.fillRect(0, 0, 512, 54);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('SPI 3D Inspection', 256, 27);

  const rows = [
    ['Volume 98.6%', 0.87, '#22d3ee'],
    ['Height 120 μm', 0.72, '#2563eb'],
    ['Area 82.4%', 0.66, '#22c55e'],
    ['Pass 1,286 / NG 3', 0.97, '#2563eb'],
  ];
  ctx.textAlign = 'left';
  rows.forEach((r, i) => {
    const y = 92 + i * 52;
    ctx.fillStyle = '#475569';
    ctx.font = '18px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(r[0], 34, y);

    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath(); ctx.roundRect(34, y + 8, 444, 20, 4); ctx.fill();
    ctx.fillStyle = r[2];
    ctx.beginPath(); ctx.roundRect(34, y + 8, 444 * r[1], 20, 4); ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 15px monospace'; ctx.textAlign = 'right';
    ctx.fillText(Math.round(r[1] * 100) + '%', 478, y); ctx.textAlign = 'left';
  });

  ctx.fillStyle = '#e2e8f0'; ctx.fillRect(0, 306, 512, 34);
  ctx.fillStyle = '#64748b';
  ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('XC-SPI S8          运行中', 256, 323);

  return new THREE.CanvasTexture(cvs);
}

// ─── build ──────────────────────────────────────────────────
export function build(device) {
  const group = new THREE.Group();
  group.name = device.id;
  const pb = new PartBuilder();

  // ═══ 下部实心机柜 ═══
  pb.add(rbox(W, LOWER_H, D, 0.040), M.white, 0, BASE_H + LOWER_H / 2, 0);
  feet(pb, W - 0.14, D - 0.14, 0.06);

  // 腰线灰带 + 蓝色品牌带（比下柜外形外凸 3~5 mm）
  pb.add(rbox(W + 0.006, 0.070, D + 0.006, 0.018), M.gray, 0, 0.695, 0);
  pb.add(rbox(W + 0.010, 0.020, D + 0.010, 0.010), M.blue, 0, 0.695, 0);
  pb.boxC(W + 0.012, 0.003, 0.003, 0, 0.735, D / 2 + 0.006, M.cyan);

  // 前脸细节：格栅 / 门缝 / 把手 / 急停 / 警示标签 / 线缆槽
  vents(pb, 0.10, 0.11, D / 2 + 0.004, 0.40, 0.16, 4, M.gray, 'z');
  pb.boxC(0.004, 0.700, 0.004, 0, 0.420, D / 2 + 0.007, M.gray);
  handle(pb, -0.14, 0.320, D / 2 + 0.004, 0.09);
  handle(pb, 0.14, 0.320, D / 2 + 0.004, 0.09);
  estop(pb, -0.36, 0.440, D / 2 + 0.004, 0);
  pb.boxC(0.10, 0.035, 0.004, -0.20, 0.520, D / 2 + 0.002, M.orange);
  pb.boxC(0.08, 0.050, 0.060, -0.32, 0.060, -D / 2 + 0.020, M.darkGray);

  // 侧面散热格栅
  for (const sx of [-1, 1]) vents(pb, sx * (W / 2 + 0.004), 0.20, 0, 0.70, 0.24, 6, M.gray, 'x');

  // ═══ 上半部框架 ═══
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    pb.boxC(0.030, 0.620, 0.030, sx * (W / 2 - 0.015), BELT_Y + 0.310, sz * (D / 2 - 0.015), M.gray);
  }
  pb.boxC(W - 0.070, 0.050, 0.050, 0, 0.880, FRONT_Z, M.gray);   // 前下横梁
  pb.boxC(W - 0.070, 0.050, 0.050, 0, 1.440, FRONT_Z, M.gray);   // 前上横梁
  pb.boxC(W - 0.060, 0.580, 0.008, 0, 1.165, -D / 2 + 0.004, M.white);
  pb.boxC(W - 0.070, WIN_H, 0.004, 0, WIN_CY, GLASS_CZ, M.glass); // 前观察窗

  // 左右侧窗（下半为侧板 + 导轨口框）
  for (const sx of [-1, 1]) {
    pb.boxC(0.006, 0.060, D - 0.060, sx * SIDE_GX, 0.970, 0, M.gray);
    pb.boxC(0.004, SIDE_H, D - 0.060, sx * SIDE_GX, SIDE_CY, 0, M.glass);
  }
  for (const sx of [-1, 1]) mouthFrame(pb, sx);

  // ═══ 顶盖：四根普通盒子拼成平整顶框 + 玻璃天窗 ═══
  for (const sx of [-1, 1]) {
    pb.boxC(0.150, TOP_T, D, sx * (W / 2 - 0.075), H - TOP_T / 2, 0, M.white);
  }
  for (const sz of [-1, 1]) {
    pb.boxC(0.700, TOP_T, 0.200, 0, H - TOP_T / 2, sz * (D / 2 - 0.100), M.white);
  }

  // 顶框外沿薄饰边，四角平整无台阶
  const EDGE_W = 0.018, EDGE_T = 0.008, EDGE_Y = H - 0.007;
  for (const sx of [-1, 1]) {
    pb.add(rbox(EDGE_W, EDGE_T, D, 0.003), M.gray,
           sx * (W / 2 - EDGE_W / 2), EDGE_Y, 0);
  }
  for (const sz of [-1, 1]) {
    pb.add(rbox(W - EDGE_W, EDGE_T, EDGE_W, 0.003), M.gray,
           0, EDGE_Y, sz * (D / 2 - EDGE_W / 2));
  }

  pb.boxC(SKY_W, 0.004, SKY_D, 0, H - 0.006, 0, M.glass);

  // ═══ PCB 输送导轨 ═══
  for (const sz of [-1, 1]) {
    pb.boxC(RAIL_LEN, RAIL_BASE_H, RAIL_BASE_W, 0, RAIL_Y - RAIL_BASE_H / 2, sz * RAIL_BASE_CZ, LIGHT_METAL);
    pb.boxC(RAIL_LEN, 0.008, RAIL_SUP_W, 0, RAIL_Y - 0.004, sz * RAIL_SUP_CZ, LIGHT_METAL);
    pb.boxC(RAIL_LEN, 0.020, RAIL_GUARD_W, 0, RAIL_Y + 0.005, sz * RAIL_GUARD_CZ, M.gray);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    pb.boxC(0.028, 0.075, 0.070, sx * (W / 2 + 0.006), 0.875, sz * RAIL_BASE_CZ, M.gray);
  }

  // ═══ 内部龙门 Y 向导轨 + 支架 ═══
  for (const sx of [-1, 1]) {
    pb.boxC(0.050, 0.050, GANTRY_Z * 2, sx * GANTRY_X, GANTRY_Y, 0, LIGHT_METAL);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    pb.boxC(0.030, 0.340, 0.030, sx * GANTRY_X, BELT_Y + 0.170, sz * GANTRY_Z, M.gray);
    pb.boxC(0.060, 0.040, 0.100, sx * GANTRY_X, GANTRY_Y, sz * GANTRY_Z, M.gray);
  }

  // ═══ 操作屏（右前角，短支臂，外挂贴机身）═══
  const HM_W = 0.260, HM_H = 0.180, HM_T = 0.028;
  const HM_RX = -0.10, HM_RY = 1.05;
  const HM_X = W / 2 + 0.080, HM_Y = 1.140, HM_Z = D / 2 - 0.075;

  pb.boxC(0.070, 0.080, 0.060, W / 2 + 0.035, 0.980, HM_Z, M.gray);        // 固定座
  pb.boxC(0.016, 0.210, 0.016, W / 2 + 0.068, 0.995, HM_Z - 0.007, M.gray); // 短立柱
  pb.add(new THREE.BoxGeometry(HM_W + 0.018, HM_H + 0.018, HM_T),
         M.gray, HM_X, HM_Y, HM_Z, HM_RX, HM_RY, 0);                        // 屏框
  pb.add(new THREE.BoxGeometry(HM_W + 0.010, 0.008, 0.008),
         M.blue, HM_X, HM_Y - HM_H / 2 - 0.006, HM_Z, HM_RX, HM_RY, 0);     // 电源条

  pb.build(group);

  // ═══ 操作屏 UI ═══
  {
    const n = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(HM_RX, HM_RY, 0));
    const uiPos = new THREE.Vector3(HM_X, HM_Y, HM_Z).addScaledVector(n, HM_T / 2 + 0.002);

    const tex = makeScreenUI();
    const uiMat = new THREE.MeshStandardMaterial({
      map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.5,
    });
    const ui = new THREE.Mesh(new THREE.PlaneGeometry(HM_W * 0.94, HM_H * 0.94), uiMat);
    ui.position.copy(uiPos);
    ui.rotation.set(HM_RX, HM_RY, 0);
    group.add(ui);
  }

  // ═══ 铭牌 KY-3D SPI ═══
  {
    const tex = textTexture('KY-3D SPI', { w: 512, h: 128, bg: '#ffffff', color: '#1f2a3d' });
    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.06),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.05 })
    );
    badge.position.set(0.12, 0.40, D / 2 + 0.004);
    group.add(badge);
  }

  // ═══ 运动部件 ═══
  const pcb = buildPCB();
  group.add(pcb);

  const gantryBeam = buildGantryBeam();
  gantryBeam.position.set(0, GANTRY_Y, 0);
  group.add(gantryBeam);

  const camera = buildCameraHead();
  camera.position.set(0, -0.01, 0);
  gantryBeam.add(camera);

  // ═══ 三色灯 + 状态环 ═══
  group.userData.lamps = signalTower(group, W / 2 - 0.10, H, -D / 2 + 0.10, 0.08);
  group.userData.ring = statusRing(W, D);
  group.add(group.userData.ring);
  applyLamps(group.userData.lamps, device.status);
  setRingStatus(group.userData.ring, device.status);

  // ═══ 动画 ═══
  group.userData.animate = (t, _dt, status) => {
    if (status !== 'run') return;

    const period = 10, enterT = 2, scanT = 6, exitT = 2;
    const p = t % period;

    if (p < enterT) {
      pcb.position.x = -W / 2 - 0.05 + (W / 2 + 0.05) * (p / enterT);
      gantryBeam.position.z = 0;
      camera.position.x = 0;
    } else if (p < enterT + scanT) {
      pcb.position.x = 0;
      const s = (p - enterT) / scanT;
      camera.position.x = CAM_XAMP * Math.sin(s * Math.PI * 4);

      const rows = 6;
      const step = Math.min(rows - 1, Math.floor(s * rows));
      gantryBeam.position.z = -0.10 + step * 0.04;
    } else {
      const e = (p - enterT - scanT) / exitT;
      pcb.position.x = (W / 2 + 0.05) * e;
      gantryBeam.position.z = 0;
      camera.position.x = 0;
    }
  };

  group.userData.size = { w: W, d: D, h: H };
  return group;
}
