import { getMarkCount } from '../utils/storage.js';
import { escHtml }      from '../utils/html.js';
import { t }            from '../i18n/translations.js';
import { DEVELOPERS } from '../data/contributors.js';
import { profileEnrichBannerHTML, bindProfileEnrichBanner } from '../components/ProfileEnrichBanner.js';
import { leadersEmbedHTML, bindLeaderEvents } from '../pages/Leaders.js';
import { isGuestTrial, endGuestTrial } from '../utils/guestTrial.js';
import { bindGuestTrialLogin } from '../components/GuestTrialBanner.js';

function developerCardHTML(d) {
  const initial = (d.name || '').match(/[一-鿿㐀-䶿]/g)?.slice(-1)[0] || '?';
  const tags = (d.tagKeys || []).map(k =>
    `<span class="developer-tag">${escHtml(t(k))}</span>`).join('');
  const highlights = (d.highlightKeys || []).map(k =>
    `<li class="developer-highlight-item">${escHtml(t(k))}</li>`).join('');
  const companies = d.companyKeys
    ? `<div class="developer-companies">${d.companyKeys.map(k =>
        `<span class="company-chip">${escHtml(t(k))}</span>`).join('')}</div>` : '';
  const branchLine = d.branchKey
    ? `<div class="developer-branch">${escHtml(t(d.branchKey))}</div>` : '';

  return `
    <article class="developer-card" data-developer="${escHtml(d.id)}">
      <div class="developer-card-top">
        <div class="developer-photo">
          <img src="assets/photos/${encodeURIComponent(d.photo)}"
            alt="" loading="lazy"
            onerror="this.style.display='none';this.parentElement.classList.add('no-photo')">
          <span class="developer-photo-fallback" aria-hidden="true">${escHtml(initial)}</span>
        </div>
        <div class="developer-head-block">
          <div class="developer-name serif">${escHtml(d.name)}</div>
          ${branchLine}
          <div class="developer-role">${escHtml(t(d.roleKey))}</div>
          <div class="developer-tags">${tags}</div>
        </div>
      </div>
      <ul class="developer-highlights">${highlights}</ul>
      ${companies}
      ${d.contactKey ? `<p class="developer-contact-note">${escHtml(t(d.contactKey))}</p>` : ''}
    </article>`;
}

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

    <div class="section-header">
      <div class="section-title">${escHtml(t('home_developers'))}</div>
      <p class="section-sub">${escHtml(t('home_developers_sub'))}</p>
    </div>
    <div class="developer-stack">
      ${DEVELOPERS.map(developerCardHTML).join('')}
    </div>

    <div class="section-header">
      <div class="section-title">${escHtml(t('leaders_title'))}</div>
      <p class="section-sub">${escHtml(t('leaders_sub'))}</p>
    </div>
    ${leadersEmbedHTML()}

    <div style="height:24px"></div>
  `;

  bindLeaderEvents(container);
  bindProfileEnrichBanner();
  if (isGuestTrial()) {
    bindGuestTrialLogin(container, { onBeforeLogin: endGuestTrial });
  }
}
