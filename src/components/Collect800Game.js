import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { memberProfileFilled } from '../utils/rosterPick.js';
import { isBound } from '../services/auth.js';
import { copyPageUrl } from '../utils/inAppBrowser.js';
import { goToPage } from '../utils/nav.js';
import { showToast } from '../utils/toast.js';

export const COLLECT800_GOAL = 800;

export function getCollect800Stats() {
  const members = window.BNI_MEMBERS || [];
  const registered = window.BNI_PUBLIC_STATS?.total_members ?? members.length;
  const enriched = members.filter(memberProfileFilled).length;
  return { registered, enriched, goal: COLLECT800_GOAL };
}

function secondaryActionHTML(context = 'home') {
  if (context === 'login') return '';
  if (!isBound()) return '';
  return `<button type="button" class="btn-ai collect800-secondary" id="collect800-profile">${escHtml(t('collect800_profile_cta'))}</button>`;
}

export function collect800HTML({ context = 'home' } = {}) {
  const { registered, enriched, goal } = getCollect800Stats();
  const regPct = Math.min(100, Math.round((registered / goal) * 100));
  const enrichPct = Math.min(100, Math.round((enriched / goal) * 100));
  const msgKey = registered >= goal
    ? 'collect800_msg_done'
    : registered >= goal * 0.75
      ? 'collect800_msg_high'
      : registered >= goal * 0.5
        ? 'collect800_msg_mid'
        : 'collect800_msg_low';
  const subKey = context === 'login' ? 'collect800_sub_login' : 'collect800_sub';
  const secondary = secondaryActionHTML(context);
  const actionsClass = secondary ? 'collect800-actions' : 'collect800-actions collect800-actions-single';

  return `
    <section class="collect800-card" aria-label="${escHtml(t('collect800_title'))}">
      <div class="collect800-glow" aria-hidden="true"></div>
      <div class="collect800-eyebrow">${escHtml(t('collect800_eyebrow'))}</div>
      <h2 class="collect800-title serif">${escHtml(t('collect800_title'))}</h2>
      <p class="collect800-sub">${escHtml(t(subKey))}</p>

      <div class="collect800-metric">
        <div class="collect800-metric-head">
          <span>${escHtml(t('collect800_registered'))}</span>
          <span class="collect800-count"><strong>${registered}</strong> / ${goal}</span>
        </div>
        <div class="collect800-track" role="progressbar" aria-valuenow="${registered}" aria-valuemin="0" aria-valuemax="${goal}">
          <div class="collect800-fill collect800-fill-gold" style="width:${regPct}%"></div>
        </div>
      </div>

      <div class="collect800-metric">
        <div class="collect800-metric-head">
          <span>${escHtml(t('collect800_enriched'))}</span>
          <span class="collect800-count"><strong>${enriched}</strong> / ${goal}</span>
        </div>
        <div class="collect800-track" role="progressbar" aria-valuenow="${enriched}" aria-valuemin="0" aria-valuemax="${goal}">
          <div class="collect800-fill collect800-fill-blue" style="width:${enrichPct}%"></div>
        </div>
      </div>

      <p class="collect800-msg">${escHtml(t(context === 'login' ? 'collect800_msg_login' : msgKey))}</p>
      <div class="${actionsClass}">
        <button type="button" class="btn-gold-outline collect800-copy-link" id="collect800-copy-link">
          ${escHtml(t('search_invite_copy'))}
        </button>
        ${secondary}
      </div>
    </section>`;
}

export function bindCollect800Game(container) {
  const root = container || document;

  root.querySelector('#collect800-copy-link')?.addEventListener('click', async () => {
    const ok = await copyPageUrl();
    showToast(ok ? t('search_invite_copied') : t('inapp_copy_fail'));
  });

  root.querySelector('#collect800-profile')?.addEventListener('click', () => {
    if (!isBound()) return;
    goToPage('profile');
  });
}
