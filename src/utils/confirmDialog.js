import { escHtml } from './html.js';
import { t } from '../i18n/translations.js';

/**
 * 自訂確認對話框（LINE / 內建瀏覽器常封鎖 window.confirm）
 */
export function showConfirmDialog({
  title = '',
  message = '',
  confirmLabel = '',
  cancelLabel = '',
} = {}) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'app-confirm-overlay';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="app-confirm-card">
        ${title ? `<h2 class="app-confirm-title">${escHtml(title)}</h2>` : ''}
        <p class="app-confirm-message">${escHtml(message)}</p>
        <div class="app-confirm-actions">
          <button type="button" class="btn-ai app-confirm-ok">${escHtml(confirmLabel || t('confirm_ok'))}</button>
          <button type="button" class="btn-outline app-confirm-cancel">${escHtml(cancelLabel || t('confirm_cancel'))}</button>
        </div>
      </div>`;

    const finish = (ok) => {
      overlay.style.transition = 'opacity 0.2s';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        resolve(ok);
      }, 180);
    };

    overlay.querySelector('.app-confirm-cancel')?.addEventListener('click', () => finish(false));
    overlay.querySelector('.app-confirm-ok')?.addEventListener('click', () => finish(true));
    document.body.appendChild(overlay);
    overlay.querySelector('.app-confirm-ok')?.focus();
  });
}
