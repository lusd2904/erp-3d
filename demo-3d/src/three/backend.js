// 后段设备：转塔式测试分选机、编带机
import * as THREE from 'three';
import { PartBuilder, roundedBoxGeo } from './builder.js';
import { M } from './materials.js';
import { signalTower, monitorArm, feet, vents, estop, handle } from './common.js';

function vibBowl(pb, x, y, z, r = 0.16) {
  pb.cyl(r * 0.55, 0.12, x, y + 0.06, z, M.darkGray, 20);           // 振动底座
  pb.cyl(r, 0.1, x, y + 0.17, z, M.chrome, 28, 0, 0, 0, r * 0.75);  // 料盘
  pb.add(new THREE.TorusGeometry(r * 0.8, 0.008, 6, 32), M.steel, x, y + 0.2, z, Math.PI / 2, 0, 0);
  pb.add(new THREE.TorusGeometry(r * 0.55, 0.008, 6, 32), M.steel, x, y + 0.18, z, Math.PI / 2, 0, 0);
  pb.boxC(0.3, 0.02, 0.03, x + r + 0.12, y + 0.2, z, M.chrome); // 直振轨道
}
function turret(n, r, mat = M.metal) {
  const grp = new THREE.Group(), tp = new PartBuilder();
  tp.cyl(r, 0.05, 0, 0, 0, mat, 40); tp.cyl(r * 0.35, 0.1, 0, 0.05, 0, M.darkGray, 20);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; tp.cyl(0.012, 0.09, Math.cos(a) * (r - 0.02), -0.06, Math.sin(a) * (r - 0.02), M.chrome, 8); tp.boxC(0.03, 0.03, 0.03, Math.cos(a) * (r - 0.02), 0, Math.sin(a) * (r - 0.02), M.blue); }
  tp.build(grp); return grp;
}

