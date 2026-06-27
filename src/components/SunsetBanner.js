import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { SUNSET_AT } from '../config/appMode.js';

const DISMISS_KEY = 'bni_sunset_banner_dismissed';

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

export function sunsetBannerHTML() {
  if (sessionStorage.getItem(DISMISS_KEY) === '1') return '';
  const when = formatSunsetLabel();
  return `
    <aside class="sunset-banner" role="status" aria-live="polite">
      <div class="sunset-banner-inner">
        <div class="sunset-banner-text">
          <p class="sunset-banner-title">${escHtml(t('sunset_banner_title'))}</p>
          <p class="sunset-banner-body">${escHtml(t('sunset_banner_body', { when }))}</p>
          <p class="sunset-banner-urgent">${escHtml(t('sunset_banner_urgent'))}</p>
        </div>
        <button type="button" class="sunset-banner-dismiss" id="sunset-banner-dismiss"
          aria-label="${escHtml(t('sunset_banner_dismiss'))}">×</button>
      </div>
    </aside>`;
}

export function mountSunsetBanner(container) {
  if (!container || container.querySelector('.sunset-banner')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = sunsetBannerHTML();
  const banner = wrap.firstElementChild;
  if (!banner) return;
  container.prepend(banner);
  banner.querySelector('#sunset-banner-dismiss')?.addEventListener('click', () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    banner.remove();
  });
}
