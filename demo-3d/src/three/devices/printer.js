import * as THREE from 'three';
import { M, lampMat, statusColor } from '../materials.js';
import { PartBuilder, roundedBoxGeo, textTexture } from '../builder.js';
import { signalTower, applyLamps, statusRing, setRingStatus, monitorArm, feet, vents, estop, handle } from '../common.js';

export const meta = {
  type: 'printer',
  name: '全自动锡膏印刷机',
  refs: [
    'DEK Horizon 03iX 全自动锡膏印刷机',
    'DEK Horizon 高端网版印刷平台',
    'MPM Momentum Elite 锡膏印刷机',
    'https://www.dek.com/products/solutions/solder-paste-printers',
    'https://www.mpm.com/solutions/solder-paste-printers',
  ],
  size: { w: 1.20, d: 1.40, h: 1.50 },
};

const W = 1.20;
const D = 1.40;
const H = 1.50;
const PCB_Y = 0.90;
const BASE_H = 0.12;
const BELT_Y = 0.88;
const TOP_H = 1.50;
const FRONT_Z = D / 2;
const BACK_Z = -D / 2;
const FRAME_Z = -0.03;

const STENCIL_X = 0.10;
const STENCIL_HALF_W = 0.20;
const STENCIL_HALF_D = 0.26;
const STENCIL_Y = 1.035;
const SQUEEGEE_Y = 1.115;
const SQUEEGEE_Z_MIN = -0.19;
const SQUEEGEE_Z_MAX = 0.19;
const CCD_Y = 1.32;
const CCD_Z = -0.38;

const matShell = new THREE.MeshStandardMaterial({ color: 0xf1f5fa, roughness: 0.40, metalness: 0.08 });
const matFrame = new THREE.MeshStandardMaterial({ color: 0xb9c5d1, roughness: 0.30, metalness: 0.78 });
const matSteel = new THREE.MeshStandardMaterial({ color: 0x8e99a6, roughness: 0.28, metalness: 0.88 });
const matCable = new THREE.MeshStandardMaterial({ color: 0x3a414b, roughness: 0.85, metalness: 0.05 });
const matOrange = new THREE.MeshStandardMaterial({ color: 0xfb923c, roughness: 0.45, metalness: 0.10 });

function buildLowerCabinet(pb) {
  const cabD = D - 0.06;

  pb.add(roundedBoxGeo(W - 0.06, BELT_Y - BASE_H, cabD, 0.035), matShell, 0, (BELT_Y + BASE_H) / 2, FRAME_Z);
  pb.add(roundedBoxGeo(W + 0.01, 0.055, cabD - 0.04, 0.020), M.gray, 0, BELT_Y - 0.030, FRAME_Z);
  pb.add(roundedBoxGeo(W - 0.10, 0.10, cabD - 0.08, 0.030), M.darkGray, 0, BASE_H + 0.05, FRAME_Z);
  pb.boxC(W - 0.16, 0.028, 0.012, 0, BASE_H + 0.06, FRAME_Z + cabD / 2 + 0.007, M.darkGray);
  feet(pb, W - 0.06, cabD - 0.06, 0.09);

  for (const sx of [-1, 1]) {
    const cx = sx * (W / 4 + 0.03);
    pb.add(roundedBoxGeo(W / 2 - 0.075, BELT_Y - BASE_H - 0.14, 0.022, 0.020),
      matShell, cx, BASE_H + 0.10 + (BELT_Y - BASE_H - 0.14) / 2, FRAME_Z + cabD / 2 + 0.012);
    vents(pb, cx, BASE_H + 0.12, FRAME_Z + cabD / 2 + 0.028, W / 2 - 0.16, 0.20, 7, M.darkGray, 'z');
  }

  for (const sx of [-1, 1]) {
    vents(pb, sx * (W / 2 - 0.032), BASE_H + 0.13, FRAME_Z, 0.30, 0.24, 7, M.darkGray, 'z');
    for (let i = 0; i < 7; i++) {
      pb.boxC(0.008, 0.026, 0.30, sx * (W / 2 - 0.024), BASE_H + 0.14 + i * 0.036, FRAME_Z, M.gray);
    }
  }

  for (let i = 0; i < 6; i++) {
    pb.boxC(0.060, 0.034, 0.040, -0.28 + i * 0.075, 0.22, FRAME_Z + cabD / 2 + 0.018, matCable);
  }
}

