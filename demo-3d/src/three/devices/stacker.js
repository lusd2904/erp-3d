// src/three/devices/stacker.js
// 单立柱巷道堆垛机 — 昆船/今天国际 SC-12 风格
import * as THREE from 'three';
import { M, lampMat, statusColor } from '../materials.js';
import { PartBuilder, roundedBoxGeo, textTexture } from '../builder.js';
import { signalTower, applyLamps, statusRing, setRingStatus, monitorArm, feet, vents } from '../common.js';

export const meta = {
  type: 'stacker',
  name: '单立柱巷道堆垛机',
  refs: [
    '昆船 KSEC 单立柱堆垛机 https://www.ksec.com.cn',
    '今天国际 NTI 堆垛机 SC-12 https://www.nti56.com',
  ],
  size: { w: 4.0, d: 1.5, h: 6.5 },
};

const RAIL_L = 4.0;
const RAIL_W = 0.20;
const RAIL_H = 0.15;
const LOWER_BEAM_L = 3.0;
const LOWER_BEAM_H = 0.30;
const LOWER_BEAM_D = 0.40;
const WHEEL_R = 0.08;
// 轮底压在轨顶面(y=RAIL_H*0.6*0.5+RAIL_H=RAIL_H*1.3的顶面≈轨顶面)
// 轨顶钢条中心y=RAIL_H，高RAIL_H*0.6，所以顶面y=RAIL_H+RAIL_H*0.3=RAIL_H*1.3=0.195
const RAIL_TOP_Y = RAIL_H + RAIL_H * 0.3; // 0.195，轨顶钢条顶面
const WHEEL_CY = RAIL_TOP_Y + WHEEL_R;    // 0.275，轮心y
const BEAM_BOT_Y = WHEEL_CY + 0.02;       // 0.295，下横梁底面（轮心以上）
const BEAM_TOP_Y = BEAM_BOT_Y + LOWER_BEAM_H; // 0.595，下横梁顶面
const MAST_X = -0.7;
const MAST_W = 0.35;
const MAST_D = 0.45;
const MAST_H = 6.0;
const MAST_TOP_Y = BEAM_TOP_Y + MAST_H;   // 6.595
const UPPER_BEAM_L = 1.0;
const UPPER_BEAM_H = 0.25;
const UPPER_BEAM_D = 0.35;
const SKY_RAIL_L = 1.0;
const SKY_RAIL_W = 0.12;
const SKY_RAIL_H = 0.10;
const CABINET_X = 0.9;
const CABINET_W = 0.6;
const CABINET_D = 0.5;
const CABINET_H = 1.5;
const CABINET_TOP_Y = BEAM_TOP_Y + CABINET_H; // 2.095
const CARRIAGE_W = 1.2;
const CARRIAGE_D = 1.1;
const CARRIAGE_H = 0.40;
const FORK_TINE_W = 0.10;
const FORK_TINE_H = 0.04;
const FORK_TINE_GAP = 0.50;
const FORK_TINE_L = 1.0;
const FORK_X = [0.40, 0.80]; // 局部x，均在立柱+X侧外（立柱半宽0.175）
const CARRIAGE_Y_MIN = BEAM_TOP_Y + 0.1;  // ≈0.695
const CARRIAGE_Y_MAX = 5.2;
const FORK_EXTEND = 0.9;
const DEVICE_W = RAIL_L;
const DEVICE_D = 3.0; // 覆盖货叉最大伸出 ±(CARRIAGE_D/2+FORK_EXTEND)≈±1.45
const DEVICE_H = MAST_TOP_Y + UPPER_BEAM_H;
// statusRing 用较小值包住机身即可
const RING_D = 1.6;
// 悬臂载货台：底板从立柱+X侧 MAST_W/2+0.03 起，宽0.95
const CANT_X0 = MAST_W / 2 + 0.03; // 悬臂起点局部x
const CANT_W = 0.95;               // 悬臂宽度

const matCyan = new THREE.MeshStandardMaterial({
  color: 0x22d3ee,
  roughness: 0.50,
  metalness: 0.12,
  emissive: 0x22d3ee,
  emissiveIntensity: 0.18,
});
const matBlue = new THREE.MeshStandardMaterial({
  color: 0x2563eb,
  roughness: 0.55,
  metalness: 0.15,
});
const matMech = new THREE.MeshStandardMaterial({
  color: 0x334155,
  roughness: 0.60,
  metalness: 0.15,
});
const matCabinet = new THREE.MeshStandardMaterial({
  color: 0xf4f7fb,
  roughness: 0.50,
  metalness: 0.05,
});
const matSteel = new THREE.MeshStandardMaterial({
  color: 0x94a3b8,
  roughness: 0.50,
  metalness: 0.22,
});

