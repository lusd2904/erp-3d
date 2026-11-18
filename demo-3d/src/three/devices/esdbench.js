// src/three/devices/esdbench.js
// 防静电（ESD）检验工作台 — 参考 Treston WB/TP 工业防静电工作台系统
import * as THREE from 'three';
import { M } from '../materials.js';
import { PartBuilder, roundedBoxGeo } from '../builder.js';
import { statusRing, setRingStatus } from '../common.js';

export const meta = {
  type: 'esdbench',
  name: '防静电检验工作台',
  refs: [
    'Treston WB ESD 电动升降工作台 1500×800: https://www.treston.com/workbenches/wb-workbench/wb-electric-adjustable-bench-esd-1500x800',
    'Treston TP ESD 工作台 1200×700: https://www.treston.com/workbenches/tp-workbench/tp-workbench-esd-1200x700',
    'Treston ESD 工作台配件（立柱、层板、料盒挂条、放大镜灯 Wave LED ESD、接地/腕带连接）: https://www.treston.com/esd-products/esd-workbenches',
  ],
  size: { w: 1.496, d: 1.239, h: 1.62 },
};

// ─── 几何与布局常数（严格与实测外廓 X 1.496、Y 1.62、Z 1.239 一致）──────
const W            = 1.496; // 整体外形跨度 X（-0.748 ~ +0.748）
const D            = 1.239; // 整体外形跨度 Z（-0.575 ~ +0.664）
const H            = 1.620; // 整体最高点 Y（0.000 ~ 1.620，铝型材立柱顶端）

const BENCH_W      = 1.50;  // 台面外廓宽（倒角后实际跨度 1.496）
const BENCH_D      = 0.75;  // 台面外廓深（Z）
const BENCH_H      = 0.78;  // 台面顶面高度（严格保证台面顶面 y = 0.780）
const BENCH_TOP_T  = 0.032; // 台面厚度
const BENCH_ZC     = -0.20; // 工作台中心 Z

const Z_FRONT      = BENCH_ZC + BENCH_D / 2; // 台面前沿 Z = +0.175
const Z_BACK       = BENCH_ZC - BENCH_D / 2; // 台面后沿 Z = -0.575

const LEG_INSET    = 0.06;
const LEG_X        = BENCH_W / 2 - LEG_INSET;   // 0.69
const LEG_Z_FRONT  = Z_FRONT - LEG_INSET;       // +0.115
const LEG_Z_BACK   = Z_BACK + LEG_INSET;        // -0.515

const UPRIGHT_X    = 0.56;                      // 铝型材立柱 X 跨距
const UPRIGHT_Z    = LEG_Z_BACK;                // 立柱位于台后腿线上（Z = -0.515）
const SHELF_Y      = 1.30;                      // 顶部层板中心高度
const SHELF_Z      = UPRIGHT_Z + 0.11;          // 层板中心 Z（-0.405）

const SCOPE_X      = -0.18;                     // 体视显微镜中心 X
const SCOPE_Z      = -0.22;                     // 体视显微镜中心 Z

const CHAIR_X      = 0.08;                      // 防静电椅中心 X
const CHAIR_Z      = 0.398;                     // 防静电椅中心 Z
const CHAIR_RY     = Math.PI - 0.20;            // 朝向工作台，带微角度自然转角

// ─── 专用材质定义 ────────────────────────────────────────────────
const matFrame        = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.45, metalness: 0.20 });
const matTableTop     = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.40, metalness: 0.05 });
const matEsdMat       = new THREE.MeshStandardMaterial({ color: 0x3fa796, roughness: 0.65, metalness: 0.02 }); // 哑光蓝绿防静电胶垫
const matEsdYellow    = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.50, metalness: 0.10 }); // ESD 黄色接地/标识
const matBinLightBlue = new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.50, metalness: 0.05 }); // 料盒浅蓝
const matChairSeat    = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.65, metalness: 0.05 }); // 低饱和浅灰蓝
const matChairBack    = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.60, metalness: 0.10 }); // 深一点的灰蓝背壳

// 显微镜与放大镜环形灯发光材质
const matLampGlow     = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xbae6fd,
  emissiveIntensity: 0.85,
  roughness: 0.20,
  metalness: 0.05,
});

