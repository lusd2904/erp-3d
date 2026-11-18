// 设备工厂：优先使用模型部提供的 src/three/devices/<type>.js（build(device) => THREE.Group），
// 加载或构建失败时回退到线A内置实现。所有类型模块并行加载（Promise.allSettled）。
import * as THREE from 'three';
import { buildPrinter, buildInspector, buildMounter, buildReflow } from './smt.js';
import { buildTester, buildTaper } from './backend.js';
import { buildStacker, buildRacks } from './warehouse.js';
import { buildAgv } from './agv.js';
import { DEVICE_FILES } from './deviceManifest.js';
import { statusRing, setRingStatus, applyLamps } from './common.js';

const EXTERNAL_TYPES = ['printer', 'spi', 'mounter', 'reflow', 'aoi', 'tester', 'taper', 'asrs', 'agv', 'stacker', 'charger', 'reelcab', 'esdbench'];
// loader / conveyor 正在返工：文件在且构建成功才用，失败静默跳过，不回退、不报错。spi 已验收，加载失败回退内置。
const OPTIONAL_TYPES = ['loader', 'conveyor'];
const external = {};   // type -> module
export const factoryReport = {}; // type -> 'external' | 'builtin' | 'external-failed:<msg>'

export async function loadExternalDevices() {
  const want = [...EXTERNAL_TYPES, ...OPTIONAL_TYPES].filter(t => DEVICE_FILES.includes(t));
  const res = await Promise.allSettled(want.map(t => import(`./devices/${t}.js`)));
  res.forEach((r, i) => {
    const typ = want[i], optional = OPTIONAL_TYPES.includes(typ);
    if (r.status === 'fulfilled' && typeof r.value.build === 'function') external[typ] = r.value;
    else if (r.status === 'rejected' && !optional) {
      console.warn('[设备工厂] 外部模型加载失败，回退内置：', typ, r.reason?.message);
      factoryReport[typ] = 'external-load-failed';
    }
  });
  return Object.keys(external);
}
export const hasExternal = t => !!external[t];
export const getExternal = t => external[t];
export const isOptionalType = t => OPTIONAL_TYPES.includes(t);

const PLACE_SIZE = {
  charger: { w: 0.45, d: 0.30, h: 0.90 },
  reelcab: { w: 1.00, d: 0.97, h: 2.42 },
  esdbench: { w: 1.50, d: 0.80, h: 0.90 },
};
function placeholder(dev) {
  const sz = PLACE_SIZE[dev.type] || { w: 1.2, d: 1.0, h: 1.2 };
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(sz.w, sz.h, sz.d),
    new THREE.MeshStandardMaterial({ color: 0xe8eef6, metalness: 0.15, roughness: 0.55 }),
  );
  body.position.y = sz.h / 2;
  g.add(body);
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(sz.w * 0.92, 0.04, sz.d * 0.92),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.3, roughness: 0.4 }),
  );
  cap.position.y = sz.h + 0.02;
  g.add(cap);
  g.userData.size = { ...sz };
  return g;
}
function builtin(dev) {
  switch (dev.type) {
    case 'printer': return buildPrinter();
    case 'spi': return buildInspector('spi');
    case 'aoi': return buildInspector('aoi');
    case 'mounter': return dev.id === 'L2-MNT1' ? buildMounter({ style: 'yamaha' }) : buildMounter({ modules: dev.id.endsWith('MNT2') ? 2 : 4 });
    case 'reflow': return buildReflow();
    case 'tester': return buildTester();
    case 'taper': return buildTaper();
    case 'asrs': return buildRacks();
    case 'stacker': return buildStacker();
    case 'agv': return buildAgv(dev.id !== 'AGV-03');
    default: return placeholder(dev);
  }
}
// 统一为 Group + userData{lamps, ring, animate, size}
function normalize(r, dev) {
  if (!r) return null;
  let g;
  if (r.isObject3D) g = r;
  else {
    g = r.group; const ud = g.userData;
    ud.lamps = ud.lamps || r.lamps; ud.size = ud.size || r.size; ud.extra = r; if (r.bins && !ud.bins) ud.bins = r.bins;
    if (r.anim && !ud.animate) ud.animate = (t, dt, st) => { if (st === 'run') r.anim(t, dt); };
  }
  const ud = g.userData;
  if (!ud.size) { const b = new THREE.Box3().setFromObject(g), s = b.getSize(new THREE.Vector3()); ud.size = { w: s.x, h: s.y, d: s.z }; }
  if (!ud.ring && dev.type !== 'agv') { ud.ring = statusRing(ud.size.w, ud.size.d); g.add(ud.ring); }
  g.name = dev.id;
  return g;
}
export function createDevice(dev) {
  let g = null;
  const ext = external[dev.type];
  if (ext) {
    try { g = normalize(ext.build({ ...dev }), dev); factoryReport[dev.type] = 'external'; g.userData.external = true; if (typeof ext.highlightBin === 'function' && !g.userData.highlightBin) g.userData.highlightBin = (grp, id) => ext.highlightBin(grp, id); }
    catch (e) {
      if (OPTIONAL_TYPES.includes(dev.type)) return null;
      console.warn('[设备工厂] 外部模型构建失败，回退内置：', dev.type, e);
      factoryReport[dev.type] = 'external-failed:' + e.message; g = null;
    }
  }
  if (!g) {
    if (OPTIONAL_TYPES.includes(dev.type)) return null;
    g = normalize(builtin(dev), dev); if (!factoryReport[dev.type]) factoryReport[dev.type] = 'builtin';
  }
  if (!g) { g = normalize(placeholder(dev), dev); factoryReport[dev.type] = (factoryReport[dev.type] || 'builtin') + '+placeholder'; }
  if (!g) return null;
  // 每台设备独立材质，便于悬停/选中高亮互不影响
  g.traverse(o => {
    if (!o.isMesh || o.userData.noPick) return;
    if (Array.isArray(o.material)) o.material = o.material.map(m => m.clone()); else o.material = o.material.clone();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (o.userData.castShadow !== false && !mats.some(m => m && m.transparent)) o.castShadow = true;
    o.receiveShadow = true;
  });
  g.userData.deviceId = dev.id;
  setStatus(g, dev.status);
  return g;
}
const STATUS_OK = new Set(['run', 'idle', 'fault', 'maint']);
export function setStatus(g, status) {
  if (!STATUS_OK.has(status)) return;
  const ud = g.userData; ud.status = status;
  applyLamps(ud.lamps, status); setRingStatus(ud.ring, status);
}
