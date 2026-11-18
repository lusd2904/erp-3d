// src/three/devices/reelcab.js
// SMT 智能料盘仓储塔（参考 Mycronic MYTower / Mydata SMD-Tower 200）
import * as THREE from 'three';
import { M, lampMat, statusColor } from '../materials.js';
import { PartBuilder, roundedBoxGeo, textTexture } from '../builder.js';
import { signalTower, applyLamps, statusRing, setRingStatus, feet, vents, estop, handle } from '../common.js';

// ─── 尺寸常量与真实外形（机身 2.1m，灯塔顶端高出 0.32m ≤ 0.35m，最低点 y = 0.000m）───
const W_BODY         = 1.00;
const D_BODY         = 0.90;
const H_BODY         = 2.10;
const BASE_H         = 0.10;
const TOWER_H        = 0.32; // pole(0.08) + 4 segs(0.22) + cap(0.02)
const FRONT_OVERHANG = 0.070; // 扫码枪探出前面板距离

const REAL_W = W_BODY;                                // 1.000 m (x: -0.500 ~ +0.500)
const REAL_D = +(D_BODY + FRONT_OVERHANG).toFixed(3);  // 0.970 m (z: -0.450 ~ +0.520)
const REAL_H = +(H_BODY + TOWER_H).toFixed(3);         // 2.420 m (y:  0.000 ~ +2.420)

export const meta = {
  type: 'reelcab',
  name: '智能料塔',
  refs: [
    'Mycronic MYTower component storage series: https://www.mycronic.com/product-areas/pcb-assembly/smt/component-storage/',
    'Mydata SMD-Tower 200 automated SMD reel storage: https://www.as-equipment.de/en/productdetailview/mydata-smd-tower-200/',
  ],
  size: { w: REAL_W, d: REAL_D, h: REAL_H },
};

// ─── 料架规格与排列说明 ──────────────────────────────────────────
const NUM_LAYERS = 6;
const SLOTS_PER_LAYER = 10;
const TOTAL_SLOTS = NUM_LAYERS * SLOTS_PER_LAYER; // 60 个料位

function detHash(seed) {
  let h = (seed * 0x45d9f3b) ^ 0x27d4eb2d;
  h = Math.imul((h >>> 16) ^ h, 0x45d9f3b);
  h = (h >>> 16) ^ h;
  return (h & 0xffff) / 65536;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
  }
}

