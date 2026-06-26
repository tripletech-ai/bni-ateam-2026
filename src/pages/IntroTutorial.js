import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';

/** 登入前 — 單頁說明，越簡單越好 */
export function showIntroTutorial({ onDone, onSkip }) {
  const overlay = document.createElement('div');
  overlay.id = 'welcome-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', t('intro_aria'));
  overlay.innerHTML = `
    <div id="welcome-card" class="welcome-card-tutorial intro-tutorial-card">
      <div class="welcome-title">${escHtml(t('intro_title'))}</div>
      <p class="welcome-desc-block">${escHtml(t('intro_body'))}</p>
      <button type="button" class="welcome-btn-primary" id="intro-done">${escHtml(t('intro_go_login'))}</button>
      <div class="intro-skip-wrap">
        <button type="button" class="welcome-btn-skip" id="intro-skip">${escHtml(t('intro_skip'))}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  function close(cb) {
    overlay.style.transition = 'opacity 0.22s';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      cb?.();
    }, 230);
  }

  overlay.querySelector('#intro-done')?.addEventListener('click', () => close(onDone));
  overlay.querySelector('#intro-skip')?.addEventListener('click', () => close(onSkip));
}