function buildFrame(pb) {
  const upperH = TOP_H - BELT_Y;
  const upperY = BELT_Y + upperH / 2;
  const frameD = D - 0.06;

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      pb.boxC(0.036, upperH, 0.036, sx * (W / 2 - 0.020), upperY, FRAME_Z + sz * (frameD / 2 - 0.018), matFrame);
    }
    pb.boxC(0.030, 0.030, frameD - 0.040, sx * (W / 2 - 0.018), TOP_H - 0.016, FRAME_Z, matFrame);
    pb.boxC(0.026, 0.024, frameD - 0.040, sx * (W / 2 - 0.018), BELT_Y + 0.012, FRAME_Z, matFrame);
    pb.boxC(0.030, 0.030, 0.055, sx * (W / 2 - 0.020), BELT_Y + 0.10, FRAME_Z - frameD / 2 + 0.010, matSteel);
  }

  pb.boxC(W - 0.040, 0.032, 0.032, 0, TOP_H - 0.016, FRAME_Z + frameD / 2 - 0.018, matFrame);
  pb.boxC(W - 0.040, 0.032, 0.032, 0, TOP_H - 0.016, FRAME_Z - frameD / 2 + 0.018, matFrame);
  pb.boxC(W - 0.040, 0.028, 0.028, 0, TOP_H - 0.016, FRAME_Z, matShell);

  pb.add(new THREE.BoxGeometry(W - 0.070, 0.008, frameD - 0.070), M.glass, 0, TOP_H - 0.004, FRAME_Z);
  pb.add(new THREE.BoxGeometry(0.008, upperH - 0.070, frameD - 0.070), M.glass, W / 2 - 0.006, upperY, FRAME_Z);
  pb.add(new THREE.BoxGeometry(0.008, upperH - 0.070, frameD - 0.070), M.glass, -W / 2 + 0.006, upperY, FRAME_Z);
  pb.add(new THREE.BoxGeometry(W - 0.070, upperH - 0.070, 0.008), M.glass, 0, upperY, FRAME_Z - frameD / 2 + 0.006);
}

function buildConveyor(pb) {
  const len = W + 0.26;

  for (const sz of [-1, 1]) {
    pb.boxC(len, 0.040, 0.030, 0, PCB_Y - 0.020, sz * 0.155, matSteel);
    pb.boxC(len, 0.008, 0.012, 0, PCB_Y + 0.004, sz * 0.145, M.belt);
  }

  pb.boxC(len - 0.04, 0.016, 0.240, 0, PCB_Y - 0.040, 0, M.darkGray);
  pb.boxC(len - 0.06, 0.008, 0.200, 0, PCB_Y - 0.026, 0, M.belt);

  for (const sx of [-1, 1]) {
    pb.boxC(0.055, 0.090, 0.330, sx * (W / 2 + 0.018), PCB_Y - 0.042, 0, M.gray);
    pb.boxC(0.030, 0.150, 0.330, sx * (W / 2 + 0.040), PCB_Y - 0.090, 0, matFrame);
  }

  pb.cyl(0.038, 0.42, 0.30, PCB_Y - 0.062, 0.20, matSteel, 14, Math.PI / 2, 0, 0);
  pb.cyl(0.024, 0.12, 0.42, PCB_Y - 0.062, 0.20, M.gray, 12, Math.PI / 2, 0, 0);
}

