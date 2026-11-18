// 线B 业务模块公共 UI 工具：样式(.bm 作用域)、页头、KPI、筛选栏、分页表格、抽屉、流程条、图表
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (n, d = 0) => (n == null || n === '' || Number.isNaN(+n)) ? '—' : (+n).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });
export const big = (n, d = 1) => { n = +n; const a = Math.abs(n); if (a >= 1e8) return [(n / 1e8).toFixed(d), '亿']; if (a >= 1e4) return [(n / 1e4).toFixed(d), '万']; return [fmt(n, n % 1 ? 1 : 0), '']; };
export const bigStr = (n, d = 1) => big(n, d).join('');
export const pct = (v, d = 1) => v == null || Number.isNaN(v) ? '—' : `${(+v).toFixed(d)}%`;
export const el = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

export const ICON = {
  base: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>',
  sales: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>',
  mo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  bom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/></svg>',
  kit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
  pick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg>',
  report: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18"/><rect x="5" y="11" width="3" height="7"/><rect x="10.5" y="7" width="3" height="11"/><rect x="16" y="4" width="3" height="14"/></svg>',
  instock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-6 9 6v10H3z"/><path d="M12 10v7M9 14l3 3 3-3"/></svg>',
  stock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  quality: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
  trace: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M7 6h10M6 8l5 8.3M18 8l-5 8.3"/></svg>',
  table: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10M15 10v10"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5z"/><path d="M3 8v8l9 5 9-5V8"/></svg>',
  cube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 12l9-5M12 12v10M12 12L3 7"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  export: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4"/></svg>',
};

