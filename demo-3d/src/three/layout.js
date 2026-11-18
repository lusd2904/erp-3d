import * as THREE from 'three';
// 产线布局：按设备机身 userData.size.w 沿 +X 排列。
// 外部 loader / conveyor 加载成功才显示，失败预留间距、不报错。
// 短间距用 0.90 m 高细导轨衔接；回流焊入/出口外伸 0.45 m 全部留空，接驳台缩短后只在炉口对接。
import { PartBuilder } from './builder.js';
import { M } from './materials.js';
import { getExternal } from './factory.js';

export const LINE_Z = { L1: -10.5, L2: -5.5 };
export const LINE_X0 = -20.35;
export const SMT_SEQ = ['PRN', 'SPI', 'MNT1', 'MNT2', 'RFL', 'AOI'];
export const L3_POS = { 'L3-TST1': [-17.6, 1.0], 'L3-TST2': [-14.9, 1.0], 'L3-TAP1': [-11.9, 1.0], 'L3-TAP2': [-9.7, 1.0] };
export const WH_ORIGIN = new THREE.Vector3(4.6, 0, -13.5);
export const AISLE_WORLD_Z = [WH_ORIGIN.z + 1.45, WH_ORIGIN.z + 5.5];
export const RAIL_Y = 0.90;

function extBuild(type, dev = {}) {
  const mod = getExternal(type);
  if (!mod || typeof mod.build !== 'function') return null;
  try {
    const g = mod.build({ id: dev.id || type, type, status: dev.status || 'run', ...dev });
    return g && g.isObject3D ? g : (g && g.group) || null;
  } catch {
    return null;
  }
}

function silentNoPick(g) {
  if (!g) return g;
  g.traverse(o => { if (o.isMesh) o.userData.noPick = true; });
  return g;
}

// 短距衔接导轨：输送面 0.90 m，与外部机台对齐（不用内置 0.92 m）
function shortRail(len) {
  const g = new THREE.Group(), pb = new PartBuilder();
  const gap = 0.26, y = RAIL_Y;
  const L = Math.max(len, 0.08), cx = 0;
  for (const s of [-1, 1]) {
    pb.boxC(L, 0.040, 0.030, cx, y - 0.015, s * gap / 2, M.metal);
    pb.boxC(L, 0.008, 0.012, cx, y + 0.005, s * (gap / 2 - 0.015), M.belt);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    pb.box(0.03, y - 0.05, 0.03, sx * (L / 2 - 0.04), 0, sz * 0.12, M.metal);
  }
  pb.build(g, { cloneMaterials: false });
  g.userData.size = { w: len, d: 0.32, h: y };
  g.userData.noPick = true;
  silentNoPick(g);
  return g;
}

// 机台导轨相对机身端面的外伸（用于避免接驳台与回流焊入口穿模）
function railOverhang(g) {
  if (!g) return 0;
  const typ = g.userData.type || g.userData.deviceId?.split('-').pop();
  const id = g.userData.deviceId || '';
  if (id.includes('RFL') || typ === 'reflow') return 0.45;
  if (id.includes('PRN') || typ === 'printer') return 0.13;
  if (id.includes('SPI') || typ === 'spi') return 0.07;
  if (id.includes('AOI') || typ === 'aoi') return 0.06;
  if (id.includes('MNT') || typ === 'mounter') return 0.02;
  if (id.includes('LDR') || id.includes('ULD') || typ === 'loader') return 0.03;
  return 0;
}

// 返回每条线的段信息 [{id, x0, x1}]
export function layoutLine(lineId, devGroups, scene) {
  const z = LINE_Z[lineId];
  let x = LINE_X0;
  const segs = [];
  const place = (obj, w, rotY = 0) => {
    obj.position.set(x + w / 2, 0, z);
    if (rotY) obj.rotation.y = rotY;
    scene.add(obj);
    x += w;
  };

  const ldr = devGroups[`${lineId}-LDR`];
  if (ldr) {
    const w = ldr.userData.size?.w || 1.3;
    place(ldr, w);
    segs.push({ id: ldr.userData.deviceId, x0: x - w, x1: x });
  } else x += 0.45;

  // 机身间隙：贴片机之间保持 0.12；回流焊前后留足接驳台 1.00 + 外伸余量 0.20。
  // SPI 按机身 1.00×1.30×1.50 排，不用预览状态环 1.50 m。
  // 包围盒（含入口 PCB / 右侧操作屏 / 灯塔）x −0.675…0.661、z −0.66…0.712、y 0…1.82；
  // 导轨两端各伸出 0.07，右侧屏突出约 0.16。0.32 间隙下屏到贴片机净距约 0.14，不穿模。
  const gapOf = key => (key === 'MNT2' ? 0.12 : (key === 'RFL' || key === 'AOI') ? 1.20 : 0.32);

  let prev = ldr;
  for (const key of SMT_SEQ) {
    const g = devGroups[`${lineId}-${key}`];
    const gap = gapOf(key);
    const long = gap >= 0.85;
    if (long) {
      const prevOh = railOverhang(prev);
      const nextOh = railOverhang(g);
      // 两侧外伸全部留空，接驳台只占中间净空，导轨在炉口对接、不穿侧板
      const lead = prevOh;
      const trail = nextOh;
      const convW = Math.max(0.62, +(gap - lead - trail).toFixed(3));
      if (lead > 0.001) x += lead;
      const cv = silentNoPick(extBuild('conveyor', { id: `${lineId}-CV-${key}`, length: convW }));
      if (cv) {
        const w = cv.userData.size?.w || convW;
        place(cv, w);
        if (w < convW) x += (convW - w);
      } else {
        place(shortRail(convW), convW);
      }
      if (trail > 0.001) x += trail;
    } else {
      place(shortRail(gap), gap);
    }
    if (!g) continue;
    const w = g.userData.size.w;
    place(g, w);
    segs.push({ id: g.userData.deviceId, x0: x - w, x1: x });
    prev = g;
  }

  place(shortRail(0.45), 0.45);
  const ul = devGroups[`${lineId}-ULD`];
  if (ul) {
    const w = ul.userData.size?.w || 1.3;
    place(ul, w, Math.PI);
    segs.push({ id: ul.userData.deviceId, x0: x - w, x1: x });
  }
  return { z, x0: LINE_X0, x1: x, segs, y: RAIL_Y + 0.01 };
}
