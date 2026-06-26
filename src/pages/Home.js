import { getMarkCount } from '../utils/storage.js';
import { resolveBranchLists } from '../data/branches.js';
import { escHtml }      from '../utils/html.js';
import { t }            from '../i18n/translations.js';
import { goalProgressHTML } from '../components/GoalProgress.js';
import { DEVELOPERS } from '../data/contributors.js';
import { communityLiveHTML } from '../components/CommunityLiveCard.js';
import { industryStatsHTML, bindIndustryStats } from '../components/IndustryStats.js';
import { profileEnrichBannerHTML, bindProfileEnrichBanner } from '../components/ProfileEnrichBanner.js';
import { leadersEmbedHTML, bindLeaderEvents } from '../pages/Leaders.js';
import { leaderboardSectionHTML } from '../components/Leaderboard.js';
import { getMembersByBranch, getMembersByIndustry } from '../utils/search.js';
import { industryLabel } from '../data/industries.js';
import { showMemberList } from '../utils/memberList.js';

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
  const branchLine = d.branchKey
    ? `<div class="developer-branch">${escHtml(t(d.branchKey))}</div>` : '';

  return `
    <article class="developer-card" data-developer="${escHtml(d.id)}">
      <div class="developer-card-top">
        <div class="developer-photo">
          <img src="assets/photos/${encodeURIComponent(d.photo)}"
            alt="" loading="lazy"
            onerror="this.style.display='none';this.parentElement.classList.add('no-photo')">
          <span class="developer-photo-fallback" aria-hidden="true">${escHtml(initial)}</span>
        </div>
        <div class="developer-head-block">
          <div class="developer-name serif">${escHtml(d.name)}</div>
          ${branchLine}
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

function showHomeIndustry(industryId) {
  const label = industryLabel(industryId, t);
  const members = getMembersByIndustry(industryId);
  showMemberList(document.getElementById('home-inline-results'), {
    title: `${label} ${t('ind_browse_members_suffix')}`,
    members,
    emptyTitle: `${label} — ${t('ind_browse_empty')}`,
  });
}

function showHomeBranch(branchName) {
  const members = getMembersByBranch(branchName);
  showMemberList(document.getElementById('home-inline-results'), {
    title: `${branchName} 夥伴`,
    members,
    emptyTitle: `${branchName} 目前沒有夥伴資料`,
  });
}

export function renderHome(container) {
  container.classList.add('page-root');
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
      <div class="ai-examples" aria-label="搜尋範例">
        <div class="ai-example-chip" role="button" tabindex="0">${escHtml(t('search_example1'))}</div>
        <div class="ai-example-chip" role="button" tabindex="0">${escHtml(t('search_example2'))}</div>
        <div class="ai-example-chip" role="button" tabindex="0">${escHtml(t('search_example3'))}</div>
      </div>
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

    <div id="home-inline-results" class="home-inline-results" style="display:none" aria-live="polite"></div>

    <div class="section-header">
      <div class="section-title">${escHtml(t('home_developers'))}</div>
      <p class="section-sub">${escHtml(t('home_developers_sub'))}</p>
    </div>
    <div class="developer-stack">
      ${DEVELOPERS.map(developerCardHTML).join('')}
    </div>

    <div class="section-header"><div class="section-title">${escHtml(t('home_leaders'))}</div></div>
    ${leadersEmbedHTML()}

    ${leaderboardSectionHTML(window.BNI_LEADERBOARD || [], { compact: true, showMore: true })}

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
      <button type="button" id="home-all-branches" class="btn-outline home-all-branches">
        ${escHtml(t('home_view_all'))}
      </button>
    </div>
    <div style="height:24px"></div>
  `;

  container.querySelectorAll('.home-quick-btn[data-hash]').forEach(btn => {
    btn.addEventListener('click', () => { location.hash = btn.dataset.hash; });
  });

  container.querySelectorAll('.lb-more-btn[data-hash]').forEach(btn => {
    btn.addEventListener('click', () => { location.hash = btn.dataset.hash; });
  });

  bindLeaderEvents(container);

  container.querySelectorAll('.branch-chip[data-branch]').forEach(chip => {
    const go = () => {
      container.querySelectorAll('.branch-chip.active').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      showHomeBranch(chip.dataset.branch);
    };
    chip.addEventListener('click', go);
    chip.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });

  document.getElementById('home-all-branches')?.addEventListener('click', () => {
    location.hash = 'search';
  });

  const runHomeSearch = (text) => {
    if (text.length >= 2) sessionStorage.setItem('bni_pending_search', text);
    location.hash = 'search';
  };

  document.getElementById('home-ai-submit').addEventListener('click', () => {
    runHomeSearch(document.getElementById('home-ai-input').value.trim());
  });

  container.querySelectorAll('.ai-example-chip').forEach(chip => {
    const trigger = () => {
      const text = chip.textContent.trim();
      const input = document.getElementById('home-ai-input');
      if (input) input.value = text;
      runHomeSearch(text);
    };
    chip.addEventListener('click', trigger);
    chip.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger(); }
    });
  });

  bindProfileEnrichBanner();
  bindIndustryStats(container, { onSelect: showHomeIndustry });
}