// 外壳 icons.js 的图标名 → 本文件图标
export const ICON_KEY = { order: 'sales', plan: 'mo', bom: 'bom', task: 'kit', pick: 'pick', report: 'report', stock: 'stock', quality: 'quality', trace: 'trace', cube: 'cube' };
const CSS = `
.bm{--p:var(--primary,#1677ff);--p2:var(--primary-2,#0fb5c9);--pl:var(--primary-light,#e8f2ff);--tx:var(--text,#1f2a3d);--tx2:var(--text-2,#56637a);--tx3:var(--text-3,#8a96a8);
 --bd:var(--border,#e3e8f0);--bd2:var(--border-2,#d3dbe7);--bgc:var(--bg,#f3f6fa);--ok:var(--success,#16b364);--wn:var(--warning,#f5a623);--er:var(--danger,#f04438);--in:var(--info,#2e90fa);
 --rd:var(--radius,10px);--sh:var(--shadow,0 2px 10px rgba(31,58,105,.07));--shl:var(--shadow-lg,0 8px 28px rgba(31,58,105,.13));--mono:'DIN Alternate','Roboto Mono','SFMono-Regular',Consolas,monospace;
 position:relative;height:100%;min-height:0;width:100%;display:flex;flex-direction:column;overflow:hidden;background:var(--bgc);color:var(--tx);
 font-family:'PingFang SC','Microsoft YaHei','Noto Sans CJK SC','Noto Sans SC',sans-serif;font-size:13px;line-height:1.5;-webkit-font-smoothing:antialiased;text-align:left}
.bm *{box-sizing:border-box}
.bm-body{flex:1;overflow:hidden;padding:14px 16px 12px;display:flex;flex-direction:column;gap:12px;min-height:0}
.bm-body>*{flex-shrink:0}
.bm-body>.bm-fill,.bm-body>.bm-split,.bm-body>.bm-out{flex:1 1 0;min-height:0;flex-shrink:1;overflow:hidden}
.bm-fill{display:flex;flex-direction:column;min-height:0}
.bm-fill>.bm-tabs,.bm-fill>.bm-filter{flex:none}
.bm-grow{flex:1 1 0;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.bm-dock{flex:none;min-height:0}
@media (max-height:900px){
  .bm-dock .ch,.bm-dock .pie,.bm-dock .load,.bm-dock .gantt{height:168px!important}
  .bm-head{padding:8px 16px 6px}
  .bm-body{padding:10px 16px 8px;gap:8px}
  .bm-kpi{padding:8px 12px 8px}
  .bm-kpi .kv{font-size:18px}
  .bm-kpi .ks{display:none}
  .bm-kpis{gap:8px}
}
.bm-head{display:flex;align-items:center;gap:14px;padding:12px 16px 10px;background:linear-gradient(100deg,#fff 0%,#f5f9ff 60%,#eef7fb 100%);border-bottom:1px solid var(--bd);flex:none}
.bm-head .ic{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--p),var(--p2));box-shadow:0 4px 10px rgba(22,119,255,.25);flex:none}
.bm-head .ic svg{width:19px;height:19px}
.bm-head h2{margin:0;font-size:17px;font-weight:650;letter-spacing:.5px;color:var(--tx);display:flex;align-items:center;gap:8px}
.bm-crumb{font-size:12px;color:var(--tx3);margin-top:1px}.bm-crumb b{color:var(--tx2);font-weight:500}
.bm-head .sp{flex:1}
.bm-demo{display:inline-flex;align-items:center;gap:4px;padding:0 8px;height:20px;border-radius:4px;font-size:12px;font-weight:600;color:#d46b08;background:#fff7e6;border:1px dashed #ffc069;white-space:nowrap}
.bm-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;height:30px;padding:0 12px;border-radius:6px;border:1px solid var(--bd2);background:#fff;color:var(--tx);font-size:13px;font-family:inherit;cursor:pointer;transition:.15s;white-space:nowrap}
.bm-btn svg{width:14px;height:14px}.bm-btn:hover{border-color:var(--p);color:var(--p)}
.bm-btn.pri{background:var(--p);border-color:var(--p);color:#fff}.bm-btn.pri:hover{filter:brightness(1.08);color:#fff}
.bm-btn.sm{height:24px;padding:0 8px;font-size:12px}.bm-btn.ghost{border-color:transparent;background:transparent;color:var(--p)}.bm-btn.ghost:hover{background:var(--pl)}
.bm-btn.danger{color:var(--er);border-color:#fcc9c5}.bm-btn[disabled]{opacity:.45;cursor:not-allowed;pointer-events:none}
.bm-link{color:var(--p);cursor:pointer;text-decoration:none;font-family:var(--mono);font-size:12.5px}.bm-link:hover{text-decoration:underline}
.bm-link.dev{display:inline-flex;align-items:center;gap:3px;font-family:inherit;padding:0 6px;border-radius:4px;background:#eef5ff;border:1px solid #d6e6ff}
.bm-link.dev svg{width:12px;height:12px}
.bm-card{background:#fff;border:1px solid var(--bd);border-radius:var(--rd);box-shadow:var(--sh);padding:12px 14px;min-width:0;display:flex;flex-direction:column}
.bm-ct{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;margin:0 0 10px;color:var(--tx);min-height:24px}
.bm-ct::before{content:"";width:4px;height:14px;border-radius:2px;background:linear-gradient(var(--p),var(--p2));flex:none}
.bm-ct .ex{margin-left:auto;font-weight:400;font-size:12px;color:var(--tx3);display:flex;align-items:center;gap:6px}
.bm-grid{display:grid;gap:12px;min-width:0}
.bm-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.bm-kpi{position:relative;background:#fff;border:1px solid var(--bd);border-radius:var(--rd);box-shadow:var(--sh);padding:12px 14px 11px;display:flex;gap:12px;align-items:center;overflow:hidden}
.bm-kpi::after{content:"";position:absolute;right:-18px;top:-18px;width:70px;height:70px;border-radius:50%;background:var(--kc,#1677ff);opacity:.06}
.bm-kpi .ki{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;color:var(--kc,#1677ff);background:color-mix(in srgb,var(--kc,#1677ff) 12%,#fff);flex:none}
.bm-kpi .ki svg{width:21px;height:21px}
.bm-kpi .kl{font-size:12px;color:var(--tx2);white-space:nowrap}
.bm-kpi .kv{font-family:var(--mono);font-size:22px;font-weight:700;color:var(--tx);line-height:1.2;display:flex;align-items:baseline;flex-wrap:wrap;column-gap:3px;min-width:0}
.bm-kpi .kv small{font-size:12px;font-weight:500;color:var(--tx3);font-family:inherit;flex:none}
@media (max-width:1500px){.bm-kpi .kv{font-size:18px}}
.bm-kpi .ks{font-size:11.5px;color:var(--tx3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bm-kpi .up{color:var(--ok)}.bm-kpi .down{color:var(--er)}
.bm-tag{display:inline-flex;align-items:center;gap:4px;padding:0 7px;border-radius:4px;font-size:12px;line-height:20px;border:1px solid transparent;white-space:nowrap;font-weight:500}
.bm-tag.success{background:#e7f8ef;color:#0f9d58;border-color:#bfe9d2}.bm-tag.warning{background:#fff5e1;color:#c47f00;border-color:#fde2ae}
.bm-tag.danger{background:#feeceb;color:#e03126;border-color:#fcc9c5}.bm-tag.info{background:#e8f3ff;color:#1677ff;border-color:#c6e0fd}
.bm-tag.default{background:#f2f4f7;color:var(--tx2);border-color:var(--bd)}.bm-tag.purple{background:#f1edff;color:#6941c6;border-color:#d9cdfe}
.bm-tag.cyan{background:#e6f9fb;color:#088a9b;border-color:#b5eaf1}.bm-tag.bm-dotted::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.bm-tabs{display:flex;gap:2px;border-bottom:1px solid var(--bd);margin:-2px 0 10px;flex:none;overflow-x:auto}
.bm-tab{padding:7px 14px;font-size:13px;color:var(--tx2);cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;display:flex;align-items:center;gap:6px}
.bm-tab:hover{color:var(--p)}.bm-tab.on{color:var(--p);border-bottom-color:var(--p);font-weight:600}
.bm-tab .n{font-size:11px;padding:0 6px;border-radius:9px;background:#eef2f7;color:var(--tx2);font-weight:500;font-family:var(--mono)}.bm-tab.on .n{background:var(--pl);color:var(--p)}
.bm-filter{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.bm-filter label{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--tx2);white-space:nowrap}
.bm-in,.bm-sel{height:30px;padding:0 10px;border:1px solid var(--bd2);border-radius:6px;font-family:inherit;font-size:13px;outline:none;background:#fff;color:var(--tx)}
.bm-sel{padding-right:6px;min-width:110px}.bm-in:focus,.bm-sel:focus{border-color:var(--p);box-shadow:0 0 0 3px rgba(22,119,255,.12)}
.bm-search{position:relative}.bm-search svg{position:absolute;left:9px;top:8px;width:14px;height:14px;color:var(--tx3)}.bm-search .bm-in{padding-left:29px;width:230px}
.bm-seg{display:inline-flex;border:1px solid var(--bd2);border-radius:6px;overflow:hidden;background:#fff}
.bm-seg span{padding:0 11px;line-height:28px;font-size:12.5px;color:var(--tx2);cursor:pointer;border-right:1px solid var(--bd)}.bm-seg span:last-child{border-right:0}
.bm-seg span.on{background:var(--pl);color:var(--p);font-weight:600}
.bm-filter .sp{flex:1}.bm-filter .cnt{font-size:12px;color:var(--tx3)}
.bm-tw{border:1px solid var(--bd);border-radius:8px;overflow:auto;position:relative;background:#fff}
.bm-t{width:100%;border-collapse:separate;border-spacing:0;font-size:12.5px}
.bm-t th{position:sticky;top:0;z-index:2;background:#f5f7fb;color:var(--tx2);font-weight:600;text-align:left;padding:8px 10px;border-bottom:1px solid var(--bd);white-space:nowrap;user-select:none}
.bm-t th.s{cursor:pointer}.bm-t th.s:hover{color:var(--p)}.bm-t th .ar{font-size:10px;color:var(--tx3);margin-left:3px}
.bm-t td{padding:7px 10px;border-bottom:1px solid #eef1f6;color:var(--tx);white-space:nowrap;vertical-align:middle}
.bm-t tbody tr{cursor:default;transition:background .12s}.bm-t.click tbody tr{cursor:pointer}
.bm-t tbody tr:nth-child(even) td{background:#fbfcfe}.bm-t tbody tr:hover td{background:#f0f6ff}.bm-t tbody tr.on td{background:#e6f0ff}
.bm-t td.r,.bm-t th.r{text-align:right}.bm-t td.c,.bm-t th.c{text-align:center}.bm-t .n{font-family:var(--mono);font-variant-numeric:tabular-nums}
.bm-t td.wrap{white-space:normal;min-width:160px}.bm-t .mut{color:var(--tx3)}.bm-t .em{color:var(--er);font-weight:600}
.bm-t tfoot td{position:sticky;bottom:0;background:#f7f9fc;font-weight:600;border-top:1px solid var(--bd)}
.bm-empty{padding:36px;text-align:center;color:var(--tx3)}
.bm-pg{display:flex;align-items:center;justify-content:flex-end;gap:6px;padding:8px 2px 0;font-size:12px;color:var(--tx2);flex:none}
.bm-pg .pb{min-width:26px;height:26px;padding:0 6px;border:1px solid var(--bd2);border-radius:5px;background:#fff;display:grid;place-items:center;cursor:pointer;font-family:var(--mono)}
.bm-pg .pb.on{background:var(--p);border-color:var(--p);color:#fff}.bm-pg .pb.dis{opacity:.4;pointer-events:none}.bm-pg .tot{margin-right:auto;color:var(--tx3)}
.bm-bar{display:flex;align-items:center;gap:8px;min-width:120px}.bm-bar i{flex:1;height:6px;border-radius:3px;background:#edf1f7;overflow:hidden;position:relative;display:block}
.bm-bar i b{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:linear-gradient(90deg,var(--p),var(--p2))}
.bm-bar i b.ok{background:linear-gradient(90deg,#16b364,#5fd39a)}.bm-bar i b.wn{background:linear-gradient(90deg,#f5a623,#fbc76b)}.bm-bar i b.er{background:linear-gradient(90deg,#f04438,#f97a70)}
.bm-bar em{font-style:normal;font-family:var(--mono);font-size:12px;color:var(--tx2);width:44px;text-align:right}
.bm-steps{display:flex;align-items:flex-start;margin:4px 0 6px;padding:10px 6px 4px}
.bm-step{flex:1;position:relative;text-align:center;font-size:12px;color:var(--tx3)}
.bm-step::before{content:"";position:absolute;top:11px;left:-50%;right:50%;height:2px;background:#e3e8f0}.bm-step:first-child::before{display:none}
.bm-step .cir{position:relative;z-index:1;width:24px;height:24px;margin:0 auto 5px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:600;background:#fff;border:2px solid #d3dbe7;color:var(--tx3);font-family:var(--mono)}
.bm-step .cir svg{width:13px;height:13px}
.bm-step.done{color:var(--tx2)}.bm-step.done::before{background:var(--p)}.bm-step.done .cir{background:var(--p);border-color:var(--p);color:#fff}
.bm-step.cur{color:var(--p);font-weight:600}.bm-step.cur::before{background:var(--p)}.bm-step.cur .cir{border-color:var(--p);color:var(--p);box-shadow:0 0 0 4px rgba(22,119,255,.14)}
.bm-step.err .cir{border-color:var(--er);color:var(--er)}.bm-step .sd{font-size:11px;color:var(--tx3);font-weight:400;font-family:var(--mono)}
.bm-mask{position:absolute;inset:0;background:rgba(20,35,60,.18);z-index:40;opacity:0;transition:opacity .2s}.bm-mask.in{opacity:1}
.bm-drawer{position:absolute;top:0;right:0;bottom:0;width:min(760px,92%);background:#fff;z-index:41;box-shadow:-10px 0 30px rgba(31,58,105,.16);display:flex;flex-direction:column;transform:translateX(102%);transition:transform .24s cubic-bezier(.2,.8,.2,1)}
.bm-drawer.in{transform:none}
.bm-dh{display:flex;align-items:flex-start;gap:10px;padding:14px 18px 12px;border-bottom:1px solid var(--bd);background:linear-gradient(100deg,#fff,#f4f8ff)}
.bm-dh h3{margin:0;font-size:16px;font-weight:650;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.bm-dh .sub{font-size:12px;color:var(--tx3);margin-top:3px}
.bm-dh .x{margin-left:auto;width:28px;height:28px;border-radius:6px;display:grid;place-items:center;cursor:pointer;color:var(--tx2);flex:none}.bm-dh .x:hover{background:#eef2f7}.bm-dh .x svg{width:16px;height:16px}
.bm-db{flex:1;overflow:auto;padding:14px 18px 18px;display:flex;flex-direction:column;gap:12px}
.bm-df{display:flex;gap:8px;justify-content:flex-end;padding:10px 18px;border-top:1px solid var(--bd);background:#fafbfd}
.bm-sec{font-size:13px;font-weight:600;color:var(--tx);display:flex;align-items:center;gap:6px;margin:2px 0 -4px}.bm-sec::before{content:"";width:3px;height:12px;background:var(--p);border-radius:2px}
.bm-desc{display:grid;grid-template-columns:repeat(var(--cols,3),minmax(0,1fr));border:1px solid var(--bd);border-radius:8px;overflow:hidden}
.bm-desc>div{display:flex;border-bottom:1px solid #eef1f6;min-width:0}.bm-desc dt{width:86px;flex:none;background:#f7f9fc;color:var(--tx2);padding:7px 10px;font-size:12px;border-right:1px solid #eef1f6}
.bm-desc dd{margin:0;padding:7px 10px;font-size:12.5px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
.bm-note{font-size:12px;color:var(--tx2);background:#f7f9fc;border:1px solid var(--bd);border-radius:6px;padding:8px 10px}
.bm-note.warn{background:#fffaf0;border-color:#fde2ae;color:#9a6200}.bm-note.err{background:#fff5f4;border-color:#fcc9c5;color:#b42318}.bm-note.ok{background:#f0fbf5;border-color:#bfe9d2;color:#0f7a45}
.bm-chart{width:100%;height:100%;min-height:160px}
.bm-toastx{position:absolute;left:50%;top:70px;transform:translateX(-50%);z-index:60;background:#fff;border:1px solid var(--bd);box-shadow:var(--shl);padding:8px 16px;border-radius:8px;font-size:13px}
.bm-tl{position:relative;padding-left:18px}.bm-tl>div{position:relative;padding:0 0 12px 6px;font-size:12.5px}
.bm-tl>div::before{content:"";position:absolute;left:-14px;top:5px;width:8px;height:8px;border-radius:50%;background:#fff;border:2px solid var(--p)}
.bm-tl>div::after{content:"";position:absolute;left:-10px;top:15px;bottom:-3px;width:1px;background:#dbe3ee}.bm-tl>div:last-child::after{display:none}
.bm-tl .t{color:var(--tx3);font-family:var(--mono);font-size:11.5px}
.bm-mono{font-family:var(--mono)}
`;
export function injectStyles(id, css) {
  if (!document.getElementById('bm-style-core')) { const s = document.createElement('style'); s.id = 'bm-style-core'; s.textContent = CSS; document.head.appendChild(s); }
  if (id && css && !document.getElementById(id)) { const s = document.createElement('style'); s.id = id; s.textContent = css; document.head.appendChild(s); }
}

