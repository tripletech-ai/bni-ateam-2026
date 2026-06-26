import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { inAppBrowserLabel, tryOpenExternalBrowser, copyPageUrl } from '../utils/inAppBrowser.js';
import { showToast } from '../utils/toast.js';

export function inAppBrowserGateHTML() {
  const app = inAppBrowserLabel();
  const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  return `
    <aside class="inapp-browser-gate" role="alert">
      <div class="inapp-browser-icon" aria-hidden="true">⚠️</div>
      <div class="inapp-browser-title">${escHtml(t('inapp_title'))}</div>
      <p class="inapp-browser-lead">${escHtml(t('inapp_lead', { app }))}</p>
      <ol class="inapp-browser-steps">
        ${isIos
          ? `<li>${escHtml(t('inapp_step_ios_1'))}</li><li>${escHtml(t('inapp_step_ios_2'))}</li>`
          : `<li>${escHtml(t('inapp_step_android_1'))}</li><li>${escHtml(t('inapp_step_android_2'))}</li>`}
      </ol>
      <div class="inapp-browser-actions">
        <button type="button" class="btn-ai inapp-open-btn">${escHtml(t('inapp_open_browser'))}</button>
        <button type="button" class="btn-outline inapp-copy-btn">${escHtml(t('inapp_copy_link'))}</button>
      </div>
      <p class="inapp-browser-note">${escHtml(t('inapp_note'))}</p>
    </aside>`;
}

export function bindInAppBrowserGate(container) {
  container?.querySelector('.inapp-open-btn')?.addEventListener('click', () => {
    tryOpenExternalBrowser();
  });
  container?.querySelector('.inapp-copy-btn')?.addEventListener('click', async () => {
    const ok = await copyPageUrl();
    showToast(ok ? t('inapp_copy_ok') : t('inapp_copy_fail'));
  });
}
