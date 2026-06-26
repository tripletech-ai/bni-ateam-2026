import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { leaderboardHTML } from '../components/Leaderboard.js';
import { feedListHTML, feedComposerHTML, bindFeedComposer, updateFeedList } from '../components/FeedChat.js';
import {
  fetchLeaderboard,
  fetchFeed,
  postFeedMessage,
} from '../services/auth.js';
import { showToast } from '../utils/toast.js';

let livePollTimer = null;

export async function refreshLiveData(container) {
  if (!container) return;
  try {
    const [board, feed] = await Promise.all([
      fetchLeaderboard(30),
      fetchFeed(50),
    ]);
    window.BNI_LEADERBOARD = board;
    window.BNI_FEED = feed;

    const lbWrap = container.querySelector('#live-leaderboard-list');
    if (lbWrap) lbWrap.innerHTML = leaderboardHTML(board);

    updateFeedList(container, feed);
  } catch (e) {
    console.warn('live refresh:', e.message);
  }
}

export function renderLive(container) {
  container.classList.add('page-root');
  const board = window.BNI_LEADERBOARD || [];
  const feed = window.BNI_FEED || [];

  container.innerHTML = `
    <div class="live-page">
      <div class="live-hero">
        <div class="live-hero-eyebrow">${escHtml(t('live_eyebrow'))}</div>
        <h1 class="live-hero-title serif">${escHtml(t('live_title'))}</h1>
        <p class="live-hero-sub">${escHtml(t('live_sub'))}</p>
      </div>
      <section class="leaderboard-section">
        <div class="section-header">
          <div class="section-title">${escHtml(t('lb_title'))}</div>
          <p class="section-sub">${escHtml(t('lb_sub'))}</p>
        </div>
        <div id="live-leaderboard-list">${leaderboardHTML(board)}</div>
      </section>
      <section class="feed-section">
        <div class="section-header">
          <div class="section-title">${escHtml(t('feed_title'))}</div>
          <p class="section-sub">${escHtml(t('feed_sub'))}</p>
        </div>
        ${feedListHTML(feed)}
        ${feedComposerHTML()}
      </section>
      <div style="height:24px"></div>
    </div>`;

  bindFeedComposer(async (text) => {
    try {
      await postFeedMessage(text);
      showToast(t('feed_post_ok'));
      await refreshLiveData(container);
    } catch (e) {
      if (/RATE_LIMIT/i.test(e.message || '')) showToast(t('feed_rate_limit'));
      else showToast(t('feed_post_fail'));
    }
  });

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
