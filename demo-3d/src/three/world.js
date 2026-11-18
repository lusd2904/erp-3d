// 三维世界：渲染器/灯光/相机/场景装配、动画、拾取高亮、视角预设、设备定位、库位定位
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { devices, deviceById, STATUS, parseBin, parseRcBin, warehouse as WHCFG } from '../data/plant.js';
import { buildHall, buildCampus, buildRoof, CAMPUS_LABELS, HALL } from './building.js';
import { loadExternalDevices, createDevice, setStatus as setDevStatus, hasExternal, factoryReport } from './factory.js';
import { layoutLine, L3_POS, WH_ORIGIN, AISLE_WORLD_Z } from './layout.js';
import { BAY, LEVEL_H, BASE_Y, ROW_Z, RACK_LEN } from './warehouse.js';
import { tempColor, REFLOW_ZONES } from './smt.js';
import { LabelLayer } from './labels.js';
import { M } from './materials.js';
import { PartBuilder } from './builder.js';

export const VIEWS = {
  campus: { name: '园区全景', pos: [34, 52, 66], target: [-6, 0, -1] },
  hall: { name: '车间全景', pos: [0, 44, 38], target: [0, 0, -3.5] },
  L1: { name: 'SMT 一线', pos: [-5.0, 15.6, 3.3], target: [-11.1, 0.7, -10.5] },
  L2: { name: 'SMT 二线', pos: [-5.0, 15.6, 8.3], target: [-11.1, 0.7, -5.5] },
  L3: { name: '测试编带', pos: [-7.2, 15.2, 11.8], target: [-13.7, 0.7, 1.0] },
  WH: { name: '立体仓库', pos: [9, 11.5, 7.5], target: [11.5, 2.2, -9.8] },
  AGV: { name: 'AGV 充电区', pos: [12.4, 2.9, 11.6], target: [15.5, 0.3, 14.15] },
  MAT: { name: '物料区', pos: [-3.8, 3.15, -8.7], target: [0.1, 1.15, -11.55] },
  QA: { name: '质检区', pos: [0.4, 3.2, 3.4], target: [-0.2, 0.85, 7.2] },
};
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export class World {
  constructor() {
    this.listeners = {}; this.devices = {}; this.mounted = null; this.clock = new THREE.Clock();
    this.labelsOn = true; this.flowOn = true; this.tween = null; this.hovered = null; this.selected = null; this.t = 0;
    this.ready = this.init();
  }
  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); return () => { this.listeners[ev] = this.listeners[ev].filter(f => f !== fn); }; }
  emit(ev, ...a) { (this.listeners[ev] || []).forEach(f => f(...a)); }

  async init() {
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.className = 'w3-canvas';
    // 软件渲染（SwiftShader/llvmpipe）或弱显卡：降低分辨率并关闭毛玻璃，保证可交互
    try { const gl = r.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ''; this.gpuName = name;
      if (/swiftshader|llvmpipe|software/i.test(name)) { this.lowGpu = true; document.documentElement.classList.add('low-gpu'); r.shadowMap.type = THREE.PCFShadowMap; } } catch (e) { /* ignore */ }
    const scene = this.scene = new THREE.Scene();
    scene.background = skyTexture(); scene.fog = new THREE.Fog(0xe9f0f8, 110, 300);
    const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55; pm.dispose();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 900);
    this.camera.position.set(...VIEWS.hall.pos);
    // 灯光：天空半球光 + 主太阳光（阴影）+ 补光
    scene.add(new THREE.HemisphereLight(0xeef5ff, 0xcfc8bb, 0.95));
    const sun = this.sun = new THREE.DirectionalLight(0xfff6e8, 2.5); sun.position.set(26, 48, 30);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 26, bottom: -26, near: 5, far: 140 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3; scene.add(sun, sun.target);
    const fill = new THREE.DirectionalLight(0xe4efff, 0.6); fill.position.set(-30, 25, -20); scene.add(fill);
    // 并行：外部设备模型模块加载 + 建筑/园区构建
    const [extTypes] = await Promise.all([loadExternalDevices(), Promise.resolve().then(() => { scene.add(buildCampus()); this.hall = buildHall(); scene.add(this.hall); this.ceilLamps = this.hall.getObjectByName('ceilingLamps'); this.hallStructure = this.hall.getObjectByName('hallStructure'); this.hallMidCols = this.hall.getObjectByName('hallMidCols'); this.hallWallCols = this.hall.getObjectByName('hallWallCols'); this.roof = buildRoof(); this.roof.visible = false; scene.add(this.roof); })]);
    this.externalTypes = extTypes;
    this.buildDevices();
    this.buildFlow();
    this.buildMarkers();
    this.labels = new LabelLayer(); this.buildLabels();
    this.raycaster = new THREE.Raycaster();
    this.factoryReport = factoryReport;
    this.loop = this.loop.bind(this);
    return this;
  }

  // ---------- 设备装配 ----------
  buildDevices() {
    const S = this.scene, G = this.devices;
    for (const d of devices) { const g = createDevice(d); if (g) G[d.id] = g; }
    this.lines = {};
    for (const L of ['L1', 'L2']) this.lines[L] = layoutLine(L, G, S);
    for (const [id, [x, z]] of Object.entries(L3_POS)) if (G[id]) { G[id].position.set(x, 0, z); S.add(G[id]); }
    // 后段接驳（测试→编带 小传送带）
    const pb = new PartBuilder();
    pb.boxC(1.1, 0.04, 0.2, -13.25, 0.95, 1.0, M.belt); pb.box(0.05, 0.93, 0.05, -13.7, 0, 1.0, M.metal); pb.box(0.05, 0.93, 0.05, -12.8, 0, 1.0, M.metal);
    const bk = new THREE.Group(); pb.build(bk, { cloneMaterials: false }); S.add(bk);
    // 立体仓库：按包围盒居中放入仓储区（兼容外部模型与内置模型的不同原点）
    const asrs = G['WH-ASRS']; this.alias = {};
    this.whOrigin = new THREE.Vector3();
    if (asrs) {
      S.add(asrs); asrs.updateMatrixWorld(true);
      const b = new THREE.Box3(); asrs.traverse(o => { if (o.isMesh && !o.userData.noPick) b.expandByObject(o); });
      const zone = { x0: 0.6, x1: 20.5, z0: -14.7, z1: -5.4 };
      asrs.position.x = (zone.x0 + zone.x1) / 2 - (b.min.x + b.max.x) / 2;
      asrs.position.z = Math.max(zone.z0 - b.min.z, Math.min(zone.z1 - b.max.z, (zone.z0 + zone.z1) / 2 - (b.min.z + b.max.z) / 2));
      asrs.updateMatrixWorld(true); this.whOrigin.copy(asrs.position);
      this.asrsBox = new THREE.Box3(); asrs.traverse(o => { if (o.isMesh && !o.userData.noPick) this.asrsBox.expandByObject(o); });
    }
    this.stackers = [];
    const extStackers = asrs && (asrs.userData.external || asrs.userData.hasStackers);
    ['WH-STK1', 'WH-STK2'].forEach((id, i) => {
      const g = G[id]; if (!g) return;
      if (extStackers) { delete G[id]; this.alias[id] = 'WH-ASRS'; return; } // 外部立体库模型已自带堆垛机
      g.position.set(this.whOrigin.x + 2, 0, this.whOrigin.z + [1.45, 5.5][i]); S.add(g);
      const car = g.userData.extra?.car || g.getObjectByName('car');
      this.stackers.push({ id, g, car, x: 2 + i * 5, y: 0.6, tx: 4, ty: 2, wait: 0 });
    });
    // AGV
    this.agvs = [];
    const loop = [[0.6, -2.2], [19.6, -2.2], [19.6, 12.5], [-19.6, 12.5], [-19.6, -2.2]];
    const spur = [[0.6, -7.6], [0.6, -2.2], [19.6, -2.2], [19.6, 12.5], [-19.6, 12.5], [-19.6, -2.2]];
    const agvCfg = { 'AGV-01': { path: spur, s: 0 }, 'AGV-02': { path: loop, s: 14 }, 'AGV-04': { path: loop, s: 52 }, 'AGV-03': { park: [16.1, 13.65, 0] } };
    for (const [id, c] of Object.entries(agvCfg)) {
      const g = G[id]; if (!g) continue; S.add(g);
      const a = { id, g, ...c, speed: 0.9, len: 0 };
      if (c.path) { a.pts = c.path.map(p => new THREE.Vector2(...p)); a.len = a.pts.reduce((s, p, i) => s + p.distanceTo(a.pts[(i + 1) % a.pts.length]), 0); this.placeAgv(a, a.s); }
      else { g.position.set(c.park[0], 0, c.park[1]); g.rotation.y = c.park[2]; }
      this.agvs.push(a);
    }
    // AGV 充电桩：面向车间内侧（-Z），停靠区位对准 AGV-03
    const chPos = { 'CH-01': [14.5, 14.45, Math.PI], 'CH-02': [16.1, 14.45, Math.PI] };
    for (const [id, [x, z, ry]] of Object.entries(chPos)) {
      const g = G[id]; if (!g) continue;
      g.position.set(x, 0, z); g.rotation.y = ry; S.add(g);
    }
    // 智能料塔：立体库西侧（靠近 SMT 一线/二线）
    {
      const box = this.asrsBox;
      const x = box ? box.min.x - 0.95 : 1.65;
      const z0 = box ? box.min.z + 1.5 : -12.6;
      const z1 = box ? box.min.z + 3.4 : -10.8;
      const rcPos = { 'RC-01': [x, z0, -Math.PI / 2], 'RC-02': [x, z1, -Math.PI / 2] };
      for (const [id, [px, pz, ry]] of Object.entries(rcPos)) {
        const g = G[id]; if (!g) continue;
        g.position.set(px, 0, pz); g.rotation.y = ry; S.add(g);
      }
    }
    // 质检室防静电工作台（朝向南侧入口玻璃）
    const esdPos = { 'QA-ESD1': [-1.6, 7.05, Math.PI], 'QA-ESD2': [1.15, 7.05, Math.PI] };
    for (const [id, [px, pz, ry]] of Object.entries(esdPos)) {
      const g = G[id]; if (!g) continue;
      g.position.set(px, 0, pz); g.rotation.y = ry; S.add(g);
    }
    for (const g of Object.values(G)) g.updateMatrixWorld(true);
  }
  agvAt(a, s) {
    s = ((s % a.len) + a.len) % a.len;
    for (let i = 0; i < a.pts.length; i++) {
      const p = a.pts[i], q = a.pts[(i + 1) % a.pts.length], L = p.distanceTo(q);
      if (s <= L) { const k = s / L; return { x: p.x + (q.x - p.x) * k, z: p.y + (q.y - p.y) * k, ang: Math.atan2(-(q.y - p.y), q.x - p.x) }; }
      s -= L;
    }
    return { x: a.pts[0].x, z: a.pts[0].y, ang: 0 };
  }
  placeAgv(a, s) {
    const p = this.agvAt(a, s); a.s = s; a.g.position.set(p.x, 0, p.z);
    let d = p.ang - a.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); a.g.rotation.y += d * 0.25; a.ang = p.ang;
  }

  // ---------- PCB 流动 ----------
  buildFlow() {
    const pb = new PartBuilder();
    pb.boxC(0.24, 0.012, 0.18, 0, 0, 0, M.pcb);
    for (let i = 0; i < 6; i++) pb.boxC(0.03, 0.01, 0.02, -0.08 + (i % 3) * 0.07, 0.01, i < 3 ? -0.04 : 0.04, M.pcbChip);
    pb.boxC(0.06, 0.014, 0.06, 0.05, 0.012, 0, M.pcbChip); pb.boxC(0.05, 0.004, 0.012, -0.05, 0.008, 0.07, M.copper);
    const tmp = new THREE.Group(); pb.build(tmp, { cloneMaterials: false, shadow: false });
    this.pcbProto = tmp;
    this.flows = Object.entries(this.lines).map(([L, line]) => ({ L, line, boards: [], spawnT: 0 }));
  }
  stepFlow(dt) {
    for (const f of this.flows) {
      const { line } = f, speed = 0.42;
      f.spawnT -= dt;
      if (f.spawnT <= 0 && (!f.boards.length || f.boards[f.boards.length - 1].x > line.x0 + 0.6)) {
        const m = this.pcbProto.clone(); m.position.set(line.x0, line.y, line.z); this.scene.add(m); f.boards.push({ m, x: line.x0 }); f.spawnT = 2.6;
      }
      // 阻塞点：故障/保养设备入口
      const blockSeg = line.segs.find(s => s.id && ['fault', 'maint'].includes(this.devices[s.id]?.userData.status));
      for (let i = 0; i < f.boards.length; i++) {
        const b = f.boards[i]; let nx = b.x + speed * dt;
        if (blockSeg && b.x < blockSeg.x0) nx = Math.min(nx, blockSeg.x0 - 0.15);
        if (i > 0) nx = Math.min(nx, f.boards[i - 1].x - 0.32);
        b.x = Math.max(b.x, nx); b.m.position.x = b.x;
      }
      while (f.boards.length && f.boards[0].x > line.x1) { const b = f.boards.shift(); this.scene.remove(b.m); }
      f.boards.forEach(b => (b.m.visible = this.flowOn));
    }
  }

  // ---------- 标记：选中框、库位高亮 ----------
  buildMarkers() {
    this.selBox = new THREE.Box3Helper(new THREE.Box3(), 0x2563eb); this.selBox.visible = false; this.selBox.material.depthTest = false; this.selBox.renderOrder = 10; this.scene.add(this.selBox);
    const bm = new THREE.Group();
    const fillMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.35, depthWrite: false });
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.08, 0.82, 1.02)), new THREE.LineBasicMaterial({ color: 0x1d4ed8, depthTest: false }));
    edge.renderOrder = 11; const fill = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.8, 1.0), fillMat); bm.add(fill, edge);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), new THREE.MeshBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.5, depthWrite: false }));
    bm.add(beam); bm.userData = { fillMat, beam, fill, edge }; bm.visible = false; this.binMarker = bm; this.scene.add(bm);
  }

  // ---------- 标签 ----------
  buildLabels() {
    this.devLabels = {};
    for (const d of devices) {
      const g = this.devices[d.id]; if (!g) continue;
      if (d.type === 'stacker' && !this.stackers.find(s => s.id === d.id)) continue;
      if (!g.parent) continue;
      const h = g.userData.size.h;
      const anchor = d.type === 'agv' || d.type === 'stacker' ? () => g.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, h + 0.15, 0)) : new THREE.Vector3().setFromMatrixPosition(g.matrixWorld).add(new THREE.Vector3(0, h + 0.12, d.type === 'asrs' ? 3.5 : 0));
      const it = this.labels.add({ id: d.id, html: '', anchor, priority: d.type === 'agv' ? -1 : 0 });
      if (d.type === 'asrs' && this.asrsBox) { const c = this.asrsBox.getCenter(new THREE.Vector3()); it.anchor = new THREE.Vector3(c.x, this.asrsBox.max.y + 0.3, this.asrsBox.max.z - 0.5); it.priority = 1; }
      this.devLabels[d.id] = it; this.refreshLabel(d.id);
    }
    // 产线标签（蓝色胶囊，常显）
    const whTop = this.asrsBox ? new THREE.Vector3(this.asrsBox.min.x + 1.2, this.asrsBox.max.y + 0.6, this.asrsBox.max.z) : new THREE.Vector3(6, 7, -6);
    this.lineLabels = [['SMT-1 线', new THREE.Vector3(-17.6, 2.6, -10.5)], ['SMT-2 线', new THREE.Vector3(-17.6, 2.6, -5.5)], ['编带/测试线', new THREE.Vector3(-16.2, 2.9, 1.0)], ['立体仓库', whTop], ['物料区', new THREE.Vector3(1.4, 2.5, -11.2)], ['质检区', new THREE.Vector3(0.5, 2.3, 8.2)]]
      .map(([n, p]) => this.labels.add({ id: 'line-' + n, html: n, anchor: p, priority: 8, cls: 'w3-label-line' }));
    this.areaLabels = CAMPUS_LABELS.map(([name, x, y, z]) => { const it = this.labels.add({ id: 'area-' + name, html: `<b>${name}</b>`, anchor: new THREE.Vector3(x, y, z), priority: 5, cls: 'w3-label-area' }); it.hidden = true; return it; });
    this.binLabel = this.labels.add({ id: 'bin', html: '', anchor: new THREE.Vector3(), priority: 20, cls: 'w3-label-bin' }); this.binLabel.hidden = true;
  }
  refreshLabel(id) {
    const d = deviceById[id], g = this.devices[id], it = this.devLabels[id]; if (!it) return;
    const st = g.userData.status;
    this.labels.setHtml(it, `<i class="dot dot-${st}"></i>${d.name.replace(/^SMT\d /, '')}<em class="st-${st}">${STATUS[st].label}</em>`);
    it.wrap.classList.toggle('is-sel', this.selected === id);
    it.wrap.classList.toggle('is-alarm', st === 'fault');
  }

  // ---------- 挂载 ----------
  mount(el) {
    if (this.mounted === el) return;
    this.unmount();
    this.mounted = el; this.blockerSelector = el.dataset.blockers || ''; this._blk = null; el.appendChild(this.renderer.domElement); el.appendChild(this.labels.el);
    this.controls?.dispose();
    const c = this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    c.enableDamping = true; c.dampingFactor = 0.08; c.maxPolarAngle = 1.42; c.minDistance = 2.5; c.maxDistance = 170; c.screenSpacePanning = false;
    c.target.set(...(this.lastTarget || VIEWS.hall.target));
    c.addEventListener('start', () => { this.tween = null; });
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(el); this.resize();
    const dom = this.renderer.domElement; this._down = null;
    this._h = {
      move: e => this.onMove(e), down: e => { this._down = [e.clientX, e.clientY]; },
      up: e => { if (this._down && Math.hypot(e.clientX - this._down[0], e.clientY - this._down[1]) < 5) this.onClick(e); this._down = null; },
      leave: () => this.setHover(null),
    };
    dom.addEventListener('pointermove', this._h.move); dom.addEventListener('pointerdown', this._h.down); dom.addEventListener('pointerup', this._h.up); dom.addEventListener('pointerleave', this._h.leave);
    this.running = true; this.clock.getDelta();
    this._raf = requestAnimationFrame(this.loop);
  }
  unmount() {
    if (!this.mounted) return;
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._loopDelay) clearTimeout(this._loopDelay);
    this._raf = 0; this._loopDelay = 0;
    this.ro?.disconnect();
    const dom = this.renderer.domElement;
    if (this._h) { dom.removeEventListener('pointermove', this._h.move); dom.removeEventListener('pointerdown', this._h.down); dom.removeEventListener('pointerup', this._h.up); dom.removeEventListener('pointerleave', this._h.leave); }
    this.lastTarget = this.controls?.target.toArray();
    dom.remove(); this.labels.el.remove(); this.mounted = null;
  }
  resize() {
    const el = this.mounted; if (!el) return;
    const w = el.clientWidth || 1, h = el.clientHeight || 1;
    this.renderer.setSize(w, h, false); this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = h + 'px';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.size = { w, h };
  }

  // ---------- 拾取 ----------
  pick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(v, this.camera);
    const hits = this.raycaster.intersectObjects(Object.values(this.devices).filter(g => g.parent), true);
    for (const h of hits) {
      if (h.object.userData.noPick) continue;
      let o = h.object; while (o && !o.userData.deviceId) o = o.parent;
      if (o) return o.userData.deviceId;
    }
    return null;
  }
  onMove(e) { if (this._down) return; const now = performance.now(); if (now - (this._lastPick || 0) < 60) return; this._lastPick = now; this.setHover(this.pick(e)); }
  onClick(e) { const id = this.pick(e); this.select(id); }
  setHover(id) {
    if (this.hovered === id) return;
    if (this.hovered && this.hovered !== this.selected) this.tint(this.hovered, 0);
    this.hovered = id; if (id && id !== this.selected) this.tint(id, 0.22);
    this.renderer.domElement.style.cursor = id ? 'pointer' : '';
    this.emit('hover', id);
  }
  tint(id, k) {
    const g = this.devices[id]; if (!g) return;
    g.traverse(o => {
      if (!o.isMesh || o.userData.noPick || !o.material.emissive || o.userData.on || o.parent?.name === 'statusRing') return;
      const m = o.material;
      if (m.userData.e0 === undefined) { m.userData.e0 = m.emissive.getHex(); m.userData.ei0 = m.emissiveIntensity; }
      if (k > 0) { m.emissive.setHex(0x2f7cf6); m.emissiveIntensity = k; } else { m.emissive.setHex(m.userData.e0); m.emissiveIntensity = m.userData.ei0; }
    });
  }
  select(id, { fly = false } = {}) {
    const prev = this.selected; this.selected = id;
    if (prev && prev !== id) { this.tint(prev, 0); this.refreshLabel(prev); }
    if (id) { this.tint(id, 0.32); this.refreshLabel(id); this.updateSelBox(); }
    this.selBox.visible = !!id;
    if (id && fly) this.flyToDevice(id);
    this.emit('select', id);
  }
  updateSelBox() { const g = this.devices[this.selected]; if (!g) return; const b = new THREE.Box3(); g.traverse(o => { if (o.isMesh && !o.userData.noPick) b.expandByObject(o); }); this.selBox.box.copy(b.expandByScalar(0.06)); }

  // ---------- 相机 ----------
  flyTo(pos, target, dur = 1.3) {
    const c = this.controls; if (!c) { this.camera.position.set(...pos); this.lastTarget = target; return; }
    this.tween = { t: 0, dur, p0: this.camera.position.clone(), p1: new THREE.Vector3(...pos), t0: c.target.clone(), t1: new THREE.Vector3(...target) };
  }
  setView(name, instant = false) {
    const v = VIEWS[name]; if (!v) return;
    this.currentView = name;
    this.clearBin();
    if (instant || !this.controls) { this.camera.position.set(...v.pos); if (this.controls) this.controls.target.set(...v.target); else this.lastTarget = v.target; this.tween = null; }
    else this.flyTo(v.pos, v.target);
    this.setCampusMode(name === 'campus');
    this.emit('view', name);
  }
  // 园区模式：显示屋面（建筑完整）与建筑标签，隐藏设备标签；其余视角为剖切模式
  setCampusMode(on) {
    this.campusMode = on; if (this.roof) this.roof.visible = on;
    for (const it of Object.values(this.devLabels || {})) it.hidden = on;
    for (const it of this.lineLabels || []) it.hidden = on;
    for (const it of this.areaLabels || []) it.hidden = !on;
    if (on) this.clearBin();
  }
  flyToDevice(id) {
    if (this.campusMode) this.setCampusMode(false);
    const g = this.devices[id]; if (!g) return;
    const b = new THREE.Box3().setFromObject(g), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
    const r = Math.max(s.x, s.y, s.z), typ = deviceById[id]?.type;
    if (id === 'WH-ASRS') { this.flyTo(VIEWS.WH.pos, VIEWS.WH.target); return; }
    const dir = new THREE.Vector3(0.32, 0.62, 1);
    if (typ === 'reelcab' || typ === 'esdbench') dir.set(0.12, 0.42, 1).applyQuaternion(g.quaternion);
    dir.normalize();
    const dist = typ === 'reelcab' ? r * 1.35 + 2.6 : r * 1.25 + 3.2;
    this.flyTo(c.clone().addScaledVector(dir, dist).toArray(), [c.x, Math.min(c.y, 1.15), c.z]);
  }
  focusDevice(id) { id = this.alias?.[id] || id; if (!this.devices[id]) return false; this.clearBin(); this.select(id, { fly: true }); return true; }

  // ---------- 库位 ----------
  binWorld(binId) {
    const asrs = this.devices['WH-ASRS']; const ud = asrs?.userData || {};
    let p = null;
    if (Array.isArray(ud.bins)) { const b = ud.bins.find(x => x.id === binId); p = b && (b.pos || b.position); }
    else if (ud.bins instanceof Map) { const b = ud.bins.get(binId); p = b && (b.pos || b.position || b); }
    else if (ud.bins && ud.bins[binId]) { const b = ud.bins[binId]; p = b.pos || b.position || b; }
    if (p && p.isVector3) return asrs.localToWorld(p.clone()).add(new THREE.Vector3(0, 0.4, 0));
    const q = parseBin(binId); if (!q) return null;
    return new THREE.Vector3(this.whOrigin.x + (q.col - 0.5) * BAY, BASE_Y + (q.level - 1) * LEVEL_H + 0.45, this.whOrigin.z + ROW_Z[q.row]);
  }
  locateBin(binId) {
    const rc = parseRcBin(binId);
    if (rc) return this.locateReelSlot(binId, rc);
    const p = this.binWorld(binId); if (!p) return false;
    if (this.campusMode) this.setCampusMode(false);
    const q = parseBin(binId); if (!q || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) return false;
    const bm = this.binMarker; bm.position.copy(p); bm.visible = true;
    const top = 6.8; bm.userData.beam.scale.y = top - p.y; bm.userData.beam.position.y = (top - p.y) / 2 + 0.4;
    const asrs = this.devices['WH-ASRS'];
    const ext = asrs?.userData.highlightBin; try { if (typeof ext === 'function') ext(asrs, binId); } catch (e) { console.warn(e); }
    this.binLabel.anchor = p.clone().add(new THREE.Vector3(0, 0.5, 0)); this.binLabel.hidden = false;
    this.labels.setHtml(this.binLabel, `<b>库位 ${binId}</b><span>第${q.row}排 · ${q.col}列 · ${q.level}层</span>`);
    // 堆垛机前往该库位
    const aisle = q.row <= 2 ? 0 : 1; const st = this.stackers[aisle];
    const extHl = ext && asrs.userData.external; bm.userData.fill.visible = !extHl; bm.userData.edge.visible = !extHl;
    if (st) {
      const sid = aisle === 0 ? 'WH-STK1' : 'WH-STK2';
      const sst = this.getStatus(this.alias?.[sid] || sid) || this.getStatus('WH-ASRS');
      if (sst === 'run') { st.tx = (q.col - 0.5) * BAY - 2 + 0.2; st.ty = BASE_Y + (q.level - 1) * LEVEL_H + 0.1; st.hold = 6; }
    }
    // 定位视角：仓库前方斜上方俯视 + 货架透视（X-ray），高亮库位一目了然
    this.xray(true);
    const fz = this.asrsBox ? this.asrsBox.max.z : p.z + 3;
    this.flyTo([p.x + 2.5, Math.min(p.y + 3.4, 7.7), fz + 8.8], [p.x, p.y, p.z], 1.4);
    this.emit('bin', binId);
    return true;
  }
  xray(on) {
    const a = this.devices['WH-ASRS']; if (!a || this._xray === on) return; this._xray = on;
    a.traverse(o => {
      if (!o.isMesh || o.userData.noPick || o.parent?.name === 'statusRing') return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(m => {
        if (!m) return;
        if (on) { m.userData.x0 = [m.transparent, m.opacity, m.depthWrite]; m.transparent = true; m.opacity = Math.min(m.opacity, 0.2); m.depthWrite = false; }
        else if (m.userData.x0) { [m.transparent, m.opacity, m.depthWrite] = m.userData.x0; }
        m.needsUpdate = true;
      });
    });
  }
  locateReelSlot(binId, rc) {
    const id = rc.id; const g = this.devices[id]; if (!g) return false;
    this.clearBin();
    if (this.campusMode) this.setCampusMode(false);
    try { g.userData.highlightSlot?.(rc.slot - 1); } catch (e) { /* ignore */ }
    const p = new THREE.Vector3(); g.getWorldPosition(p); p.y += 1.4;
    this.binLabel.anchor = p; this.binLabel.hidden = false;
    this.labels.setHtml(this.binLabel, `<b>料塔料位 ${binId}</b><span>${deviceById[id]?.name || id} · 槽位 ${rc.slot}</span>`);
    this.select(id, { fly: false });
    this.flyToDevice(id);
    this.emit('bin', binId);
    return true;
  }
  clearBin() {
    this.xray(false); this.binMarker.visible = false; this.binLabel.hidden = true;
    const a = this.devices['WH-ASRS']; try { a?.userData.highlightBin?.(a, null); } catch (e) { /* ignore */ }
    for (const id of ['RC-01', 'RC-02']) { try { this.devices[id]?.userData.highlightSlot?.(null); } catch (e) { /* ignore */ } }
  }

  // ---------- 状态 ----------
  setStatus(id, st) { if (!STATUS[st]) return; const g = this.devices[id]; if (!g) { if (deviceById[id]) { deviceById[id].status = st; this.emit('status', id, st); } return; } setDevStatus(g, st); deviceById[id].status = st; this.refreshLabel(id); this.emit('status', id, st); }
  getStatus(id) { return this.devices[id]?.userData.status || deviceById[id]?.status; }
  setLabels(on) { this.labels.visible = on; }
  setFlow(on) { this.flowOn = on; }

  // ---------- 主循环 ----------
  loop() {
    if (!this.running) { this._raf = 0; return; }
    if (this.lowGpu) this._loopDelay = setTimeout(() => { this._loopDelay = 0; this._raf = requestAnimationFrame(this.loop); }, 250);
    else this._raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.1); this.t += dt; const t = this.t;
    const nowS = performance.now() / 1000, realDt = Math.min(0.6, nowS - (this._lastNow || nowS)); this._lastNow = nowS;
    if (this.tween) {
      const tw = this.tween; tw.t += realDt; const k = ease(Math.min(1, tw.t / tw.dur));
      this.camera.position.lerpVectors(tw.p0, tw.p1, k); this.controls.target.lerpVectors(tw.t0, tw.t1, k);
      if (k >= 1) this.tween = null;
    }
    if (this.autoRotate && !this.tween) { const c = this.controls; const off = this.camera.position.clone().sub(c.target); off.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.08); this.camera.position.copy(c.target).add(off); }
    this.controls.update();
    if (this.ceilLamps) this.ceilLamps.visible = this.camera.position.y < 8.0;
    this.updateStructureFade(dt);
    for (const g of Object.values(this.devices)) { const f = g.userData.animate; if (f) try { f(t, dt, g.userData.status); } catch (e) { g.userData.animate = null; console.warn(e); } }
    // 信号灯：故障闪烁
    for (const g of Object.values(this.devices)) if (g.userData.status === 'fault') { const L = g.userData.lamps?.red; if (L) L.material.emissiveIntensity = Math.sin(t * 8) > 0 ? 1.6 : 0.15; const ring = g.userData.ring; if (ring) ring.userData.fillMat.opacity = 0.12 + 0.12 * Math.sin(t * 5); }
    // 回流焊温区色带
    for (const L of ['L1', 'L2']) { const g = this.devices[L + '-RFL']; const strips = g?.userData.extra?.zoneStrips; if (strips && Math.floor(t * 4) !== g.userData._tz) { g.userData._tz = Math.floor(t * 4); strips.forEach((m, i) => { const T = reflowProfile(i, t, L); const c = tempColor(T); m.material.color.copy(c); m.material.emissive.copy(c); }); } }
    this.stepFlow(dt); this.stepAgvs(dt); this.stepStackers(dt);
    if (this.binMarker.visible) { this.binMarker.userData.fillMat.opacity = 0.25 + 0.2 * Math.sin(t * 5); }
    if (this.selected) this.updateSelBoxMaybe();
    this.renderer.render(this.scene, this.camera);
    this.updateLabelLod();
    if (this.size) this.labels.update(this.camera, this.size.w, this.size.h, this.getBlockers());
  }
  // 远景只显示产线/区域标签（故障/选中设备除外），拉近后显示单机标签，避免全景重叠
  updateLabelLod() {
    if (this.campusMode || !this.devLabels) return;
    const cam = this.camera.position;
    const tgt = this.controls?.target || this.lastTarget;
    const dist = tgt ? cam.distanceTo(tgt.isVector3 ? tgt : new THREE.Vector3(...(tgt.x != null ? [tgt.x, tgt.y, tgt.z] : tgt))) : cam.y;
    const far = cam.y >= 22 || dist >= 28;
    const mid = !far && cam.y >= 8;
    const look = this.controls?.target;
    const lineView = ['L1', 'L2', 'L3'].includes(this.currentView) ? this.currentView : null;
    for (const [id, it] of Object.entries(this.devLabels)) {
      const st = this.devices[id]?.userData.status;
      const keep = this.selected === id || this.hovered === id || (st === 'fault' && (!lineView || id.startsWith(lineView + '-')));
      const lineOf = (id.split('-')[0] || '');
      if (lineView && lineOf !== lineView && this.selected !== id && this.hovered !== id) { it.hidden = true; continue; }
      if (far) it.hidden = !keep;
      else if (mid && look) {
        const g = this.devices[id];
        const p = g.getWorldPosition(new THREE.Vector3());
        it.hidden = !keep && p.distanceTo(look) > 16;
      } else it.hidden = false;
    }
    for (const it of this.lineLabels || []) it.hidden = false;
  }


  // 产线/区域近景：屋顶横梁、桁架、檩条淡到 ≤0.1；过近立柱同样淡出。园区全景与车间全景保持实色。
  updateStructureFade(dt = 0.016) {
    const cam = this.camera.position;
    const hall = this.hall;
    const inside = hall && cam.x > HALL.x0 - 2 && cam.x < HALL.x1 + 2 && cam.z > HALL.z0 - 2 && cam.z < HALL.z1 + 2;
    const overview = this.campusMode || this.currentView === 'hall' || this.currentView === 'campus' || cam.y >= 28;
    const fade = !overview && (inside || cam.y < HALL.h + 8);
    const roofOp = fade ? 0.08 : 1;
    const k = Math.min(1, dt * 6);
    const setOp = (mesh, target) => {
      if (!mesh || !mesh.material) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach(m => {
        const cur = m.transparent ? (m.opacity ?? 1) : 1;
        const next = cur + (target - cur) * k;
        const fadeOut = !(next > 0.98 && target >= 0.99);
        const trans = fadeOut;
        const dw = fadeOut ? next > 0.5 : true;
        const op = fadeOut ? next : 1;
        if (m.transparent !== trans || m.depthWrite !== dw) {
          m.transparent = trans; m.depthWrite = dw; m.needsUpdate = true;
        }
        m.opacity = op;
      });
      if (mesh.castShadow != null) mesh.castShadow = target > 0.5 || (mats[0].opacity ?? 1) > 0.5;
    };
    if (this.hallStructure) this.hallStructure.traverse(o => { if (o.isMesh) setOp(o, roofOp); });
    if (this.hallMidCols) {
      this.hallMidCols.children.forEach(o => {
        if (!o.isMesh) return;
        const hz = Math.hypot(o.position.x - cam.x, o.position.z - cam.z);
        setOp(o, fade && hz < 16 ? 0.08 : (fade ? 0.35 : 1));
      });
    }
    if (this.hallWallCols) {
      this.hallWallCols.children.forEach(o => {
        if (!o.isMesh) return;
        const hz = Math.hypot(o.position.x - cam.x, o.position.z - cam.z);
        setOp(o, fade && hz < 8 ? 0.08 : 1);
      });
    }
  }
  // 标签避让：页面上悬浮卡片区域（相对三维容器坐标），每 400ms 刷新
  getBlockers() {
    const now = performance.now(); if (this._blk && now - this._blkT < 400) return this._blk;
    const host = this.mounted, sel = this.blockerSelector; let out = [];
    if (host && sel) { const r0 = host.getBoundingClientRect(); const root = host.parentElement || host; root.querySelectorAll(sel).forEach(e => { if (e.hidden || !e.offsetParent) return; const r = e.getBoundingClientRect(); out.push({ x: r.left - r0.left, y: r.top - r0.top, w: r.width, h: r.height }); }); }
    this._blk = out; this._blkT = now; return out;
  }
  updateSelBoxMaybe() { const g = this.devices[this.selected]; if (g && (deviceById[this.selected].type === 'agv' || deviceById[this.selected].type === 'stacker')) this.updateSelBox(); }
  stepAgvs(dt) {
    const moving = this.agvs.filter(a => a.pts && this.devices[a.id].userData.status === 'run');
    for (const a of moving) {
      const ns = a.s + a.speed * dt, p = this.agvAt(a, ns);
      const dir = new THREE.Vector2(Math.cos(a.ang ?? 0), -Math.sin(a.ang ?? 0));
      let blocked = false;
      for (const b of this.agvs) {
        if (b === a) continue; const dx = b.g.position.x - p.x, dz = b.g.position.z - p.z, dist = Math.hypot(dx, dz);
        if (dist < 1.7 && (dx * dir.x + dz * dir.y) > 0.2) {
          const bdir = new THREE.Vector2(Math.cos(b.ang ?? 0), -Math.sin(b.ang ?? 0));
          const mutual = -(dx * bdir.x + dz * bdir.y) > 0.2 && moving.includes(b);
          if (!mutual || this.agvs.indexOf(a) > this.agvs.indexOf(b)) { blocked = true; break; }
        }
      }
      if (!blocked) this.placeAgv(a, ns);
    }
  }
  stepStackers(dt) {
    for (const s of this.stackers) {
      if (s.g.userData.status !== 'run' && !s.hold) continue;
      const dx = s.tx - s.x, dy = s.ty - s.y;
      if (Math.abs(dx) < 0.02 && Math.abs(dy) < 0.02) {
        if (s.hold) { s.hold -= dt; if (s.hold <= 0) s.hold = 0; continue; }
        s.wait -= dt; if (s.wait <= 0) { s.tx = 0.3 + Math.random() * (RACK_LEN + 1.5); s.ty = BASE_Y + Math.floor(Math.random() * WHCFG.levels) * LEVEL_H + 0.1; s.wait = 1.5; }
      }
      s.x += Math.sign(dx) * Math.min(Math.abs(dx), dt * 1.6); s.y += Math.sign(dy) * Math.min(Math.abs(dy), dt * 0.7);
      s.g.position.x = this.whOrigin.x + s.x; if (s.car) s.car.position.y = Math.max(0.35, s.y);
    }
  }
  snapshot() { this.renderer.render(this.scene, this.camera); return this.renderer.domElement.toDataURL('image/png'); }
}
function reflowProfile(i, t, L) { const base = [125, 150, 168, 180, 192, 205, 228, 248, 243, 225, 110, 58]; return base[i] + Math.sin(t * 0.7 + i + (L === 'L2' ? 1 : 0)) * 2.5; }
export function reflowZoneTemps(L, t = performance.now() / 1000) { return Array.from({ length: REFLOW_ZONES }, (_, i) => +reflowProfile(i, t, L).toFixed(1)); }
function skyTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 512; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#cfe3f7'); gr.addColorStop(0.55, '#e8f1fa'); gr.addColorStop(1, '#f6f9fc');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
let _world = null;
export function getWorld() { return (_world ||= new World()); }