const TONE = {
  计划: 'default', 计划确认: 'cyan', 下达: 'info', 开工: 'warning', 完工: 'success', 结案: 'purple',
  已审核: 'success', 审核中: 'warning', 已保存: 'default', 待审核: 'warning', 已关闭: 'default', 部分出货: 'cyan', 生产中: 'warning', 已出货: 'success',
  合格: 'success', 不合格: 'danger', 拒收: 'danger', 让步接收: 'warning', 待检: 'info', 检验中: 'info', '免检(自制)': 'default', 免检: 'default',
  正常: 'success', 预警: 'warning', 缺料: 'danger', 齐套: 'success', 部分齐套: 'warning', 待返工: 'warning', 待上架: 'info', '冻结-待退供': 'danger',
  领料: 'info', 补料: 'warning', 退料: 'cyan', 合格品入库: 'success', 不合格品入库: 'danger', 退库: 'warning', 普通生产: 'default', 返工生产: 'purple',
  正常汇报: 'success', 设备故障: 'danger', 欠料停线: 'warning', 换线调机: 'info', 来料不良: 'purple', 品质异常: 'danger', 高: 'danger', 中: 'warning', 低: 'default', 交期紧: 'danger',
  合格品: 'success', 不合格品: 'danger', run: 'success', idle: 'warning', fault: 'danger', maint: 'info',
};
export const tag = (t, tone, dot) => `<span class="bm-tag ${tone || TONE[t] || 'default'}${dot ? ' bm-dotted' : ''}">${esc(t)}</span>`;
export const bar = (v, tone) => { const p = Math.max(0, Math.min(100, v)); const c = tone || (p >= 100 ? 'ok' : p < 30 ? 'wn' : ''); return `<div class="bm-bar"><i><b class="${c}" style="width:${p}%"></b></i><em>${p.toFixed(p % 1 && p < 100 ? 1 : 0)}%</em></div>`; };
export const devLink = (id, label) => `<a class="bm-link dev" data-dev="${esc(id)}" title="在三维场景中定位设备">${ICON.cube}${esc(label || id)}</a>`;
export const binLink = (id) => id ? `<a class="bm-link dev" data-bin="${esc(id)}" title="在三维立体仓库中定位库位">${ICON.pin}${esc(id)}</a>` : '<span class="mut">—</span>';
export const navLink = (mod, id, text) => `<a class="bm-link" data-nav="${esc(mod)}" data-id="${esc(id)}">${esc(text || id)}</a>`;

