import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { completeTutorial } from '../services/auth.js';

/** 認領完成後 — 單次、單屏，導向搜尋 */
export function showFirstRunHint({ onGoSearch } = {}) {
  const overlay = document.createElement('div');
  overlay.id = 'first-run-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="first-run-card">
      <div class="first-run-title">${escHtml(t('first_run_title'))}</div>
      <p class="first-run-body">${escHtml(t('first_run_body'))}</p>
      <button type="button" class="welcome-btn-primary" id="first-run-go">${escHtml(t('first_run_go'))}</button>
      <button type="button" class="welcome-btn-skip" id="first-run-skip">${escHtml(t('first_run_skip'))}</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = (cb) => {
    overlay.style.transition = 'opacity 0.2s';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      cb?.();
    }, 200);
  };

  overlay.querySelector('#first-run-go')?.addEventListener('click', () => {
    close(() => onGoSearch?.());
  });
  overlay.querySelector('#first-run-skip')?.addEventListener('click', () => {
    close();
  });
}

export async function finishOnboardingTutorial() {
  try {
    await completeTutorial();
  } catch (e) {
    console.warn('completeTutorial:', e.message);
  }
}
