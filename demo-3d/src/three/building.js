// 厂房结构 + 园区环境：钢结构厂房（剖切）、地坪分区与标线、综合楼、道路、停车场、绿化、氮气站
import * as THREE from 'three';
import { PartBuilder, textTexture } from './builder.js';
import { M } from './materials.js';

export const HALL = { x0: -21, x1: 21, z0: -15, z1: 15, h: 9 };
const std = (c, r = 0.8, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const MAT = {
  grass: std(0xd3e7c8, 1), grass2: std(0xc4dfb6, 1), road: std(0xd7dce2, 0.95), walk: std(0xeceff2, 0.9), curb: std(0xf7f8fa, 0.8),
  floor: std(0xd9e0e8, 0.55), zoneSmt: std(0xcfe8dc, 0.55), zoneWh: std(0xcfdff3, 0.55), zoneBk: std(0xe2dcf2, 0.55), zoneQa: std(0xf1e7d0, 0.55),
  wall: std(0xf4f6f9, 0.7), wallRib: std(0xe2e7ee, 0.7), eave: std(0x2f6fc9, 0.5, 0.2), steel: std(0x8fa3b8, 0.45, 0.6), steelW: std(0xdfe5ec, 0.5, 0.3),
  winGlass: new THREE.MeshStandardMaterial({ color: 0x9cc9ee, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.55 }),
  winFrame: std(0xbfc9d4, 0.4, 0.5), white: std(0xffffff, 0.6), lineY: std(0xf2c230, 0.6), lineW: std(0xffffff, 0.6), lineG: std(0x34b27a, 0.6), lineB: std(0x3d8be6, 0.6),
  trunk: std(0x8b6a4c, 0.9), leaf: std(0x8ccf7e, 0.9), leaf2: std(0x6fbf6a, 0.9), lamp: std(0xffffff, 0.3, 0, { }),
};
MAT.led = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf4fbff, emissiveIntensity: 0.9 });

function floorText(group, text, x, z, w, h, color = '#3b6fb6', rot = 0) {
  const tex = textTexture(text, { w: 1024, h: 160, font: 'bold 96px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif', color });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.75, depthWrite: false }));
  m.rotation.set(-Math.PI / 2, 0, rot); m.position.set(x, 0.021, z); m.renderOrder = 2; m.userData.noPick = true; group.add(m); return m;
}
function rect(pb, x0, z0, x1, z1, y, mat, t = 0.004) { pb.boxC(x1 - x0, t, z1 - z0, (x0 + x1) / 2, y, (z0 + z1) / 2, mat); }
function outline(pb, x0, z0, x1, z1, y, mat, w = 0.1) {
  rect(pb, x0, z0, x1, z0 + w, y, mat); rect(pb, x0, z1 - w, x1, z1, y, mat); rect(pb, x0, z0, x0 + w, z1, y, mat); rect(pb, x1 - w, z0, x1, z1, y, mat);
}

