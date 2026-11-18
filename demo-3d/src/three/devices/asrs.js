// =============================================================================
// asrs.js — 自动化立体仓库 + 双立柱堆垛机  (type = asrs)
// 4排×12列×6层单深位货架，双巷道各一台双立柱堆垛机
// 出入库辊筒输送线、安全护栏、信号灯塔、库位映射与高亮定位光标
// =============================================================================
import * as THREE from 'three';
import { M, lampMat, statusColor } from '../materials.js';
import { PartBuilder, roundedBoxGeo, textTexture } from '../builder.js';
import { signalTower, applyLamps, statusRing, setRingStatus, monitorArm, feet, vents } from '../common.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ── 常量 ────────────────────────────────────────────────────────────────────
const ROWS = 4, COLS = 12, LEVELS = 6;
const BAY = 1.1;                     // 列宽 (x)
const LEVEL_H = 0.88;                // 层高 (y)
const RACK_D = 1.15;                 // 单排货架进深 (z)
const BASE_Y = 0.16;                 // 首层横梁底面 y
const UPRIGHT_W = 0.07;              // 立柱截面宽
const BEAM_H = 0.07;                 // 横梁高
const BEAM_D = 0.04;                 // 横梁厚
const BRACE_T = 0.02;                // 斜撑条厚
const AISLE_W = 1.65;                // 巷道宽度 (z)
const BACK_GAP = 0.12;               // 排02-03背靠背间距

const LEN = COLS * BAY;              // 货架总长 x
const TOP_Y = BASE_Y + LEVELS * LEVEL_H + 0.12; // 顶梁高度

// 排中心 Z
const totalZ = RACK_D * 4 + AISLE_W * 2 + BACK_GAP;
const halfZ = totalZ / 2;
const ROW_Z = [];
ROW_Z[1] = -halfZ + RACK_D / 2;
ROW_Z[2] = ROW_Z[1] + RACK_D + AISLE_W;
ROW_Z[3] = ROW_Z[2] + RACK_D + BACK_GAP;
ROW_Z[4] = ROW_Z[3] + RACK_D + AISLE_W;

const AISLE_Z = [
  (ROW_Z[1] + ROW_Z[2]) / 2,
  (ROW_Z[3] + ROW_Z[4]) / 2,
];

const X_OFF = -LEN / 2;

// ── 货位几何 ────────────────────────────────────────────────────────────────
// 横梁顶面 y（level 从 1 开始）
function beamTopY(level) {
  return BASE_Y + (level - 1) * LEVEL_H + BEAM_H;
}
// 货位净空高度（横梁顶面到上一层横梁底面）
const BIN_CLEAR = LEVEL_H - BEAM_H;
// 货位几何中心 y（用于高亮框中心和 bins 坐标）
function binCenterY(level) {
  return beamTopY(level) + BIN_CLEAR / 2;
}

// 立柱片内前后两根立柱的 z 偏移（相对排中心）
const UPRIGHT_INSET = 0.05;
const UPRIGHT_Z_OFF = RACK_D / 2 - UPRIGHT_INSET;

// 前后横梁 z 偏移（相对排中心）
const BEAM_Z_OFF = RACK_D / 2 - 0.06;

// 托盘尺寸
const PALLET_W = 0.95;
const PALLET_H = 0.10;
const PALLET_D = BEAM_Z_OFF * 2 + BEAM_D; // 刚好搭在前后两根横梁上（外边到外边）

// ── 双立柱堆垛机尺寸 ──
const STK_COL_SPAN = 1.2;            // 两立柱 X 方向间距
const STK_COL_W = 0.16;              // 立柱截面宽
const STK_COL_D = 0.20;              // 立柱截面深
const STK_H = TOP_Y + 0.80;          // 立柱高度 (明显高出货架顶 0.8m)
const UPPER_BEAM_H = 0.12;           // 上横梁高度

// 地轨尺寸
const GROUND_RAIL_H = 0.05;
const GROUND_RAIL_TOP_H = 0.02;
const GROUND_RAIL_TOP_W = 0.05;
const GROUND_RAIL_W = 0.20;
const RAIL_TOP_Y = GROUND_RAIL_H + GROUND_RAIL_TOP_H; // 轨顶 y = 0.07

// 天轨尺寸
const SKY_RAIL_H = 0.14;             // 天轨高
const SKY_RAIL_W = 0.12;             // 天轨宽
const SKY_RAIL_Y = STK_H + UPPER_BEAM_H / 2 + 0.04; // 上横梁顶 + 间隙
const SKY_RAIL_HALF_W = SKY_RAIL_W / 2;

// 货叉伸出距离
const FORK_REACH = (RACK_D + AISLE_W) / 2;

// 货叉叉齿尺寸
const FORK_TINE_L = 1.0;             // 叉齿沿 Z 长度
const FORK_TINE_W = 0.10;            // 叉齿沿 X 宽度
const FORK_TINE_H = 0.025;           // 叉齿高度
const FORK_TINE_GAP = 0.50;          // 两齿 X 间距（对应托盘叉孔）
const FORK_PALLET_INSERT = 0.05;     // 叉齿位于托盘底面上方高度（叉孔位置）

// ── 确定性伪随机 hash ──────────────────────────────────────────────────────
function hash(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h / 4294967295;
}

function binKey(row, col, level) {
  const r = String(row).padStart(2, '0');
  const c = String(col).padStart(2, '0');
  const l = String(level).padStart(2, '0');
  return `WH-A-${r}-${c}-${l}`;
}

// 返回货位几何中心坐标（用于 bins 映射和高亮框定位）
function binCenter(row, col, level) {
  const x = X_OFF + (col - 0.5) * BAY;
  const y = binCenterY(level);
  const z = ROW_Z[row];
  return new THREE.Vector3(x, y, z);
}

// ── 平滑缓动 ──
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// ── 实际边界计算 ──
function computeBounds(group) {
  const box = new THREE.Box3();
  group.traverse(obj => {
    if (!obj.isMesh) return;
    if (obj.userData.noPick) return; // 排除状态光环与高亮标记
    if (obj.parent && obj.parent.name === 'statusRing') return;
    if (!obj.geometry) return;
    obj.geometry.computeBoundingBox();
    const b = obj.geometry.boundingBox.clone();
    b.applyMatrix4(obj.matrixWorld);
    box.union(b);
  });
  const size = new THREE.Vector3();
  box.getSize(size);
  return { w: size.x, d: size.z, h: size.y };
}

