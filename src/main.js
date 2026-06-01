import { renderTabBar } from './components/TabBar.js';
import { renderHome }   from './pages/Home.js';
import { renderSearch } from './pages/Search.js';
import { renderMarks }  from './pages/Marks.js';
import { renderResult } from './pages/Result.js';
import { renderLeaders }from './pages/Leaders.js';
import { t }            from './i18n/translations.js';

// ── Language ──────────────────────────────────────
window.BNI_LANG = localStorage.getItem('bni_lang') || 'zh';

function initLangToggle() {
  const btn = document.getElementById('lang-toggle');
  if (!btn) return;
  btn.textContent = t('lang_toggle');
  btn.addEventListener('click', () => {
    window.BNI_LANG = window.BNI_LANG === 'zh' ? 'en' : 'zh';
    localStorage.setItem('bni_lang', window.BNI_LANG);
    btn.textContent = t('lang_toggle');
    navigate();
  });
}

// ── Router ────────────────────────────────────────
const app = document.getElementById('app');

const routes = {
  ''         : renderHome,
  '#home'    : renderHome,
  '#search'  : renderSearch,
  '#marks'   : renderMarks,
  '#result'  : renderResult,
  '#leaders' : renderLeaders,
};

function navigate() {
  const hash = window.location.hash || '';
  const render = routes[hash] || renderHome;
  app.innerHTML = '';
  try {
    render(app);
  } catch (err) {
    console.error('Page render error:', err);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'padding:40px 20px;text-align:center;color:#f87171;font-family:Noto Sans TC,sans-serif';
    errorDiv.textContent = '頁面載入失敗，請重新整理';
    app.appendChild(errorDiv);
  }
  renderTabBar(document.getElementById('tab-bar'), hash);
  window.scrollTo(0, 0);
}

window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
});

window.addEventListener('hashchange', navigate);
initLangToggle();
navigate();
