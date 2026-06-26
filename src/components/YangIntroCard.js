import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { LEADERS } from '../data/leaders.js';

/** 首頁楊董介紹（純文字，不佔頭貼位） */
export function yangIntroHTML() {
  const y = LEADERS.primary;
  return `
    <article class="yang-intro-card">
      <div class="yang-intro-eyebrow">BNI ANDERSON TEAM</div>
      <h2 class="yang-intro-name serif">${escHtml(y.name)}</h2>
      <p class="yang-intro-title">${escHtml(y.title)} · ${escHtml(t('yang_intro_region'))}</p>
      <p class="yang-intro-text">${escHtml(t('yang_intro_body'))}</p>
      <a href="#leaders" class="btn-yang yang-intro-cta">${escHtml(t('home_view_leaders'))}</a>
    </article>`;
}