export function buildHall() {
  const g = new THREE.Group(); g.name = 'hall';
  const pb = new PartBuilder(), { x0, x1, z0, z1, h } = HALL;
  // 地坪与分区
  rect(pb, x0, z0, x1, z1, 0.0, MAT.floor, 0.04);
  rect(pb, -20.5, -14.5, -0.8, -3.2, 0.025, MAT.zoneSmt);
  rect(pb, 0.2, -14.6, 20.6, -5.2, 0.025, MAT.zoneWh);
  rect(pb, -20.3, -1.0, -5.0, 4.6, 0.025, MAT.zoneBk);
  rect(pb, -4.0, 4.6, 5.6, 11.4, 0.025, MAT.zoneQa);
  outline(pb, -20.5, -14.5, -0.8, -3.2, 0.03, MAT.lineY, 0.08);
  outline(pb, 0.2, -14.6, 20.6, -5.2, 0.03, MAT.lineY, 0.08);
  outline(pb, -20.3, -1.0, -5.0, 4.6, 0.03, MAT.lineY, 0.08);
  outline(pb, 6.5, 2.0, 18.0, 11.4, 0.03, MAT.lineY, 0.08);
  outline(pb, -20.3, 5.4, -5.8, 11.4, 0.03, MAT.lineY, 0.08);
  // AGV 导航路径（双线 + 虚线中心）
  const loop = [[-19.6, -2.2], [19.6, -2.2], [19.6, 12.5], [-19.6, 12.5]];
  for (let i = 0; i < 4; i++) {
    const [ax, az] = loop[i], [bx, bz] = loop[(i + 1) % 4];
    const horiz = az === bz, L = horiz ? Math.abs(bx - ax) : Math.abs(bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2;
    for (const s of [-0.45, 0.45]) horiz ? rect(pb, cx - L / 2 - 0.45, cz + s - 0.03, cx + L / 2 + 0.45, cz + s + 0.03, 0.032, MAT.lineB) : rect(pb, cx + s - 0.03, cz - L / 2 - 0.45, cx + s + 0.03, cz + L / 2 + 0.45, 0.032, MAT.lineB);
    for (let k = 0; k < L; k += 1.2) horiz ? rect(pb, Math.min(ax, bx) + k, cz - 0.02, Math.min(ax, bx) + k + 0.5, cz + 0.02, 0.033, MAT.lineW) : rect(pb, cx - 0.02, Math.min(az, bz) + k, cx + 0.02, Math.min(az, bz) + k + 0.5, 0.033, MAT.lineW);
  }
  rect(pb, 0.15, -8.4, 1.05, -2.2, 0.032, MAT.lineB); // 仓库支线
  // 人行通道（绿色）
  rect(pb, -20.5, 13.75, 13.6, 14.25, 0.031, MAT.lineG);
  // 斑马线
  for (let k = 0; k < 6; k++) rect(pb, -1.6 + k * 0.5, 12.0, -1.35 + k * 0.5, 13.6, 0.034, MAT.lineW);
  // 墙体：后墙/左墙全高，右墙 3m + 玻璃，前墙剖切矮墙
  const ribs = (len, along, fixed, y0, y1, side) => { for (let k = 0.6; k < len; k += 0.6) along === 'x' ? pb.boxC(0.06, y1 - y0, 0.04, x0 + k, (y0 + y1) / 2, fixed + side * 0.12, MAT.wallRib) : pb.boxC(0.04, y1 - y0, 0.06, fixed + side * 0.12, (y0 + y1) / 2, z0 + k, MAT.wallRib); };
  pb.box(x1 - x0, h, 0.2, 0, 0, z0 - 0.1, MAT.wall); ribs(x1 - x0, 'x', z0 - 0.1, 0.2, 5.6, 1);
  pb.box(0.2, h, z1 - z0, x0 - 0.1, 0, 0, MAT.wall); ribs(z1 - z0, 'z', x0 - 0.1, 0.2, 5.6, 1);
  pb.box(0.2, 2.8, z1 - z0, x1 + 0.1, 0, 0, MAT.wall);
  pb.box(x1 - x0, 1.0, 0.2, 0, 0, z1 + 0.1, MAT.wall);
  // 高窗带
  for (let k = 0; k < 14; k++) { const x = x0 + 1.5 + k * 3; pb.boxC(2.6, 1.6, 0.05, x, 7.0, z0 + 0.02, MAT.winGlass); pb.boxC(2.7, 0.08, 0.1, x, 7.85, z0 + 0.03, MAT.winFrame); pb.boxC(2.7, 0.08, 0.1, x, 6.15, z0 + 0.03, MAT.winFrame); }
  for (let k = 0; k < 10; k++) { const z = z0 + 1.5 + k * 3; pb.boxC(0.05, 1.6, 2.6, x0 + 0.02, 7.0, z, MAT.winGlass); pb.boxC(0.1, 0.08, 2.7, x0 + 0.03, 7.85, z, MAT.winFrame); }
  pb.boxC(x1 - x0 + 0.4, 0.5, 0.24, 0, h + 0.05, z0 - 0.1, MAT.eave); pb.boxC(0.24, 0.5, z1 - z0, x0 - 0.1, h + 0.05, 0, MAT.eave);
  pb.boxC(0.24, 0.12, z1 - z0, x1 + 0.1, 2.86, 0, MAT.eave); pb.boxC(x1 - x0, 0.12, 0.24, 0, 1.06, z1 + 0.1, MAT.eave);
  // 卷帘门（后墙）
  for (const dx of [-14, 8]) { pb.boxC(4, 4.2, 0.05, dx, 2.1, z0 + 0.03, MAT.wallRib); for (let k = 0; k < 20; k++) pb.boxC(4, 0.03, 0.07, dx, 0.1 + k * 0.21, z0 + 0.04, MAT.steelW); pb.boxC(4.3, 0.25, 0.12, dx, 4.3, z0 + 0.05, MAT.steel); }
  // 围护钢柱（留在主分组，远景保持实色）
  const wallCols = new THREE.Group(); wallCols.name = 'hallWallCols';
  for (let k = 0; k <= 7; k++) {
    const x = x0 + k * 6;
    for (const z of [z0 + 0.25, z1 - 0.25]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.4, h - 0.2, 0.3), MAT.steel.clone());
      col.position.set(x, (h - 0.2) / 2, z); col.castShadow = true; col.receiveShadow = true; col.userData.noPick = true;
      wallCols.add(col);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.5), MAT.steel.clone());
      base.position.set(x, 0.03, z); base.receiveShadow = true; base.userData.noPick = true;
      wallCols.add(base);
    }
  }
  g.add(wallCols);
  // 屋顶横梁 / 桁架 / 檩条 / 桥架：近景渐隐，不影响园区和车间全景
  const spb = new PartBuilder();
  for (let k = 0; k <= 7; k++) {
    const x = x0 + k * 6;
    spb.boxC(0.3, 0.55, z1 - z0, x, h - 0.3, 0, MAT.steel);
    for (let j = 0; j < 9; j++) spb.add(new THREE.BoxGeometry(0.04, 1.0, 0.04), MAT.steelW, x, h - 0.75, z0 + 1.5 + j * 3.3, 0.8, 0, 0);
  }
  for (let j = 0; j <= 6; j++) spb.boxC(x1 - x0, 0.12, 0.1, 0, h - 0.04, z0 + j * 5, MAT.steelW);
  for (const z of [-10.5, -5.5]) { spb.boxC(18.5, 0.08, 0.36, -10.8, 7.6, z + 1.6, MAT.steelW); for (let k = 0; k < 4; k++) spb.cyl(0.015, 0.9, -19 + k * 6, 8.05, z + 1.6, MAT.steel, 6); }
  const struct = new THREE.Group(); struct.name = 'hallStructure';
  spb.build(struct, { cloneMaterials: true });
  struct.traverse(o => { if (o.isMesh) { o.userData.noPick = true; o.material.transparent = true; o.material.opacity = 1; } });
  g.add(struct);
  // 中间柱列（独立网格，近镜头时淡出）
  const midCols = new THREE.Group(); midCols.name = 'hallMidCols';
  for (let k = 1; k < 7; k++) {
    const x = x0 + k * 6;
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.35, h - 0.6, 0.35), MAT.steelW.clone());
    col.position.set(x, (h - 0.6) / 2, 0.4); col.castShadow = true; col.receiveShadow = true; col.userData.noPick = true;
    midCols.add(col);
    const ring = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.36), MAT.lineY.clone());
    ring.position.set(x, 1.29, 0.4); ring.userData.noPick = true;
    midCols.add(ring);
  }
  g.add(midCols);
  // LED 工矿灯（独立分组：俯视时隐藏）
  const lp = new PartBuilder();
  for (let k = 0; k < 7; k++) for (let j = 0; j < 5; j++) { const x = x0 + 3 + k * 6, z = z0 + 3 + j * 6; lp.cyl(0.32, 0.1, x, h - 0.62, z, MAT.steelW, 20, 0, 0, 0, 0.2); lp.cyl(0.3, 0.01, x, h - 0.68, z, MAT.led, 20); }
  const lamps = new THREE.Group(); lamps.name = 'ceilingLamps'; lp.build(lamps, { cloneMaterials: false, shadow: false }); g.add(lamps);
  // 质检室玻璃隔断
  const qa = { x0: -3.6, x1: 5.2, z0: 5.0, z1: 11.0 };
  for (const [ax, az, bx, bz] of [[qa.x0, qa.z0, qa.x1, qa.z0], [qa.x0, qa.z1, qa.x1, qa.z1], [qa.x0, qa.z0, qa.x0, qa.z1], [qa.x1, qa.z0, qa.x1, qa.z1]]) {
    const L = Math.hypot(bx - ax, bz - az), horiz = az === bz;
    pb.boxC(horiz ? L : 0.04, 2.4, horiz ? 0.04 : L, (ax + bx) / 2, 1.2, (az + bz) / 2, MAT.winGlass);
    pb.boxC(horiz ? L : 0.08, 0.08, horiz ? 0.08 : L, (ax + bx) / 2, 2.42, (az + bz) / 2, MAT.winFrame);
    pb.boxC(horiz ? L : 0.08, 0.15, horiz ? 0.08 : L, (ax + bx) / 2, 0.08, (az + bz) / 2, MAT.winFrame);
    for (let k = 0; k <= L; k += 1.5) pb.box(0.06, 2.4, 0.06, horiz ? Math.min(ax, bx) + k : ax, 0, horiz ? az : Math.min(az, bz) + k, MAT.winFrame);
  }
  // 质检工作台改由 devices/esdbench.js 放置（见 world.buildDevices）；保留 X-Ray 与试验箱
  pb.box(1.4, 1.8, 1.2, 3.8, 0, 9.6, M.white); pb.boxC(0.6, 0.4, 0.02, 3.8, 1.2, 8.99, M.glassTint); pb.box(1.45, 0.08, 1.25, 3.8, 1.8, 9.6, M.blue); // X-Ray
  pb.box(1.2, 1.6, 0.9, 0.0, 0, 10.2, M.white); pb.boxC(0.9, 0.7, 0.02, 0.0, 1.0, 9.74, M.glass); // 温湿度试验箱
  // 物料暂存货架（料盘架）
  for (let i = 0; i < 5; i++) {
    const x = -19 + i * 2.8, z = 8.5;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) pb.box(0.04, 1.8, 0.04, x + sx * 1.1, 0, z + sz * 0.3, M.metal);
    for (let l = 0; l < 4; l++) { pb.box(2.2, 0.03, 0.6, x, 0.15 + l * 0.5, z, M.gray); for (let r = 0; r < 9; r++) pb.cyl(0.16, 0.03, x - 0.95 + r * 0.24, 0.35 + l * 0.5, z, [M.reel, M.reelWhite, M.black][(r + l + i) % 3], 18, 0, 0, Math.PI / 2); }
  }
  // 成品待出货区：托盘与包装台
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const x = 8.2 + i * 2.2, z = 3.6 + j * 2.4; pb.box(1.2, 0.14, 1.0, x, 0, z, M.pallet);
    const hh = 0.6 + ((i * 7 + j * 3) % 5) * 0.12; pb.box(1.1, hh, 0.92, x, 0.14, z, (i + j) % 3 ? M.carton : M.cartonDark);
    pb.boxC(1.11, 0.05, 0.93, x, 0.14 + hh * 0.6, z, M.white);
  }
  for (let i = 0; i < 2; i++) { const x = 17.2, z = 4 + i * 3; pb.box(1.6, 0.05, 0.9, x, 0.85, z, MAT.steelW); pb.box(1.5, 0.85, 0.8, x, 0, z, M.ivory); pb.box(0.4, 0.3, 0.05, x - 0.4, 1.0, z - 0.3, M.graphite); }
  // AGV 充电桩改由 devices/charger.js 模型放置（见 world.buildDevices）
  // 后段区：料车（编带卷盘周转）
  for (let i = 0; i < 2; i++) { const x = -7.4 + i * 1.1, z = 2.6; pb.box(0.8, 0.04, 0.5, x, 0.2, z, M.gray); pb.box(0.8, 0.04, 0.5, x, 0.75, z, M.gray); for (const sx of [-0.38, 0.38]) for (const sz of [-0.23, 0.23]) { pb.box(0.03, 1.0, 0.03, x + sx, 0.08, z + sz, M.metal); pb.cyl(0.04, 0.03, x + sx, 0.04, z + sz, M.black, 10, Math.PI / 2, 0, 0); } for (let r = 0; r < 4; r++) pb.cyl(0.17, 0.03, x - 0.27 + r * 0.18, 0.97, z, [M.reel, M.reelWhite][r % 2], 20, 0, 0, Math.PI / 2); }
  pb.build(g, { cloneMaterials: false });
  // 地面区域文字
  floorText(g, 'SMT 一线  L1', -11, -12.6, 7, 1.1);
  floorText(g, 'SMT 二线  L2', -11, -3.85, 7, 1.1);
  floorText(g, '立体仓库 AS/RS', 11.5, -5.75, 6.5, 1.0);
  floorText(g, '测试 / 编带区  L3', -12.5, -0.4, 7, 1.0, '#6b4fb6');
  floorText(g, '物料暂存区', -13, 10.6, 4.5, 0.9, '#b7791f');
  floorText(g, '品质检验室', 0.8, 10.4, 4.5, 0.9, '#b7791f');
  floorText(g, '成品待出货区', 12.2, 10.6, 5, 0.9, '#2f7d4f');
  // 后墙标语
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.4), new THREE.MeshBasicMaterial({ map: textTexture('芯程电子 · SMT 数字化车间', { w: 2048, h: 200, font: 'bold 120px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif', color: '#1f5fbf' }), transparent: true }));
  sign.position.set(-6, 5.0, z0 + 0.03); g.add(sign);
  g.traverse(o => { if (o.isMesh) { o.receiveShadow = true; o.userData.noPick = true; } });
  return g;
}

