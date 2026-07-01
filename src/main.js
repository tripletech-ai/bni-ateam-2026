import { renderTabBar } from './components/TabBar.js';
import { renderHome }   from './pages/Home.js';
import { renderSearch } from './pages/Search.js';
import { renderMarks, refreshIncomingMarksSection } from './pages/Marks.js';
import { renderLeaders }from './pages/Leaders.js';
import { renderLive, stopLivePoll } from './pages/Live.js';
import { renderOnboard, renderLoginGate, tryPendingClaim } from './pages/Onboard.js';
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
  recordPresence,
  fetchLeaderboard,
  fetchFeed,
  fetchLiveSettings,
  tryAutoBindOnLogin,
  fetchEventChapters,
  getMyStatus,
  refreshStatus,
} from './services/auth.js';
import { showIncomingOneOverlay, dismissIncomingOverlay } from './components/IncomingOneBanner.js';
import { setIncomingUnseenCount } from './utils/incomingMarks.js';
import { renderUserBar } from './components/UserBar.js';
import { bootSkeletonHTML } from './utils/skeleton.js';
import { showFirstRunHint, finishOnboardingTutorial } from './components/FirstRunHint.js';
import { loadMembersFromDb } from './services/membersApi.js';
import { withRetry } from './utils/retry.js';
import { isGuestTrial, endGuestTrial } from './utils/guestTrial.js';
import { renderGuestBanner } from './components/GuestTrialBanner.js';
import { showGuestTrialIntro } from './components/GuestTrialIntro.js';
import { showToast } from './utils/toast.js';
import { notifyProfileMilestone } from './utils/profileMilestone.js';
import { clearPendingClaim } from './utils/memberClaim.js';
import { mergePendingMarks } from './utils/storage.js';
import { syncAllMarksToServer } from './utils/markSync.js';
import { refreshLeaderboardCache } from './utils/leaderboardCache.js';
import { refreshConnectionCache } from './utils/connectionCache.js';
import { restoreMarksFromServer } from './utils/marksRestore.js';
import { normalizeAppUrl } from './utils/appUrl.js';
import { profileBackendEmpty } from './utils/profileHints.js';
import { registerNavigator, goToPage } from './utils/nav.js';
import { initPreferences } from './utils/preferences.js';
import {
  isAdminRoute,
  isShowRoute,
  isShowUnlocked,
  syncAdminPathToHash,
  syncShowPathToHash,
  consumeAdminLoginIntent,
  hasAdminLoginIntent,
} from './utils/routing.js';
import { renderAdminLogin } from './pages/AdminLogin.js';
import { renderShowGate } from './pages/ShowGate.js';
import { isAppFullyClosed, isRegistrationClosed } from './config/appMode.js';
import { renderEventClosed } from './pages/EventClosed.js';
import { mountSunsetBanner } from './components/SunsetBanner.js';

// ── Language & font (set on login screen; persisted in localStorage) ──
initPreferences();

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

function shouldShowEventClosed() {
  if (isShowRoute() && isShowUnlocked()) return false;
  return isAppFullyClosed() && !isAdminRoute();
}

function needsShowGate() {
  return isAppFullyClosed() && isShowRoute() && !isShowUnlocked();
}

function bootEventClosed() {
  appReady = true;
  setChromeVisible(false);
  if (tabBar) tabBar.style.display = 'none';
  document.body.classList.add('event-closed-mode');
  renderEventClosed(app).catch(err => {
    console.warn('renderEventClosed:', err.message);
  });
}

function setChromeVisible(showTabs) {
  const onAdmin = isAdminRoute();
  if (tabBar) tabBar.style.display = (showTabs && !onAdmin) ? 'flex' : 'none';
  if (showTabs && isBound() && !onAdmin) renderUserBar(userBar);
  else if (userBar) userBar.classList.add('hidden');
  document.body.classList.toggle('guest-trial-mode', showTabs && isGuestTrial());
  document.body.classList.toggle('admin-mode', onAdmin && isAdmin);
}

