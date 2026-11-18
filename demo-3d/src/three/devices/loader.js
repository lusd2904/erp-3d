// src/three/devices/loader.js
// SMT 单料盒上板机 — Nutek S NTM710 风格（料盒升降 + 气动推板 + 出口传送段）
// 传送面 0.90 m（目录 950±25 mm，规格允许指定；本线统一 0.90 m）
import * as THREE from 'three';
import { M, lampMat, statusColor } from '../materials.js';
import { PartBuilder, roundedBoxGeo, textTexture } from '../builder.js';
import { signalTower, applyLamps, statusRing, setRingStatus, monitorArm, feet, vents, estop, handle } from '../common.js';

const W = 1.30;
const D = 0.85;
const H = 1.20;
const PCB_Y = 0.90;

const PCB_L = 0.30;
const PCB_W = 0.246;
const PCB_T = 0.008;
const PCB_CY = PCB_Y + 0.001 + PCB_T / 2;

const RAIL_Z = 0.128;
const MAG_X = -0.22;

const N = 7;
const PITCH = 0.036; // 真实节距 10 mm；演示放大，使层板在产线尺度下可辨
const SLOT0 = 0.042;
const FRAME_TOP = 0.028;
const FRAME_H = SLOT0 + (N - 1) * PITCH + FRAME_TOP;

const BODY_W = 1.26;
const BODY_D = 0.80;
const CAB_TOP = 0.55;
const BAY_Y0 = 0.592;
const ROOF_Y0 = 1.155;

const NOSE_X = -0.42;
const BLADE_T = 0.026;
const PUSH = 0.46;
const CYCLE = 4.2;

const FONT = '"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif';

export const meta = {
  type: 'loader',
  name: '上板机',
  refs: [
    'Nutek S NTM710LL Single Magazine Loader — 1330×1005×1300 mm，SMEMA，气动推板，LED 塔灯',
    'https://www.nutek-europe.com/s-ntm710-single-magazine-loader',
    'Nutek NTM710LM — 1080×845×1300 mm（深度 845 mm，与本模型 0.85 m 对齐）',
    'https://hawkerrichardson.com.au/product/single-magazine-loader/ （NTM0700 单料盒上板机）',
  ],
  size: { w: W, d: D, h: H },
};

function smooth01(u) {
  const t = u < 0 ? 0 : u > 1 ? 1 : u;
  return t * t * (3 - 2 * t);
}

function elevatorY(i) {
  return PCB_CY - (SLOT0 + i * PITCH);
}

function boardEdgeX() {
  return MAG_X - PCB_L / 2;
}

function rodLenRetracted() {
  return boardEdgeX() - 0.018 - NOSE_X - BLADE_T;
}

function pcbTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 192;
  const g = c.getContext('2d');
  g.fillStyle = '#1f7a4a';
  g.fillRect(0, 0, 256, 192);
  g.strokeStyle = '#d7a15a';
  g.lineWidth = 3;
  g.strokeRect(8, 8, 240, 176);
  g.fillStyle = '#c98b4b';
  for (let i = 0; i < 10; i++) g.fillRect(16 + i * 22, 14, 8, 5);
  const chips = [[28, 36, 52, 34], [108, 32, 78, 46], [36, 100, 44, 30], [128, 104, 70, 40], [210, 48, 28, 28]];
  chips.forEach(([x, y, w, h]) => {
    g.fillStyle = '#262a30';
    g.fillRect(x, y, w, h);
    g.strokeStyle = '#c5ced6';
    g.lineWidth = 2;
    g.strokeRect(x, y, w, h);
  });
  g.fillStyle = '#e8eef5';
  for (let i = 0; i < 6; i++) g.fillRect(18, 150 + (i % 2) * 8, 10, 5);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function hmiTexture() {
  const c = document.createElement('canvas');
  c.width = 480;
  c.height = 320;
  const g = c.getContext('2d');
  g.fillStyle = '#F4F7FB';
  g.fillRect(0, 0, 480, 320);
  g.fillStyle = '#2563EB';
  g.fillRect(0, 0, 480, 48);
  g.fillStyle = '#ffffff';
  g.font = `bold 26px ${FONT}`;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillText('上板机', 18, 24);
  g.fillStyle = '#22D3EE';
  g.fillRect(360, 10, 104, 28);
  g.fillStyle = '#0B1F33';
  g.font = `bold 18px ${FONT}`;
  g.textAlign = 'center';
  g.fillText('RUN', 412, 24);

  const cards = [
    ['产能', '420', '片/时', '#2563EB'],
    ['剩余槽位', '4', '槽', '#0891B2'],
    ['节拍', '6.0', '秒', '#1F2A3D'],
    ['本盒', '7', '层', '#FB923C'],
  ];
  cards.forEach((card, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 16 + col * 228;
    const y = 64 + row * 112;
    g.fillStyle = '#E7EEF7';
    g.fillRect(x, y, 216, 100);
    g.fillStyle = '#5C6B80';
    g.font = `18px ${FONT}`;
    g.textAlign = 'left';
    g.fillText(card[0], x + 14, y + 24);
    g.fillStyle = card[3];
    g.font = `bold 40px ${FONT}`;
    g.fillText(card[1], x + 14, y + 66);
    g.fillStyle = '#64748B';
    g.font = `16px ${FONT}`;
    g.fillText(card[2], x + 150, y + 66);
  });
  g.fillStyle = '#E2E8F0';
  g.fillRect(0, 292, 480, 28);
  g.fillStyle = '#475569';
  g.font = `14px ${FONT}`;
  g.textAlign = 'center';
  g.fillText('SMEMA  ·  NTM710  ·  出口 0.90 m', 240, 306);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function addRails(pb, x0, x1) {
  const L = x1 - x0;
  const cx = (x0 + x1) / 2;
  for (const s of [-1, 1]) {
    const z = s * RAIL_Z;
    pb.boxC(L, 0.036, 0.036, cx, PCB_Y - 0.026, z, M.metal);
    pb.boxC(L, 0.008, 0.018, cx, PCB_Y - 0.004, z, M.belt);
    pb.boxC(L, 0.014, 0.006, cx, (PCB_Y - 0.008) + 0.007, z + s * 0.015, M.steel);
  }
}

function buildMagazine() {
  const g = new THREE.Group();
  g.name = 'magazineElevator';
  const pb = new PartBuilder();
  const xE = PCB_L / 2 + 0.012;
  const zE = PCB_W / 2 + 0.014;
  const post = 0.014;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      pb.boxC(post, FRAME_H, post, sx * xE, FRAME_H / 2, sz * zE, M.steel);
    }
  }
  for (const y of [0.012, FRAME_H - 0.012]) {
    for (const sz of [-1, 1]) pb.boxC(xE * 2 - post, 0.012, 0.012, 0, y, sz * zE, M.steel);
    for (const sx of [-1, 1]) pb.boxC(0.012, 0.012, zE * 2 - post, sx * xE, y, 0, M.steel);
  }
  // 槽轨托住每层板的两侧，中间敞开，推板可从 -X 进入
  for (let i = 0; i < N; i++) {
    const y = SLOT0 + i * PITCH - PCB_T / 2 - 0.002;
    for (const sz of [-1, 1]) {
      pb.boxC(PCB_L - 0.02, 0.003, 0.012, 0, y, sz * (PCB_W / 2 - 0.012), M.steel);
    }
  }
  // 升降滑块（对准两侧导轨，留 3 mm 间隙）
  for (const sz of [-1, 1]) {
    pb.boxC(0.03, 0.08, 0.02, 0, FRAME_H * 0.55, sz * 0.176, M.steel);
  }
  // 丝杠夹块贴在丝杠 +Z 侧，留 3 mm 间隙
  pb.boxC(0.022, 0.04, 0.024, -0.012, FRAME_H * 0.45, -0.223, M.steel);
  // 顶部压板夹贴在顶框下沿，位于板宽以外，升降时不刮到出口上的板
  for (const sz of [-1, 1]) {
    pb.boxC(0.036, 0.010, 0.016, 0, FRAME_H - 0.023, sz * zE, M.steel);
  }
  pb.build(g, { cloneMaterials: false });
  return g;
}