export function steps(labels, cur, opt = {}) {
  return `<div class="bm-steps">${labels.map((l, i) => { const st = i < cur ? 'done' : i === cur ? (opt.err ? 'cur err' : 'cur') : ''; const d = opt.dates && opt.dates[i] ? `<div class="sd">${esc(opt.dates[i])}</div>` : '';
    return `<div class="bm-step ${st}"><div class="cir">${i < cur ? ICON.check : i + 1}</div>${esc(l)}${d}</div>`; }).join('')}</div>`;
}
export const desc = (pairs, cols = 3) => `<dl class="bm-desc" style="--cols:${cols};margin:0">${pairs.map(([k, v, span]) => `<div style="${span ? `grid-column:span ${span}` : ''}"><dt>${esc(k)}</dt><dd title="${esc(String(v).replace(/<[^>]+>/g, ''))}">${v ?? '—'}</dd></div>`).join('')}</dl>`;
export const kpis = items => `<div class="bm-kpis">${items.map(k => `<div class="bm-kpi" style="--kc:${k.color || '#1677ff'}"><div class="ki">${ICON[k.icon] || ICON.box}</div><div style="min-width:0"><div class="kl">${esc(k.label)}</div><div class="kv">${k.value}<small>${esc(k.unit || '')}</small></div><div class="ks">${k.sub || ''}</div></div></div>`).join('')}</div>`;

