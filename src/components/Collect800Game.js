import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { memberProfileFilled } from '../utils/rosterPick.js';
import { getCurrentUser } from '../services/auth.js';
import { isGuestTrial, endGuestTrial } from '../utils/guestTrial.js';

export const COLLECT800_GOAL = 800;

export function getCollect800Stats() {
  const members = window.BNI_MEMBERS || [];
  const registered = window.BNI_PUBLIC_STATS?.total_members ?? members.length;
  const enriched = members.filter(memberProfileFilled).length;
  return { registered, enriched, goal: COLLECT800_GOAL };
}

export function collect800HTML() {
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

  return `
    <section class="collect800-card" aria-label="${escHtml(t('collect800_title'))}">
      <div class="collect800-glow" aria-hidden="true"></div>
      <div class="collect800-eyebrow">${escHtml(t('collect800_eyebrow'))}</div>
      <h2 class="collect800-title serif">${escHtml(t('collect800_title'))}</h2>
      <p class="collect800-sub">${escHtml(t('collect800_sub'))}</p>

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

      <p class="collect800-msg">${escHtml(t(msgKey))}</p>
      <div class="collect800-actions">
        <button type="button" class="btn-outline collect800-nudge" id="collect800-nudge">
          ${escHtml(t('collect800_nudge'))}
        </button>
        ${(!getCurrentUser() || isGuestTrial())
          ? `<button type="button" class="btn-ai collect800-profile" id="collect800-login">${escHtml(t('collect800_login_cta'))}</button>`
          : `<a href="#profile" class="btn-ai collect800-profile">${escHtml(t('collect800_profile_cta'))}</a>`}
      </div>
    </section>`;
}

export function bindCollect800Game() {
  document.getElementById('collect800-nudge')?.addEventListener('click', async () => {
    const text = t('collect800_nudge_text');
    try {
      await navigator.clipboard.writeText(text);
      import('../utils/toast.js').then(({ showToast }) => showToast(t('collect800_nudge_copied')));
    } catch {
      import('../utils/toast.js').then(({ showToast }) => showToast(text));
    }
  });
  document.getElementById('collect800-login')?.addEventListener('click', () => {
    endGuestTrial();
    location.hash = '';
    window.location.reload();
  });
}
