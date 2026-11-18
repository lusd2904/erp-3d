// 立体仓库：4 排 × 12 列 × 6 层托盘货架 + 双巷道堆垛机 + 出入库输送线
import * as THREE from 'three';
import { PartBuilder } from './builder.js';
import { M } from './materials.js';
import { signalTower } from './common.js';
import { warehouse as WH, binId } from '../data/plant.js';

export const BAY = 1.15, LEVEL_H = 0.92, RACK_D = 1.1, BASE_Y = 0.18;
export const ROW_Z = { 1: 0, 2: 2.9, 3: 4.05, 4: 6.95 };
export const AISLE_Z = [1.45, 5.5];
const LEN = WH.cols * BAY, TOP = BASE_Y + WH.levels * LEVEL_H + 0.25;

function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }

export function buildRacks({ occupied } = {}) {
  const g = new THREE.Group(), pb = new PartBuilder();
  const uprightMat = M.blue, beamMat = M.orange;
  for (let r = 1; r <= WH.rows; r++) {
    const z = ROW_Z[r];
    for (let c = 0; c <= WH.cols; c++) {
      const x = c * BAY;
      for (const s of [-1, 1]) pb.box(0.07, TOP, 0.07, x, 0, z + s * (RACK_D / 2 - 0.04), uprightMat);
      // 立柱间斜撑
      for (let k = 0; k < 6; k++) pb.add(new THREE.BoxGeometry(0.02, 1.25, 0.02), M.steel, x, 0.5 + k * 1.0, z, k % 2 ? 0.75 : -0.75, 0, 0);
      pb.box(0.16, 0.02, RACK_D, x, 0, z, M.steel); // 底板
    }
    for (let l = 0; l < WH.levels; l++) {
      const y = BASE_Y + l * LEVEL_H;
      for (const s of [-1, 1]) pb.boxC(LEN, 0.08, 0.045, LEN / 2, y, z + s * (RACK_D / 2 - 0.04), beamMat);
    }
    pb.boxC(LEN, 0.06, RACK_D, LEN / 2, TOP, z, M.steel);
    // 端部标识牌
    pb.box(0.02, 0.4, 0.7, -0.05, TOP - 0.7, z, M.white);
  }
  // 顶部连接梁 + 巷道天轨/地轨
  for (let c = 0; c <= WH.cols; c += 3) pb.boxC(0.06, 0.06, ROW_Z[4] - ROW_Z[1] + RACK_D, c * BAY, TOP + 0.05, (ROW_Z[1] + ROW_Z[4]) / 2, M.steel);
  for (const az of AISLE_Z) {
    pb.boxC(LEN + 3, 0.06, 0.12, LEN / 2 - 1.2, 0.03, az, M.steel);
    pb.boxC(LEN + 3, 0.02, 0.05, LEN / 2 - 1.2, 0.07, az, M.chrome);
    pb.boxC(LEN + 2.6, 0.1, 0.08, LEN / 2 - 1.2, TOP + 0.1, az, M.steel);
  }
  // 出入库辊筒输送线（巷道前端）
  for (const az of AISLE_Z) {
    for (const s of [-1, 1]) pb.boxC(2.2, 0.08, 0.05, -1.7, 0.6, az + s * 0.55, M.metal);
    for (let i = 0; i < 24; i++) pb.cyl(0.03, 1.05, -2.75 + i * 0.09, 0.6, az, M.chrome, 8, Math.PI / 2, 0, 0);
    for (const sx of [-2.7, -0.7]) for (const s of [-1, 1]) pb.box(0.05, 0.56, 0.05, sx, 0, az + s * 0.55, M.metal);
    pb.box(0.6, 1.4, 0.3, -3.2, 0, az + 0.9, M.white); // 扫码/控制柜
    pb.boxC(0.4, 0.25, 0.01, -3.2, 1.05, az + 1.055, M.screen);
  }
  // 安全护栏（巷道前端）
  for (const az of AISLE_Z) for (const s of [-1, 1]) { pb.box(0.05, 1.1, 0.05, -0.3, 0, az + s * 0.62, M.yellow); }
  pb.build(g, { cloneMaterials: true });

  // 托盘 + 料箱（实例化）
  const bins = [], pal = [], cart = [];
  for (let r = 1; r <= WH.rows; r++) for (let c = 1; c <= WH.cols; c++) for (let l = 1; l <= WH.levels; l++) {
    const id = binId(r, c, l); const occ = occupied ? occupied.has(id) : hash(id) > 0.16;
    const p = new THREE.Vector3((c - 0.5) * BAY, BASE_Y + (l - 1) * LEVEL_H + 0.05, ROW_Z[r]);
    bins.push({ id, pos: p, occ, row: r, col: c, level: l });
  }
  const occList = bins.filter(b => b.occ);
  const palMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.0, 0.12, 0.95), M.pallet.clone(), occList.length);
  const boxMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.92, 0.5, 0.88), M.carton.clone(), occList.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  occList.forEach((b, i) => {
    m4.makeTranslation(b.pos.x, b.pos.y + 0.06, b.pos.z); palMesh.setMatrixAt(i, m4);
    const h = 0.6 + hash(b.id + 'h') * 0.5; m4.makeScale(1, h, 1).setPosition(b.pos.x, b.pos.y + 0.12 + 0.25 * h, b.pos.z); boxMesh.setMatrixAt(i, m4);
    const t = hash(b.id + 'c'); col.set(t < 0.55 ? 0xd8b27c : t < 0.75 ? 0xc9a06a : t < 0.9 ? 0x9ec3e6 : 0xb9d9b4); boxMesh.setColorAt(i, col);
  });
  palMesh.castShadow = boxMesh.castShadow = true; palMesh.receiveShadow = boxMesh.receiveShadow = true;
  g.add(palMesh, boxMesh);
  return { group: g, bins, size: { w: LEN, h: TOP, d: ROW_Z[4] + RACK_D } };
}

