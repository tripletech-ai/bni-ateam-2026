import { escHtml, escAttr } from '../utils/html.js';
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

export function renderRegistrationClosed(container) {
  const sunset = formatSunsetLabel();
  container.className = 'page-root registration-closed-page';
  container.innerHTML = `
    <div class="registration-closed-wrap">
      <header class="hero hero-compact registration-closed-hero">
        <h1 class="hero-title serif hero-title-gold registration-closed-title"
            data-text="${escAttr(t('hero_title'))}">${escHtml(t('hero_title'))}</h1>
        <p class="hero-sub registration-closed-tagline serif hero-title-gold"
           data-text="${escAttr(t('hero_sub'))}">${escHtml(t('hero_sub'))}</p>
      </header>

      <section class="registration-closed-card">
        <p class="registration-closed-lead">${escHtml(t('reg_closed_sorry'))}</p>
        <p class="registration-closed-body">${escHtml(t('reg_closed_only_bound'))}</p>
        <p class="registration-closed-body">${escHtml(t('reg_closed_no_new'))}</p>
      </section>

      <section class="registration-closed-card registration-closed-sunset">
        <p class="registration-closed-sunset-title">${escHtml(t('sunset_banner_title'))}</p>
        <p class="registration-closed-body">${escHtml(t('sunset_banner_body', { when: sunset }))}</p>
        <p class="registration-closed-muted">${escHtml(t('sunset_banner_urgent'))}</p>
      </section>

      <section class="registration-closed-card">
        <p class="registration-closed-muted">${escHtml(t('reg_closed_already_hint'))}</p>
      </section>
    </div>
  `;
}