function buildRail(pb) {
  const railY = RAIL_H / 2;
  pb.boxC(RAIL_L, RAIL_H, RAIL_W, 0, railY, 0, matMech);
  pb.boxC(RAIL_L * 0.95, RAIL_H * 0.6, RAIL_W * 1.1, 0, RAIL_H, 0, matSteel);
  const plateN = 9;
  const plateStep = RAIL_L / (plateN + 1);
  for (let i = 0; i < plateN; i++) {
    const px = -RAIL_L / 2 + plateStep * (i + 1);
    pb.boxC(0.10, 0.015, RAIL_W * 1.3, px, 0.005, 0, matMech);
  }
}

function buildLowerBeam(pb) {
  // 下横梁：底面BEAM_BOT_Y，顶面BEAM_TOP_Y
  const beamCY = (BEAM_BOT_Y + BEAM_TOP_Y) / 2;
  pb.boxC(LOWER_BEAM_L, LOWER_BEAM_H, LOWER_BEAM_D, 0, beamCY, 0, matBlue);

  // 轮箱 + 轮子（每端一个居中轮子，轮缘两侧薄圆盘）
  for (const ex of [-1, 1]) {
    const wx = ex * (LOWER_BEAM_L / 2 - 0.25);
    const boxW = 0.35, boxH = BEAM_BOT_Y - RAIL_TOP_Y + WHEEL_R * 2 + 0.02, boxD = 0.30;
    const boxCY = RAIL_TOP_Y + boxH / 2;
    // 轮箱包住轮子上半部
    pb.boxC(boxW, boxH, boxD, wx, boxCY, 0, matBlue);
    // 居中轮胎（厚0.08，沿X轴，z=0）
    pb.cyl(WHEEL_R, 0.08, wx, WHEEL_CY, 0, matMech, 16, Math.PI / 2, 0, 0);
    // 两侧轮缘薄圆盘
    for (const wz of [-0.045, 0.045]) {
      pb.cyl(WHEEL_R + 0.012, 0.014, wx, WHEEL_CY, wz, matMech, 16, Math.PI / 2, 0, 0);
    }
  }

  // 驱动电机+减速机（一端）
  const motorX = -LOWER_BEAM_L / 2 + 0.30;
  pb.cyl(0.10, 0.28, motorX, BEAM_TOP_Y + 0.14, -LOWER_BEAM_D / 2 - 0.08, matBlue, 16);
  pb.boxC(0.18, 0.18, 0.20, motorX, BEAM_TOP_Y + 0.09, -LOWER_BEAM_D / 2 - 0.24, matMech);
  pb.cyl(0.04, 0.06, motorX, BEAM_TOP_Y + 0.18, -LOWER_BEAM_D / 2 - 0.36, matSteel, 10);
}

function buildMast(pb) {
  pb.box(MAST_W, MAST_H, MAST_D, MAST_X, BEAM_TOP_Y, 0, matCyan);
  for (const sz of [-1, 1]) {
    const rz = sz * (MAST_D / 2 - 0.025);
    pb.box(0.03, MAST_H * 0.95, 0.04, MAST_X, BEAM_TOP_Y + MAST_H * 0.025, rz, matMech);
  }
}

