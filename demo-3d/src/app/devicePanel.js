// 设备详情弹窗（对齐 docs/design/设备详情弹窗.png），驾驶舱与三维车间共用
import { deviceById, STATUS, lines } from '../data/plant.js';
import { runtime, deviceDetail } from './runtime.js';
import { icon } from './icons.js';

const TYPE_NAME = { printer: '锡膏印刷机', spi: '3D 锡膏检测', mounter: '高速贴片机', reflow: '氮气回流焊炉', aoi: '3D AOI 光学检测', tester: '转塔测试分选机', taper: '转塔式编带机', asrs: '自动化立体仓库', stacker: '巷道堆垛机', agv: '激光导航 AGV', charger: 'AGV 自动充电桩', reelcab: '智能料塔', esdbench: '防静电工作台', loader: '上下板机', conveyor: '接驳台' };
const LV_TONE = { 严重: 'danger', 警告: 'warning', 提示: 'info' };
const ST_TONE = { 未处置: 'danger', 处置中: 'warning', 未处理: 'danger', 已处理: 'ok', 已处置: 'ok' };

function durSince(hhmm) {
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false });
  const [h, m] = fmt.format(new Date()).split(':').map(Number);
  const [sh, sm] = (hhmm || '14:06').split(':').map(Number);
  let mins = h * 60 + m - (sh * 60 + sm); if (mins < 0) mins += 1440;
  const hh = Math.floor(mins / 60), mm = mins % 60;
  return hh ? `${hh} 小时 ${mm} 分钟` : `${mm} 分钟`;
}
const fmt = n => Number(n).toLocaleString('zh-CN');

function openWorkOrder(ctx, wo) {
  if (!wo || !/^MO/i.test(wo)) { ctx?.toast?.(`当前无关联生产订单`); return; }
  if (ctx?.standalone) {
    const path = location.pathname + location.search + `#/mo?id=${encodeURIComponent(wo)}`;
    try { if (window.opener && !window.opener.closed) { window.opener.location.hash = `#/mo?id=${encodeURIComponent(wo)}`; window.opener.focus(); return; } } catch { /* ignore */ }
    window.open(path, '_blank');
    return;
  }
  ctx?.openWorkOrder?.(wo);
}

