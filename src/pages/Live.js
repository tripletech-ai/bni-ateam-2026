import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { leaderboardHTML, leaderboardModeTabsHTML } from '../components/Leaderboard.js';
import {
  chatRoomHTML,
  feedComposerHTML,
  bindFeedComposer,
  updateFeedList,
  bindFeedAdminActions,
  scrollChatToBottom,
} from '../components/FeedChat.js';
import {
  fetchLeaderboard,
  fetchFeed,
  fetchLiveSettings,
  postFeedMessage,
  adminDeleteFeedMessage,
  checkIsAdmin,
  ensureSessionFresh,
  getCurrentUser,
  signInWithGoogle,
} from '../services/auth.js';
import { showToast } from '../utils/toast.js';
import { isGuestTrial } from '../utils/guestTrial.js';
import { guestFeedLoginHTML, bindGuestTrialLogin } from '../components/GuestTrialBanner.js';
import { endGuestTrial } from '../utils/guestTrial.js';

let livePollTimer = null;
let liveIsAdmin = false;
let liveMainTab = 'chat';
let liveLbMode = 'mutual';
let liveLbModes = ['mutual', 'received_one'];
let liveSessionWarned = false;

function resolveLbModes(settings) {
  const modes = settings?.leaderboard_modes;
  if (Array.isArray(modes) && modes.length) {
    return modes.filter(m => m === 'mutual' || m === 'received_one');
  }
  return ['mutual', 'received_one'];
}

function ensureLbMode() {
  if (!liveLbModes.includes(liveLbMode)) {
    liveLbMode = liveLbModes[0] || 'mutual';
  }
}

function liveMainTabsHTML() {
  return `
    <div class="live-main-tabs" role="tablist" aria-label="${escHtml(t('live_tabs_label'))}">
      <button type="button" class="live-main-tab${liveMainTab === 'leaderboard' ? ' active' : ''}"
        role="tab" aria-selected="${liveMainTab === 'leaderboard'}"
        data-live-tab="leaderboard">${escHtml(t('live_tab_leaderboard'))}</button>
      <button type="button" class="live-main-tab${liveMainTab === 'chat' ? ' active' : ''}"
        role="tab" aria-selected="${liveMainTab === 'chat'}"
        data-live-tab="chat">${escHtml(t('live_tab_chat'))}</button>
    </div>`;
}

function leaderboardPanelHTML() {
  const boards = window.BNI_LEADERBOARDS || {};
  const rows = boards[liveLbMode] || [];
  return `
    <section class="live-panel live-panel-leaderboard" ${liveMainTab !== 'leaderboard' ? 'hidden' : ''}>
      ${leaderboardModeTabsHTML(liveLbModes, liveLbMode)}
      <div id="live-leaderboard-list">${leaderboardHTML(rows, { mode: liveLbMode })}</div>
    </section>`;
}

function chatPanelHTML(feed) {
  return `
    <section class="live-panel live-panel-chat" ${liveMainTab !== 'chat' ? 'hidden' : ''}>
      <div id="live-feed-wrap">
        ${chatRoomHTML(feed, { isAdmin: liveIsAdmin, isGuest: isGuestTrial() })}
      </div>
    </section>`;
}

function sessionBannerHTML() {
  return `
    <div class="live-session-banner" role="alert">
      <p>${escHtml(t('feed_session_expired'))}</p>
      <button type="button" class="btn-ai live-session-relogin">${escHtml(t('guest_banner_login'))}</button>
    </div>`;
}

function switchLiveTab(container, tab) {
  liveMainTab = tab;
  container.querySelectorAll('.live-main-tab').forEach(b => {
    const on = b.dataset.liveTab === tab;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  container.querySelector('.live-panel-leaderboard')?.classList.toggle('hidden', tab !== 'leaderboard');
  container.querySelector('.live-panel-chat')?.classList.toggle('hidden', tab !== 'chat');
  if (tab === 'chat') scrollChatToBottom(container);
}

function bindLiveMainTabs(container) {
  container.querySelectorAll('.live-main-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.liveTab;
      if (!tab || tab === liveMainTab) return;
      switchLiveTab(container, tab);
    });
  });
}

function bindLbModeTabs(container) {
  container.querySelectorAll('.lb-mode-tab').forEach(btn => {
    btn.addEventListener('click', async () => {
      const mode = btn.dataset.lbMode;
      if (!mode || mode === liveLbMode || !liveLbModes.includes(mode)) return;
      liveLbMode = mode;
      container.querySelectorAll('.lb-mode-tab').forEach(b => {
        const on = b.dataset.lbMode === liveLbMode;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      await refreshLeaderboardPanel(container);
    });
  });
}

async function refreshLeaderboardPanel(container) {
  const lbWrap = container.querySelector('#live-leaderboard-list');
  if (!lbWrap) return;
  try {
    const rows = await fetchLeaderboard(30, liveLbMode);
    if (!window.BNI_LEADERBOARDS) window.BNI_LEADERBOARDS = {};
    window.BNI_LEADERBOARDS[liveLbMode] = rows;
    lbWrap.innerHTML = leaderboardHTML(rows, { mode: liveLbMode });
  } catch (e) {
    console.warn('leaderboard refresh:', e.message);
  }
}

function bindLiveFeedAdmin(container) {
  if (!liveIsAdmin) return;
  bindFeedAdminActions(container, async (feedId) => {
    try {
      await adminDeleteFeedMessage(feedId);
      showToast(t('feed_delete_ok'));
      await refreshLiveData(container);
    } catch (e) {
      showToast(t('feed_delete_fail'));
    }
  });
}

function ensureChatComposer(container) {
  const wrap = container.querySelector('.chat-composer-wrap');
  if (!wrap) return;

  if (isGuestTrial()) {
    if (!wrap.querySelector('.guest-feed-login-card')) {
      wrap.innerHTML = guestFeedLoginHTML();
      bindGuestTrialLogin(container, { onBeforeLogin: endGuestTrial });
    }
    return;
  }

  if (!document.getElementById('feed-input')) {
    wrap.innerHTML = feedComposerHTML();
    bindFeedComposer(onPostFeed(container));
  }
}

function showSessionBanner(container) {
  const chatRoom = container.querySelector('.chat-room');
  if (!chatRoom || chatRoom.querySelector('.live-session-banner')) return;
  chatRoom.insertAdjacentHTML('afterbegin', sessionBannerHTML());
  chatRoom.querySelector('.live-session-relogin')?.addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      showToast(e.message || t('guest_login_fail'));
    }
  });
}

