import { escHtml, escAttr } from '../utils/html.js';
import {
  CHANGHUI_DINNER_EVENT,
  dinnerRosterStats,
} from '../data/changhuiDinner.js';

/**
 * 長輝擴大商機晚會 Landing
 * @param {HTMLElement} container
 * @param {{ onEnter: () => void }} opts
 */
export function renderDinnerLanding(container, { onEnter } = {}) {
  const ev = CHANGHUI_DINNER_EVENT;
  const stats = dinnerRosterStats();
  container.className = 'page-root dinner-landing-page';
  container.innerHTML = `
    <div class="dinner-landing-wrap">
      <header class="hero hero-compact dinner-landing-hero">
        <p class="dinner-landing-eyebrow">BNI 長輝白金分會</p>
        <h1 class="hero-title serif hero-title-gold dinner-landing-title"
            data-text="${escAttr(ev.title)}">${escHtml(ev.title)}</h1>
        <p class="dinner-landing-date">${escHtml(ev.dateLabel)}</p>
      </header>

      <section class="dinner-landing-card" aria-label="活動資訊">
        <ul class="dinner-landing-meta">
          <li><span class="dinner-meta-k">入場</span><span class="dinner-meta-v">${escHtml(ev.timeEntry)}</span></li>
          <li><span class="dinner-meta-k">開始</span><span class="dinner-meta-v">${escHtml(ev.timeStart)}</span></li>
          <li><span class="dinner-meta-k">地點</span><span class="dinner-meta-v">${escHtml(ev.venue)}</span></li>
          <li><span class="dinner-meta-k">地址</span><span class="dinner-meta-v">${escHtml(ev.address)}</span></li>
        </ul>
        <p class="dinner-landing-note">${escHtml(ev.note)}</p>
        <div class="dinner-landing-stats" role="list">
          <div class="dinner-stat" role="listitem">
            <div class="dinner-stat-num">${stats.members}</div>
            <div class="dinner-stat-label">長輝會員</div>
          </div>
          <div class="dinner-stat" role="listitem">
            <div class="dinner-stat-num">${stats.guests}</div>
            <div class="dinner-stat-label">來賓</div>
          </div>
          <div class="dinner-stat" role="listitem">
            <div class="dinner-stat-num">${stats.total}</div>
            <div class="dinner-stat-label">本場合計</div>
          </div>
        </div>
        <p class="dinner-evershine-link-wrap">
          <a class="dinner-evershine-link" href="${escAttr(ev.website)}" target="_blank" rel="noopener noreferrer">
            ${escHtml(ev.websiteLabel || '長輝分會網站 evershine.tw')}
          </a>
        </p>
      </section>

      <section class="dinner-landing-cta-block">
        <button type="button" class="btn-ai dinner-enter-btn" id="dinner-enter-btn">開始入場</button>
        <p class="dinner-landing-hint">從名單選擇自己 → 確認身分 → 開始商務交流與 AI 媒合</p>
      </section>
    </div>`;

  container.querySelector('#dinner-enter-btn')?.addEventListener('click', () => onEnter?.());
}
