// src/three/devices/conveyor.js
// SMT 接驳台 — Nutek S NTM410M / NTM0401 1 m SMEMA 连线输送机
// 输送面 0.90 m（目录 950±25 mm，本线统一 0.90 m）
// 无三色灯、无操作屏；地面状态环保留。
import * as THREE from 'three';
import { M, lampMat, statusColor } from '../materials.js';
import { PartBuilder, textTexture } from '../builder.js';
import { applyLamps, statusRing, setRingStatus } from '../common.js';

const LEN = 1.00;
const PCB_Y = 0.90;
const RAIL_ZF = 0.118; // 固定轨（操作侧 +Z）
const RAIL_ZB = -0.108;
const PCB_L = 0.28;
const PCB_W = 0.210;
const PCB_T = 0.006;
const PCB_CY = PCB_Y + 0.001 + PCB_T / 2;
const PCB_Z = (RAIL_ZF + RAIL_ZB) / 2;

const POST = 0.040;
const LEG_X = 0.36;
const BEAM_H = 0.040;
const RAIL_BOT = PCB_Y - 0.044; // 0.856，轨体底面
const BEAM_TOP = RAIL_BOT;
const BEAM_BOT = BEAM_TOP - BEAM_H; // 0.816
const Z_FRONT = 0.254; // 前立柱中心；立柱正面即前面板背面
const Z_REAR = -0.264;
const FRONT_FACE = Z_FRONT + POST / 2 + 0.012; // 0.286 = 固定轨 + 168 mm
const COVER_TOP = 0.98;
const SPEED = 0.22; // m/s，约 13 m/min，接近目录 14 m/min
const D_BODY = 0.63; // 后蒙皮到调宽旋钮，约 0.632 m

const FONT = '"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif';

