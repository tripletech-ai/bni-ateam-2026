import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { getMyStatus, isBound } from '../services/auth.js';
import { profileNeedsEnrichment, profileBackendEmpty } from '../utils/profileHints.js';
import { goToPage } from '../utils/nav.js';
import { showToast } from '../utils/toast.js';

export function profileEnrichBannerHTML() {
  const member = getMyStatus()?.member;
  if (!profileNeedsEnrichment(member)) return '';

  const empty = profileBackendEmpty(member);
  const titleKey = empty ? 'profile_enrich_empty_title' : 'profile_enrich_title';
  const bodyKey = empty ? 'profile_enrich_empty_body' : 'profile_enrich_short';

  return `
    <aside class="profile-enrich-banner${empty ? ' profile-enrich-urgent' : ' profile-enrich-minimal'}" id="profile-enrich-banner" role="alert">
      <div class="profile-enrich-body">
        <div class="profile-enrich-title">${escHtml(t(titleKey))}</div>
        <p class="profile-enrich-text">${escHtml(t(bodyKey))}</p>
      </div>
      <button type="button" class="profile-enrich-btn" id="profile-enrich-go">
        ${escHtml(t(empty ? 'profile_enrich_empty_btn' : 'profile_enrich_btn'))}
      </button>
    </aside>
  `;
}

export function bindProfileEnrichBanner() {
  document.getElementById('profile-enrich-go')?.addEventListener('click', () => {
    if (!isBound()) {
      showToast(t('collect800_claim_first'));
      return;
    }
    goToPage('profile');
  });
}
