import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { signInWithGoogle, getAuthEmail, checkIsAdmin, signOut } from '../services/auth.js';
import { ADMIN_EMAILS } from '../config/admins.js';
import { isInAppBrowser } from '../utils/inAppBrowser.js';
import { inAppBrowserGateHTML, bindInAppBrowserGate } from '../components/InAppBrowserGate.js';
import { showToast } from '../utils/toast.js';
import { setAdminLoginIntent } from '../utils/routing.js';

export async function renderAdminLogin(container, { onSuccess, denied = false } = {}) {
  const emailHint = ADMIN_EMAILS.map(e => escHtml(e)).join('、');

  if (denied) {
    container.innerHTML = `
      <div class="admin-login-wrap">
        <div class="admin-login-card admin-login-denied">
          <h1 class="admin-login-title serif">${escHtml(t('admin_denied_title'))}</h1>
          <p class="admin-denied">${escHtml(t('admin_denied_body', { emails: ADMIN_EMAILS.join('、') }))}</p>
          <p class="admin-signed-as">${escHtml(t('admin_signed_as'))} ${escHtml(getAuthEmail() || '—')}</p>
          <button type="button" id="admin-signout-retry" class="btn-outline">${escHtml(t('admin_login_retry'))}</button>
          <a href="/" class="admin-login-back">${escHtml(t('admin_login_back'))}</a>
        </div>
      </div>`;
    container.querySelector('#admin-signout-retry')?.addEventListener('click', async () => {
      await signOut();
      location.href = '/admin';
      location.reload();
    });
    return;
  }

  container.innerHTML = `
    <div class="admin-login-wrap">
      <header class="admin-login-head">
        <p class="admin-login-eyebrow">BNI A Team · Admin</p>
        <h1 class="admin-login-title serif">${escHtml(t('admin_login_title'))}</h1>
        <p class="admin-login-sub">${escHtml(t('admin_login_sub'))}</p>
      </header>
      <div class="admin-login-card">
        ${isInAppBrowser() ? inAppBrowserGateHTML() : `
        <p class="admin-login-hint">${escHtml(t('admin_login_hint'))}</p>
        <ul class="admin-login-emails" aria-label="${escHtml(t('admin_login_allowed'))}">
          ${ADMIN_EMAILS.map(e => `<li>${escHtml(e)}</li>`).join('')}
        </ul>
        <button type="button" id="admin-google-btn" class="btn-google admin-google-btn">
          ${escHtml(t('admin_login_google'))}
        </button>
        <p class="admin-login-foot">${escHtml(t('admin_login_foot'))}</p>
        <a href="/" class="admin-login-back">${escHtml(t('admin_login_back'))}</a>`}
      </div>
    </div>`;

  if (isInAppBrowser()) {
    bindInAppBrowserGate(container);
    return;
  }

  container.querySelector('#admin-google-btn')?.addEventListener('click', async () => {
    try {
      setAdminLoginIntent();
      await signInWithGoogle({ returnPath: '/admin' });
    } catch (e) {
      if (e.code === 'INAPP_BROWSER') showToast(t('inapp_toast'));
      else showToast(e.message || t('guest_login_fail'));
    }
  });

  const email = getAuthEmail();
  if (email && await checkIsAdmin()) {
    onSuccess?.();
  }
}
