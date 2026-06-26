import { renderTabBar } from './components/TabBar.js';
import { renderHome }   from './pages/Home.js';
import { renderSearch } from './pages/Search.js';
import { renderMarks }  from './pages/Marks.js';
import { renderLeaders }from './pages/Leaders.js';
import { renderLive, stopLivePoll } from './pages/Live.js';
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
  fetchIncomingMarks,
  fetchMyMutualStats,
  recordPresence,
  fetchLeaderboard,
  fetchFeed,
  fetchLiveSettings,
} from './services/auth.js';
import { showIncomingOneOverlay } from './components/IncomingOneBanner.js';
import { renderUserBar } from './components/UserBar.js';
import { bootSkeletonHTML } from './utils/skeleton.js';
import { showWelcomeTutorial } from './pages/WelcomeTutorial.js';
import { loadMembersFromDb } from './services/membersApi.js';
import { withRetry } from './utils/retry.js';
import { isGuestTrial, endGuestTrial } from './utils/guestTrial.js';
import { guestTrialBannerHTML, bindGuestTrialLogin } from './components/GuestTrialBanner.js';
import { showToast } from './utils/toast.js';
import { notifyProfileMilestone } from './utils/profileMilestone.js';

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
const FONT_LABEL_KEYS = { 'fs-s': 'font_s', 'fs-m': 'font_m', 'fs-l': 'font_l' };
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
    import('./utils/toast.js').then(({ showToast }) => showToast(`${t('font_label')}${t(FONT_LABEL_KEYS[next])}`));
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
  '#result'  : renderMarks,
  '#leaders' : renderLeaders,
  '#live'    : renderLive,
  '#profile' : renderProfileEdit,
  '#admin'   : (c) => renderAdmin(c),
};

function setChromeVisible(showTabs) {
  tabBar.style.display = showTabs ? 'flex' : 'none';
  document.getElementById('font-toggle').style.display = showTabs ? '' : 'none';
  document.getElementById('lang-toggle').style.display = showTabs ? '' : 'none';
  if (showTabs && isBound()) renderUserBar(userBar);
  else if (userBar) userBar.classList.add('hidden');
  document.body.classList.toggle('guest-trial-mode', showTabs && isGuestTrial());
}

function navigate() {
  if (!appReady) return;
  let hash = window.location.hash || '';
  if (hash === '#admin' && !isAdmin) {
    hash = '#home';
    if (window.location.hash === '#admin') {
      history.replaceState(null, '', '#home');
    }
  }
  if (hash === '#result') {
    hash = '#marks';
    if (window.location.hash === '#result') {
      history.replaceState(null, '', '#marks');
    }
  }
  if (isGuestTrial()) {
    if (hash === '#admin' || hash === '#profile') {
      hash = '#home';
      if (window.location.hash === '#admin' || window.location.hash === '#profile') {
        history.replaceState(null, '', '#home');
      }
      showToast(t('guest_login_required'));
    }
  }
  const render = routes[hash] || renderHome;
  if (hash !== '#live') stopLivePoll();
  app.innerHTML = '';
  try {
    render(app);
    if (isGuestTrial()) {
      app.insertAdjacentHTML('afterbegin', guestTrialBannerHTML());
      bindGuestTrialLogin(app, { onBeforeLogin: endGuestTrial });
    }
  } catch (err) {
    console.error('Page render error:', err);
    app.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#f87171">頁面載入失敗，請重新整理</div>';
  }
  renderTabBar(tabBar, hash, { isAdmin });
  renderUserBar(userBar);
  window.scrollTo(0, 0);
}

let incomingPollTimer = null;
let incomingMarksUnavailable = false;

function cacheIncomingKeys(rows) {
  window.BNI_INCOMING_ONE_KEYS = new Set(
    (rows || []).map(r => `${r.name}||${r.branch}`),
  );
}

async function syncMutualStats() {
  try {
    const stats = await fetchMyMutualStats();
    if (stats && typeof stats.mutual_count === 'number') {
      window.BNI_MUTUAL_COUNT = stats.mutual_count;
    }
  } catch (e) {
    console.warn('mutual stats:', e.message);
  }
}

