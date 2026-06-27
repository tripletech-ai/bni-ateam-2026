import { escHtml, escAttr } from '../utils/html.js';
import { developerPhotoHTML } from '../utils/avatar.js';

const STATS = {
  members: 557,
  branches: 151,
  oneMarks: 1338,
  mutualPairs: 191,
  bizMarks: 722,
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

export function renderEventClosed(container) {
  container.className = 'page-root event-closed-page';
  container.innerHTML = `
    <div class="event-closed-wrap">
      <header class="hero hero-compact event-closed-hero">
        <h1 class="hero-title serif hero-title-gold event-closed-title"
            data-text="${escAttr('A Team 商務連結行動')}">${escHtml('A Team 商務連結行動')}</h1>
        <p class="hero-sub event-closed-tagline serif hero-title-gold"
           data-text="${escAttr('說你想找誰，AI 幫你媒合')}">${escHtml('說你想找誰，AI 幫你媒合')}</p>
      </header>

      <section class="event-closed-section">
        <p class="event-closed-lead">感謝 7/26 BNI 台灣年會的熱情！</p>
        <p class="event-closed-body">
          今天一共收錄了 <strong>${STATS.members}</strong> 人的名單，含
          <strong>${STATS.branches}</strong> 個分會的會員收錄資料。
        </p>
      </section>

      <section class="event-closed-section">
        <h2 class="event-closed-heading serif">平台累計</h2>
        <div class="event-closed-stats">
          <div class="event-closed-stat">
            <div class="event-closed-stat-num">${STATS.oneMarks.toLocaleString()}</div>
            <div class="event-closed-stat-label">想約 1-1</div>
          </div>
          <div class="event-closed-stat">
            <div class="event-closed-stat-num">${STATS.mutualPairs}</div>
            <div class="event-closed-stat-label">相互連結（對）</div>
          </div>
          <div class="event-closed-stat">
            <div class="event-closed-stat-num">${STATS.bizMarks}</div>
            <div class="event-closed-stat-label">有合作可能</div>
          </div>
          <div class="event-closed-stat event-closed-stat-wide">
            <div class="event-closed-stat-num">${STATS.feedPosts}</div>
            <div class="event-closed-stat-label">即時牆發言</div>
          </div>
        </div>
      </section>

      <section class="event-closed-section event-closed-notice">
        <p class="event-closed-body">本次年會的活動間暫時關閉，</p>
        <p class="event-closed-body">期待未來我們持續在 BNI 活動相見！</p>
        <p class="event-closed-body">或許變成常駐功能或是 APP？</p>
        <p class="event-closed-muted">有任何今天使用回饋也歡迎給我們～</p>
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
    </div>
  `;
}
