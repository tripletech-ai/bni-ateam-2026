import { getKeywordsFromAI }                from '../utils/aiSearch.js';
import { searchMembersTiered, getSuggestions, getMembersByBranch, getMembersByIndustry } from '../utils/search.js';
import { personCardHTML, bindCardEvents }    from '../components/PersonCard.js';
import { resolveBranchLists, normalizeBranchName } from '../data/branches.js';
import { industryLabel, mergeIndustryStatsFromPublic } from '../data/industries.js';
import { escHtml }                           from '../utils/html.js';
import { t }                                 from '../i18n/translations.js';
import { showMemberList }                    from '../utils/memberList.js';
import { industryPieChartHTML } from '../components/IndustryPieChart.js';
import { searchInviteBannerHTML, bindSearchInviteBanner } from '../components/SearchInviteBanner.js';

export function renderSearch(container) {
  container.classList.add('page-root');
  const pending       = sessionStorage.getItem('bni_pending_search');
  const pendingBranch = sessionStorage.getItem('bni_pending_branch');
  const pendingIndustry = sessionStorage.getItem('bni_pending_industry');
  if (pending)       sessionStorage.removeItem('bni_pending_search');
  if (pendingBranch) sessionStorage.removeItem('bni_pending_branch');
  if (pendingIndustry) sessionStorage.removeItem('bni_pending_industry');

  container.innerHTML = buildSearchUI();
  bindSearchEvents(container);
  bindSearchInviteBanner(container);
  renderQuickFilters(document.getElementById('search-quick-filters'));
  renderBranchBrowse(document.getElementById('branch-browse-area'));

  if (pending)       setTimeout(() => triggerSearch(pending), 50);
  else if (pendingBranch) setTimeout(() => showBranchMembers(pendingBranch), 50);
  else if (pendingIndustry) setTimeout(() => showIndustryMembers(pendingIndustry), 50);
}

function buildSearchUI() {
  return `
    <div id="search-ai-box" class="ai-box">
      <div class="ai-box-label">${escHtml(t('search_label'))}</div>
      <textarea id="ai-input" class="ai-textarea"
        placeholder="${escHtml(t('search_placeholder'))}"
        rows="3" aria-label="${escHtml(t('search_label'))}" maxlength="200"></textarea>
      <button id="ai-submit" class="btn-ai">${escHtml(t('search_btn'))}</button>
      <div class="ai-examples" aria-label="搜尋範例">
        <div class="ai-example-chip" role="button" tabindex="0">${escHtml(t('search_example1'))}</div>
        <div class="ai-example-chip" role="button" tabindex="0">${escHtml(t('search_example2'))}</div>
        <div class="ai-example-chip" role="button" tabindex="0">${escHtml(t('search_example3'))}</div>
      </div>
    </div>
    <div id="search-loading" style="display:none" role="status" aria-live="polite"></div>
    <div id="ai-result-area"      style="display:none"></div>
    <div id="search-results-area" style="display:none"></div>
    ${searchInviteBannerHTML()}
    ${industryPieChartHTML({ stats: window.BNI_PUBLIC_STATS, members: window.BNI_MEMBERS })}
    <div id="search-quick-filters"></div>
    <div id="branch-browse-area"></div>
  `;
}

function bindSearchEvents(container) {
  container.querySelectorAll('.ai-example-chip').forEach(chip => {
    const trigger = () => {
      const input = document.getElementById('ai-input');
      if (input) input.value = chip.textContent.trim();
      triggerSearch(chip.textContent.trim());
    };
    chip.addEventListener('click', trigger);
    chip.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger(); }
    });
  });

  document.getElementById('ai-submit').addEventListener('click', () => {
    const input = document.getElementById('ai-input').value.trim();
    if (input.length >= 2) triggerSearch(input);
  });

  document.getElementById('ai-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('ai-submit').click();
    }
  });
}

