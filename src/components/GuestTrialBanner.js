import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { showToast } from '../utils/toast.js';
import { isInAppBrowser, tryOpenExternalBrowser } from '../utils/inAppBrowser.js';
import { endGuestTrial } from '../utils/guestTrial.js';

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
        <button type="button" class="btn-ai guest-trial-login-btn">
          ${escHtml(t('guest_banner_login'))}
        </button>
      </div>
    </aside>`;
}

/** 首頁／標記等 — 訪客提醒 */
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
