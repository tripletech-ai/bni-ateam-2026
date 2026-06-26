import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { getMyStatus } from '../services/auth.js';
import { profileNeedsEnrichment } from '../utils/profileHints.js';

export function profileEnrichBannerHTML() {
  const member = getMyStatus()?.member;
  if (!profileNeedsEnrichment(member)) return '';

  return `
    <aside class="profile-enrich-banner profile-enrich-minimal" id="profile-enrich-banner">
      <p class="profile-enrich-text">${escHtml(t('profile_enrich_short'))}</p>
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