export function buildTester() {
  const g = new THREE.Group(), pb = new PartBuilder();
  const w = 1.6, d = 1.3;
  pb.box(w, 0.07, d, 0, 0.06, 0, M.graphite);
  pb.box(w, 0.8, d, 0, 0.13, 0, M.white); feet(pb, w, d);
  for (const sx of [-0.4, 0.4]) pb.boxC(0.76, 0.66, 0.012, sx, 0.52, d / 2 + 0.005, M.ivory);
  vents(pb, -0.4, 0.2, d / 2 + 0.012, 0.5, 0.15, 5);
  pb.box(w + 0.02, 0.05, d + 0.02, 0, 0.93, 0, M.steel); // 工作台面
  // 亚克力罩 + 铝型材框
  const ch = 0.75, cy = 0.98;
  pb.add(new THREE.BoxGeometry(w - 0.04, ch, d - 0.04), M.glass, 0, cy + ch / 2, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pb.box(0.04, ch, 0.04, sx * (w / 2 - 0.02), cy, sz * (d / 2 - 0.02), M.metal);
  for (const sz of [-1, 1]) pb.boxC(w, 0.04, 0.04, 0, cy + ch, sz * (d / 2 - 0.02), M.metal);
  for (const sx of [-1, 1]) pb.boxC(0.04, 0.04, d, sx * (w / 2 - 0.02), cy + ch, 0, M.metal);
  pb.box(w, 0.04, d, 0, cy + ch, 0, M.gray);
  // 内部：振动盘、测试座、分BIN料盒
  vibBowl(pb, -0.55, 0.98, -0.2);
  for (let i = 0; i < 6; i++) { const a = -0.6 + i * 0.36; pb.box(0.08, 0.14, 0.08, 0.1 + Math.cos(a) * 0.48, 0.98, 0.05 + Math.sin(a) * 0.48, M.navy); } // 测试工位
  for (let i = 0; i < 9; i++) pb.box(0.1, 0.12, 0.16, -0.6 + i * 0.13, 0.98, 0.47, i === 8 ? M.red : (i % 2 ? M.yellow : M.green)); // 分 BIN
  // 顶部测试机头（Tester）与电缆
  pb.box(0.6, 0.35, 0.5, 0.25, cy + ch + 0.04, -0.15, M.navy);
  vents(pb, 0.25, cy + ch + 0.1, 0.1 + 0.002, 0.45, 0.22, 5, M.graphite);
  pb.cyl(0.03, 0.5, 0.65, cy + ch + 0.2, -0.15, M.black, 10, 0, 0, Math.PI / 2.4);
  // 右侧编带出料卷盘
  pb.cyl(0.2, 0.025, w / 2 + 0.03, 1.4, 0.2, M.reelWhite, 32, 0, 0, Math.PI / 2);
  monitorArm(pb, -w / 2 - 0.08, 0.98, d / 2 - 0.2, { ry: -0.4, armH: 0.45 });
  estop(pb, w / 2 - 0.12, 0.85, d / 2 + 0.02); for (const sx of [-0.05, 0.05]) handle(pb, sx, 0.55, d / 2 + 0.02);
  const lamps = signalTower(g, w / 2 - 0.1, cy + ch + 0.04, -d / 2 + 0.1);
  pb.build(g);
  const tur = turret(18, 0.38); tur.position.set(0.1, 1.32, 0.05); g.add(tur);
  return { group: g, size: { w, h: 2.1, d }, lamps, anim: (t, dt) => { tur.rotation.y += dt * 1.6; } };
}

export function buildTaper() {
  const g = new THREE.Group(), pb = new PartBuilder();
  const w = 1.2, d = 0.9;
  pb.box(w, 0.07, d, 0, 0.06, 0, M.graphite);
  pb.box(w, 0.82, d, 0, 0.13, 0, M.white); feet(pb, w, d);
  pb.boxC(w - 0.1, 0.66, 0.012, 0, 0.52, d / 2 + 0.005, M.ivory);
  pb.box(w + 0.02, 0.04, d + 0.02, 0, 0.95, 0, M.steel);
  // 竖直安装背板（卷盘面板）
  pb.box(w, 0.9, 0.08, 0, 0.99, -d / 2 + 0.06, M.ivory);
  pb.add(roundedBoxGeo(w, 0.08, 0.1, 0.03), M.white, 0, 1.93, -d / 2 + 0.06);
  // 载带轨道与热封头
  pb.boxC(w - 0.15, 0.03, 0.05, 0, 1.08, -d / 2 + 0.13, M.chrome);
  pb.box(0.12, 0.12, 0.1, 0.2, 1.1, -d / 2 + 0.14, M.orange);
  pb.boxC(0.08, 0.2, 0.06, 0.2, 1.32, -d / 2 + 0.14, M.darkGray);
  // CCD 检测相机
  pb.cyl(0.03, 0.12, -0.05, 1.25, -d / 2 + 0.16, M.black, 12); pb.box(0.08, 0.06, 0.08, -0.05, 1.31, -d / 2 + 0.16, M.darkGray);
  // 上带卷（小）
  pb.cyl(0.09, 0.03, 0.35, 1.55, -d / 2 + 0.12, M.reelWhite, 24, Math.PI / 2, 0, 0);
  vibBowl(pb, -0.35, 0.97, 0.12, 0.15);
  monitorArm(pb, w / 2 - 0.15, 0.97, d / 2 - 0.05, { ry: 0.2, armH: 0.3 });
  estop(pb, -w / 2 + 0.12, 0.85, d / 2 + 0.02); handle(pb, w / 2 - 0.12, 0.5, d / 2 + 0.02);
  const lamps = signalTower(g, -w / 2 + 0.08, 1.97, -d / 2 + 0.06, 0.16);
  pb.build(g);
  // 收料大卷盘（转动）
  const reel = new THREE.Group(), rp = new PartBuilder();
  rp.cyl(0.3, 0.012, 0, 0.018, 0, M.reel, 40, 0, 0, 0); rp.cyl(0.3, 0.012, 0, -0.018, 0, M.reel, 40);
  rp.cyl(0.18, 0.03, 0, 0, 0, M.black, 32); rp.cyl(0.045, 0.06, 0, 0, 0, M.chrome, 16);
  for (let i = 0; i < 3; i++) rp.boxC(0.02, 0.04, 0.2, Math.cos(i * 2.09) * 0.2, 0, Math.sin(i * 2.09) * 0.2, M.white, 0, -i * 2.09, 0);
  rp.build(reel); reel.rotation.x = Math.PI / 2; reel.position.set(-0.3, 1.5, -d / 2 + 0.14); g.add(reel);
  const tur = turret(12, 0.17); tur.position.set(0.02, 1.13, 0.1); g.add(tur);
  return { group: g, size: { w, h: 2.1, d }, lamps, anim: (t, dt) => { reel.rotation.y += dt * 1.2; tur.rotation.y += dt * 2.2; } };
}