async function triggerSearch(input) {
  const aiBox      = document.getElementById('search-ai-box');
  const loading    = document.getElementById('search-loading');
  const resultArea = document.getElementById('ai-result-area');
  const searchArea = document.getElementById('search-results-area');
  const branchArea = document.getElementById('branch-browse-area');
  const submitBtn  = document.getElementById('ai-submit');

  if (!aiBox || !loading) return;
  if (submitBtn) submitBtn.disabled = true;

  aiBox.style.display      = 'none';
  resultArea.style.display = 'none';
  searchArea.style.display = 'none';
  hideBrowseChrome();
  loading.style.display    = 'block';

  // Premium AI loading animation
  loading.innerHTML = `
    <div class="ai-loading-container">
      <div class="ai-scan-line"></div>
      <div class="ai-particles">
        <div class="ai-particle"></div>
        <div class="ai-particle"></div>
        <div class="ai-particle"></div>
        <div class="ai-particle"></div>
        <div class="ai-particle"></div>
      </div>
      <div class="ai-loading-text">${escHtml(t('search_analyzing'))}</div>
      <div class="ai-shimmer-bar"><div class="ai-shimmer-fill"></div></div>
      <div class="ai-loading-promo">
        <p class="ai-loading-promo-text">${escHtml(t('search_dev_promo'))}</p>
        <p class="ai-loading-promo-contact">${escHtml(t('search_dev_contact'))}</p>
      </div>
    </div>`;

  const keywords = await getKeywordsFromAI(input);

  // Guard: user may have navigated away
  if (!document.getElementById('search-loading')) return;

  loading.style.display = 'none';
  if (submitBtn) submitBtn.disabled = false;

  // Show AI keyword result card (no manual search button — auto-searches immediately)
  resultArea.style.display = 'block';
  resultArea.innerHTML = `
    <div class="ai-result-card" style="margin:16px">
      <div class="ai-result-query" style="font-size:12px;margin-bottom:8px;opacity:0.7">
        ${escHtml(input.length > 45 ? input.substring(0, 45) + '…' : input)}
      </div>
      <div class="keyword-tags">
        ${keywords.map(k => `<span class="keyword-tag">${escHtml(k)}</span>`).join('')}
      </div>
      <button id="btn-reset-search" class="btn-reset">${escHtml(t('search_reset'))}</button>
    </div>`;

  document.getElementById('btn-reset-search').addEventListener('click', resetSearch);

  // Auto-search immediately (no manual button)
  showResults(keywords, searchArea);
}

const REFINE_HINT = () => `
  <div class="search-refine">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3z"/>
    </svg>
    <div>${escHtml(t('search_refine_hint'))}</div>
  </div>`;

const cardsHTML = (list, opts = {}) =>
  list.map((m, i) => personCardHTML(m, {
    matchedKeywords: opts.showMatch ? (m.matchedKeywords || []) : [],
    staggerIndex: i,
  })).join('');

function showResults(keywords, container) {
  container.style.display = 'block';
  const { precise, possible } = searchMembersTiered(keywords);
  const MIN_POSSIBLE = 3;

  const excludeIds = new Set([...precise, ...possible].map(r => r.id || r.name));
  let possibleList = [...possible];
  if (possibleList.length < MIN_POSSIBLE) {
    const extra = getSuggestions(keywords, excludeIds, MIN_POSSIBLE - possibleList.length);
    possibleList = [...possibleList, ...extra];
  }

  const preciseSection = precise.length
    ? `<div class="results-header precise">
        <span>${precise.length}</span> ${escHtml(t('search_precise_title'))}
      </div>
      <div id="cards-list-precise">${cardsHTML(precise, { showMatch: true })}</div>`
    : `<div class="search-noexact">${escHtml(t('search_no_exact'))}</div>`;

  const possibleSection = possibleList.length
    ? `<div class="results-header possible">
        <span>${possibleList.length}</span> ${escHtml(t('search_possible_title'))}
      </div>
      <div id="cards-list-possible">${cardsHTML(possibleList, { showMatch: true })}</div>`
    : '';

  container.innerHTML = `
    ${preciseSection}
    ${possibleSection}
    ${REFINE_HINT()}`;

  const preciseEl = document.getElementById('cards-list-precise');
  if (preciseEl) bindCardEvents(preciseEl, precise);
  const possibleEl = document.getElementById('cards-list-possible');
  if (possibleEl) bindCardEvents(possibleEl, possibleList);
}

function hideBrowseChrome() {
  const aiBox = document.getElementById('search-ai-box');
  const quick = document.getElementById('search-quick-filters');
  const branches = document.getElementById('branch-browse-area');
  const invite = document.querySelector('.search-invite-banner');
  const pie = document.querySelector('.industry-pie-section');
  if (aiBox) aiBox.style.display = 'none';
  if (quick) quick.style.display = 'none';
  if (branches) branches.style.display = 'none';
  if (invite) invite.style.display = 'none';
  if (pie) pie.style.display = 'none';
}

function showBrowseChrome() {
  const aiBox = document.getElementById('search-ai-box');
  const quick = document.getElementById('search-quick-filters');
  const branches = document.getElementById('branch-browse-area');
  const invite = document.querySelector('.search-invite-banner');
  const pie = document.querySelector('.industry-pie-section');
  if (aiBox) aiBox.style.display = 'block';
  if (quick) quick.style.display = 'block';
  if (branches) branches.style.display = 'block';
  if (invite) invite.style.display = '';
  if (pie) pie.style.display = '';
}

function resetSearch() {
  const result   = document.getElementById('ai-result-area');
  const search   = document.getElementById('search-results-area');
  if (result)   result.style.display   = 'none';
  if (search)   search.style.display   = 'none';
  showBrowseChrome();
  document.querySelectorAll('.quick-filter-chip.active').forEach(c => c.classList.remove('active'));
  const input = document.getElementById('ai-input');
  if (input) { input.value = ''; input.focus(); }
}

