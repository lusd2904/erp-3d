// 共享材质库（浅色工业风）。设备构建时会按设备克隆，便于单独高亮。
import * as THREE from 'three';
const std = (color, roughness = 0.55, metalness = 0.05, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
export const M = {
  white: std(0xf4f7fb, 0.42, 0.05),
  ivory: std(0xe6e9ee, 0.5, 0.05),
  gray: std(0xcbd5e1, 0.5, 0.15),
  midGray: std(0x8e99a6, 0.5, 0.3),
  darkGray: std(0x4a5361, 0.55, 0.3),
  graphite: std(0x2c323b, 0.6, 0.2),
  black: std(0x1d2127, 0.7, 0.1),
  metal: std(0xb7c0ca, 0.3, 0.85),
  steel: std(0x8f9aa6, 0.35, 0.8),
  chrome: std(0xdfe5ea, 0.15, 0.95),
  blue: std(0x2563eb, 0.4, 0.15),
  navy: std(0x1d3f72, 0.45, 0.2),
  cyan: std(0x22d3ee, 0.4, 0.15),
  teal: std(0x2bb5a0, 0.45, 0.1),
  orange: std(0xf08a24, 0.5, 0.1),
  yellow: std(0xf6c343, 0.5, 0.1),
  red: std(0xe5484d, 0.5, 0.1),
  green: std(0x2fb36d, 0.5, 0.1),
  pcb: std(0x1f7a4a, 0.6, 0.05),
  pcbChip: std(0x262a30, 0.5, 0.2),
  copper: std(0xc98b4b, 0.35, 0.8),
  belt: std(0x32363d, 0.85, 0.05),
  rubber: std(0x22262b, 0.9, 0.0),
  carton: std(0xd8b27c, 0.85, 0.0),
  cartonDark: std(0xc49a62, 0.85, 0.0),
  pallet: std(0x9a7b56, 0.8, 0.0),
  reel: std(0x2a6fd6, 0.4, 0.1),
  reelWhite: std(0xf5f5f5, 0.4, 0.05),
  glass: new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.3, depthWrite: false }),
  glassTint: new THREE.MeshStandardMaterial({ color: 0x5c7a96, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.55, depthWrite: false }),
  screen: std(0x0f2a48, 0.25, 0.1, { emissive: 0x2f86d9, emissiveIntensity: 0.55 }),
  screenUi: std(0xffffff, 0.3, 0, { emissive: 0x9fd2ff, emissiveIntensity: 0.6 }),
  heatGlow: std(0xff7a3d, 0.4, 0.1, { emissive: 0xff5a1f, emissiveIntensity: 0.9 }),
  lampOff: std(0x9aa3ad, 0.3, 0.1, { transparent: true, opacity: 0.85 }),
  floorLine: std(0xf3c234, 0.6, 0),
};
export const statusColor = { run: 0x16b364, idle: 0xfb923c, fault: 0xf04438, maint: 0x2e90fa };
export function lampMat(color) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, roughness: 0.3, transparent: true, opacity: 0.95 });
}