// ---------- 园区 ----------
export function buildCampus() {
  const g = new THREE.Group(); g.name = 'campus';
  const pb = new PartBuilder();
  const ground = new THREE.Mesh(new THREE.CircleGeometry(170, 64), MAT.grass); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; g.add(ground);
  // 道路网：厂房外环路 + 主干道
  const roads = [[-60, 20, 75, 27], [-60, -26, 75, -20], [-27, -26, -20, 27], [28, -26, 35, 27], [-60, 27, -53, 80], [-150, 20, 150, 27]];
  roads.forEach(([ax, az, bx, bz]) => rect(pb, ax, az, bx, bz, 0.0, MAT.road, 0.02));
  // 路面标线
  for (let x = -58; x < 74; x += 4) { rect(pb, x, 23.42, x + 2, 23.58, 0.012, MAT.lineW); rect(pb, x, -23.08, x + 2, -22.92, 0.012, MAT.lineW); }
  for (let z = -18; z < 18; z += 4) { rect(pb, -23.58, z, -23.42, z + 2, 0.012, MAT.lineW); rect(pb, 31.42, z, 31.58, z + 2, 0.012, MAT.lineW); }
  // 人行道 + 路缘
  rect(pb, -20, -20, 28, -18.6, 0.04, MAT.walk, 0.08); rect(pb, -20, 18.6, 28, 20, 0.04, MAT.walk, 0.08);
  rect(pb, -20, -18.6, -18.6, 18.6, 0.04, MAT.walk, 0.08); rect(pb, 26.6, -18.6, 28, 18.6, 0.04, MAT.walk, 0.08);
  rect(pb, -18.6, -18.6, 26.6, 18.6, 0.0, MAT.grass2, 0.03); // 厂房周边绿地
  // 厂房外地坪与卸货平台
  rect(pb, -22, -17.5, 22, 17, 0.02, MAT.walk, 0.05);
  // 停车场（前侧）
  rect(pb, -16, 28, 24, 40, 0.0, MAT.road, 0.02);
  for (let i = 0; i <= 16; i++) { rect(pb, -15 + i * 2.4, 28.4, -14.9 + i * 2.4, 33, 0.012, MAT.lineW); rect(pb, -15 + i * 2.4, 35, -14.9 + i * 2.4, 39.6, 0.012, MAT.lineW); }
  // 综合楼（5 层，带窗格）
  const ob = { x: -40, z: -2, w: 16, d: 22, fl: 5, fh: 3.6 };
  const H = ob.fl * ob.fh;
  pb.box(ob.w, H, ob.d, ob.x, 0, ob.z, MAT.wall);
  pb.box(ob.w + 0.6, 0.6, ob.d + 0.6, ob.x, H, ob.z, MAT.eave);
  pb.box(ob.w * 0.4, 2.2, ob.d * 0.3, ob.x, H + 0.6, ob.z - 3, MAT.wallRib);
  for (let f = 0; f < ob.fl; f++) {
    const y = 0.9 + f * ob.fh;
    pb.boxC(ob.w + 0.08, 0.25, ob.d + 0.08, ob.x, y - 0.35, ob.z, MAT.wallRib);
    for (let k = 0; k < 7; k++) { const x = ob.x - ob.w / 2 + 1.3 + k * 2.25; for (const s of [-1, 1]) pb.boxC(1.6, 1.9, 0.06, x, y + 1.05, ob.z + s * (ob.d / 2 + 0.02), MAT.winGlass); }
    for (let k = 0; k < 9; k++) { const z = ob.z - ob.d / 2 + 1.4 + k * 2.4; for (const s of [-1, 1]) pb.boxC(0.06, 1.9, 1.7, ob.x + s * (ob.w / 2 + 0.02), y + 1.05, z, MAT.winGlass); }
  }
  pb.box(5, 0.3, 3, ob.x + ob.w / 2 + 1.5, 3.2, ob.z + 4, MAT.eave); pb.box(4, 3.2, 0.1, ob.x + ob.w / 2 + 0.2, 0, ob.z + 4, MAT.winGlass);
  // 氮气站：液氮储罐 + 汽化器
  for (let i = 0; i < 2; i++) {
    const x = 24 + i * 3, z = -11;
    pb.cyl(1.1, 7, x, 4.2, z, MAT.white, 28); pb.add(new THREE.SphereGeometry(1.1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), MAT.white, x, 7.7, z);
    for (let k = 0; k < 4; k++) pb.box(0.12, 1.0, 0.12, x + Math.cos(k * 1.57) * 0.85, 0, z + Math.sin(k * 1.57) * 0.85, MAT.steel);
    pb.cyl(1.12, 0.2, x, 1.1, z, MAT.eave, 28);
  }
  for (let k = 0; k < 8; k++) pb.box(0.2, 3.2, 0.2, 23.4 + k * 0.5, 0, -7.3, MAT.steelW);
  pb.box(3.8, 0.2, 0.3, 25.2, 3.2, -7.3, MAT.steel);
  // 变配电房
  pb.box(6, 3.6, 4, 24, 0, 5, MAT.wall); pb.box(6.3, 0.35, 4.3, 24, 3.6, 5, MAT.eave);
  for (let k = 0; k < 3; k++) pb.box(1.0, 2.2, 0.06, 22 + k * 2, 0, 3.0, MAT.steelW);
  // 门卫 + 大门
  pb.box(4, 3.2, 3, 30.5, 0, 32, MAT.wall); pb.box(4.4, 0.35, 3.4, 30.5, 3.2, 32, MAT.eave); pb.boxC(3, 1.3, 0.05, 30.5, 1.9, 33.52, MAT.winGlass);
  pb.box(0.6, 4.5, 0.6, 27.6, 0, 26.6, MAT.wallRib); pb.box(0.6, 4.5, 0.6, 35.4, 0, 26.6, MAT.wallRib); pb.boxC(8.4, 0.8, 0.5, 31.5, 4.8, 26.6, MAT.eave);
  // 路灯
  for (let x = -55; x < 72; x += 12) for (const z of [19.4, 27.8]) { pb.cyl(0.08, 6, x, 3, z, MAT.steel, 8); pb.boxC(1.0, 0.1, 0.25, x + (z > 25 ? -0.4 : 0.4), 6, z, MAT.steelW); }
  pb.build(g, { cloneMaterials: false });
  // 综合楼楼顶标识
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.6), new THREE.MeshBasicMaterial({ map: textTexture('综合办公楼', { w: 1024, h: 160, color: '#ffffff', font: 'bold 110px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif' }), transparent: true }));
  sign.position.set(-40, H + 2.0, -2 + 22 / 2 * 0.3 - 3 + 3.3 * 0 + 0.02 + 3.3 - 3.3); sign.position.z = -2 - 3 + 22 * 0.15 + 0.02; g.add(sign);
  // 车辆（实例化）
  addCars(g, -15, 30.6, 16, 2.4); addCars(g, -15, 37.4, 13, 2.4, 7);
  // 树木（实例化）
  const trees = [];
  for (let x = -58; x < 74; x += 5.5) { trees.push([x, 17.4]); trees.push([x + 2.5, 29.5 + (x > -17 && x < 25 ? 12 : 0)]); }
  for (let z = -24; z < 16; z += 5) { trees.push([-28.6, z]); trees.push([36.8, z]); }
  for (let x = -56; x < 74; x += 6) trees.push([x, -28.5]);
  for (const [x, z] of [[-48, 14], [-32, 14], [-50, -18], [-31, -18], [10, -17.4], [0, -17.4], [-10, -17.4], [18, 17.6], [-12, 17.6]]) trees.push([x, z]);
  addTrees(g, trees);
  g.traverse(o => { if (o.isMesh) { o.receiveShadow = true; o.userData.noPick = true; } });
  return g;
}
function addCars(g, x0, z, n, gap, seed = 1) {
  const colors = [0xffffff, 0xd8dde3, 0x3d7bd9, 0x9aa5b1, 0xe9ecef, 0x2f4f6f, 0xc9473f, 0xf4f4f4];
  const body = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.7, 4.2), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.4 }), n);
  const cab = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.6, 2.2), new THREE.MeshStandardMaterial({ color: 0x5e7890, roughness: 0.1, metalness: 0.5 }), n);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = x0 + 1.2 + i * gap * (i % 3 === 2 ? 1.5 : 1);
    m.makeTranslation(x, 0.55, z); body.setMatrixAt(i, m); body.setColorAt(i, c.setHex(colors[(i * 3 + seed) % colors.length]));
    m.makeTranslation(x, 1.2, z + 0.2); cab.setMatrixAt(i, m);
  }
  body.castShadow = cab.castShadow = true; g.add(body, cab);
}
function addTrees(g, pts) {
  const n = pts.length;
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.22, 2.4, 8), MAT.trunk, n);
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.6, 1), MAT.leaf, n);
  const crown2 = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.15, 1), MAT.leaf2, n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  pts.forEach(([x, z], i) => {
    const k = 0.8 + ((i * 37) % 10) / 25;
    m.compose(p.set(x, 1.2 * k, z), q.identity(), s.set(k, k, k)); trunk.setMatrixAt(i, m);
    m.compose(p.set(x, 3.3 * k, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i), s.set(k, k * 1.05, k)); crown.setMatrixAt(i, m);
    m.compose(p.set(x + 0.4, 4.4 * k, z - 0.3), q, s.set(k, k, k)); crown2.setMatrixAt(i, m);
  });
  [trunk, crown, crown2].forEach(o => { o.castShadow = true; g.add(o); });
}