// 生成层板前沿白底深蓝字清晰编号标签条
function createShelfLabelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');

  // 白底
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1536, 80);

  // 均匀分格与细分隔线
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  const colW = 1536 / 6;

  // 深蓝 #1E3A8A 粗体大字
  ctx.font = 'bold 46px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillStyle = '#1e3a8a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < 6; i++) {
    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(i * colW, 8);
      ctx.lineTo(i * colW, 72);
      ctx.stroke();
    }
    ctx.fillText(`0${i + 1}`, (i + 0.5) * colW, 41);
  }

  // 边框装饰线增强立体感
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 1534, 78);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function build(device) {
  const group = new THREE.Group();
  group.name = device.id;

  const pb = new PartBuilder();

  // ══════════════════════════════════════════════════════════════
  // 1. 工作台框架与台面（顶面严格 = BENCH_H 0.780）
  // ══════════════════════════════════════════════════════════════

  // 台面外廓（带 0.010 bevel，实际外形精确为 1.496 × 0.032 × 0.75 m）
  const topB = 0.010;
  pb.add(
    roundedBoxGeo(BENCH_W - 2 * topB, BENCH_TOP_T - 2 * topB, BENCH_D - 2 * topB, topB),
    matTableTop,
    0,
    BENCH_H - BENCH_TOP_T / 2,
    BENCH_ZC
  );

  // 四腿（铝型材 50×50mm）
  const legH = BENCH_H - BENCH_TOP_T - 0.035;
  const legCenterY = 0.035 + legH / 2;
  for (const sx of [-1, 1]) {
    for (const sz of [LEG_Z_FRONT, LEG_Z_BACK]) {
      pb.boxC(0.050, legH, 0.050, sx * LEG_X, legCenterY, sz, matFrame);

      // 调平地脚（金属螺栓 + 黑色防震底盘，底面接触 y=0）
      pb.cyl(0.032, 0.016, sx * LEG_X, 0.008, sz, M.black, 12);
      pb.cyl(0.010, 0.024, sx * LEG_X, 0.022, sz, M.steel, 8);
    }
  }

  // 台面下方横撑与承重框
  const frameSpanX = (LEG_X * 2) - 0.05;
  const frameSpanZ = (LEG_Z_FRONT - LEG_Z_BACK) - 0.05;
  pb.boxC(frameSpanX, 0.040, 0.030, 0, BENCH_H - BENCH_TOP_T - 0.020, LEG_Z_FRONT, matFrame);
  pb.boxC(frameSpanX, 0.050, 0.040, 0, BENCH_H - BENCH_TOP_T - 0.025, LEG_Z_BACK, matFrame);
  for (const sx of [-1, 1]) {
    pb.boxC(0.040, 0.045, frameSpanZ, sx * LEG_X, BENCH_H - BENCH_TOP_T - 0.0225, BENCH_ZC, matFrame);
  }

  // 底部加固横撑与脚踏撑
  pb.boxC(frameSpanX, 0.030, 0.040, 0, 0.18, LEG_Z_BACK, matFrame);
  for (const sx of [-1, 1]) {
    pb.boxC(0.030, 0.040, frameSpanZ, sx * LEG_X, 0.18, BENCH_ZC, matFrame);
  }

  // 蓝绿色防静电胶垫（哑光 #3FA796，外带 2mm 深色包边）
  const matW = 1.36, matD = 0.65, matH = 0.0025;
  const matY = BENCH_H + matH / 2; // 0.78125，胶垫坐于台面顶面
  const matZ = BENCH_ZC + 0.010;   // -0.190
  pb.boxC(matW, matH, matD, 0, matY, matZ, matEsdMat);

  // 胶垫深色边框包边（复用 M.darkGray 保持低网格数）
  const borderW = 0.004;
  pb.boxC(matW + borderW * 2, matH, borderW, 0, matY, matZ - matD / 2 - borderW / 2, M.darkGray);
  pb.boxC(matW + borderW * 2, matH, borderW, 0, matY, matZ + matD / 2 + borderW / 2, M.darkGray);
  pb.boxC(borderW, matH, matD, -matW / 2 - borderW / 2, matY, matZ, M.darkGray);
  pb.boxC(borderW, matH, matD,  matW / 2 + borderW / 2, matY, matZ, M.darkGray);

  // 胶垫左后角铜质接地母扣 + 规整敷设至台下接地端子的黄绿双色接地线
  const snapX = -matW / 2 + 0.06;
  const snapZ = matZ - matD / 2 + 0.06;
  pb.cyl(0.009, 0.004, snapX, BENCH_H + 0.0045, snapZ, M.copper, 12);
  pb.cyl(0.004, 0.006, snapX, BENCH_H + 0.0060, snapZ, M.chrome, 8);

  // 台下接地汇流端子与走线
  const termX = -LEG_X;
  const termY = BENCH_H - 0.055;
  pb.boxC(0.024, 0.022, 0.024, termX + 0.012, termY, snapZ, M.copper);
  pb.cyl(0.0025, 0.035, snapX, BENCH_H - 0.012, snapZ, matEsdYellow, 8);
  pb.boxC(Math.abs(termX + 0.012 - snapX), 0.005, 0.005, (snapX + termX + 0.012) / 2, BENCH_H - 0.030, snapZ, matEsdYellow);
  pb.cyl(0.0025, 0.030, termX + 0.012, termY + 0.018, snapZ, matEsdYellow, 8);
  pb.cyl(0.0035, 0.45, termX + 0.022, 0.45, LEG_Z_BACK, matEsdYellow, 8);

  // 右侧金属抽屉柜（3层浅灰柜体带镀铬拉手）
  const drawerW = 0.36, drawerH = 0.34, drawerD = 0.50;
  const drawerX = 0.45;
  const drawerY = BENCH_H - BENCH_TOP_T - drawerH / 2 - 0.006;
  pb.boxC(drawerW, drawerH, drawerD, drawerX, drawerY, BENCH_ZC, matFrame);
  for (let d = 0; d < 3; d++) {
    const dy = drawerY - drawerH / 2 + 0.055 + d * 0.115;
    pb.boxC(drawerW - 0.024, 0.098, 0.012, drawerX, dy, LEG_Z_FRONT - 0.014, matTableTop);
    pb.boxC(0.10, 0.014, 0.018, drawerX, dy, LEG_Z_FRONT - 0.002, M.chrome);
  }

  // ══════════════════════════════════════════════════════════════
  // 2. 上层立柱、层板、前开口斜口零件盒、接地插座排与顶部照明
  // ══════════════════════════════════════════════════════════════

  // 铝型材立柱（顶高严格到达 H = 1.620）
  const uprightH = H - 0.40;
  const uprightCenterY = 0.40 + uprightH / 2; // 1.010
  for (const sx of [-1, 1]) {
    pb.boxC(0.045, uprightH, 0.055, sx * UPRIGHT_X, uprightCenterY, UPRIGHT_Z, matFrame);
    pb.boxC(0.010, uprightH - 0.06, 0.006, sx * UPRIGHT_X, uprightCenterY, UPRIGHT_Z + 0.028, M.darkGray);
  }

  // 上层层板（前沿 Z = SHELF_Z + shelfD / 2 = -0.265）
  const shelfW = 1.38, shelfD = 0.28, shelfT = 0.022;
  pb.boxC(shelfW, shelfT, shelfD, 0, SHELF_Y, SHELF_Z, matTableTop);

  // 层板三角承重托架
  for (const sx of [-1, 1]) {
    pb.boxC(0.024, 0.14, 0.24, sx * UPRIGHT_X, SHELF_Y - 0.08, SHELF_Z, matFrame);
  }

  // 6 个工业标准前开口斜口零件盒（背高前低、前部开口取料、浅蓝与白色交替）
  const binW = 0.16, binD = 0.22, binBackH = 0.080, binFrontH = 0.032;
  const binFloorY = SHELF_Y + shelfT / 2;
  for (let i = 0; i < 6; i++) {
    const bx = -0.50 + i * 0.20;
    const bz = SHELF_Z;
    const binMat = i % 2 === 0 ? matBinLightBlue : M.white;

    // 料盒底板与后高壁
    pb.boxC(binW, 0.006, binD, bx, binFloorY + 0.003, bz, binMat);
    pb.boxC(binW, binBackH, 0.008, bx, binFloorY + binBackH / 2, bz - binD / 2 + 0.004, binMat);

    // 左右阶梯斜向侧壁（后高前低）
    for (const sx of [-1, 1]) {
      const cx = bx + sx * (binW / 2 - 0.003);
      pb.boxC(0.006, binFrontH, binD, cx, binFloorY + binFrontH / 2, bz, binMat);
      pb.boxC(0.006, binBackH - binFrontH, binD * 0.55, cx, binFloorY + binFrontH + (binBackH - binFrontH) / 2, bz - binD * 0.225, binMat);
    }
    // 前部开口低矮挡檐 + 白色标识卡片位
    pb.boxC(binW, binFrontH, 0.006, bx, binFloorY + binFrontH / 2, bz + binD / 2 - 0.003, binMat);
    pb.boxC(binW * 0.55, 0.016, 0.002, bx, binFloorY + binFrontH / 2, bz + binD / 2 + 0.001, M.white);
  }

  // 右立柱前沿醒目浅灰 ESD 接地面板（3个黑色插孔 + 黄色静电标 + 黄绿螺旋腕带线）
  const panelX = UPRIGHT_X;
  const panelY = 1.08;
  const panelZ = UPRIGHT_Z + 0.028 + 0.011;
  pb.boxC(0.072, 0.115, 0.022, panelX, panelY, panelZ, matFrame);
  pb.boxC(0.048, 0.030, 0.003, panelX, panelY + 0.036, panelZ + 0.011, matEsdYellow);
  pb.cyl(0.004, 0.005, panelX, panelY + 0.036, panelZ + 0.013, M.black, 10, Math.PI / 2, 0, 0);

  // 3 个黑色香蕉插孔（带金属导电内芯）
  for (let k = 0; k < 3; k++) {
    const jy = panelY - 0.002 - k * 0.024;
    pb.cyl(0.007, 0.008, panelX, jy, panelZ + 0.011, M.black, 12, Math.PI / 2, 0, 0);
    pb.cyl(0.003, 0.009, panelX, jy, panelZ + 0.011, M.chrome, 8, Math.PI / 2, 0, 0);
  }

  // 黄绿色螺旋弹簧腕带接地引线（垂下通向台前边缘插座）
  for (let s = 0; s < 5; s++) {
    const cy = panelY - 0.065 - s * 0.036;
    const cx = panelX - 0.010 + Math.sin(s * 1.4) * 0.008;
    const cz = panelZ + 0.025 + Math.cos(s * 1.4) * 0.008;
    pb.add(new THREE.TorusGeometry(0.014, 0.0032, 8, 16), matEsdYellow, cx, cy, cz, 0.35, 0.2 * s, 0);
  }

  // 台面前沿右侧双工位腕带插座盒子
  const benchJackX = 0.52;
  const benchJackZ = Z_FRONT;
  pb.boxC(0.045, 0.028, 0.032, benchJackX, BENCH_H - 0.020, benchJackZ, M.black);
  pb.boxC(0.036, 0.016, 0.002, benchJackX, BENCH_H - 0.020, benchJackZ + 0.017, matEsdYellow);
  pb.cyl(0.005, 0.006, benchJackX - 0.010, BENCH_H - 0.020, benchJackZ + 0.017, M.chrome, 8, Math.PI / 2, 0, 0);
  pb.cyl(0.005, 0.006, benchJackX + 0.010, BENCH_H - 0.020, benchJackZ + 0.017, M.chrome, 8, Math.PI / 2, 0, 0);
  pb.cyl(0.003, 0.22, (panelX + benchJackX) / 2, 0.86, (panelZ + benchJackZ) / 2, matEsdYellow, 8, 0.85, 0, -0.15);

  // 蓝色防静电手环环体（放置于右侧台面上）
  pb.add(new THREE.TorusGeometry(0.035, 0.006, 8, 18), matBinLightBlue, 0.48, BENCH_H + matH + 0.006, 0.02, Math.PI / 2, 0, 0);

  // 顶部 LED 照明灯条（复用 M.white 洁白灯罩）
  const ledY = 1.58;
  const ledZ = UPRIGHT_Z + 0.06;
  pb.boxC(1.24, 0.036, 0.12, 0, ledY, ledZ, matFrame);
  pb.boxC(1.18, 0.006, 0.09, 0, ledY - 0.019, ledZ, M.white);
  pb.boxC(0.030, 0.040, 0.08, -UPRIGHT_X, ledY, UPRIGHT_Z + 0.02, matFrame);
  pb.boxC(0.030, 0.040, 0.08,  UPRIGHT_X, ledY, UPRIGHT_Z + 0.02, matFrame);

  // ══════════════════════════════════════════════════════════════
  // 3. 台面检验器具：体视显微镜、放大镜灯、测量工具、待检 PCB
  // ══════════════════════════════════════════════════════════════

  // 体视显微镜底座（外形严格按 0.20 × 0.022 × 0.24 m 计算，坐于胶垫顶面 y=0.7825）
  const scopeB = 0.008;
  const scopeBaseY = BENCH_H + matH + 0.022 / 2; // 0.7935
  pb.add(
    roundedBoxGeo(0.20 - 2 * scopeB, 0.022 - 2 * scopeB, 0.24 - 2 * scopeB, scopeB),
    matTableTop,
    SCOPE_X, scopeBaseY, SCOPE_Z
  );

  // 显微镜黑白对比载物台盘与压片（载物台顶面在 y = 0.8065）
  const stageY = BENCH_H + matH + 0.022 + 0.002;
  pb.cyl(0.065, 0.004, SCOPE_X, stageY, SCOPE_Z + 0.02, M.darkGray, 24);
  pb.boxC(0.008, 0.003, 0.045, SCOPE_X - 0.048, stageY + 0.002, SCOPE_Z + 0.02, M.chrome);
  pb.boxC(0.008, 0.003, 0.045, SCOPE_X + 0.048, stageY + 0.002, SCOPE_Z + 0.02, M.chrome);

  // 显微镜立柱与调焦托架
  pb.cyl(0.014, 0.30, SCOPE_X, BENCH_H + 0.17, SCOPE_Z - 0.07, M.chrome, 16);
  pb.boxC(0.070, 0.090, 0.090, SCOPE_X, BENCH_H + 0.22, SCOPE_Z - 0.04, matTableTop);
  pb.cyl(0.020, 0.024, SCOPE_X - 0.045, BENCH_H + 0.22, SCOPE_Z - 0.04, M.darkGray, 16, 0, 0, Math.PI / 2);
  pb.cyl(0.020, 0.024, SCOPE_X + 0.045, BENCH_H + 0.22, SCOPE_Z - 0.04, M.darkGray, 16, 0, 0, Math.PI / 2);

  // 显微镜光学镜体与倾斜 45° 双目镜筒
  pb.boxC(0.080, 0.100, 0.090, SCOPE_X, BENCH_H + 0.24, SCOPE_Z + 0.01, matTableTop);
  const eyeAngle = -Math.PI / 5;
  pb.boxC(0.084, 0.050, 0.070, SCOPE_X, BENCH_H + 0.30, SCOPE_Z + 0.02, matTableTop, -Math.PI / 6, 0, 0);
  pb.cyl(0.011, 0.070, SCOPE_X - 0.022, BENCH_H + 0.33, SCOPE_Z + 0.045, M.chrome, 12, eyeAngle, 0, 0);
  pb.cyl(0.011, 0.070, SCOPE_X + 0.022, BENCH_H + 0.33, SCOPE_Z + 0.045, M.chrome, 12, eyeAngle, 0, 0);
  pb.cyl(0.015, 0.018, SCOPE_X - 0.022, BENCH_H + 0.365, SCOPE_Z + 0.065, M.black, 14, eyeAngle, 0, 0, 0.018);
  pb.cyl(0.015, 0.018, SCOPE_X + 0.022, BENCH_H + 0.365, SCOPE_Z + 0.065, M.black, 14, eyeAngle, 0, 0, 0.018);

  // 下向物镜及环形照明外壳
  pb.cyl(0.022, 0.038, SCOPE_X, BENCH_H + 0.175, SCOPE_Z + 0.02, M.darkGray, 16);
  pb.cyl(0.016, 0.018, SCOPE_X, BENCH_H + 0.150, SCOPE_Z + 0.02, M.chrome, 16);
  pb.cyl(0.035, 0.020, SCOPE_X, BENCH_H + 0.142, SCOPE_Z + 0.02, M.darkGray, 20);

  // 显微镜环形灯发光盘（面朝载物台，并入 PartBuilder）
  pb.add(new THREE.RingGeometry(0.018, 0.033, 24), matLampGlow, SCOPE_X, BENCH_H + 0.131, SCOPE_Z + 0.02, Math.PI / 2, 0, 0);

  // 放大镜台灯（左边缘桌夹 + 弹簧双摇臂 + 环形灯头）
  const clampX = -0.71, clampZ = -0.20;
  pb.boxC(0.040, 0.080, 0.060, clampX, BENCH_H - 0.01, clampZ, M.darkGray);
  pb.cyl(0.012, 0.030, clampX, BENCH_H - 0.07, clampZ, M.steel, 10);
  pb.cyl(0.016, 0.035, clampX + 0.01, BENCH_H + 0.03, clampZ, M.darkGray, 12);
  pb.cyl(0.005, 0.32, -0.62, BENCH_H + 0.18, -0.18, M.steel, 8, 0.12, 0, -0.52);
  pb.cyl(0.004, 0.18, -0.63, BENCH_H + 0.17, -0.18, M.chrome, 8, 0.12, 0, -0.52);
  pb.boxC(0.028, 0.028, 0.028, -0.54, BENCH_H + 0.32, -0.16, M.darkGray);
  pb.cyl(0.005, 0.22, -0.44, BENCH_H + 0.29, -0.15, M.steel, 8, -0.09, 0, 0.22);

  // 环形放大镜灯头外壳与玻璃透镜
  const magX = -0.34, magY = BENCH_H + 0.26, magZ = -0.14;
  const magRx = 0.20, magRz = -0.32;
  pb.add(new THREE.TorusGeometry(0.075, 0.014, 12, 24), matTableTop, magX, magY, magZ, magRx, 0, magRz);
  pb.add(new THREE.CylinderGeometry(0.060, 0.060, 0.004, 24), M.glass, magX, magY, magZ, magRx, 0, magRz);

  // 放大镜环形灯发光环（并入 PartBuilder 共享发光材质）
  pb.add(new THREE.RingGeometry(0.052, 0.070, 24), matLampGlow, magX, magY - 0.005, magZ, magRx + Math.PI / 2, 0, magRz);

  // 数字万用表（黄色防摔套 + 灰黑液晶屏 + 旋钮 + 表笔）坐于胶垫上
  const dmmX = 0.32, dmmZ = -0.10, dmmY = BENCH_H + matH;
  pb.boxC(0.095, 0.032, 0.165, dmmX, dmmY + 0.016, dmmZ, matEsdYellow);
  pb.boxC(0.082, 0.004, 0.152, dmmX, dmmY + 0.032, dmmZ, M.darkGray);
  pb.boxC(0.064, 0.002, 0.038, dmmX, dmmY + 0.034, dmmZ - 0.045, M.darkGray);
  pb.boxC(0.056, 0.001, 0.030, dmmX, dmmY + 0.035, dmmZ - 0.045, M.white); // 液晶屏白色数显底
  pb.cyl(0.018, 0.008, dmmX, dmmY + 0.036, dmmZ + 0.010, M.black, 16);
  pb.cyl(0.004, 0.006, dmmX - 0.020, dmmY + 0.034, dmmZ + 0.056, M.steel, 8);
  pb.cyl(0.004, 0.006, dmmX + 0.000, dmmY + 0.034, dmmZ + 0.056, M.steel, 8);
  pb.cyl(0.004, 0.006, dmmX + 0.020, dmmY + 0.034, dmmZ + 0.056, M.steel, 8);
  pb.cyl(0.004, 0.085, dmmX - 0.060, dmmY + 0.004, dmmZ + 0.040, matEsdYellow, 8, 0, 0.4, Math.PI / 2);
  pb.cyl(0.0015, 0.015, dmmX - 0.060 - 0.045 * Math.cos(0.4), dmmY + 0.004, dmmZ + 0.040 - 0.045 * Math.sin(0.4), M.steel, 8, 0, 0.4, Math.PI / 2);
  pb.cyl(0.004, 0.085, dmmX - 0.060, dmmY + 0.004, dmmZ + 0.080, M.black, 8, 0, 0.3, Math.PI / 2);
  pb.cyl(0.0015, 0.015, dmmX - 0.060 - 0.045 * Math.cos(0.3), dmmY + 0.004, dmmZ + 0.080 - 0.045 * Math.sin(0.3), M.steel, 8, 0, 0.3, Math.PI / 2);

  // 数显游标卡尺（不锈钢尺身 + 滑块）
  const calX = 0.52, calZ = -0.20, calY = BENCH_H + matH;
  pb.boxC(0.220, 0.003, 0.016, calX, calY + 0.0015, calZ, M.steel);
  pb.boxC(0.014, 0.003, 0.048, calX - 0.10, calY + 0.0015, calZ + 0.016, M.steel);
  pb.boxC(0.045, 0.008, 0.028, calX - 0.02, calY + 0.005, calZ, M.darkGray);
  pb.boxC(0.012, 0.003, 0.046, calX - 0.035, calY + 0.0015, calZ + 0.016, M.steel);

  // 浅色防静电周转托盘（约 0.28 × 0.22 m，放置 2 块真实尺寸 PCB）
  const trayX = 0.22, trayZ = -0.28, trayY = BENCH_H + matH;
  pb.boxC(0.280, 0.006, 0.220, trayX, trayY + 0.003, trayZ, M.white);
  pb.frame(0.280, 0.018, 0.220, trayX, trayY + 0.009, trayZ, 0.008, M.white);

  // 托盘 PCB 1（真实尺寸：0.18 × 0.12 m）
  const pcb1X = trayX - 0.045, pcb1Z = trayZ, pcb1Y = trayY + 0.007;
  pb.boxC(0.180, 0.002, 0.120, pcb1X, pcb1Y, pcb1Z, M.pcb);
  pb.boxC(0.038, 0.004, 0.038, pcb1X - 0.035, pcb1Y + 0.003, pcb1Z, M.pcbChip);
  pb.boxC(0.024, 0.003, 0.024, pcb1X + 0.030, pcb1Y + 0.0025, pcb1Z - 0.025, M.pcbChip);
  pb.boxC(0.060, 0.001, 0.008, pcb1X, pcb1Y + 0.0015, pcb1Z + 0.050, M.copper);
  pb.boxC(0.040, 0.001, 0.003, pcb1X - 0.020, pcb1Y + 0.0015, pcb1Z - 0.035, M.white);

  // 托盘 PCB 2（真实尺寸：0.14 × 0.10 m，叠放少许偏角）
  const pcb2X = trayX + 0.040, pcb2Z = trayZ + 0.010, pcb2Y = trayY + 0.009;
  pb.boxC(0.140, 0.002, 0.100, pcb2X, pcb2Y, pcb2Z, M.pcb, 0.08);
  pb.boxC(0.028, 0.003, 0.028, pcb2X, pcb2Y + 0.0025, pcb2Z, M.pcbChip, 0.08);
  pb.boxC(0.014, 0.002, 0.018, pcb2X + 0.035, pcb2Y + 0.002, pcb2Z + 0.020, M.pcbChip, 0.08);
  pb.boxC(0.025, 0.001, 0.015, pcb2X - 0.030, pcb2Y + 0.0015, pcb2Z - 0.025, M.copper, 0.08);

  // 胶垫上待检 PCB 3（真实尺寸：0.16 × 0.11 m，带黑色芯片、金手指与电容）
  const pcb3X = -0.18, pcb3Z = 0.04, pcb3Y = BENCH_H + matH + 0.001;
  pb.boxC(0.160, 0.002, 0.110, pcb3X, pcb3Y, pcb3Z, M.pcb);
  pb.boxC(0.034, 0.004, 0.034, pcb3X - 0.025, pcb3Y + 0.003, pcb3Z, M.pcbChip);
  pb.boxC(0.018, 0.0025, 0.020, pcb3X + 0.035, pcb3Y + 0.002, pcb3Z + 0.025, M.pcbChip);
  pb.boxC(0.018, 0.0025, 0.020, pcb3X + 0.035, pcb3Y + 0.002, pcb3Z - 0.025, M.pcbChip);
  pb.cyl(0.006, 0.012, pcb3X - 0.055, pcb3Y + 0.007, pcb3Z - 0.030, M.chrome, 12);
  pb.boxC(0.050, 0.001, 0.008, pcb3X, pcb3Y + 0.0015, pcb3Z + 0.046, M.copper);
  pb.boxC(0.045, 0.001, 0.003, pcb3X, pcb3Y + 0.0015, pcb3Z - 0.042, M.white);

  // ══════════════════════════════════════════════════════════════
  // 4. 防静电高台工作椅（镀铬五星脚、黑色脚轮、灰蓝背盖板）
  // ══════════════════════════════════════════════════════════════

  // 镀铬五星脚（外径半径 0.210 m，黑色导电脚轮严格接触 y=0，前沿绝不侵入工作台）
  const chairBaseR = 0.210;
  pb.cyl(0.038, 0.045, CHAIR_X, 0.075, CHAIR_Z, M.chrome, 16);
  for (let k = 0; k < 5; k++) {
    const ang = CHAIR_RY + k * (Math.PI * 2 / 5);
    const cosA = Math.cos(ang), sinA = Math.sin(ang);
    const tipX = CHAIR_X + cosA * chairBaseR;
    const tipZ = CHAIR_Z + sinA * chairBaseR;
    const midX = (CHAIR_X + tipX) / 2;
    const midZ = (CHAIR_Z + tipZ) / 2;

    pb.boxC(0.022, 0.016, chairBaseR, midX, 0.055, midZ, M.chrome, 0, Math.atan2(tipX - CHAIR_X, tipZ - CHAIR_Z), 0);
    pb.cyl(0.006, 0.022, tipX, 0.033, tipZ, M.steel, 8);
    pb.cyl(0.018, 0.014, tipX, 0.018, tipZ, M.black, 12, 0, 0, Math.PI / 2);
  }

  // 气压升降柱与检验椅脚踏圈（Torus 外圈 + 径向支撑臂）
  pb.cyl(0.024, 0.180, CHAIR_X, 0.18, CHAIR_Z, M.black, 16);
  pb.cyl(0.015, 0.240, CHAIR_X, 0.36, CHAIR_Z, M.chrome, 16);
  pb.add(new THREE.TorusGeometry(0.18, 0.010, 8, 24), M.chrome, CHAIR_X, 0.22, CHAIR_Z, Math.PI / 2, 0, 0);
  for (let a = 0; a < 4; a++) {
    const spAng = a * (Math.PI / 2);
    pb.cyl(0.006, 0.16, CHAIR_X + Math.cos(spAng) * 0.09, 0.22, CHAIR_Z + Math.sin(spAng) * 0.09, M.chrome, 8, 0, -spAng, Math.PI / 2);
  }

  // 坐垫调节底盘与升降手柄
  pb.boxC(0.16, 0.035, 0.16, CHAIR_X, 0.49, CHAIR_Z, M.darkGray);
  pb.cyl(0.005, 0.10, CHAIR_X + 0.10, 0.49, CHAIR_Z, M.chrome, 8, 0, 0, Math.PI / 2);
  pb.boxC(0.030, 0.012, 0.020, CHAIR_X + 0.15, 0.49, CHAIR_Z, M.black);

  // 浅灰蓝防静电布面坐垫（真实尺寸 0.46 × 0.06 × 0.42 m，坐高 y=0.580）
  const seatB = 0.015;
  const seatY = 0.550;
  pb.add(
    roundedBoxGeo(0.46 - 2 * seatB, 0.06 - 2 * seatB, 0.42 - 2 * seatB, seatB),
    matChairSeat,
    CHAIR_X, seatY, CHAIR_Z,
    0, CHAIR_RY, 0
  );

  // 人体工学靠背（镀铬曲杆 + 浅灰蓝靠背垫 + 灰蓝 #475569 背盖板，向后方朝向远离台面）
  const backDist = 0.19;
  const backX = CHAIR_X - Math.sin(CHAIR_RY) * backDist;
  const backZ = CHAIR_Z - Math.cos(CHAIR_RY) * backDist;
  pb.boxC(0.035, 0.34, 0.018, backX, 0.65, backZ, M.chrome, 0.08 * Math.cos(CHAIR_RY), CHAIR_RY, -0.08 * Math.sin(CHAIR_RY));

  const backB = 0.015;
  pb.add(
    roundedBoxGeo(0.40 - 2 * backB, 0.28 - 2 * backB, 0.05 - 2 * backB, backB),
    matChairSeat,
    backX, 0.80, backZ,
    0.08 * Math.cos(CHAIR_RY), CHAIR_RY, -0.08 * Math.sin(CHAIR_RY)
  );
  pb.boxC(
    0.40, 0.28, 0.008,
    backX - Math.sin(CHAIR_RY) * 0.026, 0.80, backZ - Math.cos(CHAIR_RY) * 0.026,
    matChairBack,
    0.08 * Math.cos(CHAIR_RY), CHAIR_RY, -0.08 * Math.sin(CHAIR_RY)
  );

  // 一次性合并所有静态网格（精确控制静态网格总数 = 17）
  const staticMeshes = pb.build(group);
  const lampGlowMesh = staticMeshes.find(m => m.material.emissive && m.material.emissive.getHex() === 0xbae6fd);

  // ══════════════════════════════════════════════════════════════
  // 5. 层板前沿编号贴纸（朝 +Z 立面，外凸 1mm 防 z-fighting）
  // ══════════════════════════════════════════════════════════════

  // 标签条高 0.045m，宽 1.20m（对应 6 个料盒 bx=-0.50~+0.50，每格精确 0.20m）
  const labelMat = new THREE.MeshStandardMaterial({
    map: createShelfLabelTexture(),
    roughness: 0.40,
    metalness: 0.05,
  });
  const shelfLabel = new THREE.Mesh(new THREE.PlaneGeometry(1.20, 0.045), labelMat);
  shelfLabel.position.set(0, SHELF_Y, SHELF_Z + shelfD / 2 + 0.001);
  group.add(shelfLabel);

  // ══════════════════════════════════════════════════════════════
  // 6. 运动部件：显微镜载物台下待检 PCB（真实尺寸 0.12 × 0.09 m）
  // ══════════════════════════════════════════════════════════════

  const pcbInspected = new THREE.Group();
  pcbInspected.name = 'pcbInspected';

  // 载物板基体与板载黑芯片、铜焊盘、白色丝印条（由 chipPb 合并构建为 4 个网格）
  const chipPb = new PartBuilder();
  chipPb.boxC(0.120, 0.002, 0.090, 0, 0.001, 0, M.pcb);
  chipPb.boxC(0.028, 0.0035, 0.028, 0, 0.0037, 0, M.pcbChip);
  chipPb.boxC(0.012, 0.0020, 0.016, -0.035, 0.0030,  0.020, M.pcbChip);
  chipPb.boxC(0.012, 0.0020, 0.016,  0.035, 0.0030, -0.020, M.pcbChip);
  chipPb.boxC(0.030, 0.0010, 0.006,  0.030, 0.0025,  0.032, M.copper);
  chipPb.boxC(0.030, 0.0010, 0.006, -0.030, 0.0025, -0.032, M.copper);
  chipPb.boxC(0.040, 0.0010, 0.003,      0, 0.0025, -0.025, M.white);
  chipPb.boxC(0.008, 0.0030, 0.005, -0.018, 0.0035,  0.024, M.copper);
  chipPb.build(pcbInspected, { cloneMaterials: false });

  const STAGE_BASE_X = SCOPE_X;
  const STAGE_BASE_Y = stageY + 0.003;
  const STAGE_BASE_Z = SCOPE_Z + 0.02;
  pcbInspected.position.set(STAGE_BASE_X, STAGE_BASE_Y, STAGE_BASE_Z);
  group.add(pcbInspected);

  // ══════════════════════════════════════════════════════════════
  // 7. 状态光环与接口定义（无三色灯塔，空 lamps）
  // ══════════════════════════════════════════════════════════════

  group.userData.lamps = {}; // 设备无三色灯塔，依约保持空对象
  group.userData.ring = statusRing(meta.size.w, meta.size.d);
  group.add(group.userData.ring);
  setRingStatus(group.userData.ring, device.status);

  // ══════════════════════════════════════════════════════════════
  // 8. 动画逻辑
  // ══════════════════════════════════════════════════════════════

  group.userData.animate = (t, _dt, status) => {
    if (status !== 'run') {
      pcbInspected.position.set(STAGE_BASE_X, STAGE_BASE_Y, STAGE_BASE_Z);
      if (lampGlowMesh) lampGlowMesh.material.emissiveIntensity = 0.20;
      return;
    }

    // 运行态：显微镜下的那块 PCB 缓慢平移模拟逐区检测（平移范围严密限制在载物台内）
    pcbInspected.position.x = STAGE_BASE_X + 0.010 * Math.sin(t * 0.75);
    pcbInspected.position.z = STAGE_BASE_Z + 0.007 * Math.cos(t * 0.55);

    // 放大镜环形灯与显微镜环形灯呈现呼吸发光
    const breath = 0.85 + 0.35 * Math.sin(t * 2.6);
    if (lampGlowMesh) lampGlowMesh.material.emissiveIntensity = breath;
  };

  group.userData.size = { ...meta.size };
  return group;
}
