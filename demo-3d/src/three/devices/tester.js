// 转塔式测试分选机（turret test handler）
// 外观参照：Cohu Ismeca NY20 / NX16（振动盘进料、圆周吸嘴转塔、多测试座、料管分选）
// 与长川科技 EXIS 550/700 一类转塔分选机。不在 SMT 线上，无 0.90 m 传送带。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { M } from '../materials.js';
import { PartBuilder, roundedBoxGeo, textTexture } from '../builder.js';
import { signalTower, applyLamps, statusRing, setRingStatus, monitorArm, vents } from '../common.js';

const TAU = Math.PI * 2;

// ── 占地与工作面（局部坐标，build 末尾把包围盒中心移到原点）────────
const CAB_W = 1.08;
const CAB_D = 0.92;
const CAB_X = -0.16;
const CAB_Z = 0.02;
const DECK_TOP = 0.86;
const WORK_Y = 0.932; // 吸嘴取放 / 测试接触平面

const TX = -0.08;
const TZ = -0.04;
const TR = 0.198;
const NPOS = 16;

const BX = 0.72;
const BZ = -0.18;
const BR = 0.20;

const PICK_ANG = Math.atan2(BZ - TZ, BX - TX);
const VISION_ANG = PICK_ANG + 0.50;
const TEST_ANGS = [0.96, 1.38, 1.78].map((d) => PICK_ANG + d);
const SORT_ANGS = [2.16, 2.50, 2.82, 3.14].map((d) => PICK_ANG + d);

const NOZZLE_Y = 1.032;
const TIP_LEN = 0.066;
const OMEGA = 0.82;

const HX0 = TX - 0.40;
const HX1 = TX + 0.36;
const HZ0 = TZ - 0.36;
const HZ1 = TZ + 0.36;
const HY0 = 0.868;
const HY1 = 1.56;
const SILL_Y = 1.045;

const PED_TOP = 0.60;
const RIM_Y = 0.956;

// ── 本机材质（不改共享库）────────────────────────────────────────
const matSS = new THREE.MeshStandardMaterial({
  color: 0xd5dee8, roughness: 0.32, metalness: 0.84, side: THREE.DoubleSide,
});
const matTube = new THREE.MeshStandardMaterial({
  color: 0xe5f3ff, roughness: 0.06, metalness: 0.08,
  transparent: true, opacity: 0.40, depthWrite: false, side: THREE.DoubleSide,
});
const matNozzle = new THREE.MeshStandardMaterial({ color: 0xc5ced6, roughness: 0.22, metalness: 0.92 });

const _yAxis = new THREE.Vector3(0, 1, 0);
const _zAxis = new THREE.Vector3(0, 0, 1);
const _dir = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _scl = new THREE.Vector3(1, 1, 1);
const _dummy = new THREE.Object3D();