function buildLadder(pb) {
  const ladderX = MAST_X - MAST_W / 2 - 0.08; // ≈ -0.955
  const ladderY0 = BEAM_TOP_Y + 0.20;
  const ladderH = MAST_H * 0.88;
  for (const dz of [-0.14, 0.14]) {
    pb.box(0.03, ladderH, 0.03, ladderX, ladderY0, dz, matMech);
  }
  const rungs = 18;
  for (let i = 0; i < rungs; i++) {
    const ry = ladderY0 + i * (ladderH / rungs);
    pb.boxC(0.03, 0.025, 0.26, ladderX, ry, 0, matMech);
  }
  // 护笼：环心外移到 ladderX - 0.28，使爬梯位于环内靠立柱一侧
  const cageX = ladderX - 0.28; // ≈ -1.235，环心x；环半径0.30覆盖x -1.535~-0.935，不切入立柱(-0.875)
  const cageY0 = BEAM_TOP_Y + 2.2;
  const cageTop = ladderY0 + ladderH - 0.3;
  const torusMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6, metalness: 0.2 });
  for (let cy = cageY0; cy <= cageTop; cy += 0.6) {
    const geo = new THREE.TorusGeometry(0.30, 0.012, 6, 20);
    pb.add(geo, torusMat, cageX, cy, 0, Math.PI / 2, 0, 0);
  }
  // 3根竖向护笼条跟随环心x
  for (const dz of [-0.28, 0, 0.28]) {
    pb.box(0.015, cageTop - cageY0, 0.015, cageX - 0.10, cageY0, dz, torusMat);
  }
}

function buildUpperBeam(pb) {
  const beamY = MAST_TOP_Y + UPPER_BEAM_H / 2;
  pb.boxC(UPPER_BEAM_L, UPPER_BEAM_H, UPPER_BEAM_D, MAST_X + 0.2, beamY, 0, matCyan);
  const skyY = MAST_TOP_Y + UPPER_BEAM_H + SKY_RAIL_H / 2; // unchanged, refs MAST_TOP_Y which is now BEAM_TOP_Y+MAST_H
  pb.boxC(SKY_RAIL_L, SKY_RAIL_H, SKY_RAIL_W, MAST_X + 0.2, skyY, 0, matSteel);
  const guideR = 0.045;
  const guideH = 0.10;
  const guideZ = SKY_RAIL_W / 2 + guideR + 0.01;
  for (const gx of [-0.25, 0.25]) {
    for (const gz of [-1, 1]) {
      pb.cyl(guideR, guideH, MAST_X + 0.2 + gx, skyY, gz * guideZ, matMech, 12);
    }
  }
}

const matDoorLight = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.45, metalness: 0.05 });
const matStopBase = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.5, metalness: 0.05 });

function buildCabinet(pb, group) {
  const cabY = BEAM_TOP_Y;
  // 柜体（白色）
  pb.box(CABINET_W, CABINET_H, CABINET_D, CABINET_X, cabY, 0, matCabinet);
  // 门板（浅灰，不深色）
  pb.boxC(CABINET_W * 0.90, CABINET_H * 0.92, 0.008,
    CABINET_X, cabY + CABINET_H / 2, CABINET_D / 2 + 0.005, matDoorLight);
  // 细门缝线（竖向深色细条）
  pb.boxC(0.008, CABINET_H * 0.88, 0.006,
    CABINET_X, cabY + CABINET_H / 2, CABINET_D / 2 + 0.010, matMech);
  // 把手
  pb.cyl(0.012, 0.04, CABINET_X + CABINET_W * 0.38, cabY + CABINET_H / 2,
    CABINET_D / 2 + 0.012, M.metal, 10, Math.PI / 2, 0, 0);
  // 散热格栅
  vents(pb, CABINET_X, cabY + CABINET_H * 0.78, CABINET_D / 2 + 0.010,
    CABINET_W * 0.65, 0.16, 10, matMech, 'x');
  // 急停：黄色底座 + 红色蘑菇头
  pb.cyl(0.045, 0.018, CABINET_X - CABINET_W * 0.25, cabY + 0.92,
    CABINET_D / 2 + 0.010, matStopBase, 16, Math.PI / 2, 0, 0);
  pb.cyl(0.030, 0.022, CABINET_X - CABINET_W * 0.25, cabY + 0.92,
    CABINET_D / 2 + 0.022, M.red, 16, Math.PI / 2, 0, 0);
  // 铭牌
  const plateGeo = new THREE.PlaneGeometry(0.30, 0.09);
  const plateTex = textTexture('SC-12 堆垛机', { w: 320, h: 96, font: 'bold 40px sans-serif', color: '#1e293b', bg: '#f1f5f9', align: 'center' });
  const plateMesh = new THREE.Mesh(plateGeo, new THREE.MeshBasicMaterial({ map: plateTex }));
  plateMesh.position.set(CABINET_X, cabY + 0.46, CABINET_D / 2 + 0.011);
  group.add(plateMesh);
}

