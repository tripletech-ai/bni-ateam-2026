import { getMarkCount } from '../utils/storage.js';
import { BRANCHES } from '../data/branches.js';
import { escHtml } from '../utils/html.js';

export function renderHome(container) {
  const markCount = getMarkCount();
  const zhongshan = BRANCHES.zhongshan.filter(b => b.count > 0);
  const sanlu = BRANCHES.sanlu.filter(b => b.count > 0);

  container.innerHTML = `
    <div class="hero">
      <div style="font-size:11px;letter-spacing:3px;opacity:0.55;margin-bottom:10px;font-family:'Noto Sans TC',sans-serif">BNI · 20 YEARS TAIWAN</div>
      <h1 class="hero-title serif">20 分會商務連結行動</h1>
      <p class="hero-sub">說出你想找的人<br>AI 幫你找到對的夥伴</p>
    </div>

    <div class="ai-box">
      <div class="ai-box-label">說一句話，幫你找到對的人</div>
      <textarea
        id="home-ai-input"
        class="ai-textarea"
        placeholder="我是做保險的，想找企業主或會計師"
        rows="2"
        aria-label="AI 搜尋輸入"
        maxlength="200"></textarea>
      <button id="home-ai-submit" class="btn-ai">AI 幫我找</button>
    </div>

    <div class="stats-strip" role="list">
      <div class="stat-item" role="listitem">
        <div class="stat-num serif">20</div>
        <div class="stat-label">參與分會</div>
      </div>
      <div class="stat-item" role="listitem">
        <div class="stat-num serif">101</div>
        <div class="stat-label">報名夥伴</div>
      </div>
      <div class="stat-item" role="listitem">
        <div class="stat-num serif" id="home-mark-count">${markCount}</div>
        <div class="stat-label">我的標記</div>
      </div>
    </div>

    <div class="section-header"><div class="section-title">區域領導者</div></div>
    <div class="yang-card">
      <div class="yang-photo" aria-hidden="true" style="font-size:40px;color:var(--navy-mid)">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <div class="yang-info">
        <div class="yang-name">楊董</div>
        <div class="yang-title">資深區域董事顧問<br>台北北區 &amp; 新北西北B</div>
        <button class="btn-yang" onclick="location.hash='yang'">查看專欄</button>
      </div>
    </div>

    <div class="section-header"><div class="section-title">20 分會陣容</div></div>
    <div class="branch-section">
      <div class="branch-region-title">中山區</div>
      <div class="branch-chips">
        ${zhongshan.map(b => `<div class="branch-chip zhongshan"
          data-branch="${escHtml(b.name)}"
          role="button" tabindex="0"
          onclick="location.hash='search'"
          onkeydown="if(event.key==='Enter')location.hash='search'">
          ${escHtml(b.name)}<span class="chip-count">${b.count}</span>
        </div>`).join('')}
      </div>
      <div class="branch-region-title">三蘆區</div>
      <div class="branch-chips">
        ${sanlu.map(b => `<div class="branch-chip sanlu"
          data-branch="${escHtml(b.name)}"
          role="button" tabindex="0"
          onclick="location.hash='search'"
          onkeydown="if(event.key==='Enter')location.hash='search'">
          ${escHtml(b.name)}<span class="chip-count">${b.count}</span>
        </div>`).join('')}
      </div>
      <button
        onclick="location.hash='search'"
        style="width:100%;margin-top:8px;padding:12px;background:var(--navy);color:#fff;border:none;border-radius:var(--r-sm);font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans TC',sans-serif">
        查看所有夥伴
      </button>
    </div>
    <div style="height:24px"></div>
  `;

  // Home AI → pass to Search page via sessionStorage
  document.getElementById('home-ai-submit').addEventListener('click', () => {
    const v = document.getElementById('home-ai-input').value.trim();
    if (v.length >= 2) {
      sessionStorage.setItem('bni_pending_search', v);
    }
    location.hash = 'search';
  });
}
