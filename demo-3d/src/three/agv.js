// 潜伏式激光导航 AGV（顶升料架）
import * as THREE from 'three';
import { PartBuilder, roundedBoxGeo } from './builder.js';
import { M } from './materials.js';

export function buildAgv(withRack = true) {
  const g = new THREE.Group(), pb = new PartBuilder();
  const L = 1.05, W = 0.7;
  pb.add(roundedBoxGeo(L, W, 0.22, 0.1), M.white, 0, 0.17, 0, Math.PI / 2, 0, 0);
  pb.boxC(L - 0.06, 0.06, W - 0.06, 0, 0.06, 0, M.graphite);
  // 前后防撞条（黄黑）
  for (const s of [-1, 1]) { pb.boxC(0.04, 0.08, W - 0.12, s * (L / 2 + 0.01), 0.12, 0, M.yellow); for (let k = 0; k < 4; k++) pb.boxC(0.042, 0.081, 0.04, s * (L / 2 + 0.012), 0.12, -0.21 + k * 0.14, M.black); }
  for (const sx of [-0.32, 0.32]) for (const sz of [-1, 1]) pb.cyl(0.06, 0.05, sx, 0.06, sz * (W / 2 - 0.06), M.rubber, 16, Math.PI / 2, 0, 0);
  pb.cyl(0.05, 0.07, L / 2 - 0.12, 0.315, 0, M.graphite, 18); pb.cyl(0.035, 0.03, L / 2 - 0.12, 0.36, 0, M.black, 18); // 激光雷达
  pb.cyl(0.22, 0.03, 0, 0.29, 0, M.darkGray, 28); // 顶升盘
  pb.boxC(0.2, 0.06, 0.005, -0.25, 0.2, W / 2 + 0.001, M.screen);
  if (withRack) {
    // 料架：4 柱 + 3 层隔板 + 料盘/料箱
    const rh = 1.1, rw = 0.8, rd = 0.6, y0 = 0.32;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) pb.box(0.03, rh, 0.03, sx * rw / 2, y0, sz * rd / 2, M.metal);
    for (let k = 0; k < 3; k++) {
      const y = y0 + 0.08 + k * 0.42; pb.box(rw, 0.02, rd, 0, y, 0, M.gray);
      if (k < 2) for (let i = 0; i < 5; i++) pb.cyl(0.13, 0.03, -0.3 + i * 0.15, y + 0.14, 0, i % 2 ? M.reel : M.reelWhite, 20, 0, 0, Math.PI / 2);
      else pb.box(0.6, 0.22, 0.45, 0, y + 0.02, 0, M.carton);
    }
  }
  pb.build(g);
  // 状态灯带（颜色随状态变化）
  const strip = new THREE.Mesh(new THREE.BoxGeometry(L - 0.1, 0.02, W + 0.005), new THREE.MeshStandardMaterial({ color: 0x16b364, emissive: 0x16b364, emissiveIntensity: 1.1 }));
  strip.position.y = 0.205; g.add(strip);
  return { group: g, strip, size: { w: L, h: withRack ? 1.45 : 0.4, d: W } };
}
