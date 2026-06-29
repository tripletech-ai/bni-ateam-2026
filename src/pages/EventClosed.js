import { escHtml, escAttr } from '../utils/html.js';
import { developerPhotoHTML } from '../utils/avatar.js';
import { fetchPublicStats } from '../services/auth.js';

const FALLBACK_STATS = {
  members: 574,
  branches: 151,
  oneMarks: 1400,
  mutualPairs: 211,
  bizMarks: 750,
  feedPosts: 36,
};

const WANGQI = {
  name: '王祈',
  branch: '長輝白金分會 · AI 學習整合',
  photo: '王祈.jpg',
  lineLink: 'https://line.me/ti/p/j_8AmmGNkN',
  highlights: [
    '協助中小企業把 AI 用在生意上，從策略到上線落地',
    '量化金融與科技管理背景，能聽懂老闆要的成果也接得住工程細節',
  ],
};

function eventClosedHTML(stats) {
  return `
    <div class="event-closed-wrap">
      <header class="hero hero-compact event-closed-hero">
        <h1 class="hero-title serif hero-title-gold event-closed-title"
            data-text="${escAttr('A Team 商務連結行動')}">${escHtml('A Team 商務連結行動')}</h1>
        <p class="hero-sub event-closed-tagline serif hero-title-gold"
           data-text="${escAttr('說你想找誰，AI 幫你媒合')}">${escHtml('說你想找誰，AI 幫你媒合')}</p>
      </header>

      <section class="event-closed-shutdown" aria-labelledby="event-closed-notice-title">
        <p class="event-closed-shutdown-badge">系統已關閉</p>
        <h2 id="event-closed-notice-title" class="event-closed-shutdown-title serif">重要公告</h2>
        <p class="event-closed-shutdown-body">麻煩會員夥伴請勿利用此系統，加 LINE 之後濫發推銷或宣傳之訊息與文件。</p>
        <p class="event-closed-shutdown-body">以防造成其他會員夥伴騷擾之情事，請大家務必配合。</p>
        <p class="event-closed-shutdown-body">如有造成不便，敬請原諒。</p>
        <p class="event-closed-shutdown-reason">本次因有會員惡意使用此程式獲取個資進行廣告推銷，提早關閉系統。</p>
        <p class="event-closed-warning-emphasis">請大家一起維護 BNI 的友好商務環境！</p>
      </section>

      <section class="event-closed-section">
        <p class="event-closed-lead">感謝 7/26 BNI 台灣年會的熱情！</p>
        <p class="event-closed-body">
          活動期間一共收錄了 <strong>${stats.members}</strong> 人的名單，含
          <strong>${stats.branches}</strong> 個分會的會員資料。
        </p>
      </section>

      <section class="event-closed-section">
        <h2 class="event-closed-heading serif">平台累計成果</h2>
        <div class="event-closed-stats">
          <div class="event-closed-stat">
            <div class="event-closed-stat-num">${stats.oneMarks.toLocaleString()}</div>
            <div class="event-closed-stat-label">想約 1-1</div>
          </div>
          <div class="event-closed-stat">
            <div class="event-closed-stat-num">${stats.mutualPairs}</div>
            <div class="event-closed-stat-label">相互連結（對）</div>
          </div>
          <div class="event-closed-stat">
            <div class="event-closed-stat-num">${stats.bizMarks.toLocaleString()}</div>
            <div class="event-closed-stat-label">有合作可能</div>
          </div>
          <div class="event-closed-stat event-closed-stat-wide">
            <div class="event-closed-stat-num">${stats.feedPosts}</div>
            <div class="event-closed-stat-label">即時牆發言</div>
          </div>
        </div>
      </section>

      <section class="event-closed-section event-closed-notice">
        <p class="event-closed-muted">期待未來我們在 BNI 活動再相見。若有使用回饋，歡迎聯繫下方開發團隊。</p>
      </section>

      <section class="event-closed-section event-closed-dev">
        <p class="event-closed-dev-eyebrow">有 AI 開發相關需求歡迎找</p>
        <article class="developer-card event-closed-dev-card">
          <div class="developer-card-top">
            ${developerPhotoHTML(WANGQI.name, WANGQI.photo)}
            <div class="developer-head-block">
              <div class="developer-name serif">${escHtml(WANGQI.name)}</div>
              <div class="developer-branch">${escHtml(WANGQI.branch)}</div>
            </div>
          </div>
          <ul class="developer-highlights">
            ${WANGQI.highlights.map(h =>
              `<li class="developer-highlight-item">${escHtml(h)}</li>`).join('')}
          </ul>
          <div class="developer-actions">
            <a href="${escAttr(WANGQI.lineLink)}" class="btn-gold-outline developer-line-btn" target="_blank" rel="noopener">加 LINE</a>
          </div>
        </article>
      </section>
    </div>`;
}

async function resolveClosedStats() {
  try {
    const pub = await fetchPublicStats();
    return {
      members: pub?.total_members ?? FALLBACK_STATS.members,
      branches: pub?.branch_count ?? FALLBACK_STATS.branches,
      oneMarks: FALLBACK_STATS.oneMarks,
      mutualPairs: FALLBACK_STATS.mutualPairs,
      bizMarks: FALLBACK_STATS.bizMarks,
      feedPosts: FALLBACK_STATS.feedPosts,
    };
  } catch {
    return { ...FALLBACK_STATS };
  }
}

export async function renderEventClosed(container) {
  container.className = 'page-root event-closed-page';
  container.innerHTML = `<div class="event-closed-wrap"><p class="event-closed-loading">載入中…</p></div>`;
  const stats = await resolveClosedStats();
  container.innerHTML = eventClosedHTML(stats);
}