export const meta = {
  type: 'conveyor',
  name: '接驳台',
  refs: [
    'Nutek S NTM410M Linking Conveyor — 1000×570×985 mm，手轮调宽，SMEMA，皮带 14 m/min',
    'https://www.nutek-europe.com/s-ntm410-linking-conveyor',
    'Nutek NTM0401-M-1000 — 1000×570×985 mm，固定轨到前面 168 mm',
    'https://www.nutek-sg.com/products/standard/linking-conveyor-500mm-1000mm',
  ],
  size: { w: LEN, d: D_BODY, h: COVER_TOP },
};

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
  g.fillStyle = '#262a30';
  [[36, 40, 64, 40], [124, 36, 80, 52], [40, 108, 48, 32], [140, 112, 72, 36]].forEach(([x, y, w, h]) => {
    g.fillRect(x, y, w, h);
  });
  g.fillStyle = '#e8eef5';
  for (let i = 0; i < 8; i++) g.fillRect(18 + i * 28, 16, 8, 5);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function build(device) {
  const group = new THREE.Group();
  group.name = device.id;
  const status = device.status || 'idle';
  const pb = new PartBuilder();
  const len = Math.max(0.62, Number(device && device.length) || LEN);
  const k = len / LEN;
  const legX = LEG_X * k;

  // 双导轨，端面正在 x=±len/2，底面贴住机架上横梁
  for (const z of [RAIL_ZF, RAIL_ZB]) {
    const s = z > 0 ? 1 : -1;
    pb.boxC(len, 0.036, 0.032, 0, PCB_Y - 0.026, z, M.metal);
    pb.boxC(len, 0.008, 0.016, 0, PCB_Y - 0.004, z, M.belt);
    pb.boxC(len, 0.012, 0.006, 0, (PCB_Y - 0.008) + 0.006, z + s * 0.013, M.steel);
  }

  const postZ = [Z_FRONT, Z_REAR];
  const zIn0 = Z_REAR + POST / 2;
  const zIn1 = Z_FRONT - POST / 2;
  const xIn = legX - POST / 2;

  // 两端 H 形方钢腿架。立柱顶住上横梁，横梁顶面贴轨底
  for (const sx of [-1, 1]) {
    const x = sx * legX;
    for (const z of postZ) {
      pb.box(0.09, 0.020, 0.064, x, 0, z, M.black);
      pb.boxC(POST, BEAM_BOT - 0.020, POST, x, (BEAM_BOT + 0.020) / 2, z, M.white);
    }
    const zSpan = (Z_FRONT + POST / 2) - (Z_REAR - POST / 2);
    const zMid = (Z_FRONT + Z_REAR) / 2;
    pb.boxC(POST, BEAM_H, zSpan, x, (BEAM_TOP + BEAM_BOT) / 2, zMid, M.white);
    pb.boxC(POST * 0.7, 0.032, zIn1 - zIn0, x, 0.28, (zIn0 + zIn1) / 2, M.white);
    // 端部蒙皮嵌在两立柱之间，上沿接到上横梁底
    pb.boxC(0.010, BEAM_TOP - 0.10, zIn1 - zIn0, x + sx * (POST / 2 + 0.005), (BEAM_TOP + 0.10) / 2, (zIn0 + zIn1) / 2, M.white);
  }

  // 两只腿架之间的纵梁：轨下各一根（顶面贴轨底），前后各一根连成立柱
  for (const z of [RAIL_ZF, RAIL_ZB]) {
    pb.boxC(xIn * 2, BEAM_H, 0.028, 0, (BEAM_TOP + BEAM_BOT) / 2, z, M.white);
  }
  for (const z of postZ) {
    pb.boxC(xIn * 2, 0.032, 0.028, 0, 0.28, z, M.white);
  }

  // 前后蒙皮：上沿 = 轨底，固定轨到前面 168 mm
  const skinH = BEAM_TOP - 0.10;
  const skinY = (BEAM_TOP + 0.10) / 2;
  const skinW = xIn * 2;
  pb.boxC(skinW, skinH, 0.012, 0, skinY, FRONT_FACE - 0.006, M.white);
  pb.boxC(skinW, 0.016, 0.008, 0, 0.62, FRONT_FACE + 0.004, M.blue);
  pb.boxC(skinW, skinH, 0.012, 0, skinY, (Z_REAR - POST / 2) - 0.006, M.white);

  const plateMat = new THREE.MeshStandardMaterial({
    map: textTexture('NTM410  接驳台', {
      w: 512, h: 128, bg: '#F4F7FB', color: '#1F2A3D',
      font: `bold 52px ${FONT}`,
    }),
    roughness: 0.45,
    metalness: 0.04,
  });
  pb.add(new THREE.PlaneGeometry(0.22 * Math.min(1, k), 0.055), plateMat, 0.08 * k, 0.40, FRONT_FACE + 0.001);

  // 调宽手轮。轮在面板外，丝杠在面板内接到后轨下的吊耳，不穿进轨体
  const shaftY = 0.70;
  const shaftX = -0.20 * k;
  const bearT = 0.022;
  const bearZ = FRONT_FACE + bearT / 2;
  pb.boxC(0.046, 0.12, bearT, shaftX, shaftY, bearZ, M.gray);
  const wheelZ = bearZ + bearT / 2 + 0.006;
  pb.cyl(0.040, 0.012, shaftX, shaftY, wheelZ, M.metal, 24, Math.PI / 2, 0, 0);
  pb.cyl(0.009, 0.016, shaftX + 0.026, shaftY + 0.020, wheelZ + 0.006 + 0.008, M.cyan, 10, Math.PI / 2, 0, 0);
  const shaftZ1 = RAIL_ZB + 0.010;
  const shaftZ0 = FRONT_FACE - 0.012;
  pb.cyl(0.007, shaftZ0 - shaftZ1, shaftX, shaftY, (shaftZ0 + shaftZ1) / 2, M.steel, 10, Math.PI / 2, 0, 0);
  pb.boxC(0.022, BEAM_BOT - (shaftY - 0.010), 0.020, shaftX, (BEAM_BOT + shaftY - 0.010) / 2, RAIL_ZB, M.gray);

  // 进板 / 出板传感器，立在固定轨外侧唇上
  const lipZ = RAIL_ZF + 0.013;
  for (const x of [-0.42 * k, 0.42 * k]) {
    pb.boxC(0.012, 0.044, 0.010, x, 0.904 + 0.022, lipZ, M.steel);
    pb.boxC(0.028, 0.018, 0.016, x, 0.948 + 0.009, lipZ, M.darkGray);
    pb.boxC(0.010, 0.010, 0.006, x, 0.948 + 0.009, lipZ - 0.011, M.cyan);
  }

  // 低翻盖，底边贴近轨面，两端敞开
  const covZf = 0.156;
  const covZb = -0.146;
  const riserH = COVER_TOP - BEAM_TOP;
  for (const x of [-legX, legX]) {
    for (const z of [covZf, covZb]) {
      pb.boxC(0.016, riserH, 0.016, x, BEAM_TOP + riserH / 2, z, M.white);
    }
  }
  const barH = 0.014;
  const barY = COVER_TOP - barH / 2;
  const spanX = (legX - 0.008) * 2;
  pb.boxC(spanX, barH, 0.014, 0, barY, covZf, M.white);
  pb.boxC(spanX, barH, 0.014, 0, barY, covZb, M.white);
  const openZ0 = covZb + 0.007;
  const openZ1 = covZf - 0.007;
  const glassT = 0.005;
  const topGlassY = (COVER_TOP - barH) - glassT / 2;
  pb.boxC(spanX, glassT, openZ1 - openZ0, 0, topGlassY, (openZ0 + openZ1) / 2, M.glass);
  const sideTop = topGlassY - glassT / 2;
  const sideBot = 0.922;
  const sideH = sideTop - sideBot;
  pb.boxC(spanX, sideH, glassT, 0, sideBot + sideH / 2, openZ1 - glassT / 2, M.glass);
  pb.boxC(spanX, sideH, glassT, 0, sideBot + sideH / 2, openZ0 + glassT / 2, M.glass);

  pb.build(group);
  group.traverse((o) => {
    if (o.isMesh && o.material && o.material.transparent) o.renderOrder = 2;
  });

  const boardMat = M.pcb.clone();
  boardMat.map = pcbTexture();
  boardMat.color.set(0xffffff);
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(PCB_L, PCB_T, PCB_W), boardMat);
  pcb.name = 'pcb';
  pcb.castShadow = true;
  pcb.position.set(-0.08, PCB_CY, PCB_Z);
  group.add(pcb);

  const xEnter = -len / 2 - PCB_L * 0.35;
  const xLeave = len / 2 + PCB_L * 0.35;
  const span = xLeave - xEnter;

  function applyMotion(t, st) {
    if (st !== 'run') {
      pcb.position.x = -0.08;
      return;
    }
    let u = (t * SPEED) % span;
    if (u < 0) u += span;
    pcb.position.x = xEnter + u;
  }
  applyMotion(0, status);

  group.userData.lamps = null;
  applyLamps(group.userData.lamps, status);
  group.userData.ring = statusRing(len, D_BODY);
  group.add(group.userData.ring);
  setRingStatus(group.userData.ring, status);
  group.userData.animate = (t, _dt, st) => applyMotion(t, st);
  group.userData.size = { w: len, d: D_BODY, h: COVER_TOP };
  return group;
}

void lampMat;
void statusColor;