function navigate() {
  if (!appReady || !app) return;
  if (shouldShowEventClosed()) {
    renderEventClosed(app).catch(err => console.warn('renderEventClosed:', err.message));
    return;
  }
  syncAdminPathToHash();
  syncShowPathToHash();
  let hash = window.location.hash || '';
  if (isAdminRoute() && !hash) hash = '#admin';
  // #admin 僅在直接開啟 /admin 時有效，一般 App 不暴露後台入口
  if (hash === '#admin' && !isAdminRoute()) {
    hash = '#home';
    history.replaceState(null, '', `#home`);
  }
  if (hash === '#admin' && !isAdmin) {
    hash = '#home';
    if (window.location.hash === '#admin') {
      history.replaceState(null, '', isAdminRoute() ? '/admin#home' : '#home');
    }
  }
  if (hash === '#result') {
    hash = '#marks';
    if (window.location.hash === '#result') {
      history.replaceState(null, '', '#marks');
    }
  }
  if (isGuestTrial()) {
    if (isRegistrationClosed()) {
      endGuestTrial();
      renderLoginGate(app, { onComplete: afterBindComplete });
      setChromeVisible(false);
      return;
    }
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
      renderGuestBanner(app, {
        onBeforeLogin: endGuestTrial,
        onDismiss: () => navigate(),
      });
    }
  } catch (err) {
    console.error('Page render error:', err);
    app.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#f87171">頁面載入失敗，請重新整理</div>';
  }
  renderTabBar(tabBar, hash, { isBound: isBound() });
  renderUserBar(userBar);
  if (isBound() && !shouldShowEventClosed()) {
    mountSunsetBanner(app);
  }
  if (hash === '#marks' || hash === '#result') dismissIncomingOverlay();
  window.scrollTo(0, 0);
}

registerNavigator(navigate);

let incomingPollTimer = null;
let incomingMarksUnavailable = false;

function isMarksRoute() {
  const hash = window.location.hash || '';
  return hash === '#marks' || hash === '#result';
}

