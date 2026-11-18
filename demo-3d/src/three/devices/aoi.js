// src/three/devices/aoi.js
// 在线 3D AOI 光学检测机 — Koh Young Zenith / Omron VT-S730 风格
import * as THREE from 'three';
import { M, lampMat, statusColor } from '../materials.js';
import { PartBuilder, roundedBoxGeo, textTexture } from '../builder.js';
import { signalTower, applyLamps, statusRing, setRingStatus, monitorArm, feet, vents, estop, handle } from '../common.js';

const W = 1.10;
const D = 1.40;
const H = 1.55;

const BASE_H = 0.04;     // 底座，露出地脚
const CAB_H = 0.72;      // 下机柜顶高度（含底座）
const CHAM_H = 0.63;     // 检测舱高度
const TOP_H  = 0.20;     // 顶盖高度（CAB_H + CHAM_H + TOP_H = 1.55）

const BEAM_Y = CAB_H + CHAM_H * 0.72;  // 龙门横梁中心高度
const CAM_Y  = BEAM_Y - 0.09;          // 相机头中心高度
const PCB_Y  = 0.90;                   // 输送面高度（规范）

export const meta = {
  type: 'aoi',
  name: '在线3D AOI光学检测机',
  refs: [
    'Koh Young Zenith 3D AOI — https://www.kohyoung.com/en/products/inspection/3d-aoi/zenith',
    'Omron VT-S730 3D AOI — https://industrial.omron.eu/en/products/vt-s730',
  ],
  size: { w: W, d: D, h: H },
};

function buildGantryBeam() {
  const g = new THREE.Group();
  g.name = 'gantryBeam';
  const pb = new PartBuilder();
  const beamL = W - 0.22;
  pb.boxC(beamL, 0.048, 0.048, 0, 0, 0, M.metal);
  pb.boxC(beamL, 0.012, 0.010, 0, -0.030,  0.016, M.metal);
  pb.boxC(beamL, 0.012, 0.010, 0, -0.030, -0.016, M.metal);
  for (const sx of [-1, 1]) {
    pb.boxC(0.055, 0.070, 0.070, sx * (beamL / 2 + 0.01), 0.012, 0, M.metal);
  }
  pb.build(g, { cloneMaterials: false });
  return g;
}

function buildCameraHead() {
  const g = new THREE.Group();
  g.name = 'cameraHead';
  const pb = new PartBuilder();
  pb.boxC(0.13, 0.080, 0.13, 0, 0, 0, M.metal);
  pb.boxC(0.070, 0.028, 0.055, 0, 0.054, 0, M.metal);
  // 中央下视相机
  pb.cyl(0.024, 0.070, 0, -0.065, 0, M.metal, 14);
  pb.cyl(0.014, 0.016, 0, -0.105, 0, M.cyan, 12);
  // 四周倾斜投影头（指向下外，结构光风格）
  const tilt = 0.70;
  const reach = 0.050;
  const len = 0.055;
  const py = -0.032;
  pb.cyl(0.013, len,  reach, py, 0, M.metal, 10, 0, 0, Math.PI + tilt);
  pb.cyl(0.013, len, -reach, py, 0, M.metal, 10, 0, 0, Math.PI - tilt);
  pb.cyl(0.013, len, 0, py,  reach, M.metal, 10, Math.PI - tilt, 0, 0);
  pb.cyl(0.013, len, 0, py, -reach, M.metal, 10, Math.PI + tilt, 0, 0);
  pb.cyl(0.008, 0.012,  reach + 0.018, py - 0.022, 0, M.cyan, 8, 0, 0, Math.PI + tilt);
  pb.cyl(0.008, 0.012, -reach - 0.018, py - 0.022, 0, M.cyan, 8, 0, 0, Math.PI - tilt);
  pb.cyl(0.008, 0.012, 0, py - 0.022,  reach + 0.018, M.cyan, 8, Math.PI - tilt, 0, 0);
  pb.cyl(0.008, 0.012, 0, py - 0.022, -reach - 0.018, M.cyan, 8, Math.PI + tilt, 0, 0);
  pb.build(g, { cloneMaterials: false });
  return g;
}