// === 第1段接口说明 ===
// RAIL_L=4.0, LOWER_BEAM_L=3.0, MAST_X=-0.7, MAST_W=0.35, MAST_D=0.45, MAST_H=6.0
// CABINET_X=0.9, CABINET_W=0.6, CABINET_D=0.5, CABINET_H=1.5
// MAST_TOP_Y = RAIL_H + LOWER_BEAM_H + MAST_H ≈ 6.45
// CABINET_TOP_Y = RAIL_H + LOWER_BEAM_H + CABINET_H ≈ 1.95 (灯塔用)
// CARRIAGE_Y_MIN=0.6, CARRIAGE_Y_MAX=5.2 (载货台升降范围)
// CARRIAGE_W=1.2, CARRIAGE_D=1.1, CARRIAGE_H=0.40
// FORK_TINE_W=0.10, FORK_TINE_H=0.04, FORK_TINE_GAP=0.50, FORK_TINE_L=1.0, FORK_EXTEND=0.9
// DEVICE_W=4.0, DEVICE_D=1.5, DEVICE_H≈6.70
// 材质：matCyan(#22D3EE), matBlue(#2563EB), matMech(#334155), matCabinet(#F4F7FB), matSteel(#94A3B8)

function buildCarriage() {
  const g = new THREE.Group();
  g.name = 'carriage';
  const pb = new PartBuilder();

  // 悬臂底板：在立柱+X侧，x从CANT_X0到CANT_X0+CANT_W，中心x=CANT_X0+CANT_W/2
  const cantCX = CANT_X0 + CANT_W / 2;
  pb.boxC(CANT_W, 0.04, CARRIAGE_D, cantCX, 0.02, 0, matMech);

  // 两侧侧板（cyan）：改放 X 两端，板面平行 Z，不挡货叉伸出方向
  for (const ex of [CANT_X0 + 0.02, CANT_X0 + CANT_W - 0.02]) {
    pb.boxC(0.04, CARRIAGE_H, CARRIAGE_D,
      ex, CARRIAGE_H / 2, 0, matCyan);
  }

  // 竖向连接板：把悬臂连到导向架（局部x≈MAST_W/2+0.03，高0.8m）
  pb.boxC(0.04, 0.80, CARRIAGE_D * 0.6,
    CANT_X0, 0.40, 0, matSteel);

  // 导向架滑块：仅保留 +X 侧（sx=+1）和 ±Z 侧，去掉 -X 侧避免与爬梯护笼碰撞
  const gw = 0.055, gh = CARRIAGE_H * 0.80, gd = 0.055;
  // +X 侧两块（±Z）
  for (const sz of [-1, 1]) {
    pb.boxC(gw, gh, gd,
      MAST_W / 2 + gw / 2 + 0.005,
      CARRIAGE_H / 2,
      sz * (MAST_D / 2 + gd / 2 + 0.005),
      matSteel);
  }
  // ±Z 侧薄滑块（贴立柱 Z 面，X 方向只盖立柱宽度，不往 -X 伸）
  const zsw = MAST_W * 0.6, zsh = CARRIAGE_H * 0.80, zsd = 0.025;
  for (const sz of [-1, 1]) {
    pb.boxC(zsw, zsh, zsd,
      MAST_W / 2 - zsw / 2,          // 偏向 +X，不超过 x=0
      CARRIAGE_H / 2,
      sz * (MAST_D / 2 + zsd / 2 + 0.003),
      matSteel);
  }

  // 导向轮：仅保留 +X 侧（轴沿 Z，夹立柱 +X 面）
  for (const sz of [-1, 1]) {
    pb.cyl(0.038, 0.045,
      MAST_W / 2 + 0.038,
      CARRIAGE_H * 0.25 + (sz > 0 ? 0 : CARRIAGE_H * 0.50),
      sz * (MAST_D / 2 - 0.07),
      matMech, 12, 0, 0, Math.PI / 2);
  }

  // 货叉底节（固定，两条叉，局部x用FORK_X，在悬臂底板上）
  for (const fx of FORK_X) {
    pb.boxC(FORK_TINE_W, FORK_TINE_H, CARRIAGE_D,
      fx, FORK_TINE_H / 2 + 0.04, 0, matMech);
  }

  pb.build(g, { cloneMaterials: false, shadow: true });
  return g;
}

