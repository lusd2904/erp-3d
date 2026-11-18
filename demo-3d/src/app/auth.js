// 登录态：任意非空账号/密码即可进入，状态存 localStorage
const SESSION = 'erp-3d-session';
const REMEMBER = 'erp-3d-remember';
const TTL_MS = 7 * 24 * 3600 * 1000;

function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } }
function safeDel(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } }

export function currentUser() {
  try {
    const u = JSON.parse(safeGet(SESSION) || 'null');
    if (!u || !u.account) return null;
    if (u.ts && Date.now() - u.ts > TTL_MS) { safeDel(SESSION); return null; }
    return u;
  } catch { return null; }
}
export function isLoggedIn() { return !!currentUser(); }

export function rememberedUser() {
  return safeGet(REMEMBER) || 'zhang.gong';
}

export function login(account, { remember = true, name, role } = {}) {
  const user = {
    account: String(account).trim(),
    name: name || '张工',
    role: role || '生产经理',
    initial: (name || '张工').slice(0, 1),
    ts: Date.now(),
  };
  safeSet(SESSION, JSON.stringify(user));
  if (remember) safeSet(REMEMBER, user.account);
  else safeDel(REMEMBER);
  return user;
}

export function logout() {
  safeDel(SESSION);
}
