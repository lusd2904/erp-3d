// 三维驾驶舱（对齐 docs/design/驾驶舱.png）：三维厂区/车间居中为主视觉，左右悬浮指标与图表卡片，底部图例 + 视角切换；
// 点击设备弹出详情；卡片区域参与三维标签避让，不遮挡三维主体。全部为演示数据。
import { devices, deviceById, STATUS } from '../data/plant.js';
import { runtime, kpis, lineKpi, jitter, openAlarmCount } from './runtime.js';
import { chart, disposeChart, grad } from './charts.js';
import { renderDevicePanel } from './devicePanel.js';
import { onAlarm } from './audio.js';

export const meta = { id: 'cockpit', title: '三维驾驶舱', group: '可视化', icon: 'cockpit' };
const fmt = n => Number(n).toLocaleString('zh-CN');
const VIEW_BTNS = [['hall', '全景'], ['L1', 'SMT-1'], ['L2', 'SMT-2'], ['L3', '编带测试'], ['WH', '仓储物流'], ['campus', '园区']];

export function mount(el, ctx) {
  const { world } = ctx; const K = kpis();
  const stock = ctx.stockAlerts();
  const warn = stock.filter(s => s.qty < s.safe);
  const wip = ctx.wipOrders();
  const plan = 21000, pct = Math.round(K.boards / plan * 1000) / 10;
  const cnt = s => devices.filter(d => d.status === s).length;
  const lineRow = (L, nm) => { const k = lineKpi(L); const st = k.fault ? ['danger', '异常'] : k.run < k.total ? ['warning', '部分待机'] : ['success', '运行中']; const out = (runtime.output[L] || []).reduce((a, b) => a + b, 0);
    return `<button class="lr" data-view="${L}"><div class="lr-h"><b>${nm}</b><span class="tag tag-${st[0]}">${st[1]}</span><em>OEE <b class="num">${k.oee}%</b></em></div><div class="bar ${st[0]}"><i style="width:${k.oee}%"></i></div><div class="lr-f">今日 ${fmt(out)} ${L === 'L3' ? 'pcs' : '板'} · FPY ${k.fpy}% · 设备 ${k.run}/${k.total} 运行</div></button>`; };
  el.innerHTML = `
  <div class="ck">
    <div class="ck-stage"></div>
    <div class="ck-col ck-left">
      <section class="card glass ck-a"><h4 class="card-title">今日产量<span class="extra">截至 ${new Date().toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false })}</span></h4>
        <div class="big"><b class="num">${fmt(K.boards)}</b><small>板</small><span class="side">后段 <b class="num">${fmt(Math.round(K.chips / 1000))}k</b> pcs</span></div>
        <div class="sub">计划 ${fmt(plan)} · 达成率 <b>${pct}%</b></div><div class="bar"><i style="width:${Math.min(100, pct)}%"></i></div>
        <div class="ck-chart" id="ck-out"></div></section>
      <div class="ck-pair">
        <section class="card glass"><h4 class="card-title">良率</h4><div class="ck-chart ck-ring" id="ck-yield"></div><div class="ring-f">目标 98.5% · <span class="st-run">+0.3%</span></div></section>
        <section class="card glass"><h4 class="card-title">OEE</h4><div class="ck-chart ck-ring" id="ck-oee"></div><div class="ring-f">较昨日 <span class="st-run">+1.2%</span></div></section>
      </div>
      <section class="card glass ck-c"><h4 class="card-title">在制工单<span class="extra">${ctx.wipSource}</span></h4>
        <div class="big sm"><b class="num">${wip.length}</b><small>单</small><span class="side">生产中 ${wip.filter(w => w.pct > 0).length} · 待开工 ${wip.filter(w => !w.pct).length}</span></div>
        <div class="ck-wo">${wip.slice(0, 5).map(w => `<div class="wo" data-line="${w.line}"><span class="no">${w.no}</span><span class="ln">${{ L1: 'SMT-1', L2: 'SMT-2', L3: '编带测试' }[w.line] || w.line}</span><div class="bar ${w.pct < 40 ? 'warning' : ''}"><i style="width:${w.pct}%"></i></div><span class="pc num">${w.pct}%</span></div>`).join('')}</div></section>
      <section class="card glass ck-d"><h4 class="card-title">近 7 日产量趋势<span class="extra">单位：千板</span></h4><div class="ck-chart" id="ck-trend"></div></section>
    </div>
    <div class="ck-col ck-right">
      <section class="card glass ck-e"><h4 class="card-title">设备状态分布<span class="extra">点击异常设备三维定位</span></h4>
        <div class="ck-dev"><div class="ck-chart ck-pie" id="ck-pie"></div>
          <div class="ck-lgd">${Object.entries(STATUS).map(([k, v]) => `<div><i class="dot dot-${k}"></i><span>${v.label}</span><b class="num">${cnt(k)} 台</b><em class="num">${(cnt(k) / devices.length * 100).toFixed(1)}%</em></div>`).join('')}</div></div>
        <div class="ck-abn">${devices.filter(d => d.status === 'fault' || d.status === 'maint').map(d => `<button class="abn" data-dev="${d.id}"><i class="dot dot-${d.status}"></i>${d.name}<em class="st-${d.status}">${STATUS[d.status].label}</em></button>`).join('')}</div></section>
      <section class="card glass ck-f"><h4 class="card-title">库存预警<span class="cnt">${warn.length} 项</span><span class="extra">点击定位库位</span></h4>
        <div class="ck-stock">${(warn.length ? warn : stock).slice(0, 3).map(s => { const lv = s.qty < s.safe * 0.5 ? ['danger', '紧缺'] : ['warning', '偏低']; return `<button class="sk" data-bin="${s.bin}"><div><b>${s.name}</b><small>${s.spec}</small><small>当前 ${fmt(s.qty)} / 安全 ${fmt(s.safe)} · <span class="num">${s.bin.replace('WH-A-', 'A-')}</span></small></div><span class="tag tag-${lv[0]}">${lv[1]}</span></button>`; }).join('')}</div></section>
      <section class="card glass ck-g"><h4 class="card-title">产线运行状态<span class="extra">点击切换视角</span></h4>
        ${lineRow('L1', 'SMT-1 线')}${lineRow('L2', 'SMT-2 线')}${lineRow('L3', '编带/测试分选线')}
        <div class="lr-agv"><span>AGV 在线 <b>4</b> · 执行任务 <b>3</b> · 平均响应 <b>38 s</b></span><span>堆垛机 <b>2</b> 台 · 今日出入库 <b>186</b> 托</span></div></section>
      <section class="card glass ck-h"><h4 class="card-title">实时报警<span class="cnt">${K.alarms} 未处置</span></h4>
        <div class="ck-alarm">${runtime.alarms.slice(0, 2).map(a => `<button class="al" data-dev="${a.dev}"><span class="lv lv${a.lv === '一级' ? 1 : a.lv === '二级' ? 2 : 3}">${a.lv}</span><span class="msg"><b>${deviceById[a.dev].name}</b>${a.msg}</span><span class="t">${a.time}<em class="${a.st === '未处置' ? 'st-fault' : a.st === '处置中' ? 'st-idle' : 'st-run'}">${a.st}</em></span></button>`).join('')}</div></section>
    </div>
    <div class="ck-foot">
      <div class="ck-legend glass"><span><i class="lg-agv"></i>AGV 行驶路线</span><span><i class="lg-zone"></i>产线区域</span><span><i class="lg-wh"></i>立体仓库区</span>${Object.entries(STATUS).map(([k, v]) => `<span><i class="dot dot-${k}"></i>${v.label}</span>`).join('')}</div>
      <div class="ck-views glass">${VIEW_BTNS.map(([k, n]) => `<button class="vbtn ${k === 'hall' ? 'on' : ''}" data-view="${k}">${n}</button>`).join('')}<span class="sep"></span><button class="vbtn" data-act="rotate">巡航</button><button class="vbtn on" data-act="labels">标签</button></div>
    </div>
    <div class="ck-pop card" hidden></div>
  </div>`;
  const stage = el.querySelector('.ck-stage'), pop = el.querySelector('.ck-pop');
  stage.dataset.blockers = '.ck-col>section,.ck-pair>section,.ck-foot>div,.ck-pop';
  world.mount(stage); world.setView(ctx.params?.view || 'hall', true);
  const charts = [];
  charts.push(chart(el.querySelector('#ck-out'), {
    grid: { left: 4, right: 4, top: 6, bottom: 16 }, tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: runtime.hours, axisLabel: { fontSize: 9, interval: 2 } }, yAxis: { type: 'value', show: false },
    series: [{ name: 'SMT 产出', type: 'bar', barWidth: '58%', data: runtime.output.L1.map((v, i) => v + runtime.output.L2[i]).map((v, i, a) => ({ value: v, itemStyle: { color: i === a.length - 1 ? '#22d3ee' : grad('#93c5fd', '#60a5fa'), borderRadius: [3, 3, 0, 0] } })) }],
  }));
  const ring = (id, v, color) => charts.push(chart(el.querySelector(id), {
    series: [{ type: 'pie', radius: ['66%', '86%'], silent: true, label: { show: true, position: 'center', formatter: `${v}%`, fontSize: 17, fontWeight: 700, color: '#14325f', fontFamily: 'DIN Alternate,Roboto Mono,monospace' }, labelLine: { show: false },
      data: [{ value: v, itemStyle: { color, borderRadius: 6 } }, { value: 100 - v, itemStyle: { color: '#e8eef6' }, label: { show: false } }] }] }));
  ring('#ck-yield', K.yield, '#16b364'); ring('#ck-oee', K.oee, '#2563eb');
  const days = runtime.fpy7.days, trend = days.map((_, i) => +(18.6 + Math.sin(i * 1.3) * 1.4 + i * 0.25).toFixed(1));
  charts.push(chart(el.querySelector('#ck-trend'), {
    grid: { left: 30, right: 12, top: 18, bottom: 20 }, tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: days, boundaryGap: false }, yAxis: { type: 'value', min: 14, splitNumber: 3 },
    series: [{ type: 'line', data: trend, symbol: 'circle', symbolSize: 6, itemStyle: { color: '#2563eb', borderColor: '#fff', borderWidth: 1.5 }, lineStyle: { width: 2.2 }, areaStyle: { color: grad('rgba(37,99,235,.22)', 'rgba(37,99,235,0)') },
      markPoint: { symbol: 'roundRect', symbolSize: [40, 18], symbolOffset: [0, -14], data: [{ type: 'max' }], label: { fontSize: 10, color: '#fff' }, itemStyle: { color: '#22d3ee' } } }],
  }));
  charts.push(chart(el.querySelector('#ck-pie'), {
    tooltip: { trigger: 'item' }, title: { text: `${devices.length}`, subtext: '设备总数(台)', left: 'center', top: '30%', textStyle: { fontSize: 22, color: '#14325f', fontFamily: 'DIN Alternate,Roboto Mono,monospace' }, subtextStyle: { fontSize: 10, color: '#8a96a8' }, itemGap: 0 },
    series: [{ type: 'pie', radius: ['60%', '84%'], label: { show: false }, itemStyle: { borderColor: '#fff', borderWidth: 2 }, data: Object.entries(STATUS).map(([k, v]) => ({ name: v.label, value: cnt(k), itemStyle: { color: v.color } })) }],
  }));
  // 交互
  let popCleanup = null;
  const showPop = id => { popCleanup?.(); popCleanup = null; if (!id) { pop.hidden = true; return; } pop.hidden = false; popCleanup = renderDevicePanel(pop, id, { world, ctx, onClose: () => world.select(null) }); };
  const offSel = world.on('select', showPop);
  const setBtn = k => el.querySelectorAll('.ck-views .vbtn[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === k));
  const onClick = e => {
    const v = e.target.closest('[data-view]'); if (v) { world.setView(v.dataset.view); setBtn(v.dataset.view); return; }
    const dv = e.target.closest('[data-dev]'); if (dv) { world.focusDevice(dv.dataset.dev); setBtn(''); return; }
    const bn = e.target.closest('[data-bin]'); if (bn) { world.select(null); world.locateBin(bn.dataset.bin); setBtn(''); el.querySelectorAll('.sk').forEach(r => r.classList.toggle('active', r === bn)); return; }
    const wo = e.target.closest('.wo[data-line]'); if (wo) { world.setView(wo.dataset.line); setBtn(wo.dataset.line); return; }
    const a = e.target.closest('[data-act]');
    if (a?.dataset.act === 'rotate') { world.autoRotate = !world.autoRotate; a.classList.toggle('on', world.autoRotate); }
    if (a?.dataset.act === 'labels') { world.labelsOn = !world.labelsOn; world.setLabels(world.labelsOn); a.classList.toggle('on', world.labelsOn); }
  };
  el.addEventListener('click', onClick);
  const timer = setInterval(jitter, 3000);
  const paintAlarms = () => {
    const box = el.querySelector('.ck-alarm'); if (!box) return;
    const n = openAlarmCount();
    const cntEl = el.querySelector('.ck-h .card-title .cnt'); if (cntEl) cntEl.textContent = n + ' 未处置';
    box.innerHTML = runtime.alarms.slice(0, 2).map(a => `<button class="al" data-dev="${a.dev}"><span class="lv lv${a.lv === '一级' ? 1 : a.lv === '二级' ? 2 : 3}">${a.lv}</span><span class="msg"><b>${deviceById[a.dev]?.name || a.dev}</b>${a.msg}</span><span class="t">${a.time}<em class="${a.st === '未处置' ? 'st-fault' : a.st === '处置中' ? 'st-idle' : 'st-run'}">${a.st}</em></span></button>`).join('');
  };
  const offAl = onAlarm(paintAlarms);
  let focusTimer = 0;
  if (ctx.params?.device) focusTimer = setTimeout(() => world.focusDevice(ctx.params.device), 50);
  return () => { clearInterval(timer); clearTimeout(focusTimer); offSel(); offAl(); popCleanup?.(); charts.forEach(disposeChart); world.select(null); world.clearBin(); world.autoRotate = false; world.unmount(); el.removeEventListener('click', onClick); };
}