// 页面骨架
export function page(container, ctx, o) {
  injectStyles(o.styleId, o.css);
  const root = el(`<div class="bm bm-${o.id}"><div class="bm-head"><div class="ic">${ICON[o.icon] || ICON[ICON_KEY[o.icon]] || ICON.mo}</div><div><h2>${esc(o.title)}</h2><div class="bm-crumb">${o.crumb.map((c, i) => i === o.crumb.length - 1 ? `<b>${esc(c)}</b>` : esc(c)).join(' / ')}${o.desc ? ` · ${esc(o.desc)}` : ''}</div></div><div class="sp"></div><div class="acts" style="display:flex;gap:8px"></div></div><div class="bm-body"></div></div>`);
  container.innerHTML = '';
  container.appendChild(root);
  const body = root.querySelector('.bm-body'); const acts = root.querySelector('.acts');
  const disposers = [];
  const P = {
    root, body, acts, ctx, disposers, alive: true,
    toast(msg) { if (ctx && typeof ctx.toast === 'function') return ctx.toast(msg); const t = el(`<div class="bm-toastx">${esc(msg)}</div>`); root.appendChild(t); const id = setTimeout(() => t.remove(), 2200); disposers.push(() => { clearTimeout(id); t.remove(); }); },
    timeout(fn, ms) { const id = setTimeout(() => { if (P.alive) fn(); }, ms); disposers.push(() => clearTimeout(id)); return id; },
    action(html, fn) { const b = el(html); b.addEventListener('click', fn); acts.appendChild(b); return b; },
    chart(node, option) { return makeChart(ctx, node, option, disposers); },
    on(target, type, fn, opt) { target.addEventListener(type, fn, opt); disposers.push(() => target.removeEventListener(type, fn, opt)); },
    destroy() { P.alive = false; root.querySelectorAll('.bm-filter').forEach(n => { try { n._destroy && n._destroy(); } catch (e) { /* noop */ } }); if (P._drawer) { try { P._drawer.close(true); } catch (e) { /* noop */ } } disposers.splice(0).forEach(f => { try { f(); } catch (e) { /* noop */ } }); root.remove(); },
  };
  // 统一委托：设备、库位、跨模块跳转
  P.on(root, 'click', e => {
    const d = e.target.closest('[data-dev]'); if (d) { e.stopPropagation(); if (ctx && ctx.focusDevice) ctx.focusDevice(d.dataset.dev); P.toast(`三维定位设备 ${d.dataset.dev}`); return; }
    const b = e.target.closest('[data-bin]'); if (b) { e.stopPropagation(); if (ctx && ctx.locateBin) ctx.locateBin(b.dataset.bin); P.toast(`三维定位库位 ${b.dataset.bin}`); return; }
    const n = e.target.closest('[data-nav]'); if (n) { e.stopPropagation(); e.preventDefault(); if (ctx && ctx.navigate) ctx.navigate(n.dataset.nav, { id: n.dataset.id }); return; }
  });
  return P;
}