async function preloadLiveData() {
  try {
    const settings = await fetchLiveSettings();
    const modes = settings?.leaderboard_modes || ['mutual', 'received_one'];
    const [feed, ...boards] = await Promise.all([
      fetchFeed(30),
      ...modes.map(mode => fetchLeaderboard(30, mode)),
    ]);
    window.BNI_LEADERBOARDS = {};
    modes.forEach((mode, i) => { window.BNI_LEADERBOARDS[mode] = boards[i] || []; });
    window.BNI_LIVE_SETTINGS = settings;
    window.BNI_LEADERBOARD = window.BNI_LEADERBOARDS.mutual || boards[0] || [];
    window.BNI_FEED = feed;
  } catch (e) {
    console.warn('preload live:', e.message);
  }
}

async function pollIncomingMarks() {
  if (!isBound() || incomingMarksUnavailable) return;
  try {
    const rows = await fetchIncomingMarks(true);
    cacheIncomingKeys(rows);
    await syncMutualStats();
    if (rows?.length) showIncomingOneOverlay(rows);
  } catch (e) {
    if (e.code === 'RPC_NOT_DEPLOYED' || /could not find the function/i.test(e.message || '')) {
      incomingMarksUnavailable = true;
      if (incomingPollTimer) {
        clearInterval(incomingPollTimer);
        incomingPollTimer = null;
      }
      return;
    }
    console.warn('incoming marks:', e.message);
  }
}

function startIncomingPoll() {
  if (incomingPollTimer) clearInterval(incomingPollTimer);
  pollIncomingMarks();
  incomingPollTimer = setInterval(pollIncomingMarks, 45000);
}

async function afterBindComplete() {
  try {
    await loadMembersWithRetry();
    await loadPublicStatsWithRetry();
  } catch (e) {
    console.warn('Reload members failed:', e);
  }
  isAdmin = await checkIsAdmin();
  showWelcomeIfNeeded();
  recordPresence().catch(() => {});
  preloadLiveData();
  startIncomingPoll();
  setChromeVisible(true);
  appReady = true;
  location.hash = '#home';
  navigate();
}

function showWelcomeIfNeeded() {
  if (!isTutorialDone()) {
    showWelcomeTutorial({
      applyFontSize,
      onGoProfile: () => {
        appReady = true;
        setChromeVisible(true);
        location.hash = 'profile';
        navigate();
      },
    });
  }
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
  const result = await withRetry(
    () => loadMembersFromDb(fetchAllMembers),
    { retries: 3, delayMs: 800, label: 'loadMembers' },
  );
  syncProfileMilestone();
  return result;
}

function syncProfileMilestone() {
  const hit = notifyProfileMilestone(window.BNI_MEMBERS);
  if (hit) window.BNI_PROFILE_MILESTONE = hit;
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

async function enterGuestMode() {
  try {
    await loadMembersWithRetry();
  } catch (e) {
    console.warn('Guest mode members load:', e.message);
    if (!window.BNI_MEMBERS?.length) {
      showBootError('會員資料載入失敗，請檢查網路後重試');
      return;
    }
  }
  await loadPublicStatsWithRetry();
  preloadLiveData();
  isAdmin = false;
  appReady = true;
  setChromeVisible(true);
  if (!window.location.hash || window.location.hash === '#profile' || window.location.hash === '#admin') {
    location.hash = '#home';
  }
  navigate();
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

  if (getCurrentUser()) endGuestTrial();

  isAdmin = await checkIsAdmin();

  try {
    await loadMembersWithRetry();
  } catch (e) {
    console.warn('DB members load failed:', e.message);
    if (!window.BNI_MEMBERS?.length) {
      showBootError('會員資料載入失敗，週六現場請確認網路後重試');
      return;
    }
  }
  await loadPublicStatsWithRetry();

  const user = getCurrentUser();
  if (!user) {
    if (isGuestTrial()) {
      await enterGuestMode();
      return;
    }
    renderLoginGate(app, { onGuestTrial: enterGuestMode });
    return;
  }

  if (!isBound()) {
    renderOnboard(app, { onComplete: afterBindComplete });
    return;
  }

  appReady = true;
  setChromeVisible(true);
  showWelcomeIfNeeded();
  recordPresence().catch(() => {});
  preloadLiveData();
  startIncomingPoll();
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
