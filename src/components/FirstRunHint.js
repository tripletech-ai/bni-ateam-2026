import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { completeTutorial, getMyStatus } from '../services/auth.js';
import { getCollect800Stats } from './Collect800Game.js';
import { copyPageUrl } from '../utils/inAppBrowser.js';
import { showToast } from '../utils/toast.js';

import { describeClaimOutcome } from '../utils/claimFeedback.js';

function loadLastClaimHint(profileEmpty) {
  try {
    const raw = sessionStorage.getItem('bni_last_claim_result');
    if (raw) {
      const result = JSON.parse(raw);
      sessionStorage.removeItem('bni_last_claim_result');
      return describeClaimOutcome(result);
    }
  } catch { /* ignore */ }
  return profileEmpty ? t('claim_game_body_profile') : t('first_run_body');
}

function claimGameBlockHTML(profileEmpty) {
  const { registered, goal } = getCollect800Stats();
  const pct = Math.min(100, Math.round((registered / goal) * 100));
  const name = getMyStatus()?.member?.name || '';

  return `
    <div class="first-run-game">
      <div class="first-run-game-badge">${escHtml(t('claim_game_badge'))}</div>
      ${name ? `<p class="first-run-game-welcome">${escHtml(t('claim_game_welcome', { name }))}</p>` : ''}
      <p class="first-run-game-stats">${escHtml(t('claim_game_stats', { n: registered, goal }))}</p>
      <div class="first-run-game-track" role="progressbar" aria-valuenow="${registered}" aria-valuemin="0" aria-valuemax="${goal}">
        <div class="first-run-game-fill" style="width:${pct}%"></div>
      </div>
      <p class="first-run-game-quest-label">${escHtml(t('claim_game_quest_title'))}</p>
      <ul class="first-run-game-quests">
        <li class="${profileEmpty ? 'active' : 'done'}">${escHtml(t('claim_game_quest_1'))}</li>
        <li class="active">${escHtml(t('claim_game_quest_2'))}</li>
        <li class="active">${escHtml(t('claim_game_quest_3'))}</li>
      </ul>
    </div>`;
}

/** 認領完成後 — 遊戲化慶祝 + 任務提示 */
export function showFirstRunHint({ onGoSearch, onGoProfile, profileEmpty = false } = {}) {
  const overlay = document.createElement('div');
  overlay.id = 'first-run-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const titleKey = profileEmpty ? 'claim_game_title' : 'first_run_title';
  const goKey = profileEmpty ? 'profile_enrich_empty_btn' : 'first_run_go';
  const skipKey = profileEmpty ? 'profile_fill_after_claim_later' : 'first_run_skip';
  const bodyText = loadLastClaimHint(profileEmpty);

  overlay.innerHTML = `
    <div class="first-run-card first-run-card-game${profileEmpty ? ' first-run-card-profile' : ''}">
      <div class="first-run-title">${escHtml(t(titleKey))}</div>
      ${claimGameBlockHTML(profileEmpty)}
      <p class="first-run-body">${escHtml(bodyText)}</p>
      <button type="button" class="welcome-btn-primary" id="first-run-go">${escHtml(t(goKey))}</button>
      <button type="button" class="btn-outline first-run-invite-btn" id="first-run-invite">${escHtml(t('claim_game_invite_btn'))}</button>
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
  overlay.querySelector('#first-run-invite')?.addEventListener('click', async () => {
    const ok = await copyPageUrl();
    showToast(ok ? t('search_invite_copied') : t('inapp_copy_fail'));
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