// ECharts
const PALETTE = ['#1677ff', '#0fb5c9', '#16b364', '#f5a623', '#7a5af8', '#f04438', '#2e90fa', '#ee46bc', '#94a3b8'];
export const COLORS = PALETTE;
function makeChart(ctx, node, option, disposers) {
  if (node && node.__bmDestroy) node.__bmDestroy();
  const E = ctx && ctx.echarts; let inst = null;
  try {
    if (E && typeof E.init === 'function') inst = E.init(node, 'erpLight', { renderer: 'canvas' });
    else if (typeof E === 'function') { const r = E(node, 'erpLight'); inst = r && r.setOption ? r : r && r.init ? r.init(node, 'erpLight') : null; }
  } catch (err) { console.warn('[bm] echarts init failed', err); }
  if (!inst) { node.innerHTML = '<div class="bm-empty">图表组件未就绪</div>'; return null; }
  const base = { color: PALETTE, textStyle: { fontFamily: "'PingFang SC','Microsoft YaHei','Noto Sans CJK SC',sans-serif" }, animationDuration: 600 };
  inst.setOption({ ...base, ...option });
  let raf = 0, dead = false;
  const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { try { inst.resize(); } catch (e) { /* */ } }); }); ro.observe(node);
  const destroy = () => { if (dead) return; dead = true; if (node.__bmDestroy === destroy) node.__bmDestroy = null; ro.disconnect(); cancelAnimationFrame(raf); try { inst.dispose(); } catch (e) { /* */ } };
  node.__bmDestroy = destroy; inst.__bmDestroy = destroy;
  disposers.push(destroy);
  return inst;
}
export const axisStyle = { axisLine: { lineStyle: { color: '#d3dbe7' } }, axisTick: { show: false }, axisLabel: { color: '#56637a', fontSize: 11 }, splitLine: { lineStyle: { color: '#eef1f6', type: 'dashed' } } };
export const tip = (o = {}) => ({ trigger: 'axis', backgroundColor: 'rgba(255,255,255,.97)', borderColor: '#e3e8f0', textStyle: { color: '#1f2a3d', fontSize: 12 }, extraCssText: 'box-shadow:0 6px 18px rgba(31,58,105,.14);border-radius:8px', ...o });
export const legend = (o = {}) => ({ top: 0, right: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: '#56637a', fontSize: 11 }, ...o });

// Tabs
export function tabs(items, active, onChange) {
  const w = el(`<div class="bm-tabs">${items.map(t => `<div class="bm-tab${t.key === active ? ' on' : ''}" data-k="${esc(t.key)}">${esc(t.label)}${t.count != null ? `<span class="n">${t.count}</span>` : ''}</div>`).join('')}</div>`);
  w.addEventListener('click', e => { const t = e.target.closest('.bm-tab'); if (!t) return; w.querySelectorAll('.bm-tab').forEach(x => x.classList.toggle('on', x === t)); onChange(t.dataset.k); });
  return w;
}

