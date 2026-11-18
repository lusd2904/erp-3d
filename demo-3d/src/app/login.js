// 登录页（对齐 docs/design/登录页.png，简约版）
import { login as doLogin, rememberedUser } from './auth.js';

const logo = (s = 32) => `<svg class="lg-mark" width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" aria-hidden="true">
  <rect width="32" height="32" rx="8" fill="#2563EB"/>
  <path d="M9 11.5h6.2v3.2H11v6.8H9V11.5zm8.2 0H23v9.9h-2.2v-6.7h-3.6V11.5z" fill="#fff"/>
  <rect x="16.6" y="18.6" width="4.2" height="2.8" rx="0.6" fill="#93C5FD"/>
</svg>`;

export function renderLogin(onSuccess) {
  document.body.className = 'login-page';
  document.title = '登录 · 芯程电子元器件生产管理 ERP';
  const account = rememberedUser();
  document.body.innerHTML = `
  <div class="lg">
    <div class="lg-bg" aria-hidden="true"></div>
    <header class="lg-brand">${logo(32)}<span>芯程电子</span></header>
    <h1 class="lg-slogan">数字化车间 · 透明化生产</h1>
    <div class="lg-main">
      <div class="lg-art"><img src="assets/login-plant.png" alt=""></div>
      <form class="lg-card" id="login-form" autocomplete="on">
        <div class="lg-card-h">${logo(36)}<b>芯程电子元器件生产管理 ERP</b></div>
        <label class="lg-field"><span>账号</span>
          <span class="lg-in">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/></svg>
            <input name="account" value="${account.replace(/"/g, '&quot;')}" placeholder="zhang.gong" autocomplete="username" autofocus>
          </span>
        </label>
        <label class="lg-field"><span>密码</span>
          <span class="lg-in">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
            <input name="password" type="password" placeholder="" autocomplete="current-password">
            <button type="button" class="lg-eye" data-act="eye" title="显示/隐藏密码" tabindex="-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </span>
        </label>
        <div class="lg-row">
          <label class="lg-check"><input type="checkbox" name="remember" checked>记住我</label>
          <button type="button" class="lg-link" data-act="forgot">忘记密码？</button>
        </div>
        <button type="submit" class="lg-submit">登录</button>
      </form>
    </div>
    <div class="toasts" id="toasts"></div>
  </div>`;
  const toast = (msg) => {
    const box = document.getElementById('toasts');
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; box.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2200); setTimeout(() => t.remove(), 2600);
  };
  const form = document.getElementById('login-form');
  form.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'eye') {
      const inp = form.password;
      inp.type = inp.type === 'password' ? 'text' : 'password';
    }
    if (b.dataset.act === 'forgot') toast('请联系系统管理员重置密码');
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const account = form.account.value.trim();
    const password = form.password.value;
    if (!account || !password) { toast('请输入账号和密码'); return; }
    doLogin(account, { remember: form.remember.checked });
    onSuccess();
  });
  document.body.dataset.ready = 'login';
}
