export function showToast(msg, duration = 2500) {
  const el = document.getElementById('toast');
  if (!el) {
    console.warn('Toast element not found in DOM');
    return;
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._toastTimer);
  el._toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}
