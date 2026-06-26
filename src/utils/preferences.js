export const FONT_SIZES = ['fs-s', 'fs-m', 'fs-l'];
export const FONT_LABEL_KEYS = { 'fs-s': 'font_s', 'fs-m': 'font_m', 'fs-l': 'font_l' };
export const DEFAULT_FONT = 'fs-m';
export const DEFAULT_LANG = 'zh';

export function getLang() {
  return localStorage.getItem('bni_lang') === 'en' ? 'en' : DEFAULT_LANG;
}

export function getFont() {
  const stored = localStorage.getItem('bni_font');
  return FONT_SIZES.includes(stored) ? stored : DEFAULT_FONT;
}

export function applyFontSize(cls) {
  if (!FONT_SIZES.includes(cls)) cls = DEFAULT_FONT;
  document.documentElement.classList.remove(...FONT_SIZES);
  document.documentElement.classList.add(cls);
  window.BNI_FONT = cls;
  localStorage.setItem('bni_font', cls);
}

export function setLang(lang) {
  window.BNI_LANG = lang === 'en' ? 'en' : 'zh';
  localStorage.setItem('bni_lang', window.BNI_LANG);
}

export function initPreferences() {
  window.BNI_LANG = getLang();
  applyFontSize(getFont());
}