// ─── 操作屏 UI 贴图（大字号清晰布局，无小字副标题）─────────────
function createScreenUiTexture() {
  const cvs = document.createElement('canvas');
  cvs.width  = 1024;
  cvs.height = 670;
  const ctx  = cvs.getContext('2d');

  // 底色
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, 1024, 670);

  // 顶栏（高度 115px）
  ctx.fillStyle = '#2563EB';
  ctx.fillRect(0, 0, 1024, 115);

  // 标题（≥ 64px）
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 68px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('智能料塔', 40, 58);

  // 状态胶囊标签
  // [人工修正 反重力] 去掉 demo 字样：徽标改为"在线"，底色改为运行绿
  ctx.fillStyle = '#16B364';
  drawRoundedRect(ctx, 800, 30, 184, 55, 12);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 30px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('在线', 892, 58);

  // 3 个大指标数据卡片（标签 ≥ 40px，数字 ≥ 96px）
  const cards = [
    { label: '在库料盘', val: '48 盘', color: '#1E293B', topColor: '#2563EB' },
    { label: '今日出库', val: '136 盘', color: '#2563EB', topColor: '#2563EB' },
    { label: '今日入库', val: '92 盘', color: '#16B364', topColor: '#16B364' },
  ];
  const cardW = 288, cardH = 340, cardY = 145, gap = 40;

  cards.forEach((c, idx) => {
    const cx = 40 + idx * (cardW + gap);
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, cx, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = c.topColor;
    drawRoundedRect(ctx, cx, cardY, cardW, 14, [20, 20, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 42px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.label, cx + cardW / 2, cardY + 80);

    ctx.fillStyle = c.color;
    ctx.font = 'bold 96px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.val, cx + cardW / 2, cardY + 220);
  });

  // 3 个操作按钮（文字 ≥ 36px）
  const buttons = [
    { text: '快速出料', bg: '#2563EB', fg: '#FFFFFF' },
    { text: '扫码入库', bg: '#0284C7', fg: '#FFFFFF' },
    { text: '整塔盘点', bg: '#E2E8F0', fg: '#1E293B', border: '#CBD5E1' },
  ];
  const btnW = 288, btnH = 115, btnY = 515;

  buttons.forEach((b, idx) => {
    const bx = 40 + idx * (btnW + gap);
    ctx.fillStyle = b.bg;
    drawRoundedRect(ctx, bx, btnY, btnW, btnH, 18);
    ctx.fill();
    if (b.border) {
      ctx.strokeStyle = b.border;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.fillStyle = b.fg;
    ctx.font = 'bold 44px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.text, bx + btnW / 2, btnY + btnH / 2);
  });

  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ─── 预建粗边框辅助几何体 ────────────────────────────────────────
function createFrameGeometry(bw, bd, bh, t) {
  const pb = new PartBuilder();
  const dummyMat = new THREE.MeshBasicMaterial();
  const hw = bw / 2, hh = bh / 2, hd = bd / 2;
  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) {
      pb.boxC(bw, t, t, 0, sy * (hh - t / 2), sz * (hd - t / 2), dummyMat);
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      pb.boxC(t, bh - 2 * t, t, sx * (hw - t / 2), 0, sz * (hd - t / 2), dummyMat);
    }
  }
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      pb.boxC(t, t, bd - 2 * t, sx * (hw - t / 2), sy * (hh - t / 2), 0, dummyMat);
    }
  }
  const dummyGroup = new THREE.Group();
  pb.build(dummyGroup, { cloneMaterials: false });
  return dummyGroup.children[0].geometry;
}

function createReelGlowGeometry(r, thick = 0.034) {
  const geo = new THREE.CylinderGeometry(r, r, thick, 32);
  geo.rotateZ(Math.PI / 2);
  return geo;
}

