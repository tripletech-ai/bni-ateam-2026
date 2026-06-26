import { escHtml, escAttr } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { showToast } from '../utils/toast.js';
import { isInAppBrowser, tryOpenExternalBrowser } from '../utils/inAppBrowser.js';
import { endGuestTrial } from '../utils/guestTrial.js';

const DISMISS_KEY = 'bni_guest_banner_dismissed';

export function isGuestBannerDismissed() {
  try { return sessionStorage.getItem(DISMISS_KEY) === '1'; }
  catch { return false; }
}

function dismissGuestBanner() {
  try { sessionStorage.setItem(DISMISS_KEY, '1'); }
  catch { /* ignore */ }
}

export function guestTrialBannerHTML() {
  return `
    <aside class="guest-trial-banner" role="alert" aria-live="polite">
      <div class="guest-trial-banner-inner">
        <div class="guest-trial-banner-text">
          <div class="guest-trial-banner-title">${escHtml(t('guest_banner_title'))}</div>
          <p class="guest-trial-banner-sub">${escHtml(t('guest_banner_sub'))}</p>
          <ul class="guest-trial-banner-list">
            <li>${escHtml(t('guest_banner_li1'))}</li>
            <li>${escHtml(t('guest_banner_li2'))}</li>
          </ul>
        </div>
        <div class="guest-trial-banner-actions">
          <button type="button" class="btn-ai guest-trial-login-btn">
            ${escHtml(t('guest_banner_login'))}
          </button>
          <button type="button" class="guest-trial-dismiss-btn" aria-label="${escAttr(t('guest_banner_dismiss'))}">
            ${escHtml(t('guest_banner_dismiss'))}
          </button>
        </div>
      </div>
    </aside>`;
}

export function guestTrialBannerMiniHTML() {
  return `
    <aside class="guest-trial-banner guest-trial-banner-mini" role="status">
      <div class="guest-trial-mini-inner">
        <span class="guest-trial-mini-text">${escHtml(t('guest_banner_mini'))}</span>
        <button type="button" class="btn-ai guest-trial-login-btn guest-trial-mini-btn">
          ${escHtml(t('guest_banner_login'))}
        </button>
      </div>
    </aside>`;
}

/** 首頁／標記等 — 訪客提醒（完整版，頂部無橫幅時用） */
export function guestHomeReminderHTML() {
  return `
    <section class="guest-home-reminder guest-home-reminder-compact" aria-labelledby="guest-home-reminder-title">
      <div class="guest-home-reminder-inner">
        <h2 id="guest-home-reminder-title" class="guest-home-reminder-title">${escHtml(t('guest_home_title'))}</h2>
        <p class="guest-home-reminder-lead">${escHtml(t('guest_home_lead'))}</p>
        <ul class="guest-home-reminder-list">
          <li>${escHtml(t('guest_home_li1'))}</li>
          <li>${escHtml(t('guest_home_li2'))}</li>
          <li>${escHtml(t('guest_home_li3'))}</li>
          <li>${escHtml(t('guest_home_li4'))}</li>
        </ul>
        <button type="button" class="btn-ai guest-home-login-btn guest-trial-login-btn">
          ${escHtml(t('guest_banner_login'))}
        </button>
      </div>
    </section>`;
}

/** 功能頁阻擋（頂部已有訪客橫幅時 — 避免重複四條說明） */
export function guestBlockedPageHTML(variant = 'default') {
  const titleKey = variant === 'marks' ? 'guest_marks_blocked_title'
    : variant === 'profile' ? 'guest_profile_blocked_title'
    : 'guest_home_title';
  const bodyKey = variant === 'marks' ? 'guest_marks_blocked_body'
    : variant === 'profile' ? 'guest_profile_blocked_body'
    : 'guest_home_lead';
  const secondary = variant === 'marks'
    ? `<button type="button" class="btn-outline guest-blocked-secondary" data-hash="search">${escHtml(t('marks_go'))}</button>`
    : '';

  return `
    <section class="guest-blocked-card" aria-labelledby="guest-blocked-title">
      <h2 id="guest-blocked-title" class="guest-blocked-title">${escHtml(t(titleKey))}</h2>
      <p class="guest-blocked-body">${escHtml(t(bodyKey))}</p>
      <div class="guest-blocked-actions">
        <button type="button" class="btn-ai guest-trial-login-btn">${escHtml(t('guest_banner_login'))}</button>
        ${secondary}
      </div>
    </section>`;
}

export function guestFeedLoginHTML() {
  return `
    <div class="guest-feed-login-card">
      <p class="guest-feed-login-lead">${escHtml(t('guest_feed_login'))}</p>
      <p class="guest-feed-login-sub">${escHtml(t('guest_feed_login_sub'))}</p>
      <button type="button" class="btn-ai guest-trial-login-btn">
        ${escHtml(t('guest_banner_login'))}
      </button>
    </div>`;
}

function goToClaimLogin(onBeforeLogin) {
  if (isInAppBrowser()) {
    showToast(t('inapp_toast'));
    tryOpenExternalBrowser();
    return;
  }
  onBeforeLogin?.();
  endGuestTrial();
  location.hash = '';
  location.reload();
}

export function bindGuestTrialLogin(container, { onBeforeLogin } = {}) {
  container?.querySelectorAll('.guest-trial-login-btn').forEach(btn => {
    btn.addEventListener('click', () => goToClaimLogin(onBeforeLogin));
  });
}

export function bindGuestBannerDismiss(container, { onDismiss } = {}) {
  container?.querySelector('.guest-trial-dismiss-btn')?.addEventListener('click', () => {
    dismissGuestBanner();
    onDismiss?.();
  });
}

/** 訪客橫幅：功能阻擋頁不顯示；關閉後改迷你列 */
export function shouldShowGuestBanner(hash = '') {
  const h = hash || window.location.hash || '#home';
  if (h === '#marks' || h === '#result' || h === '#profile') return false;
  return true;
}

export function renderGuestBanner(container, { onBeforeLogin, onDismiss } = {}) {
  if (!shouldShowGuestBanner()) return;
  const html = isGuestBannerDismissed() ? guestTrialBannerMiniHTML() : guestTrialBannerHTML();
  container.insertAdjacentHTML('afterbegin', html);
  bindGuestTrialLogin(container, { onBeforeLogin });
  if (!isGuestBannerDismissed()) {
    bindGuestBannerDismiss(container, { onDismiss });
  }
}