// ── 模块顶层计算 meta.size ─────────────────────────────────────────────────
const _convLineXEnd = X_OFF - 0.6 - 2.6;   // 输送线最远端 x
const _cabinetXEnd = X_OFF - 3.6 - 0.55 / 2; // 控制柜最远端 x
const _fenceXEnd = X_OFF - 4.05 - 0.04 / 2;  // 护栏最远端 x
const _maintXEnd = X_OFF + LEN + 0.25 + 1.5 + 0.04 / 2; // 维修端护栏最远端
const _minX = Math.min(_convLineXEnd, _cabinetXEnd, _fenceXEnd);
const _maxX = _maintXEnd;
const _metaW = _maxX - _minX;

const _fenceZMax = Math.max(AISLE_Z[0], AISLE_Z[1]) + 1.5 + 0.04 / 2;
const _fenceZMin = Math.min(AISLE_Z[0], AISLE_Z[1]) - 1.5 - 0.04 / 2;
const _cabinetZMax = Math.max(AISLE_Z[0], AISLE_Z[1]) + 1.1 + 0.35 / 2;
const _rackZMax = ROW_Z[4] + RACK_D / 2;
const _rackZMin = ROW_Z[1] - RACK_D / 2;
const _metaD = Math.max(_fenceZMax, _cabinetZMax, _rackZMax) - Math.min(_fenceZMin, _rackZMin);

const _lampTopY = 1.5 + 0.28 + 4 * 0.055 + 0.02; // 灯塔杆底 y + 杆高 + 4灯 + 帽
const _skyRailTopY = SKY_RAIL_Y + SKY_RAIL_H;
const _portalTopY = _skyRailTopY + 0.05; // 门形支架横梁顶
const _stkTopY = STK_H + UPPER_BEAM_H / 2 + 0.08; // 堆垛机顶帽与导向轮座顶
const _metaH = Math.max(_skyRailTopY, _portalTopY, _stkTopY, _lampTopY);

// ── meta ────────────────────────────────────────────────────────────────────
export const meta = {
  type: 'asrs',
  name: '自动化立体仓库',
  refs: [
    'Daifuku 托盘式自动化立体仓库/堆垛机 https://www.daifuku.com',
    '今天国际 堆垛机/立体仓库 https://www.nti56.com',
    '昆船智能 KSEC https://www.ksec.com.cn',
  ],
  size: { w: _metaW, d: _metaD, h: _metaH },
};

// ── highlightBin ────────────────────────────────────────────────────────────
export function highlightBin(group, binId) {
  const marker = group.userData._hlMarker;
  group.userData._hlBinId = null;

  // 取消高亮或未知 id：隐藏并从 group 移除，避免撑大包围盒
  if (!binId || !group.userData.bins || !group.userData.bins[binId]) {
    if (marker) {
      marker.visible = false;
      if (marker.parent === group) {
        group.remove(marker);
      }
    }
    return false;
  }

  if (!marker) return false;

  const pos = group.userData.bins[binId];
  marker.position.set(pos.x, pos.y, pos.z);
  if (group.userData._updateHlBeam) {
    group.userData._updateHlBeam(pos.y);
  }
  marker.visible = true;
  if (marker.parent !== group) {
    group.add(marker);
  }
  group.userData._hlBinId = binId;
  return true;
}

// ── 动画目标序列 ──
const TARGETS_A = [
  { col: 2, level: 5, dir: 1 },
  { col: 7, level: 2, dir: -1 },
  { col: 11, level: 6, dir: 1 },
  { col: 4, level: 1, dir: -1 },
  { col: 9, level: 4, dir: 1 },
  { col: 1, level: 3, dir: -1 },
  { col: 6, level: 6, dir: 1 },
  { col: 12, level: 2, dir: -1 },
];
const TARGETS_B = [
  { col: 10, level: 3, dir: -1 },
  { col: 3, level: 6, dir: 1 },
  { col: 8, level: 1, dir: -1 },
  { col: 5, level: 5, dir: 1 },
  { col: 12, level: 3, dir: -1 },
  { col: 1, level: 4, dir: 1 },
  { col: 6, level: 2, dir: -1 },
  { col: 9, level: 6, dir: 1 },
  { col: 2, level: 2, dir: 1 },
  { col: 6, level: 6, dir: 1 },
  { col: 9, level: 1, dir: -1 },
  { col: 12, level: 4, dir: 1 },
];

// 每个动作的时间分配(秒)
const T_TRAVEL = 3.0;   // 行走到目标列
const T_LIFT   = 2.0;   // 升降到目标层
const T_FORK_OUT = 1.0; // 货叉伸出
const T_FORK_HOLD = 0.5;// 保持
const T_FORK_IN = 1.0;  // 货叉收回
const T_CYCLE = T_TRAVEL + T_LIFT + T_FORK_OUT + T_FORK_HOLD + T_FORK_IN;

// 货叉作业高度：叉齿位于托盘叉孔高度
function forkTargetY(level) {
  return beamTopY(level) + FORK_PALLET_INSERT;
}

function stackerAnim(t, targets, stk) {
  const totalTime = targets.length * T_CYCLE;
  const ct = ((t % totalTime) + totalTime) % totalTime;
  const idx = Math.floor(ct / T_CYCLE);
  const lt = ct - idx * T_CYCLE; // 当前目标的局部时间

  const target = targets[idx % targets.length];
  const prevIdx = (idx - 1 + targets.length) % targets.length;
  const prev = targets[prevIdx];

  const targetX = X_OFF + (target.col - 0.5) * BAY;
  const prevX = X_OFF + (prev.col - 0.5) * BAY;
  const targetY = forkTargetY(target.level);
  const prevY = forkTargetY(prev.level);

  let xPos, yPos, forkZ;

  if (lt < T_TRAVEL) {
    // 行走阶段
    const p = easeInOut(clamp01(lt / T_TRAVEL));
    xPos = lerp(prevX, targetX, p);
    yPos = prevY;
    forkZ = 0;
  } else if (lt < T_TRAVEL + T_LIFT) {
    // 升降阶段
    const p = easeInOut(clamp01((lt - T_TRAVEL) / T_LIFT));
    xPos = targetX;
    yPos = lerp(prevY, targetY, p);
    forkZ = 0;
  } else if (lt < T_TRAVEL + T_LIFT + T_FORK_OUT) {
    // 货叉伸出
    const p = easeInOut(clamp01((lt - T_TRAVEL - T_LIFT) / T_FORK_OUT));
    xPos = targetX;
    yPos = targetY;
    forkZ = p * target.dir * FORK_REACH;
  } else if (lt < T_TRAVEL + T_LIFT + T_FORK_OUT + T_FORK_HOLD) {
    // 保持
    xPos = targetX;
    yPos = targetY;
    forkZ = target.dir * FORK_REACH;
  } else {
    // 货叉收回
    const p = easeInOut(clamp01((lt - T_TRAVEL - T_LIFT - T_FORK_OUT - T_FORK_HOLD) / T_FORK_IN));
    xPos = targetX;
    yPos = targetY;
    forkZ = (1 - p) * target.dir * FORK_REACH;
  }

  stk.group.position.x = xPos;
  stk.carriage.position.y = yPos;
  stk.fork.position.z = forkZ;
}

