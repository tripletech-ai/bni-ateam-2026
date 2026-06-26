/** 是否為管理員後台路徑（/admin 或 #admin） */
export function isAdminRoute() {
  const path = normalizePathname(window.location.pathname);
  const hash = window.location.hash || '';
  return path === '/admin' || hash === '#admin';
}

export function normalizePathname(pathname) {
  const p = String(pathname || '/').replace(/\/+$/, '') || '/';
  return p.startsWith('//') ? '/' : p;
}

/** /admin → /admin#admin，方便書籤與分享 */
export function syncAdminPathToHash() {
  if (normalizePathname(window.location.pathname) !== '/admin') return false;
  const hash = window.location.hash || '';
  const target = hash && hash !== '#' ? hash : '#admin';
  const search = window.location.search || '';
  window.history.replaceState(null, '', `/admin${search}${target}`);
  return true;
}

export const ADMIN_LOGIN_FLAG = 'bni_admin_login_intent';

export function setAdminLoginIntent() {
  try { sessionStorage.setItem(ADMIN_LOGIN_FLAG, '1'); } catch { /* ignore */ }
}

export function consumeAdminLoginIntent() {
  try {
    const v = sessionStorage.getItem(ADMIN_LOGIN_FLAG) === '1';
    sessionStorage.removeItem(ADMIN_LOGIN_FLAG);
    return v;
  } catch {
    return false;
  }
}

export function hasAdminLoginIntent() {
  try { return sessionStorage.getItem(ADMIN_LOGIN_FLAG) === '1'; }
  catch { return false; }
}