// 筛选栏：fields [{key,type:'search'|'select'|'seg',label,placeholder,options:[v|{v,l}],value}]
export function filterBar(fields, onChange, extraRight = '') {
  const vals = {}; fields.forEach(f => { vals[f.key] = f.value ?? ''; });
  const opt = o => typeof o === 'object' ? o : { v: o, l: o };
  const w = el(`<div class="bm-filter">${fields.map(f => {
    if (f.type === 'search') return `<div class="bm-search">${ICON.search}<input class="bm-in" data-k="${f.key}" placeholder="${esc(f.placeholder || '搜索')}" value="${esc(vals[f.key])}"></div>`;
    if (f.type === 'seg') return `<div class="bm-seg" data-k="${f.key}">${f.options.map(opt).map(o => `<span data-v="${esc(o.v)}" class="${o.v === vals[f.key] ? 'on' : ''}">${esc(o.l)}</span>`).join('')}</div>`;
    return `<label>${esc(f.label || '')}<select class="bm-sel" data-k="${f.key}"><option value="">全部</option>${f.options.map(opt).map(o => `<option value="${esc(o.v)}"${o.v === vals[f.key] ? ' selected' : ''}>${esc(o.l)}</option>`).join('')}</select></label>`;
  }).join('')}<button class="bm-btn sm ghost" data-reset>重置</button><div class="sp"></div><span class="cnt"></span>${extraRight}</div>`);
  const fire = () => onChange({ ...vals });
  let tm; w.addEventListener('input', e => { const k = e.target.dataset.k; if (!k) return; vals[k] = e.target.value; clearTimeout(tm); tm = setTimeout(fire, 120); });
  w._destroy = () => clearTimeout(tm);
  w.addEventListener('change', e => { const k = e.target.dataset.k; if (!k || e.target.tagName !== 'SELECT') return; vals[k] = e.target.value; fire(); });
  w.addEventListener('click', e => {
    const s = e.target.closest('.bm-seg span'); if (s) { const seg = s.parentElement; seg.querySelectorAll('span').forEach(x => x.classList.toggle('on', x === s)); vals[seg.dataset.k] = s.dataset.v; fire(); return; }
    if (e.target.closest('[data-reset]')) { fields.forEach(f => { vals[f.key] = f.value ?? ''; }); w.querySelectorAll('[data-k]').forEach(n => { if (n.tagName === 'INPUT' || n.tagName === 'SELECT') n.value = vals[n.dataset.k]; else n.querySelectorAll('span').forEach(x => x.classList.toggle('on', x.dataset.v === vals[n.dataset.k])); }); fire(); }
  });
  w.setCount = t => { w.querySelector('.cnt').innerHTML = t; };
  w.values = () => ({ ...vals });
  return w;
}
export const match = (row, q, keys) => !q || keys.some(k => String(row[k] ?? '').toLowerCase().includes(q.toLowerCase()));

