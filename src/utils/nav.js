/** SPA 分頁導航 — hash 相同時也強制 re-render */
let _navigate = null;

export function registerNavigator(fn) {
  _navigate = fn;
}

export function goToPage(page) {
  const target = page.startsWith('#') ? page : `#${page}`;
  const slug = target.slice(1) || 'home';
  if (window.location.hash === target) {
    _navigate?.();
  } else {
    window.location.hash = slug;
  }
}