// 单立柱堆垛机
export function buildStacker() {
  const g = new THREE.Group(), pb = new PartBuilder();
  const H = TOP + 0.05;
  pb.box(1.4, 0.25, 0.42, 0, 0.08, 0, M.yellow);         // 下横梁行走机构
  for (const sx of [-0.55, 0.55]) pb.cyl(0.1, 0.12, sx, 0.12, 0, M.darkGray, 18, Math.PI / 2, 0, 0);
  pb.box(0.38, 0.35, 0.36, -0.45, 0.33, 0, M.navy);       // 驱动电机箱
  pb.box(0.32, 0.5, 0.26, 0.5, 0.33, 0, M.white);         // 电控柜
  pb.box(0.22, H - 0.4, 0.26, -0.15, 0.33, 0, M.yellow);  // 立柱
  for (let i = 0; i < 12; i++) pb.boxC(0.005, 0.18, 0.2, -0.04, 0.6 + i * 0.5, 0.0, M.darkGray); // 立柱检修孔
  pb.box(0.7, 0.12, 0.3, -0.15, H - 0.07, 0, M.yellow);   // 上横梁
  for (const s of [-1, 1]) pb.cyl(0.05, 0.06, -0.15 + s * 0.25, H + 0.07, 0, M.black, 12);
  pb.build(g);
  const lamps = signalTower(g, 0.5, 0.83, 0.1, 0.12);
  // 载货台 + 货叉（可升降）
  const car = new THREE.Group(), cp = new PartBuilder();
  cp.box(0.95, 0.08, 1.0, 0.45, 0, 0, M.steel);
  for (const s of [-1, 1]) cp.box(0.06, 0.5, 1.0, 0.45 + s * 0.45, 0, 0, M.yellow);
  cp.box(0.9, 0.04, 0.12, 0.45, 0.08, -0.25, M.chrome); cp.box(0.9, 0.04, 0.12, 0.45, 0.08, 0.25, M.chrome);
  cp.box(0.25, 0.3, 0.3, 0.0, 0.1, 0.0, M.navy);
  cp.build(car); car.position.set(-0.15, 0.6, 0); g.add(car);
  return { group: g, car, lamps, size: { w: 1.4, h: H + 0.1, d: 1.0 } };
}
export { TOP as RACK_TOP, LEN as RACK_LEN };