// 分页表格
export function table(o) {
  const st = { rows: o.rows || [], page: 1, size: o.pageSize || 12, sort: null, dir: 1, sel: o.selected || null };
  const w = el(`<div style="display:flex;flex-direction:column;min-height:0;${o.fill ? 'flex:1' : ''}"><div class="bm-tw" style="${o.maxHeight ? `max-height:${o.maxHeight}px` : ''}${o.fill ? ';flex:1' : ''}"><table class="bm-t${o.onRow ? ' click' : ''}"><thead></thead><tbody></tbody>${o.foot ? '<tfoot></tfoot>' : ''}</table></div>${o.pageSize === 0 ? '' : '<div class="bm-pg"></div>'}</div>`);
  const thead = w.querySelector('thead'), tbody = w.querySelector('tbody'), pg = w.querySelector('.bm-pg'), tfoot = w.querySelector('tfoot');
  const cols = o.columns;
  const renderHead = () => { thead.innerHTML = `<tr>${cols.map((c, i) => `<th data-i="${i}" class="${c.sort ? 's' : ''} ${c.align || ''}" style="${c.width ? `width:${c.width}px;min-width:${c.width}px` : ''}">${esc(c.title)}${c.sort ? `<span class="ar">${st.sort === i ? (st.dir > 0 ? '▲' : '▼') : '⇅'}</span>` : ''}</th>`).join('')}</tr>`; };
  const cell = (c, r) => { const v = c.render ? c.render(r) : esc(r[c.key] ?? '—'); return `<td class="${c.align || ''} ${c.num ? 'n' : ''} ${c.cls || ''}">${v}</td>`; };
  const key = r => o.rowKey ? r[o.rowKey] : null;
  function render() {
    let rows = st.rows.slice();
    if (st.sort != null) { const c = cols[st.sort]; const g = c.sortVal || (r => r[c.key]); rows.sort((a, b) => { const x = g(a), y = g(b); return (x > y ? 1 : x < y ? -1 : 0) * st.dir; }); }
    const total = rows.length; const pages = o.pageSize === 0 ? 1 : Math.max(1, Math.ceil(total / st.size)); st.page = Math.min(st.page, pages);
    const view = o.pageSize === 0 ? rows : rows.slice((st.page - 1) * st.size, st.page * st.size);
    tbody.innerHTML = view.length ? view.map((r, i) => `<tr data-i="${i}" class="${st.sel != null && key(r) === st.sel ? 'on' : ''}">${cols.map(c => cell(c, r)).join('')}</tr>`).join('') : `<tr><td colspan="${cols.length}"><div class="bm-empty">暂无符合条件的数据</div></td></tr>`;
    tbody._view = view;
    if (tfoot) tfoot.innerHTML = `<tr>${o.foot(rows).map((v, i) => `<td class="${cols[i] && cols[i].align || ''} n">${v ?? ''}</td>`).join('')}</tr>`;
    if (pg) {
      const btn = (p, t = p, cls = '') => `<span class="pb ${cls}${p === st.page && t === p ? ' on' : ''}" data-p="${p}">${t}</span>`;
      let nums = []; for (let p = 1; p <= pages; p++) if (p === 1 || p === pages || Math.abs(p - st.page) <= 1) nums.push(p); else if (nums[nums.length - 1] !== '…') nums.push('…');
      pg.innerHTML = `<span class="tot">共 <b class="bm-mono">${total}</b> 条</span>${btn(st.page - 1, '‹', st.page <= 1 ? 'dis' : '')}${nums.map(p => p === '…' ? '<span>…</span>' : btn(p)).join('')}${btn(st.page + 1, '›', st.page >= pages ? 'dis' : '')}<span>${st.size} 条/页</span>`;
    }
  }
  thead.addEventListener('click', e => { const th = e.target.closest('th.s'); if (!th) return; const i = +th.dataset.i; if (st.sort === i) st.dir = -st.dir; else { st.sort = i; st.dir = -1; } renderHead(); render(); });
  if (pg) pg.addEventListener('click', e => { const b = e.target.closest('.pb'); if (!b) return; st.page = +b.dataset.p; render(); });
  tbody.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-i]'); if (!tr) return; const r = tbody._view[+tr.dataset.i]; if (!r) return;
    const act = e.target.closest('[data-act]'); if (act && o.onAction) { e.stopPropagation(); o.onAction(act.dataset.act, r, act); return; }
    if (e.target.closest('[data-dev],[data-bin],[data-nav]')) return;
    if (o.onRow) { st.sel = key(r); tbody.querySelectorAll('tr').forEach(x => x.classList.toggle('on', x === tr)); o.onRow(r); }
  });
  renderHead(); render();
  w.setRows = rows => { st.rows = rows; st.page = 1; render(); };
  w.refresh = render;
  w.select = k => { st.sel = k; let rows = st.rows.slice(); if (st.sort != null) { const c = cols[st.sort]; const g = c.sortVal || (r => r[c.key]); rows.sort((a, b) => { const x = g(a), y = g(b); return (x > y ? 1 : x < y ? -1 : 0) * st.dir; }); } const idx = rows.findIndex(r => key(r) === k); if (idx >= 0 && o.pageSize !== 0) st.page = Math.floor(idx / st.size) + 1; render(); };
  return w;
}

// 抽屉（限定在模块根节点内）
export function drawer(P, o) {
  if (P._drawer && !P._drawer.closed) P._drawer.close(true);
  const mask = el('<div class="bm-mask"></div>');
  const d = el(`<div class="bm-drawer" style="${o.width ? `width:min(${o.width}px,94%)` : ''}"><div class="bm-dh"><div style="min-width:0"><h3>${o.title}</h3><div class="sub">${o.sub || ''}</div></div><div class="x" title="关闭">${ICON.close}</div></div><div class="bm-db"></div>${o.footer ? `<div class="bm-df">${o.footer}</div>` : ''}</div>`);
  P.root.append(mask, d);
  const db = d.querySelector('.bm-db');
  if (typeof o.body === 'string') db.innerHTML = o.body; else if (o.body) db.appendChild(o.body);
  let closed = false, closeTm = 0;
  const raf = requestAnimationFrame(() => { if (!closed) { mask.classList.add('in'); d.classList.add('in'); } });
  const close = (immediate) => {
    if (closed) return; closed = true; handle.closed = true;
    cancelAnimationFrame(raf); clearTimeout(closeTm);
    document.removeEventListener('keydown', key);
    if (immediate) { mask.remove(); d.remove(); }
    else { mask.classList.remove('in'); d.classList.remove('in'); closeTm = setTimeout(() => { mask.remove(); d.remove(); }, 240); }
    if (o.onClose) o.onClose();
  };
  const key = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', key);
  mask.addEventListener('click', () => close()); d.querySelector('.x').addEventListener('click', () => close());
  if (o.onFooter) d.querySelector('.bm-df')?.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) o.onFooter(b.dataset.f, close, b); });
  const handle = { el: d, body: db, close, closed: false };
  P._drawer = handle;
  return handle;
}

export const getParams = (ctx, extra) => (extra && typeof extra === 'object' ? extra : null) || (ctx && (ctx.params || (ctx.route && ctx.route.params))) || {};
