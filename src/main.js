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

// ── Welcome overlay (shown on every visit) ─────────────
function showWelcome() {
  const overlay = document.createElement('div');
  overlay.id = 'welcome-overlay';
  overlay.innerHTML = `
    <div id="welcome-card">
      <div class="welcome-eyebrow">BNI · ANDERSON TEAM · 2026 年會</div>
      <div class="welcome-title">A Team<br>商務連結系統</div>
      <div class="welcome-rule"></div>
      <div class="welcome-guide">
        <div class="welcome-row">
          <span class="welcome-tag">找人脈</span>
          <span class="welcome-desc">搜尋你想認識的夥伴</span>
        </div>
        <div class="welcome-row">
          <span class="welcome-tag">AI 搜尋</span>
          <span class="welcome-desc">說出需求，AI 幫你精準配對</span>
        </div>
        <div class="welcome-row">
          <span class="welcome-tag">標記</span>
          <span class="welcome-desc">記下想約 1-1 或合作的人</span>
        </div>
        <div class="welcome-row">
          <span class="welcome-tag">成果</span>
          <span class="welcome-desc">查看今天的標記進度</span>
        </div>
      </div>
      <div class="welcome-goal">今天目標：標記 5 位以上夥伴</div>
      <button id="welcome-start">開始使用</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('welcome-start').addEventListener('click', () => {
    overlay.style.transition = 'opacity 0.22s';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 230);
  });
}

window.addEventListener('hashchange', navigate);
initLangToggle();
showWelcome();
navigate();
