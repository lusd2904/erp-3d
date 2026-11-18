// 线框图标（SVG）
const P = {
  cockpit: '<path d="M3 13a9 9 0 1 1 18 0"/><path d="M12 13l4-5"/><circle cx="12" cy="13" r="1.6"/><path d="M5 19h14"/>',
  cube: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 22V12M21 7l-9 5-9-5"/>',
  order: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  bom: '<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="18" r="2.2"/><path d="M12 7v4M12 11H5v5M12 11h7v5"/>',
  plan: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M7 13h5M7 17h9"/>',
  stock: '<path d="M3 21V8l9-5 9 5v13"/><path d="M7 21v-8h10v8M7 17h10"/>',
  quality: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  trace: '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M7 6h10M6 8l5 8M18 8l-5 8"/>',
  report: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  pick: '<path d="M4 7h16l-1.5 13h-13z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
  task: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
  default: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 12h6M12 9v6"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9z"/>',
  back: '<path d="M15 18l-6-6 6-6"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>', target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>',
  volume: '<path d="M4 9v6h4l5 5V4L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9.5 9.5 0 0 1 0 14"/>',
  mute: '<path d="M4 9v6h4l5 5V4L8 9H4z"/><path d="M22 9l-6 6M16 9l6 6"/>',
  logout: '<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/>',
  wrench: '<path d="M14.7 6.3a4.5 4.5 0 0 0-6.2 6.2L3 18l3 3 5.5-5.5a4.5 4.5 0 0 0 6.2-6.2L16 11l-3-3 1.7-1.7z"/>',
};

const ALIAS = { sales: 'order', so: 'order', orders: 'order', material: 'bom', materials: 'bom', mo: 'plan', production: 'plan', workorder: 'plan', inventory: 'stock', warehouse: 'stock', qc: 'quality', traceability: 'trace', reports: 'report', issue: 'pick', picking: 'pick' };
export function icon(name, size = 18) {
  const k = P[name] ? name : P[ALIAS[name]] ? ALIAS[name] : null;
  if (!k && name && [...name].length <= 2) return `<span class="ico-text" style="font-size:${size - 2}px">${name}</span>`;
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${P[k || 'default']}</svg>`;
}