function angDist(a, b) {
  let d = Math.abs(a - b) % TAU;
  if (d > Math.PI) d = TAU - d;
  return d;
}
function relToPick(a) {
  let d = (a - PICK_ANG) % TAU;
  if (d < 0) d += TAU;
  return d;
}
function smoothPulse(dist, width) {
  if (dist >= width || dist < 0) return 0;
  const k = 1 - dist / width;
  return k * k * (3 - 2 * k);
}
function polar(ang, r, y = 0) {
  return new THREE.Vector3(TX + Math.cos(ang) * r, y, TZ + Math.sin(ang) * r);
}
// 把四元数直接烘焙进几何。PartBuilder.add 只接受 Euler XYZ，
// setFromUnitVectors 再拆成欧拉时，长轴可能对不齐线段。
function bakeAlong(geo, x, y, z) {
  _m4.compose(_pos.set(x, y, z), _q, _scl);
  geo.applyMatrix4(_m4);
  return geo;
}
function addBeam(pb, x0, y0, z0, x1, y1, z1, sx, sy, mat) {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-4) return;
  _dir.set(dx / len, dy / len, dz / len);
  _q.setFromUnitVectors(_zAxis, _dir);
  pb.add(bakeAlong(new THREE.BoxGeometry(sx, sy, len), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), mat);
}
function addCylAlong(pb, x0, y0, z0, x1, y1, z1, r, mat, seg = 8, open = false) {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-4) return;
  _dir.set(dx / len, dy / len, dz / len);
  _q.setFromUnitVectors(_yAxis, _dir);
  pb.add(bakeAlong(new THREE.CylinderGeometry(r, r, len, seg, 1, open), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), mat);
}
function addFoot(pb, x, z) {
  pb.cyl(0.034, 0.028, x, 0.014, z, M.black, 12);
  pb.cyl(0.012, 0.058, x, 0.050, z, M.steel, 8);
}
function addEStop(pb, x, y, z) {
  pb.cyl(0.028, 0.010, x, y + 0.005, z, M.yellow, 16);
  pb.cyl(0.018, 0.016, x, y + 0.016, z, M.red, 16);
  pb.cyl(0.008, 0.006, x, y + 0.010, z, M.black, 10);
}
function makeNozzleGeo() {
  const flange = new THREE.CylinderGeometry(0.011, 0.011, 0.008, 10).translate(0, -0.004, 0);
  const shank = new THREE.CylinderGeometry(0.0066, 0.0066, 0.042, 10).translate(0, -0.029, 0);
  const tip = new THREE.CylinderGeometry(0.0028, 0.0066, 0.018, 10).translate(0, -0.057, 0);
  const g = mergeGeometries([flange, shank, tip].map((geo) => {
    const n = geo.index ? geo.toNonIndexed() : geo;
    return n;
  }), false);
  flange.dispose(); shank.dispose(); tip.dispose();
  return g;
}
function hmiTexture() {
  const c = document.createElement('canvas');
  c.width = 768; c.height = 512;
  const g = c.getContext('2d');
  const font = '"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif';
  g.fillStyle = '#F4F7FB';
  g.fillRect(0, 0, 768, 512);
  g.fillStyle = '#2563EB';
  g.fillRect(0, 0, 768, 92);
  g.fillStyle = '#ffffff';
  g.font = `bold 52px ${font}`;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillText('测试分选机', 28, 46);
  g.fillStyle = '#22D3EE';
  g.fillRect(612, 26, 128, 40);
  g.fillStyle = '#0B1F33';
  g.font = `bold 26px ${font}`;
  g.textAlign = 'center';
  g.fillText('RUN', 676, 46);

  g.fillStyle = '#E7EEF7';
  g.fillRect(20, 112, 356, 168);
  g.fillRect(392, 112, 356, 168);
  g.textAlign = 'left';
  g.fillStyle = '#5C6B80';
  g.font = `28px ${font}`;
  g.fillText('UPH', 40, 156);
  g.fillText('良率', 412, 156);
  g.fillStyle = '#2563EB';
  g.font = `bold 68px ${font}`;
  g.fillText('7200', 40, 224);
  g.fillStyle = '#0891B2';
  g.fillText('99.2%', 412, 224);

  const bins = [
    ['良品', '6840', '#2563EB', '#1D4ED8'],
    ['不良', '42', '#FB923C', '#C2410C'],
    ['复测', '86', '#22D3EE', '#0E7490'],
    ['溢料', '12', '#FB923C', '#C2410C'],
  ];
  bins.forEach((b, i) => {
    const x = 20 + i * 188;
    g.fillStyle = '#E7EEF7';
    g.fillRect(x, 304, 176, 184);
    g.fillStyle = b[2];
    g.fillRect(x, 304, 176, 12);
    g.fillStyle = '#1F2A3D';
    g.font = `bold 32px ${font}`;
    g.textAlign = 'center';
    g.fillText(b[0], x + 88, 368);
    g.fillStyle = b[3];
    g.font = `bold 44px ${font}`;
    g.fillText(b[1], x + 88, 432);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function binLabelTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 128;
  const g = c.getContext('2d');
  const items = [
    ['良品', '#1c8a4a', '#ffffff'],
    ['不良', '#c5363b', '#ffffff'],
    ['复测', '#d39a22', '#1f2a3d'],
    ['溢料', '#d26516', '#ffffff'],
  ];
  items.forEach((it, i) => {
    const x = i * 256;
    g.fillStyle = it[1];
    g.fillRect(x, 0, 256, 128);
    g.font = 'bold 72px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif';
    g.fillStyle = it[2];
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(it[0], x + 128, 66);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function labelPlane(u0, u1, w, h) {
  const geo = new THREE.PlaneGeometry(w, h);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * (u1 - u0));
  return geo;
}

function buildBowl(exitAng) {
  const g = new THREE.Group();
  g.name = 'bowl';
  const pb = new PartBuilder();
  const floorBottom = 0.788;
  const wallH = RIM_Y - floorBottom;

  // 振动器：橡胶隔振脚 + 带散热环的驱动体
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    pb.cyl(0.020, 0.032, sx * 0.105, PED_TOP + 0.016, sz * 0.105, M.rubber, 10);
  }
  pb.cyl(0.092, 0.148, 0, PED_TOP + 0.108, 0, M.darkGray, 24);
  for (let i = 0; i < 5; i++) {
    pb.cyl(0.108, 0.010, 0, PED_TOP + 0.048 + i * 0.024, 0, M.darkGray, 24);
  }

  // 料斗：锥壁（开口）+ 卷边 + 深色盘底 + 中心锥
  pb.add(
    new THREE.CylinderGeometry(BR, BR * 0.90, wallH, 40, 1, true),
    matSS, 0, floorBottom + wallH / 2, 0,
  );
  pb.add(new THREE.TorusGeometry(BR, 0.009, 8, 36), matSS, 0, RIM_Y, 0, Math.PI / 2, 0, 0);
  pb.add(new THREE.TorusGeometry(BR * 0.90, 0.007, 6, 32), matSS, 0, floorBottom + 0.012, 0, Math.PI / 2, 0, 0);
  pb.cyl(BR * 0.86, 0.014, 0, floorBottom + 0.012, 0, M.steel, 36);
  pb.add(new THREE.CylinderGeometry(0.012, 0.062, 0.10, 16), matSS, 0, floorBottom + 0.062, 0);

  // 螺旋轨道，末端对准出料方向
  const turns = 1.72;
  const nSeg = 34;
  for (let i = 0; i < nSeg; i++) {
    const u = i / (nSeg - 1);
    const ang = exitAng - (1 - u) * turns * TAU;
    const r = 0.055 + u * (BR * 0.78 - 0.055);
    const y = floorBottom + 0.028 + u * (RIM_Y - floorBottom - 0.04);
    const x = Math.cos(ang) * r;
    const z = Math.sin(ang) * r;
    pb.add(new THREE.BoxGeometry(0.058, 0.016, 0.030), matSS, x, y, z, 0, -ang - Math.PI / 2, 0);
  }

  // 出料舌
  const lip0 = BR * 0.92;
  const lip1 = BR + 0.055;
  addBeam(
    pb,
    Math.cos(exitAng) * lip0, RIM_Y - 0.004, Math.sin(exitAng) * lip0,
    Math.cos(exitAng) * lip1, WORK_Y + 0.004, Math.sin(exitAng) * lip1,
    0.036, 0.010, matSS,
  );
  for (const s of [-1, 1]) {
    const px = -Math.sin(exitAng) * s * 0.016;
    const pz = Math.cos(exitAng) * s * 0.016;
    addBeam(
      pb,
      Math.cos(exitAng) * lip0 + px, RIM_Y + 0.004, Math.sin(exitAng) * lip0 + pz,
      Math.cos(exitAng) * lip1 + px, WORK_Y + 0.012, Math.sin(exitAng) * lip1 + pz,
      0.008, 0.016, matSS,
    );
  }

  pb.build(g, { cloneMaterials: false });
  g.position.set(BX, 0, BZ);
  return g;
}

export const meta = {
  type: 'tester',
  name: '测试分选机',
  refs: [
    'Cohu Ismeca NY20 — 20-station turret test handler, bowl/tube/tape in, up to 8 contacting stations, tube & bulk out. Overall 0.8×0.8×1.80 m, floor space 1.3×1.0×1.80 m. https://www.cohu.com/ny20/',
    'Cohu Ismeca NY20 product sheet REV20210827 https://www.cohu.com/wp-content/uploads/2019/06/NY20-Product-Sheet_TnI_20210827.pdf',
    'Cohu Ismeca NX16 — 16-position turret handler (vision, test contact, tube/reel). 2-frame overall about 1.3×1.6×2.05 m.',
    '长川科技 EXIS 550/700 转塔式分选机 — 32/40 工位，可选 Bowl 进料，Tube/Bulk 出料，整机约 1800×1200×960 mm. https://www.onetest.net/index/product/show?cate=-1&id=17671',
  ],
  size: { w: 1.58, d: 1.22, h: 1.56 },
};

export function build(device) {
  const group = new THREE.Group();
  group.name = device.id;

  const rig = new THREE.Group();
  rig.name = 'rig';
  group.add(rig);

  const pb = new PartBuilder();
  const frontZ = CAB_Z + CAB_D / 2 + 0.040;
  const backZ = CAB_Z - CAB_D / 2 - 0.034;
  const leftX = CAB_X - CAB_W / 2 - 0.034;
  const cabRight = CAB_X + CAB_W / 2;
  const cabLeft = CAB_X - CAB_W / 2;

  // ══ A. 机柜、地脚、腰线 ════════════════════════════════════════
  const fx = CAB_W / 2 - 0.09;
  const fz = CAB_D / 2 - 0.09;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) addFoot(pb, CAB_X + sx * fx, CAB_Z + sz * fz);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) addFoot(pb, BX + sx * 0.13, BZ + sz * 0.13);

  pb.add(roundedBoxGeo(CAB_W + 0.05, 0.09, CAB_D + 0.05, 0.04), M.graphite, CAB_X, 0.085, CAB_Z);
  pb.add(roundedBoxGeo(CAB_W, 0.72, CAB_D, 0.046), M.white, CAB_X, 0.475, CAB_Z);
  pb.add(roundedBoxGeo(CAB_W + 0.03, 0.050, CAB_D + 0.03, 0.036), M.blue, CAB_X, 0.792, CAB_Z);
  pb.boxC(CAB_W + 0.040, 0.012, CAB_D + 0.040, CAB_X, 0.824, CAB_Z, M.cyan);
  pb.add(roundedBoxGeo(CAB_W - 0.08, 0.030, CAB_D - 0.10, 0.02), M.metal, CAB_X, 0.845, CAB_Z - 0.01);

  // 正面双门、拉手、铭牌、格栅
  pb.boxC(CAB_W * 0.40, 0.50, 0.014, CAB_X - CAB_W * 0.215, 0.48, frontZ, M.ivory);
  pb.boxC(CAB_W * 0.40, 0.50, 0.014, CAB_X + CAB_W * 0.215, 0.48, frontZ, M.ivory);
  pb.boxC(0.010, 0.50, 0.008, CAB_X, 0.48, frontZ + 0.006, M.darkGray);
  for (const sx of [-1, 1]) {
    const hx = CAB_X + sx * 0.10;
    pb.boxC(0.014, 0.11, 0.018, hx, 0.50, frontZ + 0.016, M.metal);
    pb.boxC(0.046, 0.014, 0.018, hx, 0.548, frontZ + 0.016, M.metal);
    pb.boxC(0.046, 0.014, 0.018, hx, 0.452, frontZ + 0.016, M.metal);
  }
  const plateTex = textTexture('TH-16  测试分选机', {
    w: 640, h: 160,
    font: 'bold 60px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif',
    color: '#16325c', bg: '#f3f6fb',
  });
  const matPlate = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.42, metalness: 0.06 });
  pb.boxC(0.40, 0.092, 0.008, CAB_X, 0.64, frontZ + 0.010, M.metal);
  pb.add(new THREE.PlaneGeometry(0.36, 0.072), matPlate, CAB_X, 0.64, frontZ + 0.016);

  vents(pb, CAB_X - 0.22, 0.18, frontZ + 0.004, 0.28, 0.14, 5, M.darkGray, 'z');
  vents(pb, leftX, 0.30, CAB_Z - 0.06, 0.42, 0.32, 8, M.darkGray, 'x');
  vents(pb, CAB_X - 0.10, 0.34, backZ, 0.36, 0.28, 7, M.darkGray, 'z');

  // 正面线缆槽
  pb.boxC(0.78, 0.050, 0.046, CAB_X, 0.20, frontZ + 0.006, M.darkGray);
  pb.boxC(0.70, 0.018, 0.020, CAB_X, 0.214, frontZ + 0.018, M.black);
  for (let i = 0; i < 3; i++) {
    pb.cyl(0.006, 0.22, CAB_X - 0.22 + i * 0.22, 0.214, frontZ + 0.020, M.black, 6, 0, 0, Math.PI / 2);
  }

  // 背面测试接口
  pb.boxC(0.32, 0.24, 0.014, CAB_X + 0.22, 0.50, backZ, M.darkGray);
  for (let i = 0; i < 3; i++) {
    pb.boxC(0.046, 0.032, 0.022, CAB_X + 0.12 + i * 0.09, 0.52, backZ - 0.012, M.metal);
  }
  pb.cyl(0.014, 0.32, CAB_X + 0.36, 0.30, backZ - 0.02, M.black, 8);
  pb.boxC(0.08, 0.05, 0.04, CAB_X + 0.36, 0.50, backZ - 0.02, M.graphite);

  // 振动盘立柱与连接桥
  pb.add(roundedBoxGeo(0.38, 0.52, 0.38, 0.03), M.white, BX, 0.30, BZ);
  pb.boxC(0.40, 0.028, 0.40, BX, 0.40, BZ, M.blue);
  pb.boxC(0.32, 0.016, 0.32, BX, PED_TOP - 0.008, BZ, M.metal);
  const pedLeft = BX - 0.19;
  if (pedLeft > cabRight) {
    const mx = (cabRight + pedLeft) / 2;
    const mw = pedLeft - cabRight + 0.04;
    pb.boxC(mw, 0.022, 0.18, mx, 0.72, BZ, M.metal);
    pb.box(0.03, 0.72, 0.03, mx, 0, BZ, M.steel);
  }

  // 急停与按钮（台面前沿，操作面 +Z）
  const browZ = CAB_Z + CAB_D / 2 - 0.06;
  addEStop(pb, CAB_X + 0.34, DECK_TOP, browZ);
  pb.cyl(0.014, 0.012, CAB_X + 0.26, DECK_TOP + 0.008, browZ, M.green, 12);
  pb.cyl(0.014, 0.012, CAB_X + 0.22, DECK_TOP + 0.008, browZ, M.darkGray, 12);
  for (let i = 0; i < 3; i++) {
    const mat = i === 0 ? M.green : i === 1 ? M.yellow : M.cyan;
    pb.cyl(0.007, 0.010, CAB_X + 0.40, DECK_TOP + 0.008, browZ - 0.06 + i * 0.028, mat, 8);
  }

  // ══ B. 防护罩（铝框 + 薄观察窗，下前部敞开便于看清转塔与料管）══
  const post = (x, z) => pb.box(0.020, HY1 - HY0, 0.020, x, HY0, z, M.metal);
  post(HX0, HZ0); post(HX1, HZ0); post(HX0, HZ1); post(HX1, HZ1);
  const hw = HX1 - HX0;
  const hd = HZ1 - HZ0;
  const hcx = (HX0 + HX1) / 2;
  const hcz = (HZ0 + HZ1) / 2;
  pb.boxC(hw, 0.018, 0.018, hcx, HY1, HZ0, M.metal);
  pb.boxC(hw, 0.018, 0.018, hcx, HY1, HZ1, M.metal);
  pb.boxC(0.018, 0.018, hd, HX0, HY1, hcz, M.metal);
  pb.boxC(0.018, 0.018, hd, HX1, HY1, hcz, M.metal);
  pb.boxC(hw, 0.016, 0.016, hcx, HY0 + 0.008, HZ0, M.metal);
  pb.boxC(hw, 0.016, 0.016, hcx, HY0 + 0.008, HZ1, M.metal);
  pb.boxC(0.016, 0.016, hd, HX0, HY0 + 0.008, hcz, M.metal);
  pb.boxC(0.016, 0.016, hd, HX1, HY0 + 0.008, hcz, M.metal);
  // 前窗中槛、门锁与合页
  pb.boxC(hw - 0.04, 0.016, 0.016, hcx, SILL_Y, HZ1, M.metal);
  pb.boxC(0.012, 0.10, 0.020, HX1 - 0.03, SILL_Y - 0.08, HZ1 + 0.006, M.metal);
  pb.cyl(0.008, 0.04, HX0 + 0.012, SILL_Y - 0.06, HZ1, M.darkGray, 8);
  pb.cyl(0.008, 0.04, HX0 + 0.012, HY0 + 0.10, HZ1, M.darkGray, 8);

  const glassH = HY1 - SILL_Y - 0.04;
  const glassY = (HY1 + SILL_Y) / 2 - 0.006;
  pb.add(new THREE.BoxGeometry(hw - 0.06, glassH, 0.006), M.glass, hcx, glassY, HZ1 - 0.012);
  pb.boxC(0.014, glassH, 0.012, hcx, glassY, HZ1 - 0.004, M.metal);
  pb.add(new THREE.BoxGeometry(hw - 0.06, glassH, 0.006), M.glass, hcx, glassY, HZ0 + 0.012);
  // 左壁整块；右壁只保留进料槽以上，槽口让直振轨道穿入
  pb.add(new THREE.BoxGeometry(0.006, HY1 - HY0 - 0.08, hd - 0.06), M.glass, HX0 + 0.012, (HY0 + HY1) / 2, hcz);
  const slot0 = 0.895;
  const slot1 = 1.045;
  const upperH = HY1 - slot1 - 0.03;
  pb.add(new THREE.BoxGeometry(0.006, upperH, hd - 0.06), M.glass, HX1 - 0.012, slot1 + upperH / 2 + 0.01, hcz);
  pb.boxC(0.012, 0.012, hd - 0.08, HX1 - 0.004, slot0, hcz, M.metal);
  pb.boxC(0.012, 0.012, hd - 0.08, HX1 - 0.004, slot1, hcz, M.metal);
  // 顶窗
  pb.add(new THREE.BoxGeometry(hw - 0.08, 0.006, hd - 0.08), M.glass, hcx, HY1 - 0.006, hcz);
  pb.boxC(hw + 0.01, 0.012, 0.014, hcx, HY1 + 0.004, HZ1, M.blue);

  // ══ C. 转塔底座、测试座、相机、直振轨道 ══════════════════════
  pb.cyl(0.078, 0.016, TX, DECK_TOP + 0.010, TZ, M.metal, 24);
  pb.cyl(0.056, 0.088, TX, DECK_TOP + 0.052, TZ, M.steel, 20);
  pb.cyl(0.040, 0.012, TX, 0.952, TZ, M.copper, 16);
  pb.cyl(0.255, 0.006, TX, DECK_TOP + 0.008, TZ, M.graphite, 32);

  // 测试座：接触块、铜垫、导柱、线缆
  const manifold = new THREE.Vector3(TX, DECK_TOP + 0.03, TZ - 0.30);
  pb.box(0.09, 0.05, 0.07, manifold.x, DECK_TOP, manifold.z, M.darkGray);
  TEST_ANGS.forEach((ang) => {
    const p = polar(ang, TR);
    pb.box(0.052, 0.064, 0.046, p.x, DECK_TOP, p.z, M.graphite, -ang);
    pb.box(0.026, 0.008, 0.020, p.x, DECK_TOP + 0.064, p.z, M.copper, -ang);
    const tx = -Math.sin(ang);
    const tz = Math.cos(ang);
    pb.cyl(0.0045, 0.036, p.x + tx * 0.020, DECK_TOP + 0.078, p.z + tz * 0.020, M.steel, 8);
    pb.cyl(0.0045, 0.036, p.x - tx * 0.020, DECK_TOP + 0.078, p.z - tz * 0.020, M.steel, 8);
    addCylAlong(pb, p.x, DECK_TOP + 0.04, p.z, manifold.x, manifold.y, manifold.z, 0.005, M.black, 6);
  });
  addCylAlong(pb, manifold.x, manifold.y, manifold.z, CAB_X + 0.22, DECK_TOP + 0.02, backZ + 0.08, 0.010, M.black, 8);

  // 视觉相机（顶视 + 侧视各一，Ismeca 式检测工位）
  function addCamera(ang, rPost, yHead) {
    const postP = polar(ang, rPost);
    const head = polar(ang, TR + 0.012, yHead);
    pb.cyl(0.008, yHead - DECK_TOP, postP.x, (yHead + DECK_TOP) / 2, postP.z, M.darkGray, 8);
    addBeam(pb, postP.x, yHead, postP.z, head.x, yHead, head.z, 0.014, 0.012, M.darkGray);
    pb.boxC(0.042, 0.030, 0.036, head.x, yHead, head.z, M.darkGray);
    pb.cyl(0.009, 0.016, head.x, yHead - 0.022, head.z, M.black, 10);
    pb.cyl(0.005, 0.008, head.x, yHead + 0.012, head.z, M.blue, 8);
  }
  addCamera(VISION_ANG, 0.30, 1.08);
  addCamera(TEST_ANGS[2] + 0.28, 0.30, 1.00);

  // 测试压头的固定缸筒与上支撑环（活动杆另做）
  const RING_Y = 1.175;
  pb.add(new THREE.TorusGeometry(0.255, 0.007, 8, 36), M.steel, TX, RING_Y, TZ, Math.PI / 2, 0, 0);
  TEST_ANGS.forEach((ang) => {
    const outer = polar(ang, 0.255);
    const inner = polar(ang, TR);
    pb.cyl(0.008, RING_Y - DECK_TOP, outer.x, (RING_Y + DECK_TOP) / 2, outer.z, M.steel, 8);
    addBeam(pb, outer.x, RING_Y - 0.01, outer.z, inner.x, RING_Y - 0.01, inner.z, 0.012, 0.010, M.steel);
    pb.cyl(0.012, 0.034, inner.x, RING_Y - 0.04, inner.z, M.steel, 10);
    pb.cyl(0.004, 0.05, inner.x + 0.016, RING_Y - 0.02, inner.z, M.cyan, 6);
  });

  // 直振轨道：出料舌末端 → 转塔取料位，水平、细轨，只在罩外留出接舌的一段
  const exitAng = Math.atan2(TZ - BZ, TX - BX);
  const lipR = BR + 0.055;
  const railY = WORK_Y + 0.004;
  const spout = new THREE.Vector3(
    BX + Math.cos(exitAng) * lipR,
    railY,
    BZ + Math.sin(exitAng) * lipR,
  );
  const pick = polar(PICK_ANG, TR - 0.010, railY);
  addBeam(pb, spout.x, railY, spout.z, pick.x, railY, pick.z, 0.014, 0.005, M.metal);
  const rdx = pick.x - spout.x, rdz = pick.z - spout.z;
  const rlen = Math.hypot(rdx, rdz) || 1;
  const px = -rdz / rlen, pz = rdx / rlen;
  for (const s of [-1, 1]) {
    addBeam(
      pb,
      spout.x + px * s * 0.009, railY + 0.006, spout.z + pz * s * 0.009,
      pick.x + px * s * 0.009, railY + 0.006, pick.z + pz * s * 0.009,
      0.003, 0.008, M.steel,
    );
  }
  // 轨道支脚与直线驱动块
  for (const u of [0.22, 0.48, 0.74]) {
    const x = spout.x + rdx * u;
    const z = spout.z + rdz * u;
    const baseY = (x > cabRight - 0.02 && x < pedLeft) ? 0.73 : DECK_TOP;
    const h = railY - baseY;
    if (h > 0.02) pb.cyl(0.008, h, x, baseY + h / 2, z, M.steel, 8);
  }
  const driveU = 0.18;
  pb.box(0.12, 0.055, 0.08, spout.x + rdx * driveU, railY - 0.06, spout.z + rdz * driveU, M.darkGray);
  // 取料止挡
  pb.box(0.010, 0.028, 0.024, pick.x + Math.cos(PICK_ANG) * 0.02, WORK_Y - 0.004, pick.z + Math.sin(PICK_ANG) * 0.02, M.steel);

  // ══ D. 分选料管与料盒 ══════════════════════════════════════════
  const BIN_W = 0.128, BIN_D = 0.15, BIN_H = 0.20, BIN_T = 0.008, BIN_GAP = 0.020;
  const binY = 0.40;
  const totalBinW = 4 * BIN_W + 3 * BIN_GAP;
  const binLeft = 0.02;
  const binZ = HZ1 + 0.22;
  const binColors = [M.green, M.red, M.yellow, M.orange];
  const binInfo = [];
  for (let i = 0; i < 4; i++) {
    const x = binLeft + BIN_W / 2 + i * (BIN_W + BIN_GAP);
    const z = binZ;
    pb.box(BIN_W, BIN_T, BIN_D, x, binY, z, M.ivory);
    pb.box(BIN_W, BIN_H, BIN_T, x, binY, z - BIN_D / 2 + BIN_T / 2, M.ivory);
    pb.box(BIN_W, BIN_H, BIN_T, x, binY, z + BIN_D / 2 - BIN_T / 2, M.ivory);
    pb.box(BIN_T, BIN_H, BIN_D - BIN_T * 2, x - BIN_W / 2 + BIN_T / 2, binY, z, M.ivory);
    pb.box(BIN_T, BIN_H, BIN_D - BIN_T * 2, x + BIN_W / 2 - BIN_T / 2, binY, z, M.ivory);
    pb.box(BIN_W - BIN_T * 2 - 0.008, 0.014, BIN_D - BIN_T * 2 - 0.008, x, binY + BIN_T, z, binColors[i]);
    binInfo.push({ x, z, top: binY + BIN_H, back: z - BIN_D / 2 });
  }
  const shelfW = totalBinW + 0.08;
  const shelfX = binLeft + totalBinW / 2;
  const shelfZ = binZ - 0.01;
  pb.boxC(shelfW, 0.018, BIN_D + 0.10, shelfX, binY - 0.012, shelfZ, M.darkGray);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    pb.box(0.026, binY - 0.02, 0.026, shelfX + sx * (shelfW / 2 - 0.04), 0, shelfZ + sz * ((BIN_D + 0.10) / 2 - 0.03), M.steel);
  }
  // 把料盒架接回机柜前沿
  pb.boxC(0.08, 0.016, 0.16, shelfX - shelfW / 2 + 0.02, binY - 0.01, (frontZ + binZ - BIN_D / 2) / 2, M.darkGray);

  const matLabels = new THREE.MeshStandardMaterial({ map: binLabelTexture(), roughness: 0.48, metalness: 0.04 });
  for (let i = 0; i < 4; i++) {
    const b = binInfo[i];
    pb.add(labelPlane(i / 4, (i + 1) / 4, 0.10, 0.040), matLabels, b.x, binY + BIN_H * 0.55, b.z + BIN_D / 2 + 0.006);
  }

  // 料管：分选漏斗 → 下前部敞开处向前 → 在柜门前方下降 → 落入对应料盒。
  // 不再用一根 y=0.97 的长横管扫过罩前和柜门。
  const tubePaths = [];
  const doorClearZ = frontZ + 0.045;
  for (let i = 0; i < 4; i++) {
    const slot = 3 - i; // 先到的工位靠近 +X，与料盒从左到右 良品→溢料 对齐
    const b = binInfo[slot];
    const s = polar(SORT_ANGS[i], TR + 0.006);
    pb.add(new THREE.CylinderGeometry(0.011, 0.020, 0.032, 10), M.darkGray, s.x, WORK_Y + 0.006, s.z);
    const p0 = new THREE.Vector3(s.x, WORK_Y - 0.012, s.z);
    const p1 = new THREE.Vector3(s.x, 0.900, HZ1 + 0.012);
    const p2 = new THREE.Vector3(s.x, 0.900, doorClearZ + i * 0.010);
    const p3 = new THREE.Vector3(b.x, b.top + 0.055, doorClearZ + i * 0.010);
    const p4 = new THREE.Vector3(b.x, b.top + 0.012, b.z - 0.012);
    addCylAlong(pb, p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, 0.011, matTube, 10, true);
    addCylAlong(pb, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, 0.011, matTube, 10, true);
    addCylAlong(pb, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z, 0.011, matTube, 10, true);
    addCylAlong(pb, p3.x, p3.y, p3.z, p4.x, p4.y, p4.z, 0.011, matTube, 10, true);
    tubePaths.push([p0, p1, p2, p3, p4]);
  }

  // 操作屏（+Z 操作面，偏左，不挡住转塔）+ 浅色 HMI 贴在屏面前 1.5 mm
  const monX = cabLeft + 0.20;
  const monY = DECK_TOP - 0.01;
  const monZ = browZ - 0.02;
  const monRy = 0.42;
  const monRx = -0.12;
  const monArm = 0.34;
  const monW = 0.30;
  const monH = 0.20;
  monitorArm(pb, monX, monY, monZ, { ry: monRy, armH: monArm, w: monW, h: monH });
  const monS = Math.sin(monRy);
  const monC = Math.cos(monRy);
  const scrX = monX + monS * 0.059;
  const scrY = monY + monArm + monH / 2 + 0.02;
  const scrZ = monZ + monC * 0.059;
  // 与 monitorArm 相同的 XYZ 欧拉：先 Rx 再 Ry，局部 +Z 为屏面法线
  const faceY = -Math.sin(monRx);
  const faceZ0 = Math.cos(monRx);
  const faceX = faceZ0 * monS;
  const faceZ = faceZ0 * monC;
  const faceGap = 0.0045;
  const matHmi = new THREE.MeshStandardMaterial({
    map: hmiTexture(), roughness: 0.4, metalness: 0.02,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  pb.add(
    new THREE.PlaneGeometry(monW, monH), matHmi,
    scrX + faceX * faceGap, scrY + faceY * faceGap, scrZ + faceZ * faceGap,
    monRx, monRy, 0,
  );
  // 灯塔法兰：杆在 signalTower 里，底座并进主机金属网格
  pb.cyl(0.034, 0.010, HX0 + 0.08, HY1 + 0.005, HZ0 + 0.08, M.metal, 16);

  pb.build(rig);
  rig.traverse((o) => {
    if (o.isMesh && o.material && o.material.transparent) o.renderOrder = 2;
  });

  // ══ E. 振动盘（独立 Group，运行时轻振）════════════════════════
  const bowl = buildBowl(exitAng);
  rig.add(bowl);

  // ══ F. 转塔（独立 Group，不进主 PartBuilder）══════════════════
  const turret = new THREE.Group();
  turret.name = 'turret';
  turret.position.set(TX, 0, TZ);
  const tpb = new PartBuilder();
  const DISK_Y = 1.040;
  tpb.cyl(0.050, 0.078, 0, 0.998, 0, M.metal, 20);
  tpb.cyl(0.186, 0.016, 0, DISK_Y, 0, M.metal, 40);
  tpb.cyl(0.034, 0.030, 0, DISK_Y + 0.022, 0, M.darkGray, 16);
  tpb.add(new THREE.TorusGeometry(0.070, 0.006, 6, 24), M.darkGray, 0, DISK_Y - 0.006, 0, Math.PI / 2, 0, 0);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + 0.05;
    tpb.add(
      new THREE.BoxGeometry(0.09, 0.004, 0.007),
      M.darkGray,
      Math.cos(a) * 0.09, DISK_Y + 0.011, Math.sin(a) * 0.09,
      0, -a, 0,
    );
  }
  tpb.build(turret, { cloneMaterials: false });

  const localAng = new Float64Array(NPOS);
  const sortRel = new Float64Array(NPOS);
  for (let i = 0; i < NPOS; i++) {
    localAng[i] = PICK_ANG + (i * TAU) / NPOS;
    sortRel[i] = relToPick(SORT_ANGS[i % 4]);
  }

  const nozzles = new THREE.InstancedMesh(makeNozzleGeo(), matNozzle, NPOS);
  nozzles.name = 'nozzles';
  nozzles.frustumCulled = false;
  nozzles.castShadow = true;
  turret.add(nozzles);

  const chipGeo = new THREE.BoxGeometry(0.018, 0.007, 0.012);
  const turretChips = new THREE.InstancedMesh(chipGeo, M.pcbChip, NPOS);
  turretChips.name = 'turretChips';
  turretChips.frustumCulled = false;
  turretChips.castShadow = true;
  turret.add(turretChips);
  rig.add(turret);

  // 测试压头（随工位短促下压）
  const ramGeo = new THREE.CylinderGeometry(0.0065, 0.0065, 0.046, 10);
  const rams = new THREE.InstancedMesh(ramGeo, M.chrome, TEST_ANGS.length);
  rams.name = 'rams';
  rams.frustumCulled = false;
  rams.castShadow = true;
  rig.add(rams);
  const RAM_Y = 1.105;

  // 直轨道与料管内的元件
  const flowPaths = [];
  for (let k = 0; k < 3; k++) {
    flowPaths.push({
      pts: [spout.clone(), pick.clone()],
      speed: 0.18,
      phase: k / 3,
      park: 0.18 + k * 0.26,
      yLift: 0.010,
    });
  }
  tubePaths.forEach((pts, i) => {
    for (let k = 0; k < 2; k++) {
      flowPaths.push({
        pts,
        speed: 0.22,
        phase: (i * 0.17 + k * 0.5) % 1,
        park: 0.86 + k * 0.06,
        yLift: 0,
      });
    }
  });
  const flow = new THREE.InstancedMesh(chipGeo, M.pcbChip, flowPaths.length);
  flow.name = 'flowChips';
  flow.frustumCulled = false;
  flow.castShadow = true;
  rig.add(flow);

  function layoutNozzles(dipOf, showOf) {
    for (let i = 0; i < NPOS; i++) {
      const a = localAng[i];
      const dip = dipOf ? dipOf(i, a) : 0;
      const show = showOf ? showOf(i, a) : 1;
      _dummy.position.set(Math.cos(a) * TR, NOZZLE_Y + dip, Math.sin(a) * TR);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      nozzles.setMatrixAt(i, _dummy.matrix);
      _dummy.position.set(Math.cos(a) * TR, NOZZLE_Y + dip - TIP_LEN - 0.002, Math.sin(a) * TR);
      _dummy.rotation.set(0, a, 0);
      _dummy.scale.setScalar(show);
      _dummy.updateMatrix();
      turretChips.setMatrixAt(i, _dummy.matrix);
    }
    nozzles.instanceMatrix.needsUpdate = true;
    turretChips.instanceMatrix.needsUpdate = true;
  }
  function layoutRams(kOf) {
    for (let i = 0; i < TEST_ANGS.length; i++) {
      const a = TEST_ANGS[i];
      const k = kOf ? kOf(a) : 0;
      _dummy.position.set(TX + Math.cos(a) * TR, RAM_Y - 0.020 * k, TZ + Math.sin(a) * TR);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      rams.setMatrixAt(i, _dummy.matrix);
    }
    rams.instanceMatrix.needsUpdate = true;
  }
  function layoutFlow(t, run) {
    for (let i = 0; i < flowPaths.length; i++) {
      const p = flowPaths[i];
      let u = run ? (t * p.speed + p.phase) % 1 : p.park;
      if (u < 0) u += 1;
      const n = p.pts.length - 1;
      let x = u * n;
      let seg = Math.floor(x);
      if (seg >= n) { seg = n - 1; x = n; }
      const f = x - seg;
      const a = p.pts[seg];
      const b = p.pts[seg + 1];
      _dummy.position.set(
        a.x + (b.x - a.x) * f,
        a.y + (b.y - a.y) * f + p.yLift,
        a.z + (b.z - a.z) * f,
      );
      _dummy.rotation.set(0, Math.atan2(b.z - a.z, b.x - a.x), 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      flow.setMatrixAt(i, _dummy.matrix);
    }
    flow.instanceMatrix.needsUpdate = true;
  }

  function applyMotion(t, status) {
    const run = status === 'run';
    if (!run) {
      turret.rotation.y = 0;
      bowl.position.set(BX, 0, BZ);
      bowl.rotation.set(0, 0, 0);
      layoutNozzles(
        () => 0,
        (i) => (relToPick(localAng[i]) < sortRel[i] ? 1 : 0),
      );
      layoutRams(() => 0);
      layoutFlow(0, false);
      return;
    }
    turret.rotation.y = -t * OMEGA;
    const wob = t * 17;
    bowl.position.set(BX + Math.sin(wob) * 0.0032, 0, BZ + Math.cos(wob * 1.17) * 0.0032);
    bowl.rotation.set(Math.sin(wob) * 0.006, 0, Math.cos(wob * 1.17) * 0.006);
    const ry = turret.rotation.y;
    layoutNozzles(
      (i, a) => {
        const world = a - ry;
        let k = smoothPulse(angDist(world, PICK_ANG), 0.12);
        for (let s = 0; s < TEST_ANGS.length; s++) k = Math.max(k, smoothPulse(angDist(world, TEST_ANGS[s]), 0.11));
        k = Math.max(k, smoothPulse(angDist(world, SORT_ANGS[i % 4]), 0.11));
        return -0.030 * k;
      },
      (i, a) => (relToPick(a - ry) < sortRel[i] ? 1 : 0),
    );
    layoutRams((ang) => {
      const step = TAU / NPOS;
      let d = (ang + ry - PICK_ANG) % step;
      if (d < 0) d += step;
      if (d > step / 2) d = step - d;
      return smoothPulse(d, 0.11);
    });
    layoutFlow(t, true);
  }

  // ══ G. 灯塔、地面光环、尺寸 ════════════════════════════════════
  const towerHost = new THREE.Group();
  towerHost.name = 'tower';
  group.userData.lamps = signalTower(towerHost, HX0 + 0.08, HY1, HZ0 + 0.08, 0.10);
  rig.add(towerHost);

  applyMotion(0, device.status || 'idle');

  // 以机身（不含灯塔）包围盒把底面中心移到原点，并给出 meta.size
  rig.updateMatrixWorld(true);
  const bodyBox = new THREE.Box3();
  rig.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    let p = o.parent;
    while (p) {
      if (p.name === 'tower') return;
      p = p.parent;
    }
    bodyBox.union(new THREE.Box3().setFromObject(o));
  });
  const center = bodyBox.getCenter(new THREE.Vector3());
  rig.position.x -= center.x;
  rig.position.z -= center.z;
  if (bodyBox.min.y !== 0) rig.position.y -= bodyBox.min.y;

  rig.updateMatrixWorld(true);
  const sized = new THREE.Box3();
  rig.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    let p = o.parent;
    while (p) {
      if (p.name === 'tower') return;
      p = p.parent;
    }
    sized.union(new THREE.Box3().setFromObject(o));
  });
  const size = {
    w: sized.max.x - sized.min.x,
    d: sized.max.z - sized.min.z,
    h: sized.max.y - sized.min.y,
  };
  meta.size = size;
  group.userData.size = { w: size.w, d: size.d, h: size.h };

  group.userData.ring = statusRing(size.w, size.d);
  group.add(group.userData.ring);
  applyLamps(group.userData.lamps, device.status || 'idle');
  setRingStatus(group.userData.ring, device.status || 'idle');

  group.userData.animate = (t, _dt, status) => applyMotion(t, status);
  return group;
}
