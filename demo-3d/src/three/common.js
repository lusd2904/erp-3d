// 设备通用部件：信号灯塔、状态光环、显示器支臂、地脚
import * as THREE from 'three';
import { M, lampMat, statusColor } from './materials.js';

export function signalTower(group, x, y, z, h = 0.28) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, h, 8), M.metal);
  pole.position.set(x, y + h / 2, z); pole.castShadow = true; group.add(pole);
  const seg = 0.055, lamps = {};
  const order = [['green', 0x16b364], ['yellow', 0xfb923c], ['red', 0xf04438], ['blue', 0x2e90fa]];
  order.forEach(([k, c], i) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, seg * 0.92, 16), M.lampOff.clone());
    m.position.set(x, y + h + seg * (i + 0.5), z); m.userData.lampColor = c; group.add(m); lamps[k] = m;
  });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.02, 16), M.darkGray);
  cap.position.set(x, y + h + seg * 4 + 0.01, z); group.add(cap);
  return lamps;
}
const LAMP_OF = { run: 'green', idle: 'yellow', fault: 'red', maint: 'blue' };
export function applyLamps(lamps, status) {
  if (!lamps) return;
  for (const [k, m] of Object.entries(lamps)) {
    const on = LAMP_OF[status] === k;
    m.material.dispose();
    m.material = on ? lampMat(m.userData.lampColor) : M.lampOff.clone();
    m.userData.on = on;
  }
}
// 地面状态光环（圆角矩形边框 + 半透明底）
export function statusRing(w, d) {
  const g = new THREE.Group(); g.name = 'statusRing';
  const shape = rr(w / 2 + 0.25, d / 2 + 0.25, 0.25), hole = rr(w / 2 + 0.17, d / 2 + 0.17, 0.2);
  shape.holes.push(hole);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x16b364, transparent: true, opacity: 0.85, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.ShapeGeometry(shape, 6), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.012;
  const fillMat = new THREE.MeshBasicMaterial({ color: 0x16b364, transparent: true, opacity: 0.1, depthWrite: false });
  const fill = new THREE.Mesh(new THREE.ShapeGeometry(rr(w / 2 + 0.17, d / 2 + 0.17, 0.2), 6), fillMat); fill.rotation.x = -Math.PI / 2; fill.position.y = 0.01;
  ring.renderOrder = fill.renderOrder = 1; ring.userData.noPick = fill.userData.noPick = true;
  g.add(fill, ring); g.userData = { ringMat, fillMat };
  return g;
}
function rr(hw, hd, r) {
  const s = new THREE.Shape();
  s.moveTo(-hw + r, -hd); s.lineTo(hw - r, -hd); s.quadraticCurveTo(hw, -hd, hw, -hd + r); s.lineTo(hw, hd - r); s.quadraticCurveTo(hw, hd, hw - r, hd);
  s.lineTo(-hw + r, hd); s.quadraticCurveTo(-hw, hd, -hw, hd - r); s.lineTo(-hw, -hd + r); s.quadraticCurveTo(-hw, -hd, -hw + r, -hd); return s;
}
export function setRingStatus(ring, status) {
  if (!ring) return; const c = statusColor[status] ?? 0x16b364;
  ring.userData.ringMat.color.setHex(c); ring.userData.fillMat.color.setHex(c);
}
// 显示器 + 支臂（PartBuilder）
export function monitorArm(pb, x, y, z, { ry = 0, armH = 0.35, w = 0.34, h = 0.24, keyboard = true } = {}) {
  const c = Math.cos(ry), s = Math.sin(ry);
  pb.cyl(0.018, armH, x, y + armH / 2, z, M.metal, 10);
  pb.boxC(0.06, 0.05, 0.06, x, y + armH, z, M.darkGray);
  const mx = x + s * 0.04, mz = z + c * 0.04;
  pb.add(new THREE.BoxGeometry(w + 0.03, h + 0.03, 0.035), M.graphite, mx, y + armH + h / 2 + 0.02, mz, -0.12, ry, 0);
  pb.add(new THREE.BoxGeometry(w, h, 0.006), M.screen, mx + s * 0.019, y + armH + h / 2 + 0.02, mz + c * 0.019, -0.12, ry, 0);
  if (keyboard) pb.add(new THREE.BoxGeometry(w * 0.95, 0.018, 0.14), M.darkGray, x + s * 0.13, y + armH - 0.12, z + c * 0.13, 0.18, ry, 0);
}
// 调平地脚
export function feet(pb, w, d, inset = 0.06) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    pb.cyl(0.035, 0.03, sx * (w / 2 - inset), 0.015, sz * (d / 2 - inset), M.black, 12);
    pb.cyl(0.012, 0.06, sx * (w / 2 - inset), 0.06, sz * (d / 2 - inset), M.steel, 8);
  }
}
// 通风格栅（一排细条）
export function vents(pb, x, y, z, w, h, n, mat = M.darkGray, axis = 'z') {
  for (let i = 0; i < n; i++) {
    const yy = y + (i + 0.5) * (h / n);
    if (axis === 'z') pb.boxC(w, h / n * 0.35, 0.008, x, yy, z, mat); else pb.boxC(0.008, h / n * 0.35, w, x, yy, z, mat);
  }
}

// 急停按钮（黄色底座 + 红色蘑菇头）
export function estop(pb, x, y, z, ry = 0) {
  const c = Math.cos(ry), s = Math.sin(ry);
  pb.add(new THREE.BoxGeometry(0.07, 0.07, 0.03), M.yellow, x, y, z, 0, ry, 0);
  pb.add(new THREE.CylinderGeometry(0.022, 0.026, 0.03, 16), M.red, x + s * 0.03, y, z + c * 0.03, Math.PI / 2, ry, 0);
}
// 门把手
export function handle(pb, x, y, z, h = 0.12) { pb.boxC(0.018, h, 0.025, x, y, z, M.metal); }
