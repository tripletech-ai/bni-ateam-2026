import { getMarkCount } from '../utils/storage.js';
import { escHtml, escAttr } from '../utils/html.js';
import { t }            from '../i18n/translations.js';
import { DEVELOPERS } from '../data/contributors.js';
import { developerPhotoHTML } from '../utils/avatar.js';
import { collect800HTML, bindCollect800Game } from '../components/Collect800Game.js';
import { yangIntroHTML } from '../components/YangIntroCard.js';
import { homeLeadersSectionsHTML, homeSectionAccordion, bindLeaderEvents } from '../pages/Leaders.js';
import { isBound } from '../services/auth.js';
import { isGuestTrial, endGuestTrial } from '../utils/guestTrial.js';
import { bindGuestTrialLogin } from '../components/GuestTrialBanner.js';
import { isDinnerMode } from '../config/appMode.js';
import { CHANGHUI_DINNER_EVENT, dinnerRosterStats } from '../data/changhuiDinner.js';

function developerCardHTML(d) {
  const tags = (d.tagKeys || []).map(k =>
    `<span class="developer-tag">${escHtml(t(k))}</span>`).join('');
  const highlights = (d.highlightKeys || []).map(k =>
    `<li class="developer-highlight-item">${escHtml(t(k))}</li>`).join('');
  const companies = d.companyKeys
    ? `<div class="developer-companies">${d.companyKeys.map(k =>
        `<span class="company-chip">${escHtml(t(k))}</span>`).join('')}</div>` : '';
  const branchLine = d.branchKey
    ? `<div class="developer-branch">${escHtml(t(d.branchKey))}</div>` : '';
  const lineBtn = d.lineLink
    ? `<a href="${escAttr(d.lineLink)}" class="btn-gold-outline developer-line-btn" target="_blank" rel="noopener">${escHtml(t('marks_line'))}</a>`
    : '';

  return `
    <article class="developer-card" data-developer="${escHtml(d.id)}">
      <div class="developer-card-top">
        ${developerPhotoHTML(d.name, d.photo)}
        <div class="developer-head-block">
          <div class="developer-name serif">${escHtml(d.name)}</div>
          ${branchLine}
          <div class="developer-role">${escHtml(t(d.roleKey))}</div>
          <div class="developer-tags">${tags}</div>
        </div>
      </div>
      <ul class="developer-highlights">${highlights}</ul>
      ${companies}
      ${lineBtn ? `<div class="developer-actions">${lineBtn}</div>` : ''}
      ${d.contactKey ? `<p class="developer-contact-note">${escHtml(t(d.contactKey))}</p>` : ''}
    </article>`;
}

function dinnerTonightCardHTML() {
  const ev = CHANGHUI_DINNER_EVENT;
  const stats = dinnerRosterStats();
  return `
    <section class="dinner-tonight-card" aria-label="${escAttr(ev.title)}">
      <p class="dinner-tonight-eyebrow">今晚現場</p>
      <h2 class="dinner-tonight-title serif">${escHtml(ev.title)}</h2>
      <p class="dinner-tonight-meta">${escHtml(ev.dateLabel)} · ${escHtml(ev.timeEntry)} · ${escHtml(ev.venue)}</p>
      <p class="dinner-tonight-body">本場 ${stats.members} 位長輝會員、${stats.guests} 位來賓 — 用 AI 找合作對象、標記想約 1-1。</p>
      <a href="#search" class="btn-ai dinner-tonight-cta">開始找本場夥伴</a>
      <p class="dinner-evershine-link-wrap">
        <a class="dinner-evershine-link" href="${escAttr(ev.website)}" target="_blank" rel="noopener noreferrer">
          ${escHtml(ev.websiteLabel || '長輝分會網站 evershine.tw')}
        </a>
      </p>
    </section>`;
}

export function renderHome(container) {
  container.classList.add('page-root');
  const markCount = getMarkCount();
  const dinner = isDinnerMode();

  container.innerHTML = `
    <div class="hero hero-compact home-landing">
      <h1 class="hero-title serif hero-title-gold" data-text="${escAttr(t('hero_title'))}">${escHtml(t('hero_title'))}</h1>
      <p class="hero-sub">${escHtml(dinner ? '長輝擴大商機晚會 · 說你想找誰，AI 幫你媒合' : t('hero_sub'))}</p>
      <a href="#search" class="btn-ai home-primary-cta">${escHtml(t('home_primary_cta'))}</a>
    </div>

    ${dinner ? dinnerTonightCardHTML() : collect800HTML({ context: 'home' })}

    ${yangIntroHTML()}

    ${markCount > 0 ? `
    <div class="home-mark-summary">
      ${escHtml(t('home_mark_summary_prefix'))}<strong>${markCount}</strong>${escHtml(t('home_mark_summary_suffix'))}
      <a href="#marks" class="home-mark-link">${escHtml(t('home_quick_marks'))}</a>
    </div>` : ''}

    ${homeLeadersSectionsHTML()}

    ${homeSectionAccordion(t('home_section_developers'), `
      <p class="home-section-sub">${escHtml(t('home_developers_sub'))}</p>
      <div class="developer-stack home-developer-stack">${DEVELOPERS.map(developerCardHTML).join('')}</div>
    `, 'home-developers', { defaultOpen: dinner ? false : true })}

    <div style="height:24px"></div>
  `;

  bindLeaderEvents(container);
  if (!dinner) bindCollect800Game(container);
  if (isGuestTrial()) {
    bindGuestTrialLogin(container, { onBeforeLogin: endGuestTrial });
  }
}