// ── 生成定位光柱向上渐隐渐变贴图 ───────────────────────────────────────────
function createHlBeamTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  // 底部（v=0，canvas y=256）不透明度更高，顶部（v=1，canvas y=0）完全渐隐
  const grad = ctx.createLinearGradient(0, 256, 0, 0);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.25, 'rgba(255, 255, 255, 0.85)');
  grad.addColorStop(0.65, 'rgba(255, 255, 255, 0.35)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// ── build ───────────────────────────────────────────────────────────────────
export function build(device) {
  const group = new THREE.Group();
  group.name = device.id;

  // ====== 高亮标记 (预创建，不默认挂载到 group) ======
  // 尺寸基于货位净空
  const hlBoxW = BAY * 0.94, hlBoxH = BIN_CLEAR * 0.90, hlBoxD = RACK_D * 0.80;
  const hlGeo = new THREE.BoxGeometry(hlBoxW, hlBoxH, hlBoxD);
  const hlMarker = new THREE.Group();
  hlMarker.name = 'hlMarker';

  // 1. 半透明告警橙填充 (#FB923C)，depthTest:false 确保隔着货架也能看到
  const hlFillMat = new THREE.MeshBasicMaterial({
    color: 0xfb923c,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  });
  const hlFill = new THREE.Mesh(hlGeo, hlFillMat);
  hlFill.name = 'hlFill';
  hlFill.renderOrder = 1000;
  hlMarker.add(hlFill);

  // 2. 加粗边框：12 条边用截面 0.045m 的细长 box 合并成 1 个 Mesh，depthTest:false
  const bT = 0.045; // 边框粗细 (0.04-0.05m)
  const bHW = hlBoxW / 2, bHH = hlBoxH / 2, bHD = hlBoxD / 2;
  const hlEdgeMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xfb923c,
    emissiveIntensity: 0.5,
    roughness: 0.35,
    metalness: 0.05,
    depthWrite: false,
    depthTest: false,
  });
  const edgeGeos = [];
  const _em = new THREE.Matrix4();
  // 4 竖边
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const eg = new THREE.BoxGeometry(bT, hlBoxH, bT);
      _em.makeTranslation(sx * bHW, 0, sz * bHD);
      eg.applyMatrix4(_em);
      edgeGeos.push(eg);
    }
  }
  // 上下各 4 条横边
  for (const sy of [-1, 1]) {
    // X 方向 2 条
    for (const sz of [-1, 1]) {
      const eg = new THREE.BoxGeometry(hlBoxW, bT, bT);
      _em.makeTranslation(0, sy * bHH, sz * bHD);
      eg.applyMatrix4(_em);
      edgeGeos.push(eg);
    }
    // Z 方向 2 条
    for (const sx of [-1, 1]) {
      const eg = new THREE.BoxGeometry(bT, bT, hlBoxD);
      _em.makeTranslation(sx * bHW, sy * bHH, 0);
      eg.applyMatrix4(_em);
      edgeGeos.push(eg);
    }
  }
  const mergedEdgeGeo = mergeGeometries(edgeGeos, false);
  edgeGeos.forEach(g => g.dispose());
  const hlEdges = new THREE.Mesh(mergedEdgeGeo, hlEdgeMat);
  hlEdges.name = 'hlEdges';
  hlEdges.renderOrder = 1200;
  hlMarker.add(hlEdges);

  // 3. 竖直定位光柱：加粗半径约 0.30m，延伸到货架顶部以上约 1.8m，depthTest:false
  const hlBoxTopLocalY = hlBoxH / 2;
  const beamRadius = 0.30;
  const beamGeo = new THREE.CylinderGeometry(beamRadius, beamRadius * 1.15, 1.0, 16, 1, true);
  beamGeo.translate(0, 0.5, 0); // 底面位于局部原点 y=0，向上延伸至 y=1
  const hlBeamTex = createHlBeamTexture();
  const hlBeamMat = new THREE.MeshBasicMaterial({
    color: 0xfb923c,
    map: hlBeamTex,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  });
  const hlBeam = new THREE.Mesh(beamGeo, hlBeamMat);
  hlBeam.name = 'hlBeam';
  hlBeam.renderOrder = 1500;
  hlMarker.add(hlBeam);

  // 4. 水平橙色圆环/光圈：货架顶部高度标出货位所在列，depthTest:false，随呼吸缩放
  const ringGeo = new THREE.RingGeometry(0.45, 0.70, 32);
  ringGeo.rotateX(-Math.PI / 2); // 水平放置在 X-Z 平面
  const hlRingMat = new THREE.MeshBasicMaterial({
    color: 0xfb923c,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  });
  const hlRing = new THREE.Mesh(ringGeo, hlRingMat);
  hlRing.name = 'hlRing';
  hlRing.renderOrder = 1800;
  hlMarker.add(hlRing);

  // 5. 顶端倒锥形指示箭头：放大到半径约 0.55m、高约 1.0m，depthTest:false
  const arrowRadius = 0.55;
  const arrowHeight = 1.0;
  const arrowGeo = new THREE.ConeGeometry(arrowRadius, arrowHeight, 16);
  arrowGeo.rotateX(Math.PI); // 倒置：尖端朝下
  arrowGeo.translate(0, arrowHeight / 2, 0); // 尖端在 y=0，底面在 y=arrowHeight
  const hlArrowMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xfb923c,
    emissiveIntensity: 0.85,
    roughness: 0.25,
    metalness: 0.1,
    depthWrite: false,
    depthTest: false, // 保证在远景全貌时始终置顶可见，不被任何构件遮挡
  });
  const hlArrow = new THREE.Mesh(arrowGeo, hlArrowMat);
  hlArrow.name = 'hlArrow';
  hlArrow.renderOrder = 2000;
  hlMarker.add(hlArrow);

  // 根据当前货位 Y 坐标动态更新光柱高度、圆环与箭头位置
  const updateHlBeam = (posY) => {
    const targetTopWorldY = TOP_Y + 1.8;
    const targetTopLocalY = targetTopWorldY - posY;
    const beamH = Math.max(0.5, targetTopLocalY - hlBoxTopLocalY);
    hlBeam.position.set(0, hlBoxTopLocalY, 0);
    hlBeam.scale.set(1, beamH, 1);
    hlRing.position.set(0, TOP_Y + 0.05 - posY, 0);
    group.userData._hlArrowBaseY = targetTopLocalY;
    hlArrow.position.set(0, targetTopLocalY, 0);
  };
  group.userData._updateHlBeam = updateHlBeam;

  // 初始配置光柱
  updateHlBeam(binCenter(1, 1, 1).y);

  hlMarker.visible = false;
  // [人工修正 反重力] 隐藏的高亮框默认在原点，半截在地面以下，会把 Box3.setFromObject 的包围盒向下撑大约 0.38 m；初始放到 01-01-01 货位中心
  hlMarker.position.copy(binCenter(1, 1, 1));
  hlMarker.renderOrder = 999;
  hlMarker.userData.noPick = true;
  hlMarker.traverse(c => { if (c.isMesh) c.userData.noPick = true; });

  group.userData._hlMarker = hlMarker;
  group.userData._hlFillMat = hlFillMat;
  group.userData._hlEdgeMat = hlEdgeMat;
  group.userData._hlBeamMat = hlBeamMat;
  group.userData._hlRing = hlRing;
  group.userData._hlRingMat = hlRingMat;
  group.userData._hlArrow = hlArrow;
  group.userData._hlBinId = null;

  // ====== 钢结构货架 ======
  const pb = new PartBuilder();

  // 浅色工业风自建材质（粗糙度适中 0.5-0.65，低金属度 ≤0.2，避免灰暗）
  const rackUprightMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.55, metalness: 0.1 });
  const rackHoleMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6, metalness: 0.1 });
  const rackSteelMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.6, metalness: 0.15 });
  const rackBeamMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.55, metalness: 0.1 });
  const railSteelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5, metalness: 0.2 });
  const groundRailBaseMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6, metalness: 0.15 });
  const skyRailMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.45, metalness: 0.2 });
  const bumperMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5, metalness: 0.1 });
  const bufferDarkMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.15 });

  for (let r = 1; r <= ROWS; r++) {
    const rz = ROW_Z[r];

    // 立柱 (每列两端各一根，共 cols+1 组，每组前后两根)
    for (let c = 0; c <= COLS; c++) {
      const cx = X_OFF + c * BAY;
      for (const sz of [-1, 1]) {
        const pz = rz + sz * UPRIGHT_Z_OFF;
        pb.box(UPRIGHT_W, TOP_Y, UPRIGHT_W, cx, 0, pz, rackUprightMat);
        // 立柱孔暗示
        for (let k = 0; k < 5; k++) {
          const hy = BASE_Y + 0.2 + k * (TOP_Y - BASE_Y - 0.4) / 4;
          pb.boxC(UPRIGHT_W + 0.005, 0.015, 0.008, cx, hy, pz + sz * (UPRIGHT_W / 2 + 0.003), rackHoleMat);
        }
      }
      // 底部地脚板
      pb.box(0.16, 0.02, RACK_D * 0.7, cx, 0, rz, rackSteelMat);

      // 立柱片斜撑（同一 x 处，在前后两根立柱之间，沿 Y-Z 平面）
      // Z 字形/X 形交替倾斜斜撑 + 水平横撑
      const frontZ = rz - UPRIGHT_Z_OFF;
      const backZ = rz + UPRIGHT_Z_OFF;
      const braceSpanZ = backZ - frontZ; // 前后立柱间距（z方向）
      // 每两层一组斜撑，共 3 组（6 层）
      for (let k = 0; k < 3; k++) {
        const yBot = BASE_Y + k * 2 * LEVEL_H + BEAM_H + 0.05;
        const yTop = BASE_Y + (k * 2 + 2) * LEVEL_H - 0.05;
        const segH = yTop - yBot;
        const braceLen = Math.sqrt(braceSpanZ * braceSpanZ + segH * segH);
        const braceAngle = Math.atan2(segH, braceSpanZ); // 斜撑在 Y-Z 平面的倾角

        // 交替方向：偶数组从前下到后上，奇数组从后下到前上
        const dir = (k % 2 === 0) ? 1 : -1;
        const midY = (yBot + yTop) / 2;
        const midZ = (frontZ + backZ) / 2;

        // 斜撑（绕 X 轴旋转的沿 Z 长条）
        // [人工修正 反重力] 原式 ±(π/2 - braceAngle) 使斜撑过平、两端伸出立柱片约 0.35 m；沿 Z 的长条应绕 X 旋转 braceAngle
        const rx = dir > 0 ? -braceAngle : braceAngle;
        pb.boxC(BRACE_T, BRACE_T, braceLen, cx, midY, midZ, rackSteelMat, rx, 0, 0);

        // 水平横撑（在段中间高度，连接前后立柱）
        pb.boxC(BRACE_T, BRACE_T, braceSpanZ, cx, midY, midZ, rackSteelMat);
      }
    }

    // 横梁（每层，排两侧各一根，采用浅灰白 #E2E8F0）
    for (let l = 0; l < LEVELS; l++) {
      const by = BASE_Y + l * LEVEL_H;
      for (const sz of [-1, 1]) {
        pb.boxC(LEN, BEAM_H, BEAM_D, X_OFF + LEN / 2, by + BEAM_H / 2, rz + sz * BEAM_Z_OFF, rackBeamMat);
      }
    }

    // ── 顶部开放结构：前后纵梁 + 每个立柱片的横向顶拉杆 ──
    for (const sz of [-1, 1]) {
      const pz = rz + sz * UPRIGHT_Z_OFF;
      pb.boxC(LEN, 0.05, 0.05, X_OFF + LEN / 2, TOP_Y + 0.025, pz, rackSteelMat);
    }
    for (let c = 0; c <= COLS; c++) {
      const cx = X_OFF + c * BAY;
      pb.boxC(0.03, 0.03, RACK_D * 0.85, cx, TOP_Y + 0.025, rz, rackSteelMat);
    }
  }

  // 顶部跨排连接梁 (每隔3列一道纵向梁)
  for (let c = 0; c <= COLS; c += 3) {
    const bx = X_OFF + c * BAY;
    pb.boxC(0.06, 0.06, totalZ * 0.95, bx, TOP_Y + 0.08, 0, rackSteelMat);
  }

  // ====== 巷道天轨 & 地轨 ======
  const railX = X_OFF + LEN / 2 - 0.5;
  const railLen = LEN + 2.0;
  for (const az of AISLE_Z) {
    // 地轨：加宽基座 (宽 0.20, #475569) + 顶部导向钢轨 (宽 0.05, #94A3B8)
    pb.boxC(railLen, GROUND_RAIL_H, GROUND_RAIL_W, railX, GROUND_RAIL_H / 2, az, groundRailBaseMat);
    pb.boxC(railLen, GROUND_RAIL_TOP_H, GROUND_RAIL_TOP_W,
      railX, GROUND_RAIL_H + GROUND_RAIL_TOP_H / 2, az, railSteelMat);

    // 地轨两端缓冲止挡块 (明亮告警黄色/橙色 #F59E0B 小方块 + 深色缓冲橡胶头)
    for (const sx of [-1, 1]) {
      const bx = railX + sx * (railLen / 2 - 0.10);
      pb.boxC(0.16, 0.12, 0.18, bx, GROUND_RAIL_H + 0.06, az, bumperMat);
      pb.boxC(0.03, 0.08, 0.12, bx - sx * 0.09, GROUND_RAIL_H + 0.06, az, bufferDarkMat);
    }

    // 天轨 (截面加大到 0.12×0.14，主色蓝 #2563EB)
    pb.boxC(LEN + 1.8, SKY_RAIL_H, SKY_RAIL_W,
      railX, SKY_RAIL_Y + SKY_RAIL_H / 2, az, skyRailMat);

    // 天轨门形吊架 (从货架顶梁一直接到天轨：每隔 3 列一副，两根竖杆 + 一根横梁跨过巷道，挂住天轨)
    const portalBeamY = SKY_RAIL_Y + SKY_RAIL_H + 0.025;
    const portalBotY = TOP_Y + 0.05;
    const portalLegH = (portalBeamY - 0.025) - portalBotY;
    for (let c = 0; c <= COLS; c += 3) {
      const bx = X_OFF + c * BAY;
      // 门架跨巷横梁 (跨度 AISLE_W+0.08)
      pb.boxC(0.05, 0.05, AISLE_W + 0.08, bx, portalBeamY, az, rackSteelMat);
      // 两根竖杆（立在巷道两侧货架边缘）
      for (const sz of [-1, 1]) {
        pb.boxC(0.05, portalLegH, 0.05, bx, portalBotY + portalLegH / 2, az + sz * (AISLE_W / 2), rackSteelMat);
      }
      // 天轨固定吊耳连接件
      pb.boxC(0.08, 0.05, SKY_RAIL_W + 0.04, bx, SKY_RAIL_Y + SKY_RAIL_H, az, rackSteelMat);
    }
  }

  // ====== 端头铭牌 ======
  const nameplateMat = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.45, metalness: 0.05 });
  const labelTex = textTexture('立体仓库 WH-A', { w: 512, h: 128, bg: '#ffffff', color: '#1e3a8a' });
  const labelMat = new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.4, metalness: 0.05 });
  for (let r = 1; r <= ROWS; r++) {
    const lpx = X_OFF - 0.06;
    const lpy = TOP_Y - 0.5;
    const lpz = ROW_Z[r];
    pb.box(0.02, 0.35, 0.8, lpx, lpy - 0.35, lpz, nameplateMat);
  }
  pb.build(group);

  // 铭牌文字面板（独立小 mesh，共用材质，仅2面）
  const labelGeo = new THREE.PlaneGeometry(0.75, 0.25);
  const label1 = new THREE.Mesh(labelGeo, labelMat);
  label1.position.set(X_OFF - 0.075, TOP_Y - 0.35, ROW_Z[1]);
  label1.rotation.y = -Math.PI / 2;
  const label2 = new THREE.Mesh(labelGeo, labelMat);
  label2.position.set(X_OFF - 0.075, TOP_Y - 0.35, ROW_Z[4]);
  label2.rotation.y = -Math.PI / 2;
  group.add(label1, label2);

  // ====== 出入库辊筒输送线 ======
  const convPb = new PartBuilder();
  const convFrameMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.55, metalness: 0.15 });
  const rollerMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.3 });
  const cabinetMat = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.5, metalness: 0.05 });
  const sensorMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6, metalness: 0.1 });

  for (let ai = 0; ai < 2; ai++) {
    const az = AISLE_Z[ai];
    for (const dz of [-0.65, 0.65]) {
      const lineZ = az + dz;
      const lineX0 = X_OFF - 0.6;
      const lineLen = 2.6;
      // 侧梁
      const sideBeamBotY = 0.60;
      for (const sz of [-0.45, 0.45]) {
        convPb.boxC(lineLen, 0.06, 0.04, lineX0 - lineLen / 2, sideBeamBotY, lineZ + sz, convFrameMat);
      }
      // 辊筒
      const rollerCount = 28;
      for (let i = 0; i < rollerCount; i++) {
        const rx = lineX0 - 0.1 - i * (lineLen / rollerCount);
        convPb.cyl(0.028, 0.84, rx, 0.60, lineZ, rollerMat, 8, Math.PI / 2, 0, 0);
      }
      // 支腿
      const legTopY = sideBeamBotY - 0.03;
      for (const sx of [lineX0 - 0.3, lineX0 - lineLen + 0.3]) {
        for (const szz of [-0.42, 0.42]) {
          convPb.box(0.05, legTopY, 0.05, sx, 0, lineZ + szz, convFrameMat);
        }
      }
    }
    const cabinetX = X_OFF - 3.6;
    const cabinetZ = az + 1.1;
    convPb.box(0.55, 1.5, 0.35, cabinetX, 0, cabinetZ, cabinetMat);
    convPb.boxC(0.38, 0.22, 0.01, cabinetX, 1.1, cabinetZ + 0.18, M.screen);
    convPb.box(0.12, 0.15, 0.1, X_OFF - 1.0, 0.7, az, sensorMat);
    convPb.boxC(0.08, 0.06, 0.015, X_OFF - 1.0, 0.85, az + 0.055, M.screen);
  }
  convPb.build(group);

  // ====== 安全护栏 ======
  const fencePb = new PartBuilder();
  const fencePostMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.55, metalness: 0.1 });
  const fenceMeshMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.6, metalness: 0.15 });
  const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.55, metalness: 0.1 });
  const doorHandleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.2 });
  // 维修端半透明网片材质 (opacity ≤ 0.25, 保持视线通透不挡巷道)
  const maintMeshMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.6,
    metalness: 0.15,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });

  // -X 端（出入库端）两侧护栏
  for (let ai = 0; ai < 2; ai++) {
    const az = AISLE_Z[ai];
    for (const dz of [-1.5, 1.5]) {
      const fz = az + dz;
      const fenceX0 = X_OFF - 0.25;
      const fenceX1 = X_OFF - 4.05;
      for (const fx of [fenceX0, fenceX1, (fenceX0 + fenceX1) / 2]) {
        fencePb.box(0.04, 1.15, 0.04, fx, 0, fz, fencePostMat);
      }
      for (const hy of [0.55, 1.05]) {
        fencePb.boxC(Math.abs(fenceX0 - fenceX1), 0.03, 0.03, (fenceX0 + fenceX1) / 2, hy, fz, fencePostMat);
      }
      // 浅色网片竖条
      const span = Math.abs(fenceX0 - fenceX1);
      const nBars = 10;
      for (let k = 0; k < nBars; k++) {
        const mx = fenceX1 + (k + 0.5) * (span / nBars);
        fencePb.boxC(0.008, 0.88, 0.008, mx, 0.58, fz, fenceMeshMat);
      }
    }
  }

  // +X 端（维修端）护栏 + 安全门（细框 + 半透明网片，保持视线通畅）
  const maintX = X_OFF + LEN + 0.25;
  for (let ai = 0; ai < 2; ai++) {
    const az = AISLE_Z[ai];
    for (const dz of [-1.5, 1.5]) {
      const fz = az + dz;
      fencePb.box(0.04, 1.15, 0.04, maintX, 0, fz, fencePostMat);
      fencePb.box(0.04, 1.15, 0.04, maintX + 1.5, 0, fz, fencePostMat);
      for (const hy of [0.55, 1.05]) {
        fencePb.boxC(1.5, 0.03, 0.03, maintX + 0.75, hy, fz, fencePostMat);
      }
      for (let k = 0; k < 4; k++) {
        const mx = maintX + 0.2 + k * 0.35;
        fencePb.boxC(0.008, 0.88, 0.008, mx, 0.58, fz, fenceMeshMat);
      }
    }
    // 安全门（细框 + 半透明网片，保持通透）
    const doorZ1 = az - 0.55;
    const doorZ2 = az + 0.55;
    const doorW = Math.abs(doorZ2 - doorZ1);
    fencePb.box(0.035, 1.20, 0.035, maintX, 0, doorZ1, doorFrameMat);
    fencePb.box(0.035, 1.20, 0.035, maintX, 0, doorZ2, doorFrameMat);
    fencePb.boxC(0.035, 0.035, doorW, maintX, 1.18, az, doorFrameMat);
    fencePb.boxC(0.025, 0.025, doorW, maintX, 0.58, az, doorFrameMat);
    fencePb.boxC(0.005, 1.05, doorW * 0.90, maintX, 0.55, az, maintMeshMat);
    fencePb.boxC(0.025, 0.08, 0.025, maintX + 0.02, 0.7, az + doorW * 0.35, doorHandleMat);
  }
  fencePb.build(group);

  // ====== 货物 InstancedMesh ======
  const bins = {};
  const allBins = [];
  for (let r = 1; r <= ROWS; r++) {
    for (let c = 1; c <= COLS; c++) {
      for (let l = 1; l <= LEVELS; l++) {
        const key = binKey(r, c, l);
        const pos = binCenter(r, c, l);
        bins[key] = pos.clone();
        allBins.push({ key, pos, row: r, col: c, level: l });
      }
    }
  }
  group.userData.bins = bins;
  group.userData.binLocal = bins;

  const occupiedBins = allBins.filter(b => hash(b.key) < 0.75);
  const cartonBins = occupiedBins.filter(b => hash(b.key + 'type') < 0.55);
  const reelBoxBins = occupiedBins.filter(b => hash(b.key + 'type') >= 0.55);

  const mat4 = new THREE.Matrix4();
  const color = new THREE.Color();

  // 托盘 InstancedMesh — 放在横梁顶面上，采用浅木色 #D9C3A0
  const palletGeo = new THREE.BoxGeometry(PALLET_W, PALLET_H, PALLET_D);
  const palletMat = new THREE.MeshStandardMaterial({
    color: 0xd9c3a0,
    roughness: 0.65,
    metalness: 0.05,
  });
  const palletMesh = new THREE.InstancedMesh(palletGeo, palletMat, occupiedBins.length);
  occupiedBins.forEach((b, i) => {
    const palletBotY = beamTopY(b.level);
    mat4.makeTranslation(b.pos.x, palletBotY + PALLET_H / 2, b.pos.z);
    palletMesh.setMatrixAt(i, mat4);
  });
  palletMesh.instanceMatrix.needsUpdate = true;
  palletMesh.castShadow = true;
  palletMesh.receiveShadow = true;
  group.add(palletMesh);

  // 纸箱 InstancedMesh — 底面在托盘顶面上，基础材质白 0xffffff 避免与 setColorAt 相乘变暗
  if (cartonBins.length > 0) {
    const cartonGeo = new THREE.BoxGeometry(0.82, 0.42, 0.65);
    const cartonMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.65,
      metalness: 0.05,
    });
    const cartonMesh = new THREE.InstancedMesh(cartonGeo, cartonMat, cartonBins.length);
    cartonBins.forEach((b, i) => {
      const hScale = 0.8 + hash(b.key + 'ch') * 0.4;
      const cartonBotY = beamTopY(b.level) + PALLET_H;
      mat4.identity();
      mat4.makeScale(1, hScale, 1);
      mat4.setPosition(b.pos.x, cartonBotY + 0.21 * hScale, b.pos.z);
      cartonMesh.setMatrixAt(i, mat4);
      const t = hash(b.key + 'cc');
      // 浅牛皮纸色：主色 #E7C9A0，微变 #EBD3B0 / #DDBB8C
      color.set(t < 0.5 ? 0xe7c9a0 : t < 0.75 ? 0xebd3b0 : 0xddbb8c);
      cartonMesh.setColorAt(i, color);
    });
    cartonMesh.instanceMatrix.needsUpdate = true;
    cartonMesh.instanceColor.needsUpdate = true;
    cartonMesh.castShadow = true;
    cartonMesh.receiveShadow = true;
    group.add(cartonMesh);
  }

  // 料盘箱 InstancedMesh (主色蓝浅色系周转箱，基础材质白 0xffffff)
  if (reelBoxBins.length > 0) {
    const rboxGeo = new THREE.BoxGeometry(0.78, 0.38, 0.60);
    const rboxMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.08,
    });
    const rboxMesh = new THREE.InstancedMesh(rboxGeo, rboxMat, reelBoxBins.length);
    reelBoxBins.forEach((b, i) => {
      const rboxBotY = beamTopY(b.level) + PALLET_H;
      mat4.makeTranslation(b.pos.x, rboxBotY + 0.19, b.pos.z);
      rboxMesh.setMatrixAt(i, mat4);
      const t = hash(b.key + 'rb');
      // 主色蓝浅色调：#93C5FD 为主，辅以 #BFDBFE / #60A5FA
      color.set(t < 0.55 ? 0x93c5fd : t < 0.8 ? 0xbfdbfe : 0x60a5fa);
      rboxMesh.setColorAt(i, color);
    });
    rboxMesh.instanceMatrix.needsUpdate = true;
    rboxMesh.instanceColor.needsUpdate = true;
    rboxMesh.castShadow = true;
    rboxMesh.receiveShadow = true;
    group.add(rboxMesh);
  }

  // 卷盘 InstancedMesh (冰蓝 #E0F2FE、纯净白 #F8FAFC 与浅灰 #CBD5E1)
  if (reelBoxBins.length > 0) {
    const reelCount = reelBoxBins.length * 2;
    const reelGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.06, 12);
    const reelMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.45,
      metalness: 0.05,
    });
    const reelMesh = new THREE.InstancedMesh(reelGeo, reelMat, reelCount);
    reelBoxBins.forEach((b, idx) => {
      for (let k = 0; k < 2; k++) {
        const i = idx * 2 + k;
        const rx = b.pos.x + (k === 0 ? -0.18 : 0.18);
        const ry = beamTopY(b.level) + PALLET_H + 0.38 + 0.03;
        mat4.makeTranslation(rx, ry, b.pos.z);
        reelMesh.setMatrixAt(i, mat4);
        const t = hash(b.key + 'reel' + k);
        color.set(t < 0.5 ? 0xe0f2fe : t < 0.8 ? 0xf8fafc : 0xcbd5e1);
        reelMesh.setColorAt(i, color);
      }
    });
    reelMesh.instanceMatrix.needsUpdate = true;
    reelMesh.instanceColor.needsUpdate = true;
    reelMesh.castShadow = true;
    group.add(reelMesh);
  }

  // ====== 堆垛机 ×2 ======
  const stackers = [];
  for (let ai = 0; ai < 2; ai++) {
    const stk = buildStacker(ai);
    stk.group.position.set(0, 0, AISLE_Z[ai]);
    group.add(stk.group);
    stackers.push(stk);
  }

  // 用 t=0 的动画姿态初始化堆垛机（解决首帧瞬移）
  stackerAnim(0, TARGETS_A, stackers[0]);
  stackerAnim(0 + 4.5, TARGETS_B, stackers[1]);

  // ====== 信号灯塔（只保留一组，放在出入库端第一个控制柜上）======
  const lampX = X_OFF - 3.6;
  group.userData.lamps = signalTower(group, lampX, 1.5, AISLE_Z[0] + 1.1);
  applyLamps(group.userData.lamps, device.status);

  // ====== 状态光环 ======
  group.updateMatrixWorld(true);
  const realSize = computeBounds(group);
  group.userData.ring = statusRing(realSize.w, realSize.d);
  group.add(group.userData.ring);
  setRingStatus(group.userData.ring, device.status);

  // ====== 动画 ======
  group.userData.animate = (t, dt, status) => {
    // 高亮标记脉动（在 run、idle、fault、maint 所有状态下均生效）
    if (hlMarker.parent === group && hlMarker.visible) {
      // 填充 opacity 在 0.22–0.45 间起伏
      const pulse = 0.335 + 0.115 * Math.sin(t * 4.0);
      hlFillMat.opacity = pulse;

      // 边框发光轻微起伏
      hlEdgeMat.emissiveIntensity = 0.45 + 0.25 * Math.sin(t * 4.0);

      // 光柱透明度在 0.55–0.75 间起伏
      hlBeamMat.opacity = 0.65 + 0.10 * Math.sin(t * 4.0);

      // 货架顶部定位圆环随呼吸缩放与透明度起伏
      const ringScale = 1.0 + 0.08 * Math.sin(t * 4.0);
      hlRing.scale.set(ringScale, 1, ringScale);
      hlRingMat.opacity = 0.65 + 0.15 * Math.sin(t * 4.0);

      // 箭头在光柱顶端轻微上下浮动 (±0.10m) 并匀速自转
      if (group.userData._hlArrowBaseY != null) {
        hlArrow.position.y = group.userData._hlArrowBaseY + 0.10 * Math.sin(t * 3.5);
        hlArrow.rotation.y = t * 1.5;
      }
    }

    // 堆垛机动画仅在 run 状态下执行
    if (status !== 'run') return;

    stackerAnim(t, TARGETS_A, stackers[0]);
    stackerAnim(t + 4.5, TARGETS_B, stackers[1]); // 相位偏移
  };

  // ====== 尺寸 ======
  group.userData.size = { w: meta.size.w, d: meta.size.d, h: meta.size.h };

  return group;
}

