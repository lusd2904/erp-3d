// src/three/devices/agv.js
// 潜伏式激光导航AGV 模型 (Hikrobot Q3-600 / Geek+ P800 风格)
//
// 网格预算表（每台设备 ≤ 25 个 mesh）：
// - statusRing: 2
// - pbBody (主体): ≤10 materials → 10 meshes
// - pbDisc (提升盘): ≤3 materials → 3 meshes
// - pbCargo (货架): ≤4 materials → 4 meshes
// - light strips: 2 meshes
// - number plates: 2 meshes
// 合计：2+10+3+4+2+2 = 23 个 mesh ✓
import * as THREE from 'three';
import { M, statusColor } from '../materials.js';
import { PartBuilder, roundedBoxGeo, textTexture } from '../builder.js';
import { statusRing, setRingStatus } from '../common.js';

export const meta = {
  type: 'agv',
  name: '潜伏式激光导航AGV',
  refs: [
    'Hikrobot Q3-600 latent lifting AGV — https://www.hikrobotics.com/en/mobilerobot/',
    'Geek+ P800 shelf-to-person robot — https://www.geekplus.com/',
  ],
  size: { w: 1.0, d: 0.7, h: 0.30 },
};

// ─── 整体尺寸常量 ─────────────────────────────────────────────
const L = 1.00;        // 前后长度（X 轴）
const D = 0.70;        // 侧宽度（Z 轴）
const H_TOTAL = 0.30;  // 最高点（提升盘顶部）
const R_DISC = 0.235;  // 提升盘半径
const H_DISC = 0.025;  // 提升盘厚度
const R_WHEEL = 0.05;  // 驱动轮半径
const R_CASTER = 0.03; // 小轮半径
const W_CASTER = 0.015; // 小轮宽度
const SHELL_Y0 = 0.07; // 壳体底面 Y
const SHELL_H = 0.20;  // 壳体主体高度
const SHELL_TOP = SHELL_Y0 + SHELL_H; // 0.27 m
const DISC_REST_Y = SHELL_TOP + 0.004; // 提升盘初始底面 Y

// ─── 材质定义 ────────────────────────────────────────────────
const matWhite = M.white;
const matGray = M.gray;
const matGraphite = M.graphite;
const matBlue = M.blue;
const matSteel = M.steel;
const matRubber = M.rubber;
const matOrange = M.orange;
const matDark = M.darkGray;
const matRed = M.red;
const matYellow = M.yellow;
const matMetal = M.metal;
const matCopper = M.copper;

// 侧灯条纹理函数
function makeStripTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 16;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.00, '#3b4a5c');
  grad.addColorStop(0.35, '#ffffff');
  grad.addColorStop(0.50, '#ffffff');
  grad.addColorStop(0.85, '#3b4a5c');
  grad.addColorStop(1.00, '#3b4a5c');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 16);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  return t;
}

// 号牌纹理函数
function makeLabelTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f7fb';
  g.fillRect(0, 0, 256, 64);
  g.strokeStyle = '#2563eb';
  g.lineWidth = 3;
  g.strokeRect(1.5, 1.5, 253, 61);
  g.fillStyle = '#1d3f72';
  g.font = 'bold 24px "PingFang SC","Microsoft YaHei",sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('AGV-07', 128, 20);
  g.fillStyle = '#64748b';
  g.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
  g.fillText('LIFT 600KG', 128, 45);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── 主体建造函数 ─────────────────────────────────────────────
