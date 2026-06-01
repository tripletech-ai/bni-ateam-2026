import { getMarkCount } from '../utils/storage.js';
import { BRANCHES }     from '../data/branches.js';
import { escHtml }      from '../utils/html.js';
import { t }            from '../i18n/translations.js';

const VIDEO_URL = ''; // Fill in when YouTube link is provided

export function renderHome(container) {
  const markCount = getMarkCount();
  const zhongshan = BRANCHES.zhongshan.filter(b => b.count > 0);
  const sanlu     = BRANCHES.sanlu.filter(b => b.count > 0);

  container.innerHTML = `
    <div class="hero">
      <div style="font-size:11px;letter-spacing:3px;opacity:0.5;margin-bottom:10px;font-family:'Noto Sans TC',sans-serif">
        ${escHtml(t('hero_eyebrow'))}
      </div>
      <h1 class="hero-title serif hero-title-shimmer">${escHtml(t('hero_title'))}</h1>
      <p class="hero-sub">${escHtml(t('hero_sub')).replace('\n', '<br>')}</p>
      <div style="font-size:11px;margin-top:12px;opacity:0.45;letter-spacing:0.3px">
        ${escHtml(t('hero_region'))}
      </div>
    </div>

    <div class="ai-box">
      <div class="ai-box-label">${escHtml(t('search_label'))}</div>
      <textarea
        id="home-ai-input"
        class="ai-textarea"
        placeholder="${escHtml(t('search_placeholder'))}"
        rows="2"
        aria-label="${escHtml(t('search_label'))}"
        maxlength="200"></textarea>
      <button id="home-ai-submit" class="btn-ai">${escHtml(t('search_btn'))}</button>
    </div>

    <div class="stats-strip" role="list">
      <div class="stat-item" role="listitem">
        <div class="stat-num serif">20</div>
        <div class="stat-label">${escHtml(t('stat_branches'))}</div>
      </div>
      <div class="stat-item" role="listitem">
        <div class="stat-num serif">120</div>
        <div class="stat-label">${escHtml(t('stat_members'))}</div>
      </div>
      <div class="stat-item" role="listitem">
        <div class="stat-num serif" id="home-mark-count">${markCount}</div>
        <div class="stat-label">${escHtml(t('stat_marks'))}</div>
      </div>
    </div>

    <div class="section-header"><div class="section-title">${escHtml(t('home_leaders'))}</div></div>
    <div class="yang-card" style="cursor:pointer" onclick="location.hash='leaders'">
      <div class="yang-photo" aria-hidden="true" style="color:rgba(250,199,117,0.7)">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <div class="yang-info">
        <div class="yang-name">楊日陞</div>
        <div class="yang-title">區域資深董事<br>${escHtml(t('hero_region'))}</div>
        <button class="btn-yang" onclick="event.stopPropagation();location.hash='leaders'">
          ${escHtml(t('home_view'))}
        </button>
      </div>
    </div>

    <div class="section-header"><div class="section-title">${escHtml(t('home_video'))}</div></div>
    <div class="video-placeholder">
      <div class="video-thumb" id="home-video-btn">
        <div class="video-play-btn" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
        <div style="font-size:13px;opacity:0.7">${VIDEO_URL ? escHtml(t('home_watch')) : escHtml(t('home_video_soon'))}</div>
      </div>
      <div class="video-caption">A Team 20 分會 · Anderson Team</div>
    </div>

    <div class="section-header"><div class="section-title">${escHtml(t('home_branches'))}</div></div>
    <div class="branch-section">
      <div class="branch-region-title">${escHtml(t('search_zhongshan'))}</div>
      <div class="branch-chips">
        ${zhongshan.map((b, i) => `<div
          class="branch-chip zhongshan stagger-${Math.min(i+1,6)}"
          data-branch="${escHtml(b.name)}"
          role="button" tabindex="0"
          onclick="location.hash='search'"
          onkeydown="if(event.key==='Enter')location.hash='search'">
          ${escHtml(b.name)}<span class="chip-count">${b.count}</span>
        </div>`).join('')}
      </div>
      <div class="branch-region-title">${escHtml(t('search_sanlu'))}</div>
      <div class="branch-chips">
        ${sanlu.map((b, i) => `<div
          class="branch-chip sanlu stagger-${Math.min(i+1,6)}"
          data-branch="${escHtml(b.name)}"
          role="button" tabindex="0"
          onclick="location.hash='search'"
          onkeydown="if(event.key==='Enter')location.hash='search'">
          ${escHtml(b.name)}<span class="chip-count">${b.count}</span>
        </div>`).join('')}
      </div>
      <button
        onclick="location.hash='search'"
        class="btn-ai"
        style="margin-top:8px;border-radius:var(--r-sm)">
        ${escHtml(t('home_view_all'))}
      </button>
    </div>
    <div style="height:24px"></div>
  `;

  document.getElementById('home-ai-submit').addEventListener('click', () => {
    const v = document.getElementById('home-ai-input').value.trim();
    if (v.length >= 2) sessionStorage.setItem('bni_pending_search', v);
    location.hash = 'search';
  });

  document.getElementById('home-video-btn').addEventListener('click', () => {
    if (VIDEO_URL) window.open(VIDEO_URL, '_blank', 'noopener');
  });
}