// ── 双立柱堆垛机构建 ──────────────────────────────────────────────────────
function buildStacker(index) {
  const g = new THREE.Group();
  g.name = index === 0 ? 'WH-STK1' : 'WH-STK2';

  // [配色说明] 强调青 (#22D3EE) 立柱+上横梁+载货台侧板，主色蓝 (#2563EB) 下横梁与顶帽，机构件 (#334155)，电控柜白 (#F4F7FB)
  const stkCyanMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    roughness: 0.50,
    metalness: 0.12,
    emissive: 0x22d3ee,
    emissiveIntensity: 0.20,
  });
  const stkBlueMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    roughness: 0.55,
    metalness: 0.15,
  });
  const stkDarkMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.60,
    metalness: 0.15,
  });
  const stkSteelMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.50,
    metalness: 0.20,
  });
  const forkMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.40,
    metalness: 0.25,
  });
  const motorMat = new THREE.MeshStandardMaterial({
    color: 0x1e40af,
    roughness: 0.50,
    metalness: 0.15,
  });
  const stkCabinetMat = new THREE.MeshStandardMaterial({
    color: 0xf4f7fb,
    roughness: 0.50,
    metalness: 0.05,
  });

  const pb = new PartBuilder();

  const halfSpan = STK_COL_SPAN / 2; // 立柱半距 (X 方向)

  // 下横梁行走机构（主色蓝 #2563EB 对比凸显）
  const wheelR = 0.07;
  const wheelCenterY = RAIL_TOP_Y + wheelR;
  const lowerBeamH = 0.16;
  const lowerBeamBotY = RAIL_TOP_Y + 0.01;
  const lowerBeamCenterY = lowerBeamBotY + lowerBeamH / 2;

  const beamLen = STK_COL_SPAN + 0.60;
  pb.boxC(beamLen, lowerBeamH, 0.36, 0, lowerBeamCenterY, 0, stkBlueMat);

  // 行走轮 (两端各2个骑在地轨上，机构件深色 #334155)
  for (const sx of [-halfSpan - 0.15, halfSpan + 0.15]) {
    for (const sz of [-GROUND_RAIL_TOP_W * 0.35, GROUND_RAIL_TOP_W * 0.35]) {
      pb.cyl(wheelR, 0.09, sx, wheelCenterY, sz, stkDarkMat, 14, Math.PI / 2, 0, 0);
    }
  }

  // 驱动电机 (一端，深蓝机身 + 金属轴)
  const motorBaseY = lowerBeamBotY + lowerBeamH;
  pb.box(0.28, 0.24, 0.26, -halfSpan - 0.08, motorBaseY, 0.22, motorMat);
  pb.cyl(0.05, 0.12, -halfSpan - 0.08, motorBaseY + 0.16, 0.38, stkSteelMat, 10);

  // 电控柜 (另一端，工业纯净白 #F4F7FB + 操作屏)
  pb.box(0.28, 0.52, 0.26, halfSpan + 0.08, motorBaseY, 0.22, stkCabinetMat);
  pb.boxC(0.20, 0.14, 0.008, halfSpan + 0.08, motorBaseY + 0.36, 0.36, M.screen);

  // 双立柱（高出货架顶 0.8m，强调青 #22D3EE + 少量自发光，在浅色场景中格外醒目）
  const colBaseY = lowerBeamBotY + lowerBeamH;
  const colH = STK_H - colBaseY;
  for (const sx of [-1, 1]) {
    const colX = sx * halfSpan;
    // 粗壮立柱主截面 (0.16 × 0.20)
    pb.box(STK_COL_W, colH, STK_COL_D, colX, colBaseY, 0, stkCyanMat);
    // 立柱内侧导轨精密镶条暗示
    pb.box(0.02, colH, 0.04, sx * (halfSpan - STK_COL_W / 2 + 0.01), colBaseY, 0, stkDarkMat);
  }

  // 上横梁（连接两立柱顶端，强调青 #22D3EE）
  pb.boxC(STK_COL_SPAN + STK_COL_W + 0.04, UPPER_BEAM_H, STK_COL_D, 0, STK_H, 0, stkCyanMat);

  // 立柱顶帽（主色蓝封头帽盖）
  for (const sx of [-1, 1]) {
    pb.boxC(STK_COL_W + 0.02, 0.025, STK_COL_D + 0.02, sx * halfSpan, STK_H + UPPER_BEAM_H / 2 + 0.0125, 0, stkBlueMat);
  }

  // 顶部导向轮（竖直轴圆柱，夹住天轨两侧）+ 安装支承座
  const guideWheelR = 0.04;
  const guideWheelH = 0.08;
  const guideWheelZ = SKY_RAIL_HALF_W + guideWheelR;
  const guideWheelY = SKY_RAIL_Y + SKY_RAIL_H / 2;
  const bracketBotY = STK_H + UPPER_BEAM_H / 2;
  const bracketH = guideWheelY - bracketBotY;
  for (const sx of [-0.18, 0.18]) {
    pb.boxC(0.06, bracketH, 0.26, sx, bracketBotY + bracketH / 2, 0, stkDarkMat);
    for (const sz of [-1, 1]) {
      pb.cyl(guideWheelR, guideWheelH, sx, guideWheelY, sz * guideWheelZ, stkDarkMat, 12);
    }
  }

  // 检修爬梯（-X 立柱外侧，机构件深色 #334155）
  const ladderX = -halfSpan - STK_COL_W / 2 - 0.06;
  const ladderH = (STK_H - 0.30) * 0.90;
  for (const dz of [-0.12, 0.12]) {
    pb.box(0.025, ladderH, 0.025, ladderX, 0.30, dz, stkDarkMat);
  }
  const ladderRungs = 16;
  for (let k = 0; k < ladderRungs; k++) {
    const ry = 0.40 + k * ((ladderH - 0.20) / ladderRungs);
    pb.boxC(0.025, 0.02, 0.22, ladderX, ry, 0, stkDarkMat);
  }

  pb.build(g);

  // 载货台 (单独 Group，可升降) — 宽度适配立柱间距
  const carriage = new THREE.Group();
  carriage.name = 'carriage';

  const cpb = new PartBuilder();
  const carrW = STK_COL_SPAN - STK_COL_W - 0.06;
  const carrD = 1.05;
  // 载货台平台底板
  cpb.box(carrW, 0.05, carrD, 0, 0, 0, stkSteelMat);
  // 载货台侧板/主框架（醒目青色 #22D3EE）
  for (const sx of [-1, 1]) {
    cpb.box(0.04, 0.35, carrD * 0.95, sx * (carrW / 2 + 0.02), 0.05, 0, stkCyanMat);
  }
  // 载货台小型安全护栏框（侧边立起青/蓝安全护栏，大幅提升等距视角可见度）
  for (const sx of [-1, 1]) {
    const fx = sx * (carrW / 2 + 0.02);
    // 护栏立柱
    for (const sz of [-carrD * 0.42, carrD * 0.42]) {
      cpb.boxC(0.025, 0.22, 0.025, fx, 0.40 + 0.11, sz, stkCyanMat);
    }
    // 上扶手横杆
    cpb.boxC(0.025, 0.025, carrD * 0.86, fx, 0.62, 0, stkCyanMat);
    // 中间安全横杆
    cpb.boxC(0.02, 0.02, carrD * 0.86, fx, 0.51, 0, stkBlueMat);
  }

  // 导靴 (C 形三块板包住立柱，机构件深色 #334155)
  const colInnerX = halfSpan - STK_COL_W / 2;
  const guideThk = 0.015;
  const guideLenZ = STK_COL_D + 0.04;
  const guideLenY = 0.07;
  for (const sx of [-1, 1]) {
    for (const sy of [0.06, 0.28]) {
      cpb.boxC(guideThk, guideLenY, guideLenZ,
        sx * (colInnerX + guideThk / 2), sy, 0, stkDarkMat);
      const wingLen = STK_COL_W + guideThk;
      for (const szz of [-1, 1]) {
        cpb.boxC(wingLen, guideLenY, guideThk,
          sx * (colInnerX + wingLen / 2), sy, szz * (guideLenZ / 2), stkDarkMat);
      }
    }
  }
  cpb.build(carriage);

  // 货叉 (单独子 Group，可沿 ±Z 伸缩)
  const fork = new THREE.Group();
  fork.name = 'fork';
  const fpb = new PartBuilder();

  // 中叉基座（连接板）
  fpb.box(FORK_TINE_GAP + FORK_TINE_W, 0.02, 0.30, 0, 0, 0, stkSteelMat);

  // 两根叉齿（中叉+上叉，高反差金属银灰 #CBD5E1）
  for (const sx of [-1, 1]) {
    const tx = sx * FORK_TINE_GAP / 2;
    // 中叉段
    fpb.boxC(FORK_TINE_W, FORK_TINE_H, FORK_TINE_L * 0.5,
      tx, 0.02 + FORK_TINE_H / 2, 0, forkMat);
    // 上叉段
    fpb.boxC(FORK_TINE_W * 0.85, FORK_TINE_H * 0.8, FORK_TINE_L * 0.55,
      tx, 0.02 + FORK_TINE_H + FORK_TINE_H * 0.8 / 2, 0, forkMat);
  }

  fpb.build(fork);
  fork.position.set(0, 0.05, 0);
  carriage.add(fork);

  carriage.position.set(0, 1.0, 0);
  g.add(carriage);

  return { group: g, carriage, fork };
}

export default { meta, build, highlightBin };
