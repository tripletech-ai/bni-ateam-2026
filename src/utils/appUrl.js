/** 修正分享連結誤打成 //? 等異常 pathname，避免資源 404 白屏 */
export function normalizeAppUrl() {
  try {
    const { pathname, search, hash } = window.location;
    if (!pathname || pathname === '' || /^\/\/+/.test(pathname)) {
      const clean = '/' + String(pathname || '').replace(/^\/+/, '');
      window.history.replaceState(null, '', (clean === '//' ? '/' : clean) + search + hash);
    }
  } catch {
    /* ignore */
  }
}