export function build(device) {
  const group = new THREE.Group();
  group.name = device.id;
  const status = device.status || 'idle';

  const pb = new PartBuilder();

  // 底座从地脚垫块顶面起，露出四个调平脚
  pb.add(roundedBoxGeo(W - 0.04, BASE_H - 0.03, D - 0.04, 0.03), M.graphite, 0, 0.03 + (BASE_H - 0.03) / 2, 0);

  // 下机柜（白色圆角盖板）
  const lowerH = CAB_H - BASE_H;
  pb.add(roundedBoxGeo(W, lowerH, D, 0.05), M.white, 0, BASE_H + lowerH / 2, 0);

  // 腰线饰条（略凸出，避免被圆角倒角吞掉）
  pb.boxC(W + 0.024, 0.038, D + 0.024, 0, CAB_H - 0.06, 0, M.blue);

  // 顶框（四周实心边，中间留观察窗；灯塔坐在右后角）
  const FRAME_W = 0.08;
  const topY0 = CAB_H + CHAM_H;
  const topYc = topY0 + TOP_H / 2;
  pb.boxC(W, TOP_H, FRAME_W, 0, topYc,  D / 2 - FRAME_W / 2, M.white);
  pb.boxC(W, TOP_H, FRAME_W, 0, topYc, -(D / 2 - FRAME_W / 2), M.white);
  pb.boxC(FRAME_W, TOP_H, D - 2 * FRAME_W,  W / 2 - FRAME_W / 2, topYc, 0, M.white);
  pb.boxC(FRAME_W, TOP_H, D - 2 * FRAME_W, -(W / 2 - FRAME_W / 2), topYc, 0, M.white);
  pb.boxC(W + 0.02, 0.016, 0.020, 0, topY0 + 0.008,  D / 2 + 0.002, M.blue);
  pb.boxC(W + 0.02, 0.016, 0.020, 0, topY0 + 0.008, -(D / 2 + 0.002), M.blue);
  pb.boxC(0.020, 0.016, D + 0.02,  W / 2 + 0.002, topY0 + 0.008, 0, M.blue);
  pb.boxC(0.020, 0.016, D + 0.02, -(W / 2 + 0.002), topY0 + 0.008, 0, M.blue);

  // 检测舱四角立柱 + 上下框
  const PW = 0.040, PD = 0.040;
  const PH = CHAM_H;
  const PY = CAB_H + PH / 2;
  const PXS = [W / 2 - PW / 2, -(W / 2 - PW / 2)];
  const PZS = [D / 2 - PD / 2, -(D / 2 - PD / 2)];
  for (const px of PXS) for (const pz of PZS) pb.boxC(PW, PH, PD, px, PY, pz, M.gray);

  const GW = W - PW;
  const GD = D - PD;
  for (const fy of [CAB_H + 0.020, CAB_H + CHAM_H - 0.020]) {
    pb.boxC(GW, 0.025, PD, 0, fy,  D / 2 - PD / 2, M.gray);
    pb.boxC(GW, 0.025, PD, 0, fy, -(D / 2 - PD / 2), M.gray);
    pb.boxC(PW, 0.025, GD,  W / 2 - PW / 2, fy, 0, M.gray);
    pb.boxC(PW, 0.025, GD, -(W / 2 - PW / 2), fy, 0, M.gray);
  }

  // 舱门把手（前面板）
  handle(pb, 0.18, CAB_H + CHAM_H * 0.50, D / 2 + 0.022, 0.12);

  // 输送导轨（沿 X 贯通，输送面 0.90 m）
  const RAIL_GAUGE = 0.30;
  const RAIL_H_SIZE = 0.04;
  const RAIL_W_SIZE = 0.028;
  for (const sg of [1, -1]) {
    const rz = sg * RAIL_GAUGE / 2;
    pb.boxC(W + 0.12, RAIL_H_SIZE, RAIL_W_SIZE, 0, PCB_Y - RAIL_H_SIZE / 2, rz, M.steel);
    pb.boxC(W + 0.12, 0.007, 0.012, 0, PCB_Y - 0.003, rz - sg * (RAIL_W_SIZE / 2 + 0.006), M.rubber);
    pb.boxC(0.022, RAIL_H_SIZE + 0.02, RAIL_W_SIZE + 0.06,  W / 2 + 0.05, PCB_Y - RAIL_H_SIZE / 2, rz, M.steel);
    pb.boxC(0.022, RAIL_H_SIZE + 0.02, RAIL_W_SIZE + 0.06, -(W / 2 + 0.05), PCB_Y - RAIL_H_SIZE / 2, rz, M.steel);
  }

  // 龙门 Z 向导轨（舱内高处）
  const GANTRY_GUIDE_Y = BEAM_Y + 0.06;
  pb.boxC(0.018, 0.018, D - 0.10,  (W / 2 - 0.08), GANTRY_GUIDE_Y, 0, M.steel);
  pb.boxC(0.018, 0.018, D - 0.10, -(W / 2 - 0.08), GANTRY_GUIDE_Y, 0, M.steel);

  // 前面板控制区与按钮
  pb.boxC(0.22, 0.14, 0.010, 0.10, 0.42, D / 2 + 0.022, M.gray);
  pb.cyl(0.016, 0.014, -0.02, 0.44, D / 2 + 0.034, M.green, 12);
  pb.cyl(0.016, 0.014,  0.08, 0.44, D / 2 + 0.034, M.orange, 12);
  pb.cyl(0.016, 0.014,  0.18, 0.44, D / 2 + 0.034, M.blue, 12);

  // 线缆槽
  pb.boxC(0.55, 0.038, 0.022, -0.05, 0.065,  D / 2 + 0.014, M.darkGray);
  pb.boxC(0.55, 0.038, 0.022, -0.05, 0.065, -(D / 2 - 0.011), M.darkGray);

  // 侧面散热格栅（下机柜左右）
  vents(pb, -(W / 2 + 0.026), 0.26,  0.05, 0.44, 0.24, 6, M.darkGray, 'x');
  vents(pb,  (W / 2 + 0.026), 0.26,  0.05, 0.44, 0.24, 6, M.darkGray, 'x');
  vents(pb, -(W / 2 + 0.026), 0.26, -0.15, 0.44, 0.24, 6, M.darkGray, 'x');
  vents(pb,  (W / 2 + 0.026), 0.26, -0.15, 0.44, 0.24, 6, M.darkGray, 'x');

  estop(pb, -W / 2 + 0.085, CAB_H - 0.08, D / 2 + 0.024);
  feet(pb, W, D, 0.07);

  // 显示器支臂 + 键盘托（前面板外侧，不穿机身）
  const ARM_X = 0.20, ARM_Y = CAB_H - 0.08, ARM_Z = D / 2 + 0.02;
  const ARM_H = 0.30, MON_W = 0.34, MON_H = 0.22;
  monitorArm(pb, ARM_X, ARM_Y, ARM_Z, { ry: 0, armH: ARM_H, w: MON_W, h: MON_H, keyboard: true });

  pb.build(group, { shadow: true });

  // 观察窗：左右在输送高度留过板缺口，前后为整面玻璃
  const glassPb = new PartBuilder();
  const GLS_H = CHAM_H - 0.05;
  const GLS_CY = CAB_H + GLS_H / 2 + 0.025;
  const GLS_T = 0.007;
  const GLS_IW = W - PW * 2 - 0.005;
  const GLS_ID = D - PD * 2 - 0.005;
  const gBottom = GLS_CY - GLS_H / 2;
  const gTop = GLS_CY + GLS_H / 2;
  const SLOT_Y0 = PCB_Y - 0.08;
  const SLOT_Y1 = PCB_Y + 0.08;

  glassPb.boxC(GLS_IW, GLS_H, GLS_T, 0, GLS_CY,  D / 2 - PD / 2 - 0.005, M.glass);
  glassPb.boxC(GLS_IW, GLS_H, GLS_T, 0, GLS_CY, -(D / 2 - PD / 2 - 0.005), M.glass);

  const loH = SLOT_Y0 - gBottom;
  const hiH = gTop - SLOT_Y1;
  for (const sx of [1, -1]) {
    const gx = sx * (W / 2 - PW / 2 - 0.005);
    glassPb.boxC(GLS_T, loH, GLS_ID, gx, gBottom + loH / 2, 0, M.glass);
    glassPb.boxC(GLS_T, hiH, GLS_ID, gx, SLOT_Y1 + hiH / 2, 0, M.glass);
  }
  // 顶盖中间开窗，不铺玻璃板，避免环境贴图把俯视面涂成实心色块
  glassPb.build(group, { shadow: false });

  // 操作屏浅色 CanvasTexture 界面
  const scrCanvas = document.createElement('canvas');
  scrCanvas.width = 512; scrCanvas.height = 384;
  const ctx = scrCanvas.getContext('2d');
  ctx.fillStyle = '#f0f4f8';
  ctx.fillRect(0, 0, 512, 384);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(0, 0, 512, 48);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AOI 3D 光学检测  ·  运行监控', 256, 24);

  ctx.fillStyle = '#1e3a5f';
  ctx.font = 'bold 16px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('状态: 运行中', 20, 76);
  ctx.fillText('基板: PCB-20250601-087', 20, 100);

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(12, 112, 230, 100);
  ctx.fillStyle = '#475569';
  ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('今日检测', 20, 132);
  ctx.fillStyle = '#1e3a5f';
  ctx.font = 'bold 32px monospace';
  ctx.fillText('1,284', 20, 168);
  ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('块', 20, 190);

  ctx.fillStyle = '#fee2e2';
  ctx.fillRect(254, 112, 230, 100);
  ctx.fillStyle = '#991b1b';
  ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('NG 计数', 262, 132);
  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 32px monospace';
  ctx.fillText('3', 262, 168);
  ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillStyle = '#991b1b';
  ctx.fillText('0.23 %', 262, 190);

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(12, 230, 480, 18);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(12, 230, 320, 18);
  ctx.fillStyle = '#475569';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('扫描进度', 12, 265);
  ctx.textAlign = 'right';
  ctx.fillText('66%', 492, 265);

  ctx.fillStyle = '#475569';
  ctx.textAlign = 'left';
  ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('上次结果:', 12, 295);
  ctx.fillStyle = '#16a34a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('PASS', 160, 295);

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(12, 308, 480, 60);
  for (let ci = 0; ci < 24; ci++) {
    const cx2 = 20 + (ci % 12) * 38;
    const cy2 = 318 + Math.floor(ci / 12) * 20;
    ctx.fillStyle = ci === 7 ? '#dc2626' : '#22d3ee';
    ctx.fillRect(cx2, cy2, 28, 12);
  }

  const scrTexture = new THREE.CanvasTexture(scrCanvas);
  scrTexture.colorSpace = THREE.SRGBColorSpace;
  const scrMat = new THREE.MeshBasicMaterial({ map: scrTexture });
  const scrMesh = new THREE.Mesh(new THREE.PlaneGeometry(MON_W, MON_H), scrMat);
  const s = Math.sin(0), c = Math.cos(0);
  const mx = ARM_X + s * 0.059;
  const my = ARM_Y + ARM_H + MON_H / 2 + 0.02;
  const mz = ARM_Z + c * 0.059;
  scrMesh.position.set(mx + s * 0.004, my, mz + c * 0.004);
  scrMesh.rotation.set(-0.12, 0, 0);
  group.add(scrMesh);

  // 铭牌
  const npTex = textTexture('3D AOI  光学检测机', {
    w: 512, h: 80, color: '#1f2a3d', bg: '#f4f7fb',
    font: 'bold 48px "PingFang SC","Microsoft YaHei",sans-serif',
  });
  const npMat = new THREE.MeshStandardMaterial({ map: npTex, roughness: 0.4, metalness: 0.05 });
  const np = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.055), npMat);
  np.position.set(-0.28, 0.28, D / 2 + 0.028);
  group.add(np);

  // 运动件：龙门 + 多角度相机头
  const gantry = buildGantryBeam();
  gantry.position.set(0, BEAM_Y, 0);
  group.add(gantry);

  const camHead = buildCameraHead();
  camHead.position.set(0, CAM_Y - BEAM_Y, 0);
  gantry.add(camHead);

  // PCB
  const pcbGroup = new THREE.Group();
  pcbGroup.name = 'pcb';
  const pcbMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.004, 0.16), M.pcb.clone());
  pcbMesh.castShadow = true;
  pcbGroup.add(pcbMesh);
  const chipPb = new PartBuilder();
  const chipDefs = [
    [-0.06,  0.03, 0.040, 0.028],
    [ 0.02,  0.02, 0.028, 0.022],
    [ 0.07, -0.03, 0.032, 0.024],
    [-0.05, -0.04, 0.022, 0.018],
    [ 0.00, -0.01, 0.018, 0.014],
  ];
  for (const [cx, cz, cw, cd] of chipDefs) {
    chipPb.boxC(cw, 0.006, cd, cx, 0.005, cz, M.pcbChip);
  }
  chipPb.build(pcbGroup, { cloneMaterials: false });
  pcbGroup.position.set(0, PCB_Y + 0.004, 0);
  group.add(pcbGroup);

  // NG 指示灯（独立 Mesh，可通过 userData.ng 闪红）
  const ngMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x22d3ee,
    emissiveIntensity: 0.25,
    roughness: 0.3,
    metalness: 0.1,
  });
  const ngLamp = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), ngMat);
  ngLamp.position.set(0, CAB_H + CHAM_H - 0.055, D / 2 - 0.08);
  ngLamp.name = 'ngLamp';
  group.add(ngLamp);

  // 信号灯塔（机顶右后角，总高出机顶 0.34 m）
  const towerX = W / 2 - 0.08;
  const towerZ = -D / 2 + 0.08;
  const towerY = H;
  group.userData.lamps = signalTower(group, towerX, towerY, towerZ, 0.10);

  group.userData.ring = statusRing(W, D);
  group.add(group.userData.ring);

  applyLamps(group.userData.lamps, status);
  setRingStatus(group.userData.ring, status);

  group.userData.ng = false;

  const Z_AMP = (D / 2 - 0.28);
  const X_AMP = (W / 2 - 0.28);
  const pcbTravel = W - 0.16;

  group.userData.animate = (t, _dt, st) => {
    const ngOn = !!group.userData.ng || st === 'fault';
    if (ngOn) {
      ngMat.color.setHex(0xf04438);
      ngMat.emissive.setHex(0xf04438);
      ngMat.emissiveIntensity = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 8));
    } else {
      ngMat.color.setHex(0x22d3ee);
      ngMat.emissive.setHex(0x22d3ee);
      ngMat.emissiveIntensity = 0.25;
    }

    if (st !== 'run') {
      gantry.position.z = 0;
      camHead.position.x = 0;
      pcbGroup.position.x = 0;
      return;
    }
    gantry.position.z = Z_AMP * Math.sin(t * 0.70);
    camHead.position.x = X_AMP * Math.sin(t * 1.10 + 0.60);
    pcbGroup.position.x = -W / 2 + 0.12 + ((t * 0.08) % pcbTravel);
  };

  group.userData.size = { w: W, d: D, h: H };
  return group;
}