export function build(device) {
  const group = new THREE.Group();
  group.name = device.id;
  const status = device.status || 'idle';
  const pb = new PartBuilder();

  // 地脚之上的浅色底座与下机柜。底座顶面贴住柜底，不伸进柜体
  pb.boxC(W - 0.12, 0.05, D - 0.12, 0, 0.055, 0, M.gray);
  pb.add(roundedBoxGeo(BODY_W, CAB_TOP - 0.10, BODY_D, 0.04), M.white, 0, 0.10 + (CAB_TOP - 0.10) / 2, 0);
  // 腰线贴在圆角盖板外皮上（挤出倒角各扩 20 mm）
  const cabHx = BODY_W / 2 + 0.02;
  const cabHz = BODY_D / 2 + 0.02;
  const stripeT = 0.012;
  const stripeH = 0.028;
  const stripeY = 0.548;
  // 正面腰线在操作屏立柱处断开，避免立柱穿进饰条
  const stripeX0 = -(cabHx + stripeT);
  const gap0 = 0.33;
  const gap1 = 0.39;
  const stripeX1 = cabHx + stripeT;
  pb.boxC(gap0 - stripeX0, stripeH, stripeT, (stripeX0 + gap0) / 2, stripeY, cabHz + stripeT / 2, M.blue);
  pb.boxC(stripeX1 - gap1, stripeH, stripeT, (gap1 + stripeX1) / 2, stripeY, cabHz + stripeT / 2, M.blue);
  pb.boxC(cabHx * 2 + stripeT * 2, stripeH, stripeT, 0, stripeY, -(cabHz + stripeT / 2), M.blue);
  pb.boxC(stripeT, stripeH, cabHz * 2, -(cabHx + stripeT / 2), stripeY, 0, M.blue);
  pb.boxC(stripeT, stripeH, cabHz * 2, cabHx + stripeT / 2, stripeY, 0, M.blue);
  feet(pb, W, D, 0.09);

  // 上舱骨架：四角立柱 + 顶盖。舱内空出，才能看见料盒
  const postH = ROOF_Y0 - BAY_Y0;
  const postY = BAY_Y0 + postH / 2;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      pb.boxC(0.045, postH, 0.045, sx * (W / 2 - 0.04), postY, sz * (D / 2 - 0.04), M.gray);
    }
  }
  // 顶盖只留边框。开口盖住料盒、推板和出口轨；+X/−Z 角仍是实心，灯塔法兰坐在后框上
  const roofT = H - ROOF_Y0;
  const roofY = (ROOF_Y0 + H) / 2;
  const hx = W / 2;
  const hz = D / 2;
  const ox0 = -0.57;
  const ox1 = 0.57;
  const oz0 = -0.28;
  const oz1 = 0.34;
  pb.boxC(hx * 2, roofT, hz - oz1, 0, roofY, (oz1 + hz) / 2, M.white);
  pb.boxC(hx * 2, roofT, oz0 + hz, 0, roofY, (-hz + oz0) / 2, M.white);
  pb.boxC(ox0 + hx, roofT, oz1 - oz0, (-hx + ox0) / 2, roofY, (oz0 + oz1) / 2, M.white);
  pb.boxC(hx - ox1, roofT, oz1 - oz0, (ox1 + hx) / 2, roofY, (oz0 + oz1) / 2, M.white);
  pb.boxC(W + 0.012, 0.012, 0.012, 0, roofY, hz + 0.006, M.blue);
  pb.boxC(W + 0.012, 0.012, 0.012, 0, roofY, -(hz + 0.006), M.blue);
  const lip = 0.008;
  pb.boxC(ox1 - ox0 - lip * 2, 0.008, oz1 - oz0 - lip * 2, (ox0 + ox1) / 2, roofY + 0.012, (oz0 + oz1) / 2, M.glass);

  // 舱内地台（在腰线之上，料盒最低点仍留空）
  pb.boxC(BODY_W - 0.12, 0.016, BODY_D - 0.16, 0, 0.616, 0, M.gray);

  // 前后观察窗（上舱）
  const glassH = 0.50;
  const glassY = BAY_Y0 + 0.06 + glassH / 2;
  pb.boxC(W - 0.16, glassH, 0.008, 0, glassY, D / 2 - 0.055, M.glass);
  pb.boxC(W - 0.16, glassH, 0.008, 0, glassY, -(D / 2 - 0.055), M.glass);
  // 入口侧（-X）玻璃门：后部换料盒
  pb.boxC(0.008, glassH, D - 0.16, -(W / 2 - 0.055), glassY, 0, M.glass);

  // 出口侧（+X）留过板口。板边贴到立柱内侧面，不嵌入立柱
  const postHalf = 0.0225;
  const exitT = 0.016;
  const exitX = (W / 2 - 0.04 - postHalf) - exitT / 2;
  const slotZ = 0.22;
  const slotY0 = 0.80;
  const slotY1 = 1.02;
  const postInnerZ = D / 2 - 0.04 - postHalf;
  pb.boxC(exitT, slotY0 - BAY_Y0, slotZ * 2, exitX, BAY_Y0 + (slotY0 - BAY_Y0) / 2, 0, M.white);
  pb.boxC(exitT, ROOF_Y0 - slotY1, slotZ * 2, exitX, slotY1 + (ROOF_Y0 - slotY1) / 2, 0, M.white);
  const cheekW = postInnerZ - slotZ;
  const cheekZ = slotZ + cheekW / 2;
  pb.boxC(exitT, postH, cheekW, exitX, postY, cheekZ, M.white);
  pb.boxC(exitT, postH, cheekW, exitX, postY, -cheekZ, M.white);

  // 出口传送段：从料盒嘴外到机外 +X
  const railX0 = 0.06;
  const railX1 = W / 2 + 0.03;
  addRails(pb, railX0, railX1);
  const supBot = 0.624;
  const supTop = PCB_Y - 0.044;
  for (const x of [0.30, 0.48]) {
    for (const s of [-1, 1]) {
      pb.boxC(0.02, supTop - supBot, 0.02, x, (supTop + supBot) / 2, s * RAIL_Z, M.steel);
    }
  }
  // 出口端板卡在两轨内侧，顶面低于输送面
  pb.boxC(0.02, 0.06, RAIL_Z * 2 - 0.036, railX1 - 0.01, PCB_Y - 0.06, 0, M.metal);

  // 升降导轨与丝杠（静）。夹块在丝杠 +Z 侧，导轨与滑块留间隙
  for (const sz of [-1, 1]) {
    pb.boxC(0.016, 0.50, 0.016, MAG_X, 0.874, sz * 0.198, M.steel);
  }
  pb.cyl(0.01, 0.46, MAG_X - 0.012, 0.90, -0.248, M.metal, 12);
  pb.boxC(0.05, 0.046, 0.05, MAG_X - 0.012, 0.647, -0.248, M.darkGray);

  // 气动缸（固定）。鞍座托住缸底，立柱落到地台，不穿进缸体
  pb.cyl(0.02, 0.16, NOSE_X - 0.08, PCB_CY, 0, M.metal, 16, 0, 0, Math.PI / 2);
  const saddleY = PCB_CY - 0.02 - 0.008;
  pb.boxC(0.14, 0.016, 0.046, NOSE_X - 0.08, saddleY, 0, M.metal);
  const colTop = saddleY - 0.008;
  const colBot = 0.624;
  pb.boxC(0.018, colTop - colBot, 0.028, NOSE_X - 0.08, (colTop + colBot) / 2, 0, M.gray);

  // 进出板传感器（出口一对）
  for (const s of [-1, 1]) {
    pb.boxC(0.03, 0.04, 0.025, railX1 - 0.08, PCB_Y + 0.03, s * (RAIL_Z + 0.04), M.darkGray);
    pb.boxC(0.012, 0.012, 0.008, railX1 - 0.08, PCB_Y + 0.03, s * (RAIL_Z + 0.02), M.cyan);
  }

  // 前面板：门板、铭牌、线槽、格栅、急停、指示灯。faceZ 为圆角盖板 +Z 外皮
  const faceZ = BODY_D / 2 + 0.02;
  pb.boxC(0.72, 0.28, 0.008, -0.12, 0.32, faceZ + 0.004, M.ivory);
  const plateMat = new THREE.MeshStandardMaterial({
    map: textTexture('NTM710  上板机', {
      w: 512, h: 128, bg: '#F4F7FB', color: '#1F2A3D',
      font: `bold 54px ${FONT}`,
    }),
    roughness: 0.42,
    metalness: 0.05,
  });
  pb.add(new THREE.PlaneGeometry(0.32, 0.08), plateMat, -0.12, 0.34, faceZ + 0.009);
  vents(pb, -(BODY_W / 2 + 0.024), 0.24, 0.0, 0.32, 0.16, 5, M.darkGray, 'x');
  vents(pb, BODY_W / 2 + 0.024, 0.24, -0.06, 0.26, 0.14, 4, M.darkGray, 'x');
  estop(pb, -0.54, 0.40, faceZ + 0.015);
  pb.cyl(0.012, 0.014, -0.36, 0.44, faceZ + 0.015, M.orange, 12, Math.PI / 2, 0, 0);
  pb.cyl(0.012, 0.014, -0.32, 0.44, faceZ + 0.015, M.green, 12, Math.PI / 2, 0, 0);
  handle(pb, 0.18, glassY, -(D / 2 - 0.055) - 0.016, 0.12);

  // 操作屏支臂立在下柜正面，杆身贴住外皮
  const monX = 0.36;
  const monY = 0.40;
  const monZ = faceZ + 0.018;
  const monRy = -0.42;
  const monArm = 0.22;
  const monW = 0.24;
  const monH = 0.16;
  monitorArm(pb, monX, monY, monZ, { ry: monRy, armH: monArm, w: monW, h: monH, keyboard: false });

  // 灯塔法兰并进金属网格。杆高 0.09 → 灯顶高出机顶 0.09+0.24 = 0.33 m
  const towerX = W / 2 - 0.10;
  const towerZ = -D / 2 + 0.10;
  pb.cyl(0.032, 0.012, towerX, H + 0.006, towerZ, M.metal, 16);

  pb.build(group);
  group.traverse((o) => {
    if (o.isMesh && o.material && o.material.transparent) o.renderOrder = 2;
  });

  // 浅色 HMI，贴在 M.screen 前方 1.5 mm（屏厚 6 mm，中心再沿法线 4.5 mm）
  {
    const monRx = -0.12;
    const s = Math.sin(monRy);
    const c = Math.cos(monRy);
    const mx = monX + s * 0.04;
    const mz = monZ + c * 0.04;
    const scx = mx + s * 0.019;
    const scy = monY + monArm + monH / 2 + 0.02;
    const scz = mz + c * 0.019;
    const faceY = -Math.sin(monRx);
    const faceZ0 = Math.cos(monRx);
    const faceX = faceZ0 * s;
    const faceZ = faceZ0 * c;
    const gap = 0.0045;
    const matHmi = new THREE.MeshBasicMaterial({
      map: hmiTexture(),
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const ui = new THREE.Mesh(new THREE.PlaneGeometry(monW, monH), matHmi);
    ui.name = 'hmi';
    ui.position.set(scx + faceX * gap, scy + faceY * gap, scz + faceZ * gap);
    ui.rotation.set(monRx, monRy, 0);
    group.add(ui);
  }

  // 料盒升降（运动）
  const elevator = buildMagazine();
  group.add(elevator);
  const boardMat = M.pcb.clone();
  boardMat.map = pcbTexture();
  boardMat.color.set(0xffffff);
  const boards = new THREE.InstancedMesh(new THREE.BoxGeometry(PCB_L, PCB_T, PCB_W), boardMat, N);
  boards.name = 'magazineBoards';
  boards.frustumCulled = false;
  boards.castShadow = true;
  elevator.add(boards);

  // 推杆 + 推板（运动）。杆从缸鼻伸出，缩回时不插入缸体
  const pusher = new THREE.Group();
  pusher.name = 'pusher';
  const rod = new THREE.Mesh(new THREE.BoxGeometry(1, 0.012, 0.012), M.chrome.clone());
  rod.name = 'pusherRod';
  rod.castShadow = true;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(BLADE_T, 0.018, 0.12), M.orange.clone());
  blade.name = 'pusherBlade';
  blade.castShadow = true;
  pusher.add(rod, blade);
  pusher.position.set(NOSE_X, PCB_CY, 0);
  group.add(pusher);

  // 正在推出的那块板（运动）
  const exitPcb = new THREE.Mesh(new THREE.BoxGeometry(PCB_L, PCB_T, PCB_W), boardMat);
  exitPcb.name = 'exitPcb';
  exitPcb.castShadow = true;
  exitPcb.position.set(MAG_X, PCB_CY, 0);
  exitPcb.visible = false;
  group.add(exitPcb);

  const dummy = new THREE.Object3D();
  const len0 = rodLenRetracted();

  function layoutBoards(emptyUntil, hideIndex) {
    for (let i = 0; i < N; i++) {
      const gone = i < emptyUntil || i === hideIndex;
      dummy.position.set(0, SLOT0 + i * PITCH, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(gone ? 0.0001 : 1, gone ? 0.0001 : 1, gone ? 0.0001 : 1);
      dummy.updateMatrix();
      boards.setMatrixAt(i, dummy.matrix);
    }
    boards.instanceMatrix.needsUpdate = true;
  }

  function setPusher(len) {
    rod.scale.set(len, 1, 1);
    rod.position.set(len / 2, 0, 0);
    blade.position.set(len + BLADE_T / 2, 0, 0);
  }

  function applyMotion(t, st) {
    if (st !== 'run') {
      elevator.position.set(MAG_X, elevatorY(3), 0);
      layoutBoards(0, -1);
      setPusher(len0);
      exitPcb.visible = false;
      exitPcb.position.set(MAG_X, PCB_CY, 0);
      return;
    }
    const cyc = (t / CYCLE) % N;
    const i = Math.floor(cyc);
    const f = cyc - i;
    const next = (i + 1) % N;
    let ey = elevatorY(i);
    if (f >= 0.62 && f < 0.90) {
      ey = elevatorY(i) + (elevatorY(next) - elevatorY(i)) * smooth01((f - 0.62) / 0.28);
    } else if (f >= 0.90) {
      ey = elevatorY(next);
    }
    elevator.position.set(MAG_X, ey, 0);

    const reloaded = i === N - 1 && f >= 0.62;
    let emptyUntil = reloaded ? 0 : (f >= 0.62 ? i + 1 : i);
    const pushing = !reloaded && f >= 0.12 && f < 0.62;
    layoutBoards(emptyUntil, pushing ? i : -1);

    const approach = smooth01(f / 0.12);
    const pushU = smooth01((f - 0.12) / 0.30);
    const retract = smooth01((f - 0.42) / 0.18);
    let len = len0;
    if (f < 0.12) len = len0 + 0.018 * approach;
    else if (f < 0.42) len = len0 + 0.018 + PUSH * pushU;
    else if (f < 0.62) len = len0 + 0.018 + PUSH * (1 - retract);
    setPusher(len);

    if (pushing && f < 0.62) {
      exitPcb.visible = true;
      const bladeFront = NOSE_X + len + BLADE_T;
      const travel = Math.max(0, bladeFront - (boardEdgeX() - 0.0005));
      let x = MAG_X + Math.min(travel, PUSH);
      if (f >= 0.42) {
        const out = smooth01((f - 0.42) / 0.20);
        x = MAG_X + PUSH + out * 0.50;
      }
      exitPcb.position.set(x, PCB_CY, 0);
    } else {
      exitPcb.visible = false;
    }
  }

  applyMotion(0, status);

  group.userData.lamps = signalTower(group, towerX, H, towerZ, 0.09);
  group.userData.ring = statusRing(W, D);
  group.add(group.userData.ring);
  applyLamps(group.userData.lamps, status);
  setRingStatus(group.userData.ring, status);
  group.userData.animate = (t, _dt, st) => applyMotion(t, st);
  group.userData.size = { w: W, d: D, h: H };
  return group;
}
