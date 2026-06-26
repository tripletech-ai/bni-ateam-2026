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
        </div>
        <button type="button" class="btn-ai guest-trial-login-btn">
          ${escHtml(t('guest_banner_login'))}
        </button>
      </div>
    </aside>`;
}

/** 首頁登入提醒 — 精簡版（sticky banner 已涵蓋主要訊息） */
export function guestHomeReminderHTML() {
  return `
    <section class="guest-home-reminder guest-home-reminder-compact" aria-labelledby="guest-home-reminder-title">
      <div class="guest-home-reminder-inner">
        <p id="guest-home-reminder-title" class="guest-home-reminder-lead">${escHtml(t('guest_home_lead'))}</p>
        <button type="button" class="btn-ai guest-home-login-btn guest-trial-login-btn">
          ${escHtml(t('guest_banner_login'))}
        </button>
      </div>
    </section>`;
}

export function guestFeedLoginHTML() {
  return `
    <div class="guest-feed-login-card">
      <p>${escHtml(t('guest_feed_login'))}</p>
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