// 厂房屋面（园区视角显示，车间视角隐藏 = 建筑剖切效果）
export function buildRoof() {
  const g = new THREE.Group(); g.name = 'roof';
  const pb = new PartBuilder(), { x0, x1, z0, z1, h } = HALL;
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xe8edf3, roughness: 0.6, metalness: 0.2 });
  const ribMat = new THREE.MeshStandardMaterial({ color: 0xd3dbe5, roughness: 0.6, metalness: 0.2 });
  const sky = new THREE.MeshStandardMaterial({ color: 0x9fcaf0, roughness: 0.15, metalness: 0.4 });
  const W = x1 - x0 + 0.8, half = (z1 - z0) / 2 + 0.4, slope = 0.06;
  for (const s of [-1, 1]) {
    pb.add(new THREE.BoxGeometry(W, 0.12, half), roofMat, 0, h + 0.35 + half * slope / 2, s * half / 2, s * slope, 0, 0);
    for (let k = 0; k < 28; k++) pb.add(new THREE.BoxGeometry(0.06, 0.06, half), ribMat, x0 + 0.6 + k * 1.5, h + 0.44 + half * slope / 2, s * half / 2, s * slope, 0, 0);
    for (let k = 0; k < 6; k++) pb.add(new THREE.BoxGeometry(2.6, 0.05, half * 0.5), sky, x0 + 4 + k * 6.6, h + 0.45 + half * slope / 2, s * half / 2, s * slope, 0, 0);
  }
  pb.boxC(W, 0.3, 0.5, 0, h + 0.45 + half * slope, 0, ribMat); // 屋脊
  // 屋顶风机
  for (let k = 0; k < 5; k++) { pb.cyl(0.45, 0.5, x0 + 5 + k * 8, h + 0.85, -5, M.metal, 16); pb.cyl(0.55, 0.08, x0 + 5 + k * 8, h + 1.12, -5, M.steel, 16); }
  pb.build(g, { cloneMaterials: false });
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.noPick = true; } });
  return g;
}
export const CAMPUS_LABELS = [
  ['SMT 数字化车间（L1/L2/L3 + 立体库）', 0, 11.5, 0], ['综合办公楼', -40, 21.5, -2], ['液氮站', 25.5, 9, -11],
  ['变配电房', 24, 4.5, 5], ['门卫 / 物流入口', 30.5, 4.2, 32], ['员工停车场', 4, 1.2, 34],
];
