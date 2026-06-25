import { getMarkCount } from '../utils/storage.js';
import { BRANCHES }     from '../data/branches.js';
import { PHOTOS }       from '../data/photos.js';
import { escHtml }      from '../utils/html.js';
import { t }            from '../i18n/translations.js';
import { goalProgressHTML } from '../components/GoalProgress.js';
import { CONTRIBUTORS } from '../data/contributors.js';
import { eventPulseHTML, bindEventPulse } from '../components/EventPulseGame.js';
import { profileEnrichBannerHTML, bindProfileEnrichBanner } from '../components/ProfileEnrichBanner.js';

const VIDEO_URL = ''; // Fill in when YouTube link is provided

function contributorCardHTML(c) {
  const initial = (c.name || '').match(/[一-鿿㐀-䶿]/g)?.slice(-1)[0] || '?';
  const paragraphs = c.paragraphKeys.map(k => `<p class="contributor-bio-p">${escHtml(t(k))}</p>`).join('');
  const cta = c.ctaKey ? `<p class="contributor-cta">${escHtml(t(c.ctaKey))}</p>` : '';
  const tag = c.tagKey
    ? `<span class="contributor-tag">${escHtml(t(c.tagKey))}</span>` : '';
  const companies = c.companyKeys
    ? `<div class="contributor-companies">${c.companyKeys.map(k =>
        `<span class="company-chip">${escHtml(t(k))}</span>`).join('')}</div>` : '';

  return `
    <article class="contributor-card" data-contributor="${escHtml(c.id)}">
      <div class="contributor-photo">
        <img src="assets/photos/${encodeURIComponent(c.photo)}"
          alt="${escHtml(c.name)}" loading="lazy"
          onerror="this.style.display='none';this.parentElement.classList.add('no-photo')">
        <span class="contributor-photo-fallback" aria-hidden="true">${escHtml(initial)}</span>
      </div>
      <div class="contributor-info">
        <div class="contributor-head">
          <div class="contributor-name serif">${escHtml(c.name)}</div>
          ${tag}
        </div>
        <div class="contributor-role">${escHtml(t(c.roleKey))}</div>
        <div class="contributor-bio">${paragraphs}${cta}</div>
        ${companies}
      </div>
    </article>`;
}

function resolveBranchLists() {
  const rows = window.BNI_PUBLIC_STATS?.branches;
  if (rows?.length) {
    const map = (region) => rows
      .filter(b => b.region === region)
      .map(b => ({
        name: String(b.branch).replace(/分會$/, ''),
        count: b.count ?? 0,
      }))
      .filter(b => b.count > 0);
    return { zhongshan: map('zhongshan'), sanlu: map('sanlu') };
  }
  return {
    zhongshan: BRANCHES.zhongshan.filter(b => b.count > 0),
    sanlu: BRANCHES.sanlu.filter(b => b.count > 0),
  };
}

export function renderHome(container) {
  const markCount = getMarkCount();
  const { zhongshan, sanlu } = resolveBranchLists();
  const totalMembers = window.BNI_PUBLIC_STATS?.total_members ?? (window.BNI_MEMBERS || []).length;
  const branchCount = window.BNI_PUBLIC_STATS?.branch_count ?? 20;

  container.innerHTML = `
    <div class="hero">
      <div style="font-size:16px;letter-spacing:2px;opacity:0.60;margin-bottom:10px;font-family:'Noto Sans TC',sans-serif">
        ${escHtml(t('hero_eyebrow'))}
      </div>
      <h1 class="hero-title serif hero-title-shimmer">${escHtml(t('hero_title'))}</h1>
      <p class="hero-sub">${escHtml(t('hero_sub')).replace('\n', '<br>')}</p>
      <div style="font-size:16px;margin-top:12px;opacity:0.65;letter-spacing:0.3px">
        ${escHtml(t('hero_region'))}
      </div>
    </div>

    ${eventPulseHTML()}

    ${profileEnrichBannerHTML()}

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
        <div class="stat-num serif">${branchCount}</div>
        <div class="stat-label">${escHtml(t('stat_branches'))}</div>
      </div>
      <div class="stat-item" role="listitem">
        <div class="stat-num serif">${totalMembers}</div>
        <div class="stat-label">${escHtml(t('stat_members'))}</div>
      </div>
      <div class="stat-item" role="listitem">
        <div class="stat-num serif" id="home-mark-count">${markCount}</div>
        <div class="stat-label">${escHtml(t('stat_marks'))}</div>
      </div>
    </div>

    ${goalProgressHTML({ compact: true })}

    <div class="section-header"><div class="section-title">${escHtml(t('home_contributor'))}</div></div>
    <div class="contributor-stack">
      ${CONTRIBUTORS.map(contributorCardHTML).join('')}
    </div>

    <div class="section-header"><div class="section-title">${escHtml(t('home_leaders'))}</div></div>
    <div class="yang-card" style="cursor:pointer" onclick="location.hash='leaders'">
      <div class="yang-photo" aria-hidden="true" style="color:rgba(250,199,117,0.7)">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        ${PHOTOS['楊日陞']
          ? `<img class="yang-photo-img" src="assets/photos/${encodeURIComponent(PHOTOS['楊日陞'])}" alt="楊日陞" loading="lazy" onerror="this.remove()">`
          : ''}
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
          data-branch="${escHtml(b.name)}分會"
          role="button" tabindex="0">
          ${escHtml(b.name)}<span class="chip-count">${b.count}</span>
        </div>`).join('')}
      </div>
      <div class="branch-region-title">${escHtml(t('search_sanlu'))}</div>
      <div class="branch-chips">
        ${sanlu.map((b, i) => `<div
          class="branch-chip sanlu stagger-${Math.min(i+1,6)}"
          data-branch="${escHtml(b.name)}分會"
          role="button" tabindex="0">
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

  container.querySelectorAll('.branch-chip[data-branch]').forEach(chip => {
    const go = () => {
      sessionStorage.setItem('bni_pending_branch', chip.dataset.branch);
      location.hash = 'search';
    };
    chip.addEventListener('click', go);
    chip.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });

  document.getElementById('home-ai-submit').addEventListener('click', () => {
    const v = document.getElementById('home-ai-input').value.trim();
    if (v.length >= 2) sessionStorage.setItem('bni_pending_search', v);
    location.hash = 'search';
  });

  document.getElementById('home-video-btn').addEventListener('click', () => {
    if (VIDEO_URL) window.open(VIDEO_URL, '_blank', 'noopener');
  });

  bindEventPulse();
  bindProfileEnrichBanner();
}
