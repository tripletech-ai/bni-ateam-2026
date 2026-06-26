import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';

/** 現場夥伴人數（來自會員資料庫，非手動刷） */
export function communityLiveHTML() {
  const n = window.BNI_PUBLIC_STATS?.total_members;
  const count = n != null ? String(n) : '—';
  return `
    <section class="community-live-card" aria-label="${escHtml(t('community_live_title'))}">
      <div class="community-live-glow" aria-hidden="true"></div>
      <div class="community-live-eyebrow">${escHtml(t('community_live_eyebrow'))}</div>
      <h2 class="community-live-title serif">${escHtml(t('community_live_title'))}</h2>
      <div class="community-live-count-row">
        <span class="community-live-num" id="community-live-num">${escHtml(count)}</span>
        <span class="community-live-unit">${escHtml(t('community_live_unit'))}</span>
      </div>
      <p class="community-live-sub">${escHtml(t('community_live_sub'))}</p>
    </section>
  `;
}

export function refreshCommunityLiveCount() {
  const n = window.BNI_PUBLIC_STATS?.total_members;
  const el = document.getElementById('community-live-num');
  if (el && n != null) el.textContent = String(n);
}