async function syncMutualStats() {
  try {
    await refreshConnectionCache();
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
    const { unseenCount } = await refreshConnectionCache();
    setIncomingUnseenCount(unseenCount);
    refreshLeaderboardCache().catch(() => {});

    if (isMarksRoute()) {
      dismissIncomingOverlay();
      refreshIncomingMarksSection(app);
    } else if (unseenCount > 0) {
      const unseen = await fetchIncomingMarks(true);
      showIncomingOneOverlay(unseen);
    }

    if (tabBar) {
      renderTabBar(tabBar, window.location.hash || '#home', { isBound: isBound() });
    }
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
  incomingPollTimer = setInterval(pollIncomingMarks, 20000);
}

async function afterBindComplete() {
  clearPendingClaim();
  try {
    await loadMembersWithRetry();
    await loadPublicStatsWithRetry();
  } catch (e) {
    console.warn('Reload members failed:', e);
  }
  const mergedCount = mergePendingMarks();
  try {
    await syncAllMarksToServer(window.BNI_MEMBERS || []);
    await restoreMarksFromServer();
  } catch (e) {
    console.warn('mark sync/restore:', e.message);
  }
  if (mergedCount > 0) showToast(t('marks_pending_merged', { n: mergedCount }));
  isAdmin = await checkIsAdmin();
  await finishOnboardingTutorial();
  sessionStorage.setItem('bni_show_first_run', '1');
  recordPresence().catch(() => {});
  preloadLiveData();
  startIncomingPoll();
  setChromeVisible(true);
  appReady = true;
  location.hash = '#home';
  navigate();
  maybeShowFirstRunHint();
  maybeNudgeEmptyProfile();
}

function maybeShowFirstRunHint() {
  if (sessionStorage.getItem('bni_show_first_run') !== '1') return;
  sessionStorage.removeItem('bni_show_first_run');
  const member = getMyStatus()?.member;
  const empty = profileBackendEmpty(member);
  showFirstRunHint({
    profileEmpty: empty,
    onGoProfile: () => goToPage('profile'),
    onGoSearch: () => goToPage('search'),
  });
}

function maybeNudgeEmptyProfile() {
  if (!isBound() || sessionStorage.getItem('bni_profile_nudge')) return;
  const member = getMyStatus()?.member;
  if (!profileBackendEmpty(member)) return;
  sessionStorage.setItem('bni_profile_nudge', '1');
  showToast(t('profile_enrich_empty_toast'));
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

async function loadEventChaptersWithRetry() {
  try {
    window.BNI_EVENT_CHAPTERS = await withRetry(() => fetchEventChapters(), {
      retries: 2, delayMs: 500, label: 'eventChapters',
    });
  } catch (e) {
    console.warn('Event chapters load failed, using static registry:', e.message);
  }
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
  if (isRegistrationClosed()) {
    appReady = true;
    setChromeVisible(false);
    renderLoginGate(app, { onComplete: afterBindComplete });
    return;
  }
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
  await loadEventChaptersWithRetry();
  preloadLiveData();
  isAdmin = false;
  appReady = true;
  setChromeVisible(true);
  if (!window.location.hash || window.location.hash === '#profile' || window.location.hash === '#admin') {
    location.hash = '#home';
  }
  navigate();
  showGuestTrialIntro({
    onGoLogin: () => {
      endGuestTrial();
      location.hash = '';
      location.reload();
    },
  });
}

async function enterAdminApp() {
  appReady = true;
  setChromeVisible(true);
  preloadLiveData();
  if (consumeAdminLoginIntent() || isAdminRoute()) {
    location.hash = 'admin';
  }
  navigate();
}

async function boot() {
  appReady = false;
  if (!app) return;

  if (needsShowGate()) {
    document.body.classList.remove('event-closed-mode');
    if (tabBar) tabBar.style.display = 'none';
    if (userBar) userBar.classList.add('hidden');
    renderShowGate(app, { onSuccess: () => boot() });
    return;
  }

  if (shouldShowEventClosed()) {
    bootEventClosed();
    return;
  }

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
  await loadEventChaptersWithRetry();

  const user = getCurrentUser();
  const wantsAdmin = isAdminRoute() || hasAdminLoginIntent();

  if (!user) {
    if (wantsAdmin) {
      renderAdminLogin(app, { onSuccess: () => boot() });
      return;
    }
    if (isGuestTrial() && !isRegistrationClosed()) {
      await enterGuestMode();
      return;
    }
    renderLoginGate(app, { onGuestTrial: enterGuestMode, onComplete: afterBindComplete });
    return;
  }

  if (!isBound()) {
    await refreshStatus();
  }

  if (!isBound()) {
    if (isAdmin) {
      await enterAdminApp();
      return;
    }
    if (wantsAdmin) {
      renderAdminLogin(app, {
        onSuccess: () => boot(),
        denied: true,
      });
      return;
    }
    const auto = await tryAutoBindOnLogin();
    if (auto?.bound) {
      await afterBindComplete();
      return;
    }
    if (await tryPendingClaim()) {
      await afterBindComplete();
      return;
    }
    renderOnboard(app, { onComplete: afterBindComplete });
    return;
  }

  if (wantsAdmin && isAdmin && isAdminRoute()) {
    location.hash = '#admin';
  }
  const mergedPending = mergePendingMarks();
  if (mergedPending > 0) {
    showToast(t('marks_pending_merged', { n: mergedPending }));
  }
  try {
    await syncAllMarksToServer(window.BNI_MEMBERS || []);
    await restoreMarksFromServer();
  } catch (e) {
    console.warn('mark sync/restore:', e.message);
  }
  appReady = true;
  setChromeVisible(true);
  if (!isTutorialDone()) {
    finishOnboardingTutorial().catch(() => {});
  }
  recordPresence().catch(() => {});
  preloadLiveData();
  startIncomingPoll();
  navigate();
  maybeNudgeEmptyProfile();
}

window.addEventListener('hashchange', navigate);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && isBound() && appReady) {
    pollIncomingMarks();
  }
});
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
  import('./utils/toast.js').then(({ showToast }) => {
    showToast('操作失敗，請稍後再試');
  }).catch(() => {});
});

normalizeAppUrl();
syncAdminPathToHash();
syncShowPathToHash();
boot();
