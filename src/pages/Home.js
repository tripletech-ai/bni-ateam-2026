import { getMarkCount } from '../utils/storage.js';
import { resolveBranchLists } from '../data/branches.js';
import { PHOTOS }       from '../data/photos.js';
import { escHtml }      from '../utils/html.js';
import { t }            from '../i18n/translations.js';
import { goalProgressHTML } from '../components/GoalProgress.js';
import { DEVELOPERS } from '../data/contributors.js';
import { communityLiveHTML } from '../components/CommunityLiveCard.js';
import { industryStatsHTML, bindIndustryStats } from '../components/IndustryStats.js';
import { profileEnrichBannerHTML, bindProfileEnrichBanner } from '../components/ProfileEnrichBanner.js';

const VIDEO_URL = '';

function developerCardHTML(d) {
  const initial = (d.name || '').match(/[一-鿿㐀-䶿]/g)?.slice(-1)[0] || '?';
  const tags = (d.tagKeys || []).map(k =>
    `<span class="developer-tag">${escHtml(t(k))}</span>`).join('');
  const highlights = (d.highlightKeys || []).map(k =>
    `<li class="developer-highlight-item">${escHtml(t(k))}</li>`).join('');
  const companies = d.companyKeys
    ? `<div class="developer-companies">${d.companyKeys.map(k =>
        `<span class="company-chip">${escHtml(t(k))}</span>`).join('')}</div>` : '';

  return `
    <article class="developer-card" data-developer="${escHtml(d.id)}">
      <div class="developer-card-top">
        <div class="developer-photo">
          <img src="assets/photos/${encodeURIComponent(d.photo)}"
            alt="${escHtml(d.name)}" loading="lazy"
            onerror="this.style.display='none';this.parentElement.classList.add('no-photo')">
          <span class="developer-photo-fallback" aria-hidden="true">${escHtml(initial)}</span>
        </div>
        <div class="developer-head-block">
          <div class="developer-name serif">${escHtml(d.name)}</div>
          <div class="developer-role">${escHtml(t(d.roleKey))}</div>
          <div class="developer-tags">${tags}</div>
        </div>
      </div>
      <ul class="developer-highlights">${highlights}</ul>
      ${companies}
      ${d.contactKey ? `<p class="developer-contact-note">${escHtml(t(d.contactKey))}</p>` : ''}
    </article>`;
}

function resolveBranchListsLocal() {
  return resolveBranchLists(window.BNI_PUBLIC_STATS);
}

export function renderHome(container) {
  const markCount = getMarkCount();
  const { zhongshan, sanlu, guest } = resolveBranchListsLocal();
  const totalMembers = window.BNI_PUBLIC_STATS?.total_members ?? (window.BNI_MEMBERS || []).length;
  const branchCount = window.BNI_PUBLIC_STATS?.branch_count ?? 20;

  container.innerHTML = `
    <div class="hero">
      <div style="font-size:16px;letter-spacing:2px;opacity:0.60;margin-bottom:10px;font-family:'Noto Sans TC',sans-serif">
        ${escHtml(t('hero_eyebrow'))}
      </div>
      <h1 class="hero-title serif hero-title-shimmer">${escHtml(t('hero_title'))}</h1>
      <p class="hero-sub">${escHtml(t('hero_sub')).replace('\n', '<br>')}</p>
    </div>

    ${communityLiveHTML()}

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

    <nav class="home-quick-nav" aria-label="${escHtml(t('home_quick_label'))}">
      <button type="button" class="home-quick-btn" data-hash="search">${escHtml(t('home_quick_search'))}</button>
      <button type="button" class="home-quick-btn" data-hash="marks">${escHtml(t('home_quick_marks'))}</button>
      <button type="button" class="home-quick-btn" data-hash="profile">${escHtml(t('home_quick_profile'))}</button>
    </nav>

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

    ${industryStatsHTML({ stats: window.BNI_PUBLIC_STATS, members: window.BNI_MEMBERS })}

    <div class="section-header"><div class="section-title">${escHtml(t('home_leaders'))}</div></div>
    <div class="yang-card yang-card-link" role="link" tabindex="0" data-hash="leaders">
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
        <div class="yang-title">區域資深董事<br>BNI Anderson Team</div>
        <button type="button" class="btn-yang" data-hash="leaders">
          ${escHtml(t('home_view'))}
        </button>
      </div>
    </div>

    <div class="section-header">
      <div class="section-title">${escHtml(t('home_developers'))}</div>
      <p class="section-sub">${escHtml(t('home_developers_sub'))}</p>
    </div>
    <div class="developer-stack">
      ${DEVELOPERS.map(developerCardHTML).join('')}
    </div>

    <div class="section-header"><div class="section-title">${escHtml(t('home_branches'))}</div></div>
    <div class="branch-section">
      <div class="branch-region-title">${escHtml(t('search_zhongshan'))}</div>
      <div class="branch-chips">
        ${zhongshan.map((b, i) => `<div
          class="branch-chip zhongshan stagger-${Math.min(i+1,6)}"
          data-branch="${escHtml(b.fullName || b.name + '分會')}"
          role="button" tabindex="0">
          ${escHtml(b.fullName || b.name + '分會')}<span class="chip-count">${b.count}</span>
        </div>`).join('')}
      </div>
      <div class="branch-region-title">${escHtml(t('search_sanlu'))}</div>
      <div class="branch-chips">
        ${sanlu.map((b, i) => `<div
          class="branch-chip sanlu stagger-${Math.min(i+1,6)}"
          data-branch="${escHtml(b.fullName || b.name + '分會')}"
          role="button" tabindex="0">
          ${escHtml(b.fullName || b.name + '分會')}<span class="chip-count">${b.count}</span>
        </div>`).join('')}
      </div>
      ${guest.length ? `
      <div class="branch-region-title">${escHtml(t('home_branches_guest'))}</div>
      <div class="branch-chips">
        ${guest.map((b, i) => `<div
          class="branch-chip guest stagger-${Math.min(i+1,6)}"
          data-branch="${escHtml(b.fullName || b.name + '分會')}"
          role="button" tabindex="0">
          ${escHtml(b.fullName || (String(b.name).endsWith('分會') ? b.name : b.name + '分會'))}<span class="chip-count">${b.count}</span>
        </div>`).join('')}
      </div>` : `
      <div class="branch-region-title">${escHtml(t('home_branches_guest'))}</div>
      <p class="branch-empty-hint">${escHtml(t('search_guest_empty'))}</p>`}
      <button
        onclick="location.hash='search'"
        class="btn-ai"
        style="margin-top:8px;border-radius:var(--r-sm)">
        ${escHtml(t('home_view_all'))}
      </button>
    </div>
    <div style="height:24px"></div>
  `;

  container.querySelectorAll('.home-quick-btn[data-hash]').forEach(btn => {
    const go = () => { location.hash = btn.dataset.hash; };
    btn.addEventListener('click', go);
  });

  const yangCard = container.querySelector('.yang-card-link');
  if (yangCard) {
    const goLeaders = () => { location.hash = 'leaders'; };
    yangCard.addEventListener('click', e => {
      if (e.target.closest('.btn-yang')) return;
      goLeaders();
    });
    yangCard.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goLeaders(); }
    });
  }
  container.querySelectorAll('.btn-yang[data-hash]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      location.hash = btn.dataset.hash;
    });
  });

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

  bindProfileEnrichBanner();
  bindIndustryStats(container);
}
