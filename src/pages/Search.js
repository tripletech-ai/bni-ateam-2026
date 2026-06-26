import { getKeywordsFromAI }                from '../utils/aiSearch.js';
import { searchMembersTiered, getSuggestions, getMembersByBranch, getMembersByIndustry } from '../utils/search.js';
import { personCardHTML, bindCardEvents }    from '../components/PersonCard.js';
import { resolveBranchLists, normalizeBranchName } from '../data/branches.js';
import { industryLabel, mergeIndustryStatsFromPublic } from '../data/industries.js';
import { escHtml }                           from '../utils/html.js';
import { t }                                 from '../i18n/translations.js';

export function renderSearch(container) {
  const pending       = sessionStorage.getItem('bni_pending_search');
  const pendingBranch = sessionStorage.getItem('bni_pending_branch');
  const pendingIndustry = sessionStorage.getItem('bni_pending_industry');
  if (pending)       sessionStorage.removeItem('bni_pending_search');
  if (pendingBranch) sessionStorage.removeItem('bni_pending_branch');
  if (pendingIndustry) sessionStorage.removeItem('bni_pending_industry');

  container.innerHTML = buildSearchUI();
  bindSearchEvents(container);
  renderIndustryBrowse(document.getElementById('industry-browse-area'));
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
    <div id="industry-browse-area"></div>
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
  if (branchArea) branchArea.style.display = 'none';
  const industryArea = document.getElementById('industry-browse-area');
  if (industryArea) industryArea.style.display = 'none';
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
  if (branchArea) branchArea.style.display = 'none';
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

function resetSearch() {
  const aiBox    = document.getElementById('search-ai-box');
  const result   = document.getElementById('ai-result-area');
  const search   = document.getElementById('search-results-area');
  const branches = document.getElementById('branch-browse-area');
  const industries = document.getElementById('industry-browse-area');
  if (aiBox)    aiBox.style.display    = 'block';
  if (result)   result.style.display   = 'none';
  if (search)   search.style.display   = 'none';
  if (branches) branches.style.display = 'block';
  if (industries) industries.style.display = 'block';
  const input = document.getElementById('ai-input');
  if (input) { input.value = ''; input.focus(); }
}

function renderIndustryBrowse(container) {
  if (!container) return;
  const rows = mergeIndustryStatsFromPublic(window.BNI_PUBLIC_STATS, window.BNI_MEMBERS);
  if (!rows.length) {
    container.innerHTML = '';
    return;
  }

  const chip = (row) => `
    <div class="industry-chip-browse" data-industry="${escHtml(row.id)}" role="button" tabindex="0">
      ${escHtml(industryLabel(row.id, t))}<span class="chip-count">${row.count}</span>
    </div>`;

  container.innerHTML = `
    <div class="section-header"><div class="section-title">${escHtml(t('ind_browse_title'))}</div></div>
    <div class="branch-section">
      <div class="industry-browse-grid">${rows.map(chip).join('')}</div>
    </div>`;

  const go = (id) => showIndustryMembers(id);
  container.querySelectorAll('[data-industry]').forEach(el => {
    el.addEventListener('click', () => go(el.dataset.industry));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(el.dataset.industry); }
    });
  });
}

function showIndustryMembers(industryId) {
  const members = getMembersByIndustry(industryId);
  const container = document.getElementById('search-results-area');
  const branchArea = document.getElementById('branch-browse-area');
  const industryArea = document.getElementById('industry-browse-area');
  const aiBox = document.getElementById('search-ai-box');
  if (!container) return;
  if (branchArea) branchArea.style.display = 'none';
  if (industryArea) industryArea.style.display = 'none';
  if (aiBox) aiBox.style.display = 'none';
  container.style.display = 'block';

  const label = industryLabel(industryId, t);
  if (members.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-title">${escHtml(label)} — ${escHtml(t('ind_browse_empty'))}</div>
    </div>`;
    return;
  }

  container.innerHTML = `
    <div class="results-header">
      <span>${members.length}</span> ${escHtml(t('search_branch_members'))}${escHtml(label)} ${escHtml(t('ind_browse_members_suffix'))}
    </div>
    <div id="cards-list"></div>`;

  const cardsList = document.getElementById('cards-list');
  cardsList.innerHTML = members.map((m, i) => personCardHTML(m, { staggerIndex: i })).join('');
  bindCardEvents(cardsList, members);
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    <div class="section-header"><div class="section-title">${escHtml(t('search_browse'))}</div></div>
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
    </div>`;

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
  const branchArea = document.getElementById('branch-browse-area');
  const industryArea = document.getElementById('industry-browse-area');
  if (!container) return;
  if (branchArea) branchArea.style.display = 'none';
  if (industryArea) industryArea.style.display = 'none';
  container.style.display = 'block';

  if (members.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-title">${escHtml(branchName)} 目前沒有夥伴資料</div>
    </div>`;
    return;
  }

  const prefix = window.BNI_LANG === 'en' ? '' : '';
  container.innerHTML = `
    <div class="results-header">
      <span>${members.length}</span> ${escHtml(t('search_branch_members'))}${escHtml(branchName)} 夥伴
    </div>
    <div id="cards-list"></div>`;

  const cardsList = document.getElementById('cards-list');
  cardsList.innerHTML = members.map((m, i) => personCardHTML(m, { staggerIndex: i })).join('');
  bindCardEvents(cardsList, members);
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