function hideSessionBanner(container) {
  container.querySelector('.live-session-banner')?.remove();
}

function onPostFeed(container) {
  return async (text) => {
    try {
      if (!isGuestTrial() && getCurrentUser()) {
        const ok = await ensureSessionFresh();
        if (!ok) {
          showSessionBanner(container);
          showToast(t('feed_session_expired'));
          return;
        }
        hideSessionBanner(container);
      }
      await postFeedMessage(text);
      showToast(t('feed_post_ok'));
      if (liveMainTab !== 'chat') switchLiveTab(container, 'chat');
      await refreshLiveData(container);
    } catch (e) {
      const msg = e.message || '';
      if (/RATE_LIMIT/i.test(msg)) showToast(t('feed_rate_limit'));
      else if (/NOT_BOUND/i.test(msg)) showToast(t('feed_not_bound'));
      else if (/NOT_AUTHENTICATED|jwt expired|401/i.test(msg)) {
        showSessionBanner(container);
        showToast(t('feed_session_expired'));
      }
      else showToast(t('feed_post_fail'));
    }
  };
}

export async function refreshLiveData(container) {
  if (!container) return;
  try {
    if (!isGuestTrial() && getCurrentUser()) {
      const fresh = await ensureSessionFresh();
      if (!fresh && !liveSessionWarned) {
        liveSessionWarned = true;
        showSessionBanner(container);
      } else if (fresh) {
        liveSessionWarned = false;
        hideSessionBanner(container);
      }
    }

    const [settings, feed] = await Promise.all([
      fetchLiveSettings(),
      fetchFeed(50),
    ]);
    liveLbModes = resolveLbModes(settings);
    ensureLbMode();

    const boards = await Promise.all(
      liveLbModes.map(mode => fetchLeaderboard(30, mode).then(rows => ({ mode, rows }))),
    );
    window.BNI_LEADERBOARDS = {};
    boards.forEach(({ mode, rows }) => { window.BNI_LEADERBOARDS[mode] = rows; });
    window.BNI_FEED = feed;

    const lbWrap = container.querySelector('#live-leaderboard-list');
    if (lbWrap) {
      lbWrap.innerHTML = leaderboardHTML(window.BNI_LEADERBOARDS[liveLbMode] || [], { mode: liveLbMode });
    }

    const modeTabs = container.querySelector('.lb-mode-tabs');
    if (modeTabs) {
      modeTabs.outerHTML = leaderboardModeTabsHTML(liveLbModes, liveLbMode);
      bindLbModeTabs(container);
    }

    const chatRoom = container.querySelector('.chat-room');
    if (chatRoom) {
      updateFeedList(chatRoom, feed, { isAdmin: liveIsAdmin, isGuest: isGuestTrial() });
      ensureChatComposer(container);
      if (isGuestTrial()) bindGuestTrialLogin(container, { onBeforeLogin: endGuestTrial });
    }

    bindLiveFeedAdmin(container);
    if (liveMainTab === 'chat') scrollChatToBottom(container);
  } catch (e) {
    console.warn('live refresh:', e.message);
    ensureChatComposer(container);
  }
}

export async function renderLive(container) {
  container.classList.add('page-root');
  liveIsAdmin = await checkIsAdmin();
  liveSessionWarned = false;

  if (!isGuestTrial() && getCurrentUser()) {
    await ensureSessionFresh();
  }

  try {
    const settings = await fetchLiveSettings();
    liveLbModes = resolveLbModes(settings);
    ensureLbMode();
  } catch {
    liveLbModes = ['mutual', 'received_one'];
  }

  const boards = window.BNI_LEADERBOARDS || {};
  const feed = window.BNI_FEED || [];

  container.innerHTML = `
    <div class="live-page">
      ${liveMainTabsHTML()}
      ${leaderboardPanelHTML(boards)}
      ${chatPanelHTML(feed)}
      <div style="height:16px"></div>
    </div>`;

  bindLiveMainTabs(container);
  bindLbModeTabs(container);

  if (isGuestTrial()) {
    bindGuestTrialLogin(container, { onBeforeLogin: endGuestTrial });
  } else {
    bindFeedComposer(onPostFeed(container));
  }

  bindLiveFeedAdmin(container);
  refreshLiveData(container);
  if (livePollTimer) clearInterval(livePollTimer);
  livePollTimer = setInterval(() => refreshLiveData(container), 20000);
}

export function stopLivePoll() {
  if (livePollTimer) {
    clearInterval(livePollTimer);
    livePollTimer = null;
  }
}