function buildStencil(pb) {
  const fx = STENCIL_X;

  pb.boxC(STENCIL_HALF_W * 2 + 0.036, 0.018, 0.020, fx, STENCIL_Y, -STENCIL_HALF_D - 0.010, matSteel);
  pb.boxC(STENCIL_HALF_W * 2 + 0.036, 0.018, 0.020, fx, STENCIL_Y, STENCIL_HALF_D + 0.010, matSteel);
  pb.boxC(0.020, 0.018, STENCIL_HALF_D * 2 + 0.040, fx - STENCIL_HALF_W - 0.010, STENCIL_Y, 0, matSteel);
  pb.boxC(0.020, 0.018, STENCIL_HALF_D * 2 + 0.040, fx + STENCIL_HALF_W + 0.010, STENCIL_Y, 0, matSteel);
  pb.boxC(STENCIL_HALF_W * 2, 0.005, STENCIL_HALF_D * 2, fx, STENCIL_Y - 0.010, 0, matSteel);

  for (let i = 0; i < 7; i++) {
    pb.boxC(0.010, 0.006, STENCIL_HALF_D * 1.7, fx - 0.075 + i * 0.025, STENCIL_Y - 0.014, 0, matSteel);
  }

  for (const sz of [-1, 1]) {
    pb.boxC(0.026, 0.016, 0.10, fx - STENCIL_HALF_W - 0.020, STENCIL_Y - 0.010, sz * 0.19, matSteel);
  }

  pb.boxC(0.032, 0.100, 0.032, fx, STENCIL_Y + 0.050, -STENCIL_HALF_D - 0.030, matFrame);
}

function buildLid(group) {
  const pivot = new THREE.Group();
  pivot.name = 'frontLid';
  pivot.position.set(0, TOP_H - 0.035, FRAME_Z + (D - 0.06) / 2);

  const pb = new PartBuilder();
  const w = W - 0.075;
  const h = 0.555;
  const cy = -h / 2;

  pb.boxC(w, 0.026, 0.026, 0, -0.012, 0, matFrame);
  pb.boxC(w, 0.024, 0.024, 0, -h + 0.012, 0, matFrame);
  pb.boxC(0.026, h, 0.026, -w / 2 + 0.013, cy, 0, matFrame);
  pb.boxC(0.026, h, 0.026, w / 2 - 0.013, cy, 0, matFrame);
  pb.add(new THREE.BoxGeometry(w - 0.050, h - 0.050, 0.008), M.glass, 0, cy, 0);
  pb.cyl(0.016, w - 0.02, 0, 0.002, 0, matSteel, 10, 0, 0, Math.PI / 2);

  for (const sx of [-1, 1]) {
    pb.boxC(0.030, 0.060, 0.040, sx * (w / 2 - 0.010), -h * 0.55, 0.010, matSteel);
  }

  handle(pb, w / 2 - 0.070, -h * 0.62, 0.026, 0.12);
  pb.build(pivot, { cloneMaterials: false });
  group.add(pivot);
  return pivot;
}

function buildSqueegee() {
  const g = new THREE.Group();
  g.name = 'squeegee';

  const pb = new PartBuilder();
  const w = STENCIL_HALF_W * 2 + 0.16;

  pb.boxC(w, 0.055, 0.050, 0, 0, 0, matFrame);
  pb.boxC(w - 0.04, 0.026, 0.028, 0, -0.040, 0, matFrame);
  pb.boxC(w - 0.06, 0.026, 0.010, 0, -0.062, 0, matOrange);
  pb.boxC(0.040, 0.090, 0.040, -w / 2 + 0.020, 0.070, 0, matFrame);
  pb.boxC(0.040, 0.090, 0.040, w / 2 - 0.020, 0.070, 0, matFrame);
  pb.cyl(0.016, w - 0.02, 0, 0.125, 0, matFrame, 12, 0, 0, Math.PI / 2);

  pb.build(g, { cloneMaterials: false });
  g.position.set(STENCIL_X, SQUEEGEE_Y, 0);
  return g;
}

function buildCCD() {
  const g = new THREE.Group();
  g.name = 'ccdGantry';

  const pb = new PartBuilder();

  pb.boxC(0.055, 0.055, 0.40, -W / 2 + 0.055, 0, 0, matFrame);
  pb.boxC(0.055, 0.055, 0.40, W / 2 - 0.055, 0, 0, matFrame);
  pb.boxC(W - 0.08, 0.050, 0.045, 0, 0, 0, matFrame);

  pb.boxC(0.090, 0.070, 0.075, 0, -0.075, 0, M.darkGray);
  pb.cyl(0.030, 0.045, 0, -0.130, 0, M.darkGray, 14);
  pb.cyl(0.018, 0.012, 0, -0.157, 0, M.darkGray, 12);
  pb.boxC(0.055, 0.050, 0.040, 0, -0.020, 0, M.darkGray);

  pb.build(g, { cloneMaterials: false });
  g.position.set(0, CCD_Y, CCD_Z);
  return g;
}