export function build(device) {
  const group = new THREE.Group();
  group.name = device.id;

  const status = device.status || 'run';

  // 灯条纹理和材质（每个设备一个）
  const stripTex = makeStripTexture();
  const STRIP_COLOR = { run: 0x22d3ee, idle: 0xfb923c, fault: 0xf04438, maint: 0x2e90fa };
  const lightStripMat = new THREE.MeshBasicMaterial({
    map: stripTex,
    color: STRIP_COLOR[status] ?? 0x22d3ee,
  });

  // 号牌纹理和材质
  const labelTex = makeLabelTexture();
  const labelMat = new THREE.MeshBasicMaterial({ map: labelTex });

  // ==================== PartBuilder: body ====================
  const pbBody = new PartBuilder();

  // 1. 白色主体壳体
  pbBody.add(
    roundedBoxGeo(L - 0.04, D - 0.04, SHELL_H - 0.04, 0.08),
    matWhite,
    0, SHELL_Y0 + SHELL_H / 2, 0,
    -Math.PI / 2, 0, 0
  );

  // 2. 底挡风板（灰色）
  pbBody.boxC(L - 0.08, 0.05, D - 0.08, 0, 0.055, 0, matGraphite);

  // 3. 驱动轮 ×2（两侧，轴沿 Z）
  pbBody.cyl(0.05, 0.04, 0, 0.05, D / 2 - 0.09, matRubber, 20, Math.PI / 2, 0, 0);  // [人工修正] 补回漏掉的 x=0 参数
  pbBody.cyl(0.05, 0.04, 0, 0.05, -D / 2 + 0.09, matRubber, 20, Math.PI / 2, 0, 0);

  // 4. 小轮腰座 ×4（四角，贴地）
  pbBody.cyl(0.03, 0.025, 0.35, 0.03, D / 2 - 0.22, matRubber, 14, Math.PI / 2, 0, 0);
  pbBody.cyl(0.03, 0.025, 0.35, 0.03, -D / 2 + 0.22, matRubber, 14, Math.PI / 2, 0, 0);
  pbBody.cyl(0.03, 0.025, -0.35, 0.03, D / 2 - 0.22, matRubber, 14, Math.PI / 2, 0, 0);
  pbBody.cyl(0.03, 0.025, -0.35, 0.03, -D / 2 + 0.22, matRubber, 14, Math.PI / 2, 0, 0);

  // 5. 顶层灰色飞盘面板
  pbBody.boxC(L - 0.14, 0.004, D - 0.14, 0, SHELL_TOP + 0.002, 0, matGray);

  // 6. 灰色分板纹理（上下各一根）
  pbBody.boxC(0.004, 0.002, D - 0.18, 0.30, SHELL_TOP + 0.0045, 0, matDark);
  pbBody.boxC(0.004, 0.002, D - 0.18, -0.30, SHELL_TOP + 0.0045, 0, matDark);

  // 7. 提升盘底座环（平环放在舱口底部）
  pbBody.cyl(R_DISC + 0.025, 0.002, 0, SHELL_TOP + 0.003, 0, matGray, 40);

  // 8. 前后激光雷达
  // 前雷达
  pbBody.boxC(0.09, 0.012, 0.12, 0.44, SHELL_TOP + 0.01, 0, matDark);
  pbBody.cyl(0.035, 0.035, 0.44, SHELL_TOP + 0.0335, 0, matDark, 20);
  pbBody.cyl(0.03, 0.006, 0.44, SHELL_TOP + 0.054, 0, matDark, 20);

  // 后雷达
  pbBody.boxC(0.09, 0.012, 0.12, -0.44, SHELL_TOP + 0.01, 0, matDark);
  pbBody.cyl(0.035, 0.035, -0.44, SHELL_TOP + 0.0335, 0, matDark, 20);
  pbBody.cyl(0.03, 0.006, -0.44, SHELL_TOP + 0.054, 0, matDark, 20);

  // 9. 前后传感器窗口带
  pbBody.boxC(0.006, 0.03, 0.22, L / 2 + 0.001, SHELL_TOP - 0.05, 0, matDark);
  pbBody.boxC(0.006, 0.03, 0.22, -L / 2 - 0.001, SHELL_TOP - 0.05, 0, matDark);

  // 10. 前后 Bumper
  // 前橙色 bumper
  pbBody.boxC(0.02, 0.05, D - 0.14, L / 2 + 0.006, 0.115, 0, matOrange);
  pbBody.boxC(0.024, 0.012, D - 0.16, L / 2 + 0.008, 0.115, 0, matRubber);
  // 后橙色 bumper
  pbBody.boxC(0.02, 0.05, D - 0.14, -L / 2 - 0.006, 0.115, 0, matOrange);
  pbBody.boxC(0.024, 0.012, D - 0.16, -L / 2 - 0.008, 0.115, 0, matRubber);

  // 11. 充电触点（后侧）
  pbBody.boxC(0.006, 0.018, 0.06, -(L / 2 + 0.002), 0.075, 0.07, matCopper);
  pbBody.boxC(0.006, 0.018, 0.06, -(L / 2 + 0.002), 0.075, -0.07, matCopper);

  // 12. 急停按钮（后左上角）
  pbBody.cyl(0.026, 0.012, -0.40, SHELL_TOP + 0.006, 0.26, matYellow, 16);
  pbBody.cyl(0.018, 0.016, -0.40, SHELL_TOP + 0.020, 0.26, matRed, 16);

  // 13. 顶部散热格栅
  for (let i = 0; i < 4; i++) {
    pbBody.boxC(0.05, 0.002, 0.008, 0.33, SHELL_TOP + 0.0045, -0.06 + i * 0.04, matDark);
  }

  pbBody.build(group, { cloneMaterials: false });

  // ==================== 提升盘 ====================
  const liftDisc = new THREE.Group();
  liftDisc.name = 'liftDisc';

  const pbDisc = new PartBuilder();
  // 提升盘主体
  pbDisc.add(
    new THREE.CylinderGeometry(R_DISC, R_DISC, H_DISC, 40),
    matSteel,
    0, H_DISC / 2, 0
  );
  // 蓝色 rim 环（竖向环形条，贴在盘边）
  pbDisc.add(
    new THREE.CylinderGeometry(R_DISC + 0.008, R_DISC + 0.008, 0.010, 40),
    matBlue,
    0, H_DISC / 2, 0
  );
  // 橡胶防滑垫（在盘顶上方 0.0015m 处）
  pbDisc.add(
    new THREE.CylinderGeometry(R_DISC - 0.03, R_DISC - 0.03, 0.003, 40),
    matRubber,
    0, H_DISC + 0.0015, 0
  );

  pbDisc.build(liftDisc, { cloneMaterials: false });
  group.add(liftDisc);

  // ==================== 货物 ====================
  const cargo = new THREE.Group();
  cargo.name = 'cargo';
  cargo.visible = true;

  const pbCargo = new PartBuilder();

  // 货架尺寸
  const rackLen = 0.80;
  const rackWid = 0.60;
  const legH = 0.70;
  const legOffX = rackLen / 2 - 0.015;
  const legOffZ = rackWid / 2 - 0.015;

  // 底框 4 条
  pbCargo.boxC(rackLen, 0.03, 0.03, 0, 0.015, legOffZ, matMetal);
  pbCargo.boxC(rackLen, 0.03, 0.03, 0, 0.015, -legOffZ, matMetal);
  pbCargo.boxC(0.03, 0.03, rackWid, legOffX, 0.015, 0, matMetal);
  pbCargo.boxC(0.03, 0.03, rackWid, -legOffX, 0.015, 0, matMetal);

  // 中心横板
  pbCargo.boxC(rackLen, 0.03, 0.03, 0, 0.015, 0, matMetal);

  // 4 条腿（完整高度）
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      pbCargo.boxC(0.03, legH, 0.03, sx * legOffX, 0.03 + legH / 2, sz * legOffZ, matMetal);
    }
  }

  // 2 层货架
  pbCargo.boxC(rackLen, 0.015, rackWid, 0, 0.34, 0, matGray);
  pbCargo.boxC(rackLen, 0.015, rackWid, 0, 0.7375, 0, matGray);

  // 蓝色小箱子（顶层）
  pbCargo.boxC(0.50, 0.20, 0.38, 0, 0.745 + 0.10, 0, matBlue);

  // 白色小箱子（中层）
  pbCargo.boxC(0.42, 0.18, 0.34, 0.10, 0.3475 + 0.09, 0, M.white);

  pbCargo.build(cargo, { cloneMaterials: false });
  liftDisc.add(cargo);
  group.userData.cargo = cargo;
  group.userData.setCargo = (v) => { cargo.visible = !!v; };

  // ==================== 提升盘初始位置 ====================
  cargo.position.y = H_DISC + 0.001;
  liftDisc.position.y = DISC_REST_Y;

  // ==================== 侧灯条 ====================
  const lightStripGeo = new THREE.PlaneGeometry(L - 0.16, 0.022);

  // +Z 侧灯条
  const lightPosZ = new THREE.Mesh(lightStripGeo, lightStripMat.clone());
  lightPosZ.position.set(0, 0.215, D / 2 + 0.003);
  group.add(lightPosZ);

  // -Z 侧灯条
  const lightNegZ = new THREE.Mesh(lightStripGeo, lightStripMat.clone());
  lightNegZ.rotation.y = Math.PI;
  lightNegZ.position.set(0, 0.215, -D / 2 - 0.003);
  group.add(lightNegZ);

  // ==================== 号牌 ====================
  const labelGeo = new THREE.PlaneGeometry(0.16, 0.05);

  // +Z 号牌
  const labelPosZ = new THREE.Mesh(labelGeo, labelMat);
  labelPosZ.position.set(L / 2 - 0.17, 0.13, D / 2 + 0.003);
  group.add(labelPosZ);

  // -Z 号牌
  const labelNegZ = new THREE.Mesh(labelGeo, labelMat);
  labelNegZ.rotation.y = Math.PI;
  labelNegZ.position.set(L / 2 - 0.17, 0.13, -D / 2 - 0.003);
  group.add(labelNegZ);

  // ==================== 状态光环 ====================
  group.userData.ring = statusRing(L, D);
  group.add(group.userData.ring);
  setRingStatus(group.userData.ring, status);

  // ==================== 动画 ====================
  group.userData.lamps = null;

  group.userData.animate = (t, _dt, st) => {
    if (st !== 'run') {
      stripTex.offset.x = 0;
      liftDisc.position.y = DISC_REST_Y;
      return;
    }

    // 灯条流动动画
    stripTex.offset.x = -(t * 0.6) % 1;

    // 提升盘轻微上下 bob
    const bob = 0.012 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 2.5));
    liftDisc.position.y = DISC_REST_Y + bob;
  };

  group.userData.size = { w: L, d: D, h: 0.30 };
  return group;
}
