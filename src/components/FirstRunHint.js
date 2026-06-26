import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { completeTutorial, getMyStatus } from '../services/auth.js';

/** 認領完成後 — 簡短歡迎（進度與任務統一在首頁 collect800 卡片） */
export function showFirstRunHint({ onGoSearch, onGoProfile, profileEmpty = false } = {}) {
  const overlay = document.createElement('div');
  overlay.id = 'first-run-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'first-run-title');

  const name = getMyStatus()?.member?.name || '';
  const titleKey = profileEmpty ? 'claim_game_title' : 'first_run_title';
  const goKey = profileEmpty ? 'profile_enrich_empty_btn' : 'first_run_go';
  const skipKey = profileEmpty ? 'profile_fill_after_claim_later' : 'first_run_skip';
  const subtitle = profileEmpty
    ? t('profile_fill_after_claim_body')
    : name
      ? t('claim_game_welcome', { name })
      : t('first_run_subtitle');

  document.body.classList.add('first-run-open');

  overlay.innerHTML = `
    <div class="first-run-card first-run-card-clear${profileEmpty ? ' first-run-card-profile' : ''}">
      <div class="first-run-hero-badge" aria-hidden="true">🎯 ${escHtml(t('first_run_badge'))}</div>
      <div id="first-run-title" class="first-run-title">${escHtml(t(titleKey))}</div>
      <p class="first-run-subtitle">${escHtml(subtitle)}</p>
      <p class="first-run-hint-next">${escHtml(t('first_run_see_home'))}</p>
      <div class="first-run-actions">
        <button type="button" class="welcome-btn-primary" id="first-run-go">${escHtml(t(goKey))}</button>
        <button type="button" class="welcome-btn-skip" id="first-run-skip">${escHtml(t(skipKey))}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = (cb) => {
    document.body.classList.remove('first-run-open');
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
