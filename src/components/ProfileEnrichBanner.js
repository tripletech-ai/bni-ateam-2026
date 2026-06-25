import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { getMyStatus } from '../services/auth.js';
import { profileNeedsEnrichment } from '../utils/profileHints.js';

export function profileEnrichBannerHTML() {
  const member = getMyStatus()?.member;
  if (!profileNeedsEnrichment(member)) return '';

  return `
    <aside class="profile-enrich-banner" id="profile-enrich-banner">
      <div class="profile-enrich-icon" aria-hidden="true">✍️</div>
      <div class="profile-enrich-body">
        <div class="profile-enrich-title">${escHtml(t('profile_enrich_title'))}</div>
        <p class="profile-enrich-text">${escHtml(t('profile_enrich_body'))}</p>
      </div>
      <button type="button" class="profile-enrich-btn" id="profile-enrich-go">
        ${escHtml(t('profile_enrich_btn'))}
      </button>
    </aside>
  `;
}

export function bindProfileEnrichBanner() {
  document.getElementById('profile-enrich-go')?.addEventListener('click', () => {
    location.hash = 'profile';
  });
}
