import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { LEADERS } from '../data/leaders.js';
import { heroPhotoHTML } from '../utils/avatar.js';

/** 首頁楊董介紹（含照片） */
export function yangIntroHTML() {
  const y = LEADERS.primary;
  const photo = heroPhotoHTML(y.name, { className: 'yang-intro-photo' });
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
      <a href="#leaders" class="btn-yang yang-intro-cta">${escHtml(t('home_view_leaders'))}</a>
    </article>`;
}
