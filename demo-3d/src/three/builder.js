// PartBuilder：用基础几何体组合精细设备，按材质合并网格以降低 drawcall
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
export class PartBuilder {
  constructor() { this.parts = new Map(); }
  add(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
    g.applyMatrix4(_m);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(g);
    return this;
  }
  // 盒子：以底面中心为 y 基准（y 为底面高度）
  box(w, h, d, x, y, z, mat, ry = 0) { return this.add(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, 0, ry, 0); }
  boxC(w, h, d, x, y, z, mat, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz); }
  cyl(r, h, x, y, z, mat, seg = 20, rx = 0, ry = 0, rz = 0, r2) { return this.add(new THREE.CylinderGeometry(r, r2 ?? r, h, seg), mat, x, y, z, rx, ry, rz); }
  // 圆角边框（四根细条拼成的边框）
  frame(w, h, d, x, y, z, t, mat) {
    this.boxC(w, t, t, x, y + h / 2, z + d / 2, mat); this.boxC(w, t, t, x, y - h / 2, z + d / 2, mat);
    this.boxC(t, h, t, x - w / 2, y, z + d / 2, mat); this.boxC(t, h, t, x + w / 2, y, z + d / 2, mat);
    return this;
  }
  build(group, { cloneMaterials = true, shadow = true } = {}) {
    const meshes = [];
    for (const [mat, list] of this.parts) {
      const geo = mergeGeometries(list, false);
      list.forEach(g => g.dispose());
      const mesh = new THREE.Mesh(geo, cloneMaterials ? mat.clone() : mat);
      mesh.castShadow = shadow && !mat.transparent; mesh.receiveShadow = !mat.transparent;
      group.add(mesh); meshes.push(mesh);
    }
    this.parts.clear();
    return meshes;
  }
}
// 圆角矩形挤出形状（用于机身盖板等）
export function roundedBoxGeo(w, h, d, r = 0.06, seg = 3) {
  const s = new THREE.Shape(); const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: Math.min(r, 0.02), bevelSize: Math.min(r, 0.02), bevelSegments: 2, curveSegments: seg });
  g.translate(0, 0, -d / 2); g.computeVertexNormals();
  return g;
}
// 画布文字贴图（用于设备铭牌、地面区域字）
export function textTexture(text, { w = 512, h = 128, font = 'bold 64px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif', color = '#1f2a3d', bg = null, align = 'center' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  g.font = font; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle';
  g.fillText(text, align === 'center' ? w / 2 : 16, h / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