function buildForks() {
  // 中节、上节与底节同用 FORK_X 作局部x，无偏移
  const midY = FORK_TINE_H / 2 + 0.04 + FORK_TINE_H;
  const topY = FORK_TINE_H / 2 + 0.04 + FORK_TINE_H * 2;

  const mid = new THREE.Group();
  mid.name = 'forkMid';
  const pbMid = new PartBuilder();
  for (const fx of FORK_X) {
    pbMid.boxC(FORK_TINE_W * 0.90, FORK_TINE_H, CARRIAGE_D, fx, midY, 0, matSteel);
  }
  pbMid.build(mid, { cloneMaterials: false, shadow: true });

  const top = new THREE.Group();
  top.name = 'forkTop';
  const pbTop = new PartBuilder();
  for (const fx of FORK_X) {
    pbTop.boxC(FORK_TINE_W * 0.80, FORK_TINE_H, CARRIAGE_D, fx, topY, 0, matCyan);
  }
  pbTop.build(top, { cloneMaterials: false, shadow: true });

  return { mid, top };
}

export function build(device) {
  const group = new THREE.Group();
  group.name = device.id ?? 'stacker';

  const pb = new PartBuilder();
  buildRail(pb);
  buildLowerBeam(pb);
  buildMast(pb);
  buildLadder(pb);
  buildUpperBeam(pb);
  buildCabinet(pb, group);
  pb.build(group, { cloneMaterials: false, shadow: true });

  const car = buildCarriage();
  car.position.set(MAST_X, CARRIAGE_Y_MIN, 0);
  const forks = buildForks();
  car.add(forks.mid, forks.top);
  group.add(car);

  group.userData.lamps = signalTower(group, CABINET_X, CABINET_TOP_Y, 0, 0.08);

  const ring = statusRing(DEVICE_W, RING_D);
  group.add(ring);
  group.userData.ring = ring;

  applyLamps(group.userData.lamps, device.status);
  setRingStatus(ring, device.status);

  const LEVELS = [2.0, 3.4, 4.8];
  const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const PH = [3.0, 0.5, 1.2, 0.8, 1.2, 3.0, 0.8];
  const TOTAL = PH.reduce((a, b) => a + b, 0);
  let _acc = 0; // 累计运行时间（不截断）

  group.userData.animate = (t, dt, status) => {
    if (status !== 'run') {
      car.position.y = CARRIAGE_Y_MIN;
      forks.mid.position.z = 0;
      forks.top.position.z = 0;
      return;
    }

    _acc += dt;
    const cycle = Math.floor(_acc / TOTAL);
    const lvlIdx = cycle % LEVELS.length;
    const dir = cycle % 2 ? -1 : 1;
    const tInCycle = _acc - cycle * TOTAL;

    let acc = 0, phase = PH.length - 1;
    for (let i = 0; i < PH.length; i++) {
      if (tInCycle < acc + PH[i]) { phase = i; break; }
      acc += PH[i];
    }
    const pt = clamp((tInCycle - acc) / PH[phase], 0, 1);
    const targetY = LEVELS[lvlIdx];

    if (phase === 0) {
      car.position.y = CARRIAGE_Y_MIN + ease(pt) * (targetY - CARRIAGE_Y_MIN);
      forks.mid.position.z = 0;
      forks.top.position.z = 0;
    } else if (phase === 1) {
      car.position.y = targetY;
    } else if (phase === 2) {
      const s = ease(pt) * dir;
      forks.mid.position.z = s * 0.5 * FORK_EXTEND;
      forks.top.position.z = s * FORK_EXTEND;
    } else if (phase === 3) {
      forks.mid.position.z = dir * 0.5 * FORK_EXTEND;
      forks.top.position.z = dir * FORK_EXTEND;
    } else if (phase === 4) {
      const s = (1 - ease(pt)) * dir;
      forks.mid.position.z = s * 0.5 * FORK_EXTEND;
      forks.top.position.z = s * FORK_EXTEND;
    } else if (phase === 5) {
      car.position.y = targetY - ease(pt) * (targetY - CARRIAGE_Y_MIN);
      forks.mid.position.z = 0;
      forks.top.position.z = 0;
    } else {
      car.position.y = CARRIAGE_Y_MIN;
      forks.mid.position.z = 0;
      forks.top.position.z = 0;
    }
  };

  const SIZE = { w: DEVICE_W, d: DEVICE_D, h: DEVICE_H };
  group.userData.size = SIZE;
  meta.size = SIZE;

  return group;
}
