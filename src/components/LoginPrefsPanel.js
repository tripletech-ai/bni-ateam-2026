import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { FONT_SIZES, FONT_LABEL_KEYS, applyFontSize, setLang } from '../utils/preferences.js';

function pressed(active) {
  return active ? 'true' : 'false';
}

function markLoginPrefsActive(panel) {
  panel.querySelectorAll('[data-lang]').forEach(btn => {
    const active = btn.dataset.lang === window.BNI_LANG;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', pressed(active));
  });
  panel.querySelectorAll('[data-fs]').forEach(btn => {
    const active = btn.dataset.fs === window.BNI_FONT;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', pressed(active));
  });
}

export function loginPrefsHTML() {
  const lang = window.BNI_LANG || 'zh';
  const font = window.BNI_FONT || 'fs-m';
  return `
    <div class="login-prefs-panel" id="login-prefs-panel">
      <p class="login-prefs-heading">${escHtml(t('login_prefs_heading'))}</p>
      <div class="login-prefs-row">
        <span class="login-prefs-label">${escHtml(t('login_prefs_lang'))}</span>
        <div class="login-prefs-seg" role="group" aria-label="${escHtml(t('login_prefs_lang'))}">
          <button type="button" class="login-prefs-btn${lang === 'zh' ? ' active' : ''}" data-lang="zh" aria-pressed="${pressed(lang === 'zh')}">中文</button>
          <button type="button" class="login-prefs-btn${lang === 'en' ? ' active' : ''}" data-lang="en" aria-pressed="${pressed(lang === 'en')}">EN</button>
        </div>
      </div>
      <div class="login-prefs-row">
        <span class="login-prefs-label">${escHtml(t('login_prefs_font'))}</span>
        <div class="login-prefs-seg login-prefs-font-seg" role="group" aria-label="${escHtml(t('login_prefs_font'))}">
          ${FONT_SIZES.map(fs => `
            <button type="button" class="login-prefs-btn login-prefs-fs-btn${font === fs ? ' active' : ''}" data-fs="${fs}" aria-pressed="${pressed(font === fs)}">${escHtml(t(FONT_LABEL_KEYS[fs]))}</button>
          `).join('')}
        </div>
      </div>
    </div>`;
}

export function bindLoginPrefs(container, { onChange } = {}) {
  const panel = container.querySelector('#login-prefs-panel');
  if (!panel) return;

  panel.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.lang === window.BNI_LANG) return;
      setLang(btn.dataset.lang);
      markLoginPrefsActive(panel);
      onChange?.({ type: 'lang' });
    });
  });

  panel.querySelectorAll('[data-fs]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.fs === window.BNI_FONT) return;
      applyFontSize(btn.dataset.fs);
      markLoginPrefsActive(panel);
      onChange?.({ type: 'font' });
    });
  });
}
