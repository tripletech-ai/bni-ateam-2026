import { renderTabBar } from './components/TabBar.js';
import { renderHome }   from './pages/Home.js';
import { renderSearch } from './pages/Search.js';
import { renderMarks }  from './pages/Marks.js';
import { renderResult } from './pages/Result.js';
import { renderLeaders }from './pages/Leaders.js';
import { renderOnboard, renderLoginGate } from './pages/Onboard.js';
import { renderAdmin }  from './pages/Admin.js';
import { renderProfileEdit } from './pages/ProfileEdit.js';
import { t }            from './i18n/translations.js';
import {
  initAuth,
  isBound,
  isTutorialDone,
  checkIsAdmin,
  fetchAllMembers,
  fetchPublicStats,
  getCurrentUser,
} from './services/auth.js';
import { renderUserBar } from './components/UserBar.js';
import { bootSkeletonHTML } from './utils/skeleton.js';
import { showWelcomeTutorial } from './pages/WelcomeTutorial.js';
import { loadMembersFromDb } from './services/membersApi.js';
import { withRetry } from './utils/retry.js';

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
    if (appReady) {
      const hash = window.location.hash || '';
      navigate();
      renderTabBar(tabBar, hash, { isAdmin });
      renderUserBar(userBar);
    } else {
      boot();
    }
  });
}

// ── Font size ─────────────────────────────────────
const FONT_SIZES = ['fs-s', 'fs-m', 'fs-l'];
const FONT_LABELS = { 'fs-s': '標準', 'fs-m': '大字', 'fs-l': '特大' };
window.BNI_FONT = localStorage.getItem('bni_font') || 'fs-s';

function applyFontSize(cls) {
  if (!FONT_SIZES.includes(cls)) cls = 'fs-s';
  document.documentElement.classList.remove(...FONT_SIZES);
  document.documentElement.classList.add(cls);
  window.BNI_FONT = cls;
  localStorage.setItem('bni_font', cls);
}

function initFontToggle() {
  const btn = document.getElementById('font-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = FONT_SIZES[(FONT_SIZES.indexOf(window.BNI_FONT) + 1) % FONT_SIZES.length];
    applyFontSize(next);
    import('./utils/toast.js').then(({ showToast }) => showToast(`字體：${FONT_LABELS[next]}`));
  });
}

applyFontSize(window.BNI_FONT);

// ── App state ─────────────────────────────────────
const app = document.getElementById('app');
const tabBar = document.getElementById('tab-bar');
const userBar = document.getElementById('user-bar');
let isAdmin = false;
let appReady = false;

const routes = {
  ''         : renderHome,
  '#home'    : renderHome,
  '#search'  : renderSearch,
  '#marks'   : renderMarks,
  '#result'  : renderResult,
  '#leaders' : renderLeaders,
  '#profile' : renderProfileEdit,
  '#admin'   : (c) => renderAdmin(c),
};

function setChromeVisible(showTabs) {
  tabBar.style.display = showTabs ? 'flex' : 'none';
  document.getElementById('font-toggle').style.display = showTabs ? '' : 'none';
  document.getElementById('lang-toggle').style.display = showTabs ? '' : 'none';
  if (showTabs && isBound()) renderUserBar(userBar);
  else if (userBar) userBar.classList.add('hidden');
}

function navigate() {
  if (!appReady) return;
  const hash = window.location.hash || '';
  const render = routes[hash] || renderHome;
  app.innerHTML = '';
  try {
    render(app);
  } catch (err) {
    console.error('Page render error:', err);
    app.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#f87171">頁面載入失敗，請重新整理</div>';
  }
  renderTabBar(tabBar, hash, { isAdmin });
  renderUserBar(userBar);
  window.scrollTo(0, 0);
}

async function afterBindComplete() {
  try {
    await loadMembersWithRetry();
  } catch (e) {
    console.warn('Reload members failed:', e);
  }
  showWelcomeIfNeeded();
  setChromeVisible(true);
  appReady = true;
  location.hash = '#home';
  navigate();
}

function showWelcomeIfNeeded() {
  if (!isTutorialDone()) showWelcomeTutorial({ applyFontSize });
}

function showBootError(message, { canRetry = true } = {}) {
  app.innerHTML = `
    <div class="boot-error">
      <p class="boot-error-title">載入失敗</p>
      <p class="boot-error-msg">${message}</p>
      ${canRetry ? '<button type="button" id="boot-retry-btn" class="btn-ai">重試</button>' : ''}
    </div>
  `;
  document.getElementById('boot-retry-btn')?.addEventListener('click', () => boot());
}

async function loadMembersWithRetry() {
  return withRetry(
    () => loadMembersFromDb(fetchAllMembers),
    { retries: 3, delayMs: 800, label: 'loadMembers' },
  );
}

async function loadPublicStatsWithRetry() {
  try {
    window.BNI_PUBLIC_STATS = await withRetry(() => fetchPublicStats(), {
      retries: 2, delayMs: 500, label: 'publicStats',
    });
  } catch (e) {
    console.warn('Public stats failed:', e.message);
  }
}

async function boot() {
  appReady = false;
  app.innerHTML = bootSkeletonHTML();
  setChromeVisible(false);

  try {
    await withRetry(() => initAuth(), { retries: 2, delayMs: 500, label: 'initAuth' });
  } catch (e) {
    console.error('initAuth failed:', e);
    showBootError('登入狀態載入失敗，請檢查網路後重試');
    return;
  }

  isAdmin = await checkIsAdmin();

  try {
    await loadMembersWithRetry();
    await loadPublicStatsWithRetry();
  } catch (e) {
    console.warn('DB members load failed:', e.message);
    if (!window.BNI_MEMBERS?.length) {
      showBootError('會員資料載入失敗，週六現場請確認網路後重試');
      return;
    }
  }

  const user = getCurrentUser();
  if (!user) {
    renderLoginGate(app);
    return;
  }

  if (!isBound()) {
    renderOnboard(app, { onComplete: afterBindComplete });
    return;
  }

  appReady = true;
  setChromeVisible(true);
  showWelcomeIfNeeded();
  navigate();
}

window.addEventListener('hashchange', navigate);
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
  import('./utils/toast.js').then(({ showToast }) => {
    showToast('操作失敗，請稍後再試');
  }).catch(() => {});
});

initLangToggle();
initFontToggle();
boot();
