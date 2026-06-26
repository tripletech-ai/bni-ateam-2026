import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { getCollect800Stats } from './Collect800Game.js';
import { profileNeedsEnrichment } from '../utils/profileHints.js';
import { getMyStatus } from '../services/auth.js';
import { copyPageUrl } from '../utils/inAppBrowser.js';
import { showToast } from '../utils/toast.js';
import { goToPage } from '../utils/nav.js';

const DISMISS_KEY = 'bni_quest_strip_dismiss';

export function homeQuestStripHTML() {
  if (localStorage.getItem(DISMISS_KEY) === '1') return '';
  const member = getMyStatus()?.member;
  if (!member) return '';

  const { registered, goal } = getCollect800Stats();
  const pct = Math.min(100, Math.round((registered / goal) * 100));
  const needProfile = profileNeedsEnrichment(member);

  return `
    <section class="home-quest-strip" aria-label="${escHtml(t('claim_game_quest_title'))}">
      <button type="button" class="home-quest-dismiss" id="home-quest-dismiss" aria-label="${escHtml(t('claim_game_dismiss'))}">×</button>
      <div class="home-quest-badge">${escHtml(t('claim_game_badge'))}</div>
      <p class="home-quest-stats">${escHtml(t('claim_game_stats', { n: registered, goal }))}</p>
      <div class="home-quest-track" role="progressbar" aria-valuenow="${registered}" aria-valuemin="0" aria-valuemax="${goal}">
        <div class="home-quest-fill" style="width:${pct}%"></div>
      </div>
      <ul class="home-quest-list">
        <li class="home-quest-item${needProfile ? ' home-quest-item-active' : ' home-quest-item-done'}">${escHtml(t('claim_game_quest_1'))}</li>
        <li class="home-quest-item home-quest-item-active">${escHtml(t('claim_game_quest_2'))}</li>
        <li class="home-quest-item home-quest-item-active">${escHtml(t('claim_game_quest_3'))}</li>
      </ul>
      <div class="home-quest-actions">
        ${needProfile
          ? `<button type="button" class="btn-ai home-quest-btn" id="home-quest-profile">${escHtml(t('collect800_profile_cta'))}</button>`
          : `<button type="button" class="btn-ai home-quest-btn" id="home-quest-search">${escHtml(t('first_run_go'))}</button>`}
        <button type="button" class="btn-outline home-quest-btn" id="home-quest-invite">${escHtml(t('claim_game_invite_btn'))}</button>
      </div>
    </section>`;
}

export function bindHomeQuestStrip(container) {
  container?.querySelector('#home-quest-dismiss')?.addEventListener('click', () => {
    localStorage.setItem(DISMISS_KEY, '1');
    container.querySelector('.home-quest-strip')?.remove();
  });
  container?.querySelector('#home-quest-profile')?.addEventListener('click', () => goToPage('profile'));
  container?.querySelector('#home-quest-search')?.addEventListener('click', () => goToPage('search'));
  container?.querySelector('#home-quest-invite')?.addEventListener('click', async () => {
    const ok = await copyPageUrl();
    showToast(ok ? t('search_invite_copied') : t('inapp_copy_fail'));
  });
}
