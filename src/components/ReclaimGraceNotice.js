import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { SUNSET_AT } from '../config/appMode.js';

function formatSunsetLabel() {
  try {
    return new Date(SUNSET_AT).toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '6/29（日）23:59';
  }
}

/** 登入／認領頁 — 活動後僅限重新認領既有名單 */
export function reclaimGraceNoticeHTML() {
  const when = formatSunsetLabel();
  return `
    <aside class="reclaim-grace-notice" role="status">
      <p class="reclaim-grace-title">${escHtml(t('reg_closed_reclaim_title'))}</p>
      <p class="reclaim-grace-body">${escHtml(t('reg_closed_reclaim_body'))}</p>
      <p class="reclaim-grace-sunset">${escHtml(t('sunset_banner_body', { when }))}</p>
      <p class="reclaim-grace-urgent">${escHtml(t('sunset_banner_urgent'))}</p>
    </aside>`;
}