function buildPCB() {
  const g = new THREE.Group();
  g.name = 'pcb';

  const pb = new PartBuilder();
  pb.boxC(0.30, 0.004, 0.20, 0, 0, 0, M.pcb);

  const chips = [
    [-0.070, 0.025, 0.030, 0.020],
    [0.005, 0.028, 0.024, 0.018],
    [0.075, 0.020, 0.032, 0.022],
    [-0.050, -0.035, 0.022, 0.016],
    [0.050, -0.040, 0.026, 0.018],
    [0.098, -0.005, 0.022, 0.014],
  ];

  for (const [cx, cz, cw, cd] of chips) {
    pb.boxC(cw, 0.006, cd, cx, 0.006, cz, M.pcbChip);
  }

  for (const [cx, cz] of [[-0.095, 0.062], [0.030, 0.068], [-0.020, -0.062]]) {
    pb.cyl(0.006, 0.012, cx, 0.010, cz, M.pcbChip, 8);
  }

  pb.build(g, { cloneMaterials: false });
  g.position.set(-W / 2 + 0.26, PCB_Y + 0.002, 0);
  return g;
}

function makeScreenTexture() {
  const cvs = document.createElement('canvas');
  cvs.width = 768;
  cvs.height = 512;
  const ctx = cvs.getContext('2d');

  ctx.fillStyle = '#f2f6fa';
  ctx.fillRect(0, 0, 768, 512);

  ctx.fillStyle = '#2563eb';
  ctx.fillRect(0, 0, 768, 68);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('锡膏印刷机 · 工艺监控', 28, 35);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(24, 88, 720, 78);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 88, 720, 78);
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('印刷次数  12,846', 52, 128);
  ctx.fillStyle = '#64748b';
  ctx.font = '20px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('班次产量 1,284  |  良率 99.2%', 440, 128);

  const rows = [
    ['印刷压力', '45.0 kPa', 0.80, '#2563eb'],
    ['刮刀速度', '38.0 mm/s', 0.62, '#22d3ee'],
    ['钢网寿命', '72 %', 0.72, '#fb923c'],
    ['对位偏差', '±0.018 mm', 0.88, '#2fb36d'],
  ];

  rows.forEach((r, i) => {
    const y = 196 + i * 60;
    ctx.fillStyle = '#334155';
    ctx.font = '22px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(r[0], 40, y);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(190, y - 15, 390, 22);
    ctx.fillStyle = r[3];
    ctx.fillRect(190, y - 15, 390 * r[2], 22);
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(r[1], 720, y);
  });

  ctx.fillStyle = '#e8eef6';
  ctx.fillRect(0, 470, 768, 42);
  ctx.fillStyle = statusColor.run === 0x16b364 ? '#16803f' : '#334155';
  ctx.font = '20px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('● 自动运行   钢网已装载   锡膏余量 68%   设备编号 PR-012', 384, 491);

  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeBadgeTexture() {
  const cvs = document.createElement('canvas');
  cvs.width = 1024;
  cvs.height = 160;
  const ctx = cvs.getContext('2d');

  ctx.fillStyle = '#f4f7fb';
  ctx.fillRect(0, 0, 1024, 160);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(0, 0, 14, 160);
  ctx.fillStyle = '#1f2a3d';
  ctx.font = 'bold 54px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('全自动锡膏印刷机', 44, 60);
  ctx.fillStyle = '#64748b';
  ctx.font = '30px monospace';
  ctx.fillText('SOLDER PASTE PRINTER  ·  HORIZON-03  ·  PR-012', 44, 116);

  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function build(device) {
  const group = new THREE.Group();
  group.name = device.id;

  const pb = new PartBuilder();
  buildLowerCabinet(pb);
  buildFrame(pb);
  buildConveyor(pb);
  buildStencil(pb);

  estop(pb, W / 2 - 0.085, BELT_Y + 0.16, FRAME_Z + (D - 0.06) / 2 + 0.022);
  estop(pb, -W / 2 + 0.085, BELT_Y + 0.16, FRAME_Z + (D - 0.06) / 2 + 0.022);

  const monX = W / 2 - 0.135;
  const monY = BELT_Y + 0.020;
  const monZ = FRONT_Z + 0.060;
  const monRy = -0.22;
  const monW = 0.32;
  const monH = 0.215;
  const monArmH = 0.34;

  monitorArm(pb, monX, monY, monZ, { ry: monRy, armH: monArmH, w: monW, h: monH, keyboard: true });

  for (let i = 0; i < 5; i++) {
    pb.boxC(0.055, 0.030, 0.036, -0.42 + i * 0.070, 1.44, BACK_Z + 0.075, matCable);
  }
  pb.boxC(0.040, 0.040, 0.040, 0.10, 1.47, BACK_Z + 0.075, M.darkGray);

  const towerX = W / 2 - 0.075;
  const towerZ = BACK_Z + 0.075;

  pb.build(group);

  const lid = buildLid(group);
  const squeegee = buildSqueegee();
  const ccd = buildCCD();
  const pcb = buildPCB();

  group.add(squeegee);
  group.add(ccd);
  group.add(pcb);

  const uiTex = makeScreenTexture();
  const uiMat = new THREE.MeshBasicMaterial({ map: uiTex, toneMapped: false });
  const uiPlane = new THREE.Mesh(new THREE.PlaneGeometry(monW - 0.012, monH - 0.012), uiMat);

  const s = Math.sin(monRy);
  const c = Math.cos(monRy);
  const mx = monX + s * 0.059;
  const my = monY + monArmH + monH / 2 + 0.02;
  const mz = monZ + c * 0.059;

  uiPlane.position.set(mx + s * 0.006, my, mz + c * 0.006);
  uiPlane.rotation.set(-0.12, monRy, 0);
  group.add(uiPlane);

  const badgeTex = makeBadgeTexture();
  const badgeMat = new THREE.MeshStandardMaterial({ map: badgeTex, roughness: 0.45, metalness: 0.05 });
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.069), badgeMat);
  badge.position.set(-0.16, 0.62, FRAME_Z + (D - 0.06) / 2 + 0.027);
  group.add(badge);

  group.userData.lamps = signalTower(group, towerX, TOP_H, towerZ, 0.10);
  group.userData.ring = statusRing(W, D);
  group.add(group.userData.ring);

  applyLamps(group.userData.lamps, device.status);
  setRingStatus(group.userData.ring, device.status);

  const squeegeeMid = (SQUEEGEE_Z_MIN + SQUEEGEE_Z_MAX) / 2;
  const squeegeeAmp = (SQUEEGEE_Z_MAX - SQUEEGEE_Z_MIN) / 2;
  const pcbStart = -W / 2 + 0.26;
  const pcbEnd = W / 2 - 0.20;

  group.userData.animate = (t, _dt, status) => {
    if (status !== 'run') {
      squeegee.position.z = squeegeeMid;
      ccd.position.x = 0;
      pcb.position.x = pcbStart;
      lid.rotation.set(0, 0, 0);
      return;
    }

    const cycle = (t % 10.0) / 10.0;
    const enterEnd = 0.26;
    const printEnd = 0.56;
    const exitEnd = 0.82;
    const offEnd = 0.96;

    if (cycle < enterEnd) {
      const u = cycle / enterEnd;
      pcb.position.x = pcbStart + (STENCIL_X - pcbStart) * u;
      squeegee.position.z = squeegeeMid;
    } else if (cycle < printEnd) {
      pcb.position.x = STENCIL_X;
      const local = (cycle - enterEnd) / (printEnd - enterEnd);
      squeegee.position.z = squeegeeMid + squeegeeAmp * Math.sin(local * Math.PI * 5);
    } else if (cycle < exitEnd) {
      const u = (cycle - printEnd) / (exitEnd - printEnd);
      pcb.position.x = STENCIL_X + (pcbEnd - STENCIL_X) * u;
      squeegee.position.z = squeegeeMid;
    } else if (cycle < offEnd) {
      const u = (cycle - exitEnd) / (offEnd - exitEnd);
      pcb.position.x = pcbEnd + 0.35 * u;
      squeegee.position.z = squeegeeMid;
    } else {
      pcb.position.x = pcbStart;
      squeegee.position.z = squeegeeMid;
    }

    ccd.position.x = 0.10 * Math.sin(t * 0.85);
    lid.rotation.set(0, 0, 0);
  };

  group.userData.size = { w: W, d: D, h: H };
  return group;
}
