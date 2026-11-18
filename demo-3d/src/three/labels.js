// 三维 HTML 标签层：每帧投影 + 贪心避让（上移错层、带引线），保证标签互不遮挡
import * as THREE from 'three';
const _v = new THREE.Vector3();
export class LabelLayer {
  constructor() {
    this.el = document.createElement('div'); this.el.className = 'w3-labels';
    this.items = []; this.visible = true;
  }
  add({ id, html, anchor, priority = 0, cls = '' }) {
    const wrap = document.createElement('div'); wrap.className = 'w3-label ' + cls;
    wrap.innerHTML = `<div class="w3-label-box">${html}</div><div class="w3-label-stem"></div>`;
    this.el.appendChild(wrap);
    const it = { id, wrap, box: wrap.firstChild, stem: wrap.lastChild, anchor, priority, w: 0, h: 0, dirty: true, hidden: false };
    this.items.push(it); return it;
  }
  remove(it) { it.wrap.remove(); this.items = this.items.filter(x => x !== it); }
  setHtml(it, html) { if (it.html !== html) { it.box.innerHTML = html; it.html = html; it.dirty = true; } }
  update(camera, width, height, blockers = []) {
    if (!this.visible) { this.el.style.display = 'none'; return; }
    this.el.style.display = '';
    const placed = blockers.map(b => ({ ...b, blocker: true }));
    const list = [];
    for (const it of this.items) {
      if (it.hidden) { it.wrap.style.display = 'none'; continue; }
      const p = typeof it.anchor === 'function' ? it.anchor() : it.anchor;
      _v.copy(p).project(camera);
      if (_v.z > 1 || _v.z < -1 || Math.abs(_v.x) > 1.1 || Math.abs(_v.y) > 1.1) { it.wrap.style.display = 'none'; continue; }
      it.wrap.style.display = '';
      if (it.dirty || !it.w) { it.w = it.box.offsetWidth; it.h = it.box.offsetHeight; it.dirty = false; }
      list.push({ it, sx: (_v.x + 1) / 2 * width, sy: (1 - _v.y) / 2 * height, depth: _v.z });
    }
    list.sort((a, b) => (b.it.priority - a.it.priority) || (a.depth - b.depth));
    const pad = 4;
    for (const L of list) {
      const { it, sx, sy } = L; let ok = false, stem = 10;
      for (let k = 0; k < 10; k++) {
        const r = { x: sx - it.w / 2, y: sy - stem - it.h, w: it.w, h: it.h };
        if (r.x < 2 || r.x + r.w > width - 2 || r.y < 2) { if (r.y < 2) break; }
        if (!placed.some(q => r.x < q.x + q.w + pad && r.x + r.w + pad > q.x && r.y < q.y + q.h + pad && r.y + r.h + pad > q.y)) { placed.push(r); ok = true; break; }
        stem += it.h * 0.75 + 4;
      }
      if (!ok && it.priority < 10) { it.wrap.style.display = 'none'; continue; }
      it.wrap.style.transform = `translate(${Math.round(sx - it.w / 2)}px, ${Math.round(sy - stem - it.h)}px)`;
      it.stem.style.height = stem + 'px'; it.stem.style.left = Math.round(it.w / 2) + 'px';
    }
  }
}
