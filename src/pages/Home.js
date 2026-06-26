import { getMarkCount } from '../utils/storage.js';
import { escHtml }      from '../utils/html.js';
import { t }            from '../i18n/translations.js';
import { profileEnrichBannerHTML, bindProfileEnrichBanner } from '../components/ProfileEnrichBanner.js';
import { isGuestTrial, endGuestTrial } from '../utils/guestTrial.js';
import { bindGuestTrialLogin } from '../components/GuestTrialBanner.js';

export function renderHome(container) {
  container.classList.add('page-root');
  const markCount = getMarkCount();

  container.innerHTML = `
    <div class="hero hero-compact home-landing">
      <h1 class="hero-title serif">${escHtml(t('hero_title'))}</h1>
      <p class="hero-sub">${escHtml(t('hero_sub'))}</p>
      <a href="#search" class="btn-ai home-primary-cta">${escHtml(t('home_primary_cta'))}</a>
    </div>

    ${profileEnrichBannerHTML()}

    ${markCount > 0 ? `
    <div class="home-mark-summary">
      ${escHtml(t('home_mark_summary_prefix'))}<strong>${markCount}</strong>${escHtml(t('home_mark_summary_suffix'))}
      <a href="#marks" class="home-mark-link">${escHtml(t('home_quick_marks'))}</a>
    </div>` : ''}
    <div style="height:24px"></div>
  `;

  bindProfileEnrichBanner();
  if (isGuestTrial()) {
    bindGuestTrialLogin(container, { onBeforeLogin: endGuestTrial });
  }
}
