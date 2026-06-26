import { escHtml, escAttr } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { LEADERS } from '../data/leaders.js';
import { heroPhotoHTML } from '../utils/avatar.js';
import { getCardLink } from '../data/cardLinks.js';

function yangContactHTML(y) {
  const parts = [];
  if (y.lineLink) {
    parts.push(`<a href="${escAttr(y.lineLink)}" class="yang-contact-btn line" target="_blank" rel="noopener">${escHtml(t('leaders_line'))}</a>`);
  }
  if (y.facebookLink) {
    parts.push(`<a href="${escAttr(y.facebookLink)}" class="yang-contact-btn fb" target="_blank" rel="noopener">${escHtml(t('leaders_facebook'))}</a>`);
  }
  if (y.email) {
    parts.push(`<a href="mailto:${escAttr(y.email)}" class="yang-contact-btn email">${escHtml(t('leaders_email'))}</a>`);
  }
  if (!parts.length) return '';
  return `<div class="yang-intro-contact">${parts.join('')}</div>`;
}

/** 首頁楊董介紹（含照片） */
export function yangIntroHTML() {
  const y = LEADERS.primary;
  const photo = heroPhotoHTML(y.name, { className: 'yang-intro-photo' });
  const cardLink = getCardLink(y.name) || y.cardLink || '';
  const cardBtn = cardLink
    ? `<a href="${escAttr(cardLink)}" class="btn-yang yang-intro-card-link" target="_blank" rel="noopener">${escHtml(t('leaders_card'))}</a>`
    : '';
  return `
    <article class="yang-intro-card">
      <div class="yang-intro-top">
        ${photo ? `<div class="yang-intro-photo-wrap">${photo}</div>` : ''}
        <div class="yang-intro-head">
          <div class="yang-intro-eyebrow">BNI ANDERSON TEAM</div>
          <h2 class="yang-intro-name serif">${escHtml(y.name)}</h2>
          <p class="yang-intro-title">${escHtml(y.title)} · ${escHtml(t('yang_intro_region'))}</p>
        </div>
      </div>
      <p class="yang-intro-text">${escHtml(t('yang_intro_body'))}</p>
      ${yangContactHTML(y)}
      <div class="yang-intro-actions">
        <a href="#leaders" class="btn-yang yang-intro-cta">${escHtml(t('home_view_leaders'))}</a>
        ${cardBtn}
      </div>
    </article>`;
}