function renderQuickFilters(container) {
  if (!container) return;
  const rows = mergeIndustryStatsFromPublic(window.BNI_PUBLIC_STATS, window.BNI_MEMBERS);
  const { zhongshan, sanlu, guest } = resolveBranchLists(window.BNI_PUBLIC_STATS);
  const topBranches = [
    ...zhongshan.slice(0, 5).map(b => ({ ...b, region: 'zhongshan' })),
    ...sanlu.slice(0, 5).map(b => ({ ...b, region: 'sanlu' })),
    ...guest.slice(0, 4).map(b => ({ ...b, region: 'guest' })),
  ];

  const industryChips = rows.map(row => `
    <button type="button" class="quick-filter-chip industry" data-industry="${escHtml(row.id)}">
      ${escHtml(industryLabel(row.id, t))}<span class="chip-count">${row.count}</span>
    </button>`).join('');

  const branchChips = topBranches.map(b => {
    const full = b.fullName || normalizeBranchName(b.name);
    const label = b.fullName || full;
    return `<button type="button" class="quick-filter-chip branch ${b.region}" data-branch="${escHtml(full)}">
      ${escHtml(label)}<span class="chip-count">${b.count}</span>
    </button>`;
  }).join('');

  if (!industryChips && !branchChips) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="quick-filter-section">
      <div class="quick-filter-label">${escHtml(t('search_quick_filter'))}</div>
      <div class="quick-filter-scroll" role="list">
        ${industryChips}${branchChips}
      </div>
    </div>`;

  container.querySelectorAll('[data-industry]').forEach(el => {
    const go = () => {
      container.querySelectorAll('.quick-filter-chip.active').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      showIndustryMembers(el.dataset.industry);
    };
    el.addEventListener('click', go);
  });
  container.querySelectorAll('[data-branch]').forEach(el => {
    const go = () => {
      container.querySelectorAll('.quick-filter-chip.active').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      showBranchMembers(el.dataset.branch);
    };
    el.addEventListener('click', go);
  });
}

function showIndustryMembers(industryId) {
  const members = getMembersByIndustry(industryId);
  const container = document.getElementById('search-results-area');
  const label = industryLabel(industryId, t);
  if (!container) return;
  hideBrowseChrome();
  document.getElementById('ai-result-area').style.display = 'none';
  showMemberList(container, {
    title: `${label} ${t('ind_browse_members_suffix')}`,
    members,
    emptyTitle: `${label} — ${t('ind_browse_empty')}`,
  });
}

function renderBranchBrowse(container) {
  if (!container) return;
  const { zhongshan, sanlu, guest } = resolveBranchLists(window.BNI_PUBLIC_STATS);

  const chip = (b, region) => {
    const full = b.fullName || normalizeBranchName(b.name);
    const label = b.fullName || full;
    return `<div class="branch-chip ${region}" data-branch="${escHtml(full)}" role="button" tabindex="0">
      ${escHtml(label)}<span class="chip-count">${b.count}</span>
    </div>`;
  };

  container.innerHTML = `
    <details class="branch-browse-details">
      <summary class="branch-browse-summary">${escHtml(t('search_browse_all_branches'))}</summary>
      <div class="branch-section">
        <div class="branch-region-title">${escHtml(t('search_zhongshan'))}</div>
        <div class="branch-chips">${zhongshan.map(b => chip(b, 'zhongshan')).join('')}</div>
        <div class="branch-region-title">${escHtml(t('search_sanlu'))}</div>
        <div class="branch-chips">${sanlu.map(b => chip(b, 'sanlu')).join('')}</div>
        <div class="branch-region-title">${escHtml(t('search_guest'))}</div>
        <div class="branch-chips">${guest.length
          ? guest.map(b => chip(b, 'guest')).join('')
          : `<p class="branch-empty-hint">${escHtml(t('search_guest_empty'))}</p>`}
        </div>
      </div>
    </details>`;

  container.addEventListener('click', e => {
    const chip = e.target.closest('[data-branch]');
    if (!chip) return;
    showBranchMembers(chip.dataset.branch);
  });
  container.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const chip = e.target.closest('[data-branch]');
    if (!chip) return;
    e.preventDefault();
    showBranchMembers(chip.dataset.branch);
  });
}

function showBranchMembers(branchName) {
  const members   = getMembersByBranch(branchName);
  const container = document.getElementById('search-results-area');
  if (!container) return;
  hideBrowseChrome();
  document.getElementById('ai-result-area').style.display = 'none';
  showMemberList(container, {
    title: `${branchName} 夥伴`,
    members,
    emptyTitle: `${branchName} 目前沒有夥伴資料`,
  });
}