// ─── build 主构建函数 ────────────────────────────────────────────
export function build(device) {
  const group = new THREE.Group();
  group.name  = device.id;

  const matBody   = new THREE.MeshStandardMaterial({ color: 0xF4F7FB, roughness: 0.45, metalness: 0.05 });
  const matPlinth = new THREE.MeshStandardMaterial({ color: 0x2C323B, roughness: 0.65, metalness: 0.20 });
  const matDark   = new THREE.MeshStandardMaterial({ color: 0x4A5361, roughness: 0.55, metalness: 0.25 });
  const matAccent = new THREE.MeshStandardMaterial({ color: 0x2563EB, roughness: 0.40, metalness: 0.15 });
  const matCyan   = new THREE.MeshStandardMaterial({ color: 0x22D3EE, roughness: 0.40, metalness: 0.15 });
  const matSteel  = new THREE.MeshStandardMaterial({ color: 0x8F9AA6, roughness: 0.35, metalness: 0.75 });
  const matMetal  = new THREE.MeshStandardMaterial({ color: 0xB7C0CA, roughness: 0.30, metalness: 0.85 });

  // 观察窗高透玻璃（opacity = 0.20）与窗内 LED 照明条材质
  const matGlass    = new THREE.MeshStandardMaterial({ color: 0xBAE6FD, roughness: 0.05, metalness: 0.15, transparent: true, opacity: 0.20, depthWrite: false });
  const matLedLight = new THREE.MeshStandardMaterial({ color: 0xE0F2FE, emissive: 0xBAE6FD, emissiveIntensity: 1.8, roughness: 0.2 });

  const pb = new PartBuilder();

  // 1. 底座与调平地脚（最低点 y = 0.000m，不低于地面）
  pb.boxC(W_BODY - 0.02, 0.080, D_BODY - 0.02, 0, 0.060, 0, matPlinth);
  pb.boxC(W_BODY - 0.08, 0.035, 0.010, 0, 0.045,  D_BODY / 2 - 0.005, matDark);
  pb.boxC(W_BODY - 0.08, 0.035, 0.010, 0, 0.045, -D_BODY / 2 + 0.005, matDark);
  feet(pb, W_BODY, D_BODY, 0.08);

  // 2. 机身钣金柜体（平齐外形标准尺寸）
  const mainH = H_BODY - BASE_H - 0.045;
  const mainY = BASE_H + mainH / 2;

  // 后背板与左右侧板
  pb.boxC(W_BODY - 0.02, mainH, 0.018, 0, mainY, -D_BODY / 2 + 0.009, matBody);
  pb.boxC(0.018, mainH, D_BODY - 0.02, -W_BODY / 2 + 0.009, mainY, 0, matBody);
  pb.boxC(0.018, mainH, D_BODY - 0.02,  W_BODY / 2 - 0.009, mainY, 0, matBody);

  // 侧面散热格栅
  vents(pb, -W_BODY / 2 + 0.004, 0.35, 0, 0.36, 0.22, 6, matDark, 'x');
  vents(pb, -W_BODY / 2 + 0.004, 1.65, 0, 0.36, 0.22, 6, matDark, 'x');
  vents(pb,  W_BODY / 2 - 0.004, 0.35, 0, 0.36, 0.22, 6, matDark, 'x');
  vents(pb,  W_BODY / 2 - 0.004, 1.65, 0, 0.36, 0.22, 6, matDark, 'x');

  // 机顶盖板与蓝色标识腰带
  pb.boxC(W_BODY, 0.045, D_BODY, 0, H_BODY - 0.0225, 0, matBody);
  pb.boxC(W_BODY, 0.080, D_BODY, 0, H_BODY - 0.075, 0, matAccent);

  // 正面右侧操作区面板
  const opPanelW = 0.40, opPanelX = 0.29;
  pb.boxC(opPanelW, mainH - 0.07, 0.016, opPanelX, mainY - 0.035, D_BODY / 2 - 0.008, matBody);
  pb.boxC(opPanelW - 0.02, 0.006, 0.008, opPanelX, 1.55, D_BODY / 2 + 0.001, matDark);
  pb.boxC(opPanelW - 0.02, 0.006, 0.008, opPanelX, 0.72, D_BODY / 2 + 0.001, matDark);
  handle(pb, 0.44, 0.45, D_BODY / 2 + 0.008, 0.12);
  vents(pb, 0.27, 0.25, D_BODY / 2 + 0.001, 0.22, 0.14, 4, matDark, 'z');

  // 3. 正面透明观察窗（铝框 + 0.20 玻璃 + 窗内高亮 LED 照明条）
  const winCenterX = -0.19, winCenterY = 1.05, winW = 0.54, winH = 1.76;
  const winZ = D_BODY / 2 - 0.008;

  pb.boxC(winW + 0.03, 0.024, 0.022, winCenterX, winCenterY + winH / 2 + 0.012, winZ, matSteel);
  pb.boxC(winW + 0.03, 0.024, 0.022, winCenterX, winCenterY - winH / 2 - 0.012, winZ, matSteel);
  pb.boxC(0.024, winH, 0.022, winCenterX - winW / 2 - 0.012, winCenterY, winZ, matSteel);
  pb.boxC(0.024, winH, 0.022, winCenterX + winW / 2 + 0.012, winCenterY, winZ, matSteel);
  pb.add(new THREE.BoxGeometry(winW, winH, 0.006), matGlass, winCenterX, winCenterY, winZ);

  // 窗内高亮 LED 照明条
  pb.boxC(winW * 0.94, 0.014, 0.016, winCenterX, winCenterY + winH / 2 - 0.016, winZ - 0.022, matLedLight);
  pb.boxC(0.014, winH * 0.94, 0.016, winCenterX - winW / 2 + 0.016, winCenterY, winZ - 0.022, matLedLight);
  pb.boxC(0.014, winH * 0.94, 0.016, winCenterX + winW / 2 - 0.016, winCenterY, winZ - 0.022, matLedLight);

  // 4. 正面操作区部件：出入料口、扫码枪、急停、触摸屏边框
  const ioX = 0.26, ioY = 0.94;
  pb.boxC(0.24, 0.13, 0.12, ioX, ioY, D_BODY / 2 - 0.055, matPlinth);
  pb.frame(0.24, 0.13, 0.02, ioX, ioY, D_BODY / 2 - 0.008, 0.014, matDark);
  pb.boxC(0.20, 0.022, 0.13, ioX, ioY - 0.045, D_BODY / 2 - 0.040, matSteel);
  pb.boxC(0.18, 0.012, 0.07, ioX, ioY - 0.032, D_BODY / 2 - 0.040, matDark);
  pb.boxC(0.18, 0.006, 0.006, ioX, ioY + 0.055, D_BODY / 2 + 0.001, matCyan);

  // 扫码枪（最外端探出前面板 0.070m，即 z = 0.520m）
  const gunX = 0.42, gunY = 1.15;
  pb.boxC(0.045, 0.045, 0.035, gunX, gunY, D_BODY / 2 + 0.008, matDark);
  pb.boxC(0.022, 0.072, 0.022, gunX, gunY + 0.035, D_BODY / 2 + 0.028, matDark, 0.26, 0, 0);
  pb.boxC(0.035, 0.032, 0.062, gunX, gunY + 0.078, D_BODY / 2 + 0.035, matPlinth, 0.16, 0, 0);
  pb.boxC(0.026, 0.018, 0.004, gunX, gunY + 0.086, D_BODY / 2 + 0.068, M.red);

  estop(pb, 0.42, 0.80, D_BODY / 2 + 0.002);

  const screenX = 0.26, screenY = 1.35, screenTilt = -0.10;
  pb.add(new THREE.BoxGeometry(0.28, 0.19, 0.020), matDark, screenX, screenY, D_BODY / 2 + 0.008, screenTilt, 0, 0);
  pb.add(new THREE.BoxGeometry(0.29, 0.20, 0.004), matAccent, screenX, screenY, D_BODY / 2 + 0.001, screenTilt, 0, 0);

  // 5. 窗内多层深槽料架与导轨
  const shelfYList = [0.15, 0.50, 0.85, 1.13, 1.41, 1.65];
  const shelfZ     = 0.06;
  const shelfW     = 0.50;
  const shelfD     = 0.44;

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      pb.boxC(0.022, 1.82, 0.022, winCenterX + sx * (shelfW / 2 - 0.015), 1.05, shelfZ + sz * (shelfD / 2 - 0.015), matSteel);
    }
  }

  const slotStartX   = winCenterX - 0.216;
  const slotSpacingX = 0.048;

  for (let k = 0; k < NUM_LAYERS; k++) {
    const sy = shelfYList[k];
    pb.boxC(shelfW, 0.012, shelfD, winCenterX, sy, shelfZ, matSteel);
    pb.boxC(shelfW, 0.020, 0.010, winCenterX, sy + 0.010, shelfZ + shelfD / 2 - 0.005, matMetal);
    pb.boxC(shelfW, 0.020, 0.010, winCenterX, sy + 0.010, shelfZ - shelfD / 2 + 0.005, matMetal);
    for (let j = 0; j <= SLOTS_PER_LAYER; j++) {
      const divX = slotStartX - slotSpacingX / 2 + j * slotSpacingX;
      pb.boxC(0.003, 0.045, shelfD * 0.88, divX, sy + 0.026, shelfZ, matDark);
    }
  }

  const guideLeftX = winCenterX - 0.21, guideRightX = winCenterX + 0.21, guideZ = 0.31;
  pb.cyl(0.012, 1.80, guideLeftX,  1.05, guideZ, M.chrome, 12);
  pb.cyl(0.012, 1.80, guideRightX, 1.05, guideZ, M.chrome, 12);
  pb.cyl(0.008, 1.80, winCenterX,  1.05, guideZ, matSteel, 10);
  pb.cyl(0.035, 0.08, winCenterX, 1.97, guideZ, matPlinth, 12);
  pb.boxC(0.08, 0.05, 0.06, guideLeftX,  1.96, guideZ, matDark);
  pb.boxC(0.08, 0.05, 0.06, guideRightX, 1.96, guideZ, matDark);
  pb.boxC(0.08, 0.05, 0.06, guideLeftX,  0.15, guideZ, matDark);
  pb.boxC(0.08, 0.05, 0.06, guideRightX, 0.15, guideZ, matDark);

  pb.build(group);

  // 6. 铭牌与操作屏 Mesh
  {
    const nameTex  = textTexture('智能料塔  REEL TOWER', { // [人工修正 反重力] 去掉 demo 字样
      w: 1024, h: 128, font: 'bold 44px "PingFang SC","Microsoft YaHei",sans-serif',
      color: '#FFFFFF', bg: '#2563EB',
    });
    const nameMat  = new THREE.MeshStandardMaterial({ map: nameTex, roughness: 0.4, metalness: 0.1 });
    const nameMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.70, 0.075), nameMat);
    nameMesh.position.set(-0.04, H_BODY - 0.075, D_BODY / 2 + 0.002);
    group.add(nameMesh);
  }
  {
    const uiTex   = createScreenUiTexture();
    const uiMat   = new THREE.MeshBasicMaterial({ map: uiTex });
    const uiMesh  = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.17), uiMat);
    uiMesh.position.set(screenX, screenY, D_BODY / 2 + 0.019);
    uiMesh.rotation.set(screenTilt, 0, 0);
    group.add(uiMesh);
  }

  // 7. SMT 料盘系统（双盘片 + 中间露出卷带料 + 中心轮毂，InstancedMesh 构建）
  const nominalRList = [0.155, 0.155, 0.125, 0.125, 0.095, 0.095];
  const slots = [];

  for (let layer = 0; layer < NUM_LAYERS; layer++) {
    const sy = shelfYList[layer];
    const nomR = nominalRList[layer];
    for (let index = 0; index < SLOTS_PER_LAYER; index++) {
      const i = layer * SLOTS_PER_LAYER + index;
      const sx = slotStartX + index * slotSpacingX;
      slots.push({
        i, layer, index,
        center: new THREE.Vector3(sx, sy + nomR + 0.006, shelfZ),
      });
    }
  }

  group.userData.slotCount = TOTAL_SLOTS;
  group.userData.slots     = slots;

  // A. 双片塑料盘片（合并几何体，露出中间凹槽）
  const flangePb = new PartBuilder();
  flangePb.cyl(1.0, 0.12, -0.44, 0, 0, matAccent, 24, 0, 0, Math.PI / 2);
  flangePb.cyl(1.0, 0.12,  0.44, 0, 0, matAccent, 24, 0, 0, Math.PI / 2);
  const dummyFlangeGroup = new THREE.Group();
  flangePb.build(dummyFlangeGroup, { cloneMaterials: false });
  const flangeGeo = dummyFlangeGroup.children[0].geometry;

  const reelMat  = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.40, metalness: 0.10 });
  const reelMesh = new THREE.InstancedMesh(flangeGeo, reelMat, TOTAL_SLOTS);
  reelMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  reelMesh.castShadow = true;

  // B. 盘片之间露出的深灰色元器件卷带
  const tapeGeo = new THREE.CylinderGeometry(1, 1, 0.74, 24);
  tapeGeo.rotateZ(Math.PI / 2);
  const tapeMat  = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.75, metalness: 0.10 });
  const tapeMesh = new THREE.InstancedMesh(tapeGeo, tapeMat, TOTAL_SLOTS);
  tapeMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  tapeMesh.castShadow = true;

  // C. 中心轮毂
  const hubGeo = new THREE.CylinderGeometry(1, 1, 1.05, 16);
  hubGeo.rotateZ(Math.PI / 2);
  const hubMat  = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.35, metalness: 0.30 });
  const hubMesh = new THREE.InstancedMesh(hubGeo, hubMat, TOTAL_SLOTS);
  hubMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  hubMesh.castShadow = true;

  const dummy  = new THREE.Object3D();
  const _color = new THREE.Color();

  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const slot = slots[i];
    const isEmpty = detHash(i * 13 + 7) < 0.20;

    if (isEmpty) {
      dummy.position.set(0, 0, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      reelMesh.setMatrixAt(i, dummy.matrix);
      tapeMesh.setMatrixAt(i, dummy.matrix);
      hubMesh.setMatrixAt(i, dummy.matrix);
    } else {
      const rH = detHash(i * 37 + 19);
      let r, thick;
      if (slot.layer <= 1) {
        r = 0.145 + rH * 0.015; // 13" 大盘 (0.31m)
        thick = 0.026 + detHash(i * 71 + 3) * 0.008;
      } else if (slot.layer <= 3) {
        r = 0.118 + rH * 0.012; // 10" 中盘 (0.25m)
        thick = 0.022 + detHash(i * 71 + 3) * 0.006;
      } else {
        r = 0.090 + rH * 0.010; // 7" 小盘 (0.19m)
        thick = 0.018 + detHash(i * 71 + 3) * 0.006;
      }

      // 双盘片
      dummy.position.copy(slot.center);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(thick, r, r);
      dummy.updateMatrix();
      reelMesh.setMatrixAt(i, dummy.matrix);

      // 卷带料
      dummy.scale.set(thick, r * 0.82, r * 0.82);
      dummy.updateMatrix();
      tapeMesh.setMatrixAt(i, dummy.matrix);

      // 中心轮毂
      dummy.scale.set(thick, r * 0.28, r * 0.28);
      dummy.updateMatrix();
      hubMesh.setMatrixAt(i, dummy.matrix);

      const cH = detHash(i * 29 + 11);
      let hex;
      if (cH < 0.60) hex = 0x60A5FA;
      else if (cH < 0.78) hex = 0x93C5FD;
      else if (cH < 0.90) hex = 0x2563EB;
      else hex = 0xF4F7FB;

      _color.setHex(hex);
      reelMesh.setColorAt(i, _color);

      _color.setHex(cH < 0.5 ? 0x1E3A8A : 0x334155);
      hubMesh.setColorAt(i, _color);
    }
  }

  reelMesh.instanceMatrix.needsUpdate = true;
  if (reelMesh.instanceColor) reelMesh.instanceColor.needsUpdate = true;
  tapeMesh.instanceMatrix.needsUpdate = true;
  hubMesh.instanceMatrix.needsUpdate = true;
  if (hubMesh.instanceColor) hubMesh.instanceColor.needsUpdate = true;

  group.add(reelMesh);
  group.add(tapeMesh);
  group.add(hubMesh);

  // 8. 内部取料升降机构（独立 Group，可运动）
  const pickerGroup = new THREE.Group();
  pickerGroup.name  = 'pickerGroup';
  const pickerPb    = new PartBuilder();

  pickerPb.boxC(0.44, 0.045, 0.055, winCenterX, 0, guideZ, matSteel);
  pickerPb.cyl(0.018, 0.065, guideLeftX,  0, guideZ, matMetal, 12);
  pickerPb.cyl(0.018, 0.065, guideRightX, 0, guideZ, matMetal, 12);
  pickerPb.boxC(0.042, 0.055, 0.048, winCenterX, 0, guideZ, matDark);
  pickerPb.boxC(0.024, 0.018, 0.25, winCenterX - 0.08, -0.014, 0.16, matSteel);
  pickerPb.boxC(0.024, 0.018, 0.25, winCenterX + 0.08, -0.014, 0.16, matSteel);
  pickerPb.boxC(0.22, 0.014, 0.08, winCenterX, -0.014, 0.03, matSteel);
  pickerPb.boxC(0.20, 0.008, 0.006, winCenterX, 0, guideZ + 0.029, matCyan);

  pickerPb.build(pickerGroup, { cloneMaterials: false });
  pickerGroup.position.set(0, 0.95, 0);
  group.add(pickerGroup);

  // 9. 醒目料位高亮系统（网格数 4 ≤ 4：发光框 + 粗边框 + 点亮料盘发光体 + 窗外灯条箭头）
  const highlightObj = new THREE.Group();
  highlightObj.name  = 'slotHighlight';

  const hlW = 0.076; // X 向加宽包住料盘及左右各 1 cm (0.076 m)

  // 预建 3 类直径尺寸（大盘 0.33m / 中盘 0.27m / 小盘 0.21m）的几何体
  const glowGeos = [
    new THREE.BoxGeometry(hlW, 0.33, 0.33),
    new THREE.BoxGeometry(hlW, 0.27, 0.27),
    new THREE.BoxGeometry(hlW, 0.21, 0.21),
  ];
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xFB923C, transparent: true, opacity: 0.50, depthWrite: false, side: THREE.DoubleSide,
  });
  const glowBox = new THREE.Mesh(glowGeos[1], glowMat);
  highlightObj.add(glowBox);

  // 粗边框（截面严格 0.012 m，合并为 1 个 Mesh，emissive）
  const frameGeos = [
    createFrameGeometry(hlW, 0.33, 0.33, 0.012),
    createFrameGeometry(hlW, 0.27, 0.27, 0.012),
    createFrameGeometry(hlW, 0.21, 0.21, 0.012),
  ];
  const fMatWire = new THREE.MeshStandardMaterial({
    color: 0xFB923C, emissive: 0xFB923C, emissiveIntensity: 1.1, roughness: 0.3,
  });
  const frameMesh = new THREE.Mesh(frameGeos[1], fMatWire);
  highlightObj.add(frameMesh);

  // 被高亮料盘本身发光体（同直径橙色扁圆柱，depthWrite: false）
  const reelGlowGeos = [
    createReelGlowGeometry(0.155),
    createReelGlowGeometry(0.125),
    createReelGlowGeometry(0.095),
  ];
  const reelGlowMat = new THREE.MeshBasicMaterial({
    color: 0xFB923C, transparent: true, opacity: 0.65, depthWrite: false, side: THREE.DoubleSide,
  });
  const reelGlowMesh = new THREE.Mesh(reelGlowGeos[1], reelGlowMat);
  highlightObj.add(reelGlowMesh);

  // 窗外指示：横跨整扇观察窗宽度的橙色发光灯条（高 0.025 m）+ 该料位 X 处朝下小三角箭头（0.06 m）
  const indicatorGeos = [];
  const barW = winW, barH = 0.025, arrowW = 0.06, arrowH = 0.05;
  for (let j = 0; j < SLOTS_PER_LAYER; j++) {
    const lx = -0.216 + j * slotSpacingX;
    const s = new THREE.Shape();
    s.moveTo(-barW / 2, -barH / 2);
    s.lineTo(lx - arrowW / 2, -barH / 2);
    s.lineTo(lx, -barH / 2 - arrowH);
    s.lineTo(lx + arrowW / 2, -barH / 2);
    s.lineTo(barW / 2, -barH / 2);
    s.lineTo(barW / 2, barH / 2);
    s.lineTo(-barW / 2, barH / 2);
    s.closePath();
    indicatorGeos.push(new THREE.ShapeGeometry(s));
  }

  const indicatorMat = new THREE.MeshBasicMaterial({
    color: 0xFB923C, depthTest: false, transparent: true, opacity: 0.95,
  });
  const indicatorMesh = new THREE.Mesh(indicatorGeos[0], indicatorMat);
  indicatorMesh.renderOrder = 999;
  highlightObj.add(indicatorMesh);

  let activeHighlightIndex = -1;

  group.userData.highlightSlot = (slotIdx) => {
    if (slotIdx === null || slotIdx === undefined || typeof slotIdx !== 'number' || slotIdx < 0 || slotIdx >= slots.length) {
      if (activeHighlightIndex !== -1) {
        group.remove(highlightObj);
        activeHighlightIndex = -1;
      }
      return false;
    }

    const targetSlot = slots[slotIdx];
    const type = targetSlot.layer <= 1 ? 0 : (targetSlot.layer <= 3 ? 1 : 2);

    glowBox.geometry = glowGeos[type];
    glowBox.position.copy(targetSlot.center);

    frameMesh.geometry = frameGeos[type];
    frameMesh.position.copy(targetSlot.center);

    reelGlowMesh.geometry = reelGlowGeos[type];
    reelGlowMesh.position.copy(targetSlot.center);

    indicatorMesh.geometry = indicatorGeos[targetSlot.index];
    indicatorMesh.position.set(winCenterX, targetSlot.center.y + 0.055, D_BODY / 2 + 0.003);

    if (activeHighlightIndex === -1) {
      group.add(highlightObj);
    }
    activeHighlightIndex = slotIdx;
    return true;
  };

  // 10. 灯塔与状态光环
  group.userData.lamps = signalTower(group, 0.38, H_BODY, -0.28, 0.08);
  applyLamps(group.userData.lamps, device.status);

  group.userData.ring = statusRing(W_BODY, D_BODY);
  group.add(group.userData.ring);
  setRingStatus(group.userData.ring, device.status);

  // 11. 动画逻辑（高亮呼吸在所有状态生效；非 run 状态托架保持当前位置不动）
  group.userData.animate = (t, _dt, status) => {
    if (activeHighlightIndex !== -1) {
      const pulse = 0.50 + 0.10 * Math.sin(t * 4.5);
      glowMat.opacity = pulse;
      fMatWire.emissiveIntensity = 0.85 + 0.40 * Math.sin(t * 4.5);
      reelGlowMat.opacity = 0.55 + 0.20 * Math.sin(t * 4.5);
      indicatorMat.opacity = 0.82 + 0.18 * Math.sin(t * 4.5);
      const wave = 1.0 + 0.02 * Math.sin(t * 4.5);
      glowBox.scale.set(wave, wave, wave);
      frameMesh.scale.set(wave, wave, wave);
      reelGlowMesh.scale.set(wave, wave, wave);
    }

    if (status !== 'run') {
      // 非 run 状态保持当前位置不动，不跳变复位
      return;
    }

    const cycle = 12.0;
    const ph    = t % cycle;
    let targetY = 0.95;

    if (ph < 2.0) {
      const u = ph / 2.0;
      const ease = 0.5 - 0.5 * Math.cos(u * Math.PI);
      targetY = 0.95 + (1.51 - 0.95) * ease;
    } else if (ph < 4.0) {
      targetY = 1.51;
    } else if (ph < 6.0) {
      const u = (ph - 4.0) / 2.0;
      const ease = 0.5 - 0.5 * Math.cos(u * Math.PI);
      targetY = 1.51 + (0.66 - 1.51) * ease;
    } else if (ph < 8.0) {
      targetY = 0.66;
    } else if (ph < 10.0) {
      const u = (ph - 8.0) / 2.0;
      const ease = 0.5 - 0.5 * Math.cos(u * Math.PI);
      targetY = 0.66 + (0.95 - 0.66) * ease;
    } else {
      targetY = 0.95;
    }

    pickerGroup.position.y = targetY;
  };

  group.userData.size = meta.size;
  return group;
}
