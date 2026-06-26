import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';

/** 登入頁 — 超白話步驟（長輩／外區來賓） */
export function loginStepsGuideHTML() {
  return `
    <div class="login-steps-guide" aria-label="${escAttr(t('login_steps_title'))}">
      <p class="login-steps-title">${escHtml(t('login_steps_title'))}</p>
      <ol class="login-steps-list">
        <li>${escHtml(t('login_step_1'))}</li>
        <li>${escHtml(t('login_step_2'))}</li>
        <li>${escHtml(t('login_step_3'))}</li>
      </ol>
      <p class="login-steps-note">${escHtml(t('login_steps_note'))}</p>
    </div>`;
}

function escAttr(s) {
  return String(s || '').replace(/"/g, '&quot;');
}
