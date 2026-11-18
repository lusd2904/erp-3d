// 告警/欢迎语音：默认静音（浏览器自动播放限制），状态存 localStorage
import { runtime, openAlarmCount } from './runtime.js';
import { deviceById } from '../data/plant.js';

const MUTE = 'erp-3d-muted';
const SRC = {
  welcome: 'assets/audio/welcome.mp3',
  alarm_fault: 'assets/audio/alarm_fault.mp3',
  alarm_ng: 'assets/audio/alarm_ng.mp3',
  alarm_shortage: 'assets/audio/alarm_shortage.mp3',
};

export function isMuted() {
  let v = null;
  try { v = localStorage.getItem(MUTE); } catch { /* ignore */ }
  return v !== '0'; // 默认静音
}
export function setMuted(m) {
  try { localStorage.setItem(MUTE, m ? '1' : '0'); } catch { /* ignore */ }
  document.querySelectorAll('[data-act="mute"]').forEach(syncBtn);
  if (!m) window.dispatchEvent(new CustomEvent('erp-unmuted'));
  else window.dispatchEvent(new CustomEvent('erp-muted'));
}

function syncBtn(b) {
  const on = isMuted();
  b.classList.toggle('is-muted', on);
  b.title = on ? '点击开启语音提示' : '点击关闭语音提示';
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
}

let current;
export function play(name) {
  if (isMuted() || !SRC[name]) return;
  try { current?.pause(); } catch { /* ignore */ }
  const a = new Audio(SRC[name]);
  current = a;
  a.play().catch(() => { /* 浏览器策略拒绝时静默 */ });
}

// 仅对当前状态相符的设备追加告警，避免给运行中的设备虚构故障/缺料
const QUEUE = [
  { audio: 'alarm_fault', lv: '一级', dev: 'L2-MNT1', msg: '吸嘴站真空再次跌落，贴装已暂停', st: '未处置', need: 'fault' },
];
const ALARM_CAP = 20;
let qi = 0, loopTimer = 0, listeners = new Set();

export function onAlarm(fn) { listeners.add(fn); return () => listeners.delete(fn); }

function paintBadge() {
  const badge = document.querySelector('#btn-alarm .badge');
  if (badge) badge.textContent = openAlarmCount();
}

function fire() {
  const ev = QUEUE[qi++ % QUEUE.length];
  const st = deviceById[ev.dev]?.status;
  if (ev.need && st && st !== ev.need) return;
  const now = new Date().toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false });
  const exist = runtime.alarms.find(a => a.dev === ev.dev && a.msg === ev.msg);
  if (exist) { exist.time = now; paintBadge(); listeners.forEach(fn => { try { fn(exist); } catch { /* ignore */ } }); play(ev.audio); return; }
  const item = { lv: ev.lv, dev: ev.dev, msg: ev.msg, time: now, st: ev.st };
  runtime.alarms.unshift(item);
  if (runtime.alarms.length > ALARM_CAP) runtime.alarms.length = ALARM_CAP;
  paintBadge();
  play(ev.audio);
  listeners.forEach(fn => { try { fn(item); } catch { /* ignore */ } });
}

export function startAlarmLoop() {
  stopAlarmLoop();
  const tick = () => { loopTimer = setTimeout(() => { if (!isMuted()) fire(); tick(); }, 90_000); };
  tick();
}
export function stopAlarmLoop() { clearTimeout(loopTimer); loopTimer = 0; }

export function muteButton(id = 'btn-mute') {
  return `<button class="ibtn ${isMuted() ? 'is-muted' : ''}" id="${id}" data-act="mute" title="${isMuted() ? '点击开启语音提示' : '点击关闭语音提示'}" aria-pressed="${isMuted() ? 'true' : 'false'}"></button>`;
}

export function bindMute(root = document) {
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-act="mute"]'); if (!b) return;
    setMuted(!isMuted());
  });
  root.querySelectorAll('[data-act="mute"]').forEach(syncBtn);
}
