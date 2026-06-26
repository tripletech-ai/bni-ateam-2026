import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { leaderboardHTML, leaderboardModeTabsHTML } from '../components/Leaderboard.js';
import {
  chatRoomHTML,
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
} from '../services/auth.js';
import { showToast } from '../utils/toast.js';
import { isGuestTrial } from '../utils/guestTrial.js';
import { guestFeedLoginHTML, bindGuestTrialLogin } from '../components/GuestTrialBanner.js';
import { endGuestTrial } from '../utils/guestTrial.js';

let livePollTimer = null;
let liveIsAdmin = false;
let liveMainTab = 'leaderboard';
let liveLbMode = 'mutual';
let liveLbModes = ['mutual', 'received_one'];

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

export async function refreshLiveData(container) {
  if (!container) return;
  try {
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

    const feedWrap = container.querySelector('#live-feed-wrap');
    if (feedWrap) {
      feedWrap.innerHTML = chatRoomHTML(feed, { isAdmin: liveIsAdmin, isGuest: isGuestTrial() });
      if (!isGuestTrial()) bindFeedComposer(onPostFeed(container));
      if (isGuestTrial()) bindGuestTrialLogin(feedWrap, { onBeforeLogin: endGuestTrial });
    }

    bindLiveFeedAdmin(container);
    if (liveMainTab === 'chat') scrollChatToBottom(container);
  } catch (e) {
    console.warn('live refresh:', e.message);
  }
}

function onPostFeed(container) {
  return async (text) => {
    try {
      await postFeedMessage(text);
      showToast(t('feed_post_ok'));
      if (liveMainTab !== 'chat') switchLiveTab(container, 'chat');
      await refreshLiveData(container);
    } catch (e) {
      if (/RATE_LIMIT/i.test(e.message || '')) showToast(t('feed_rate_limit'));
      else showToast(t('feed_post_fail'));
    }
  };
}

export async function renderLive(container) {
  container.classList.add('page-root');
  liveIsAdmin = await checkIsAdmin();

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