export function renderDevicePanel(el, id, { world, ctx, onClose, compact = false } = {}) {
  el.__cleanup?.(); el.__cleanup = null;
  const d = deviceById[id]; if (!d) { el.innerHTML = ''; return () => {}; }
  const rt = runtime.dev[id] || {}, st = (world?.getStatus?.(id) || d.status), S = STATUS[st];
  const line = lines.find(l => l.id === d.line);
  const det = deviceDetail(id, st);
  const moList = ctx?.data?.mos;
  const mo = moList && (moList.find(m => m.no === rt.wo) || moList.find(m => m.no === 'MO2611-0010' && id === 'L2-MNT1'));
  const qty = mo?.qty || 0, done = mo?.done || 0, pct = qty ? Math.min(100, Math.round(done / qty * 100)) : 0;
  const hasMo = !!(rt.wo && /^MO/i.test(rt.wo));
  const tone = st === 'run' ? 'success' : st === 'idle' ? 'warning' : st === 'fault' ? 'danger' : 'info';
  const yld = det.yld != null ? det.yld : (rt.yield != null ? rt.yield : null);
  const ringColor = st === 'fault' ? '#f04438' : st === 'idle' ? '#fb923c' : '#2563eb';
  const sumH = det.sumH || 24;
  const barH = (st, h) => { const lab = { run: '运行', idle: '待机', fault: '故障', maint: '保养' }[st]; return `<i class="tl-${st}" style="flex:${h}" title="${lab} ${h.toFixed(1)} h"></i>`; };
  const hoursSum = [
    ['运行', det.segs.filter(s => s.st === 'run').reduce((a, b) => a + b.h, 0)],
    ['待机', det.segs.filter(s => s.st === 'idle').reduce((a, b) => a + b.h, 0)],
    ['故障', det.segs.filter(s => s.st === 'fault').reduce((a, b) => a + b.h, 0)],
    ['保养', det.segs.filter(s => s.st === 'maint').reduce((a, b) => a + b.h, 0)],
  ].filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v.toFixed(1)} h`).join(' · ');
  const openAlarms = det.alarms.filter(a => a.st === '未处置' || a.st === '未处理' || a.st === '处置中').length;

  el.classList.add('dp');
  el.innerHTML = `
  <div class="dp-head">
    <div class="dp-ico st-${st}">${icon(d.type === 'agv' ? 'target' : d.type === 'charger' ? 'stock' : 'cube', 18)}</div>
    <div class="dp-title">
      <h3>${d.name} <span class="tag tag-${tone}">${S.label}</span></h3>
      <p>编号 ${d.id} · ${line ? line.name : d.line} · ${TYPE_NAME[d.type] || d.type}</p>
    </div>
    ${onClose ? `<button class="dp-close" title="关闭">${icon('close', 16)}</button>` : ''}
  </div>
  <div class="dp-scroll">
  ${det.fault ? `<div class="dp-alert"><span class="dot"></span><div><b>${det.fault.since} 起停机，已持续 ${durSince(det.fault.since)}</b> · ${det.fault.text}</div><em>维修：${det.fault.tech}</em></div>` : ''}
  <div class="dp-sec"><h5>OEE 综合效率<span class="ex">统计区间：近 24 小时</span></h5>
    <div class="dp-oee">
      <div class="dp-ring" style="--p:${Math.max(0, Math.min(100, det.oee))};--c:${ringColor}"><span><b>${det.oee}%</b><small>OEE</small></span></div>
      <div class="dp-bars">
        <div><span>可用率</span><i><b class="avail" style="width:${det.avail}%"></b></i><em>${det.avail}%</em></div>
        <div><span>性能</span><i><b class="perf" style="width:${det.perf}%"></b></i><em>${det.perf}%</em></div>
        <div><span>良率</span><i><b class="yld" style="width:${yld ?? 0}%"></b></i><em>${yld != null ? yld + '%' : '—'}</em></div>
        <p>${det.avail}% × ${det.perf}% × ${yld != null ? yld + '%' : '—'} ＝ ${det.oee}% · 目标 ${det.target}.0%</p>
      </div>
    </div>
  </div>
  <div class="dp-sec"><h5>当前工单${hasMo ? '<span class="tag tag-warning">在制中</span>' : ''}<span class="ex">${hasMo ? '预计还要 1.2 h' : ''}</span></h5>
    ${hasMo ? `<div class="dp-wo">
      <div class="wo-h"><a class="link" data-act="wo">${rt.wo}</a><span>${mo ? mo.spec || '' : rt.product}</span></div>
      <div class="wo-m">${mo ? mo.productName : rt.product}${mo ? ' · ' + mo.spec : ''}</div>
      <div class="wo-p"><span>完成 ${fmt(done)} / 计划 ${fmt(qty)} ${mo?.unit || 'PCS'}</span><b>${pct}%</b></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
    </div>` : `<div class="dp-wo empty">当前无生产订单${rt.wo ? ` · ${rt.wo}` : ''}</div>`}
  </div>
  <div class="dp-sec"><h5>近 24 小时状态<span class="ex tl-lg"><i class="dot dot-run"></i>运行 <i class="dot dot-idle"></i>待机 <i class="dot dot-fault"></i>故障 <i class="dot dot-maint"></i>保养</span></h5>
    <div class="dp-tl">${det.segs.map(s => barH(s.st, s.h)).join('')}</div>
    <div class="dp-tl-h">${det.hours.map(h => `<span>${h}</span>`).join('')}</div>
    <div class="dp-tl-s">${hoursSum}</div>
  </div>
  <div class="dp-sec"><h5>告警记录<span class="ex">今日 ${det.alarms.length} 条 · 未处理 ${openAlarms} 条</span></h5>
    <div class="dp-al">${det.alarms.length ? det.alarms.map(a => `<div class="al"><span class="t">${a.time}</span><span class="lv lv-${LV_TONE[a.lv] || 'info'}">${a.lv}</span><span class="msg">${a.msg}</span><span class="st st-${ST_TONE[a.st] || 'default'}">${a.st}</span></div>`).join('') : '<div class="al empty">近 24 小时无告警</div>'}</div>
  </div>
  <div class="dp-sec"><h5>保养计划<span class="ex">上次保养 ${det.lastMaint}</span></h5>
    <div class="dp-mt">${det.maint.map(m => `<div class="mt"><i class="dot tone-${m.tone}"></i><div><b>${m.name}</b><small>${m.cycle} · ${m.next}</small></div><span class="tag tag-${m.tone === 'warning' ? 'warning' : m.tone === 'info' ? 'info' : 'default'}">${m.st}</span></div>`).join('')}</div>
  </div>
  </div>
  <div class="dp-actions">
    <button class="btn" data-act="wo">查看工单</button>
    <button class="btn btn-primary" data-act="repair">创建维修单</button>
  </div>`;

  const onClick = e => {
    const b = e.target.closest('[data-act],.dp-close'); if (!b) return;
    if (b.classList.contains('dp-close')) return onClose?.();
    if (b.dataset.act === 'wo') return openWorkOrder(ctx, rt.wo);
    if (b.dataset.act === 'repair') ctx?.toast?.(`已创建维修单：${d.name}${det.fault ? ' · ' + det.fault.text : ''}`);
  };
  el.onclick = onClick;
  el.__cleanup = () => { el.onclick = null; };
  return () => el.__cleanup?.();
}
