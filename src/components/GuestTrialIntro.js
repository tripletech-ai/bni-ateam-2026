import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';

const INTRO_SHOWN_KEY = 'bni_guest_intro_shown';

export function clearGuestIntroFlag() {
  try { sessionStorage.removeItem(INTRO_SHOWN_KEY); } catch { /* ignore */ }
}

/** 進入訪客試玩後 — 白話說明「別人搜不到你」 */
export function showGuestTrialIntro({ onGoLogin } = {}) {
  if (sessionStorage.getItem(INTRO_SHOWN_KEY) === '1') return;
  sessionStorage.setItem(INTRO_SHOWN_KEY, '1');

  const overlay = document.createElement('div');
  overlay.id = 'guest-trial-intro-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'guest-trial-intro-title');

  overlay.innerHTML = `
    <div class="guest-trial-intro-card">
      <div class="guest-trial-intro-icon" aria-hidden="true">👀</div>
      <h2 id="guest-trial-intro-title" class="guest-trial-intro-title">${escHtml(t('guest_trial_modal_title'))}</h2>
      <p class="guest-trial-intro-lead">${escHtml(t('guest_trial_modal_lead'))}</p>
      <ul class="guest-trial-intro-list">
        <li class="guest-trial-intro-no">${escHtml(t('guest_trial_modal_li1'))}</li>
        <li class="guest-trial-intro-no">${escHtml(t('guest_trial_modal_li2'))}</li>
        <li class="guest-trial-intro-no">${escHtml(t('guest_trial_modal_li3'))}</li>
        <li class="guest-trial-intro-yes">${escHtml(t('guest_trial_modal_li4'))}</li>
      </ul>
      <p class="guest-trial-intro-foot">${escHtml(t('guest_trial_modal_foot'))}</p>
      <button type="button" class="welcome-btn-primary" id="guest-trial-intro-login">
        ${escHtml(t('guest_trial_modal_login'))}
      </button>
      <button type="button" class="btn-outline guest-trial-intro-ok" id="guest-trial-intro-ok">
        ${escHtml(t('guest_trial_modal_ok'))}
      </button>
    </div>`;

  document.body.appendChild(overlay);

  const close = (cb) => {
    overlay.style.transition = 'opacity 0.2s';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      cb?.();
    }, 200);
  };

  overlay.querySelector('#guest-trial-intro-ok')?.addEventListener('click', () => close());
  overlay.querySelector('#guest-trial-intro-login')?.addEventListener('click', () => {
    close(() => onGoLogin?.());
  });
}
