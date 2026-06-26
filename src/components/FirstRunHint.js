import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { completeTutorial } from '../services/auth.js';

/** 認領完成後 — 單次提示；後台無資料時優先導向填寫 */
export function showFirstRunHint({ onGoSearch, onGoProfile, profileEmpty = false } = {}) {
  const overlay = document.createElement('div');
  overlay.id = 'first-run-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const titleKey = profileEmpty ? 'profile_fill_after_claim_title' : 'first_run_title';
  const bodyKey = profileEmpty ? 'profile_fill_after_claim_body' : 'first_run_body';
  const goKey = profileEmpty ? 'profile_enrich_empty_btn' : 'first_run_go';
  const skipKey = profileEmpty ? 'profile_fill_after_claim_later' : 'first_run_skip';

  overlay.innerHTML = `
    <div class="first-run-card${profileEmpty ? ' first-run-card-profile' : ''}">
      <div class="first-run-title">${escHtml(t(titleKey))}</div>
      <p class="first-run-body">${escHtml(t(bodyKey))}</p>
      <button type="button" class="welcome-btn-primary" id="first-run-go">${escHtml(t(goKey))}</button>
      <button type="button" class="welcome-btn-skip" id="first-run-skip">${escHtml(t(skipKey))}</button>
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
    close(() => (profileEmpty ? onGoProfile?.() : onGoSearch?.()));
  });
  overlay.querySelector('#first-run-skip')?.addEventListener('click', () => {
    close(() => {
      if (profileEmpty) onGoSearch?.();
    });
  });
}

export async function finishOnboardingTutorial() {
  try {
    await completeTutorial();
  } catch (e) {
    console.warn('completeTutorial:', e.message);
  }
}
