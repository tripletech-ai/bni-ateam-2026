import { getSearchIntentFromAI } from '../utils/aiSearch.js';
import { searchMembersByIntent, getMembersByBranch, getMembersByIndustry } from '../utils/search.js';
import { personCardHTML, bindCardEvents } from '../components/PersonCard.js';
import { resolveBranchLists, normalizeBranchName } from '../data/branches.js';
import { industryLabel, mergeIndustryStatsFromPublic } from '../data/industries.js';
import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { showMemberList } from '../utils/memberList.js';
import { industryPieChartHTML } from '../components/IndustryPieChart.js';
import { searchInviteBannerHTML, bindSearchInviteBanner } from '../components/SearchInviteBanner.js';

export function renderSearch(container) {
  container.classList.add('page-root');
  const pending = sessionStorage.getItem('bni_pending_search');
  const pendingBranch = sessionStorage.getItem('bni_pending_branch');
  const pendingIndustry = sessionStorage.getItem('bni_pending_industry');
  if (pending) sessionStorage.removeItem('bni_pending_search');
  if (pendingBranch) sessionStorage.removeItem('bni_pending_branch');
  if (pendingIndustry) sessionStorage.removeItem('bni_pending_industry');

  container.innerHTML = buildSearchUI();
  bindSearchEvents(container);
  bindSearchInviteBanner(container);
  renderQuickFilters(document.getElementById('search-quick-filters'));
  renderBranchBrowse(document.getElementById('branch-browse-area'));

  if (pending) setTimeout(() => triggerSearch(pending), 50);
  else if (pendingBranch) setTimeout(() => showBranchMembers(pendingBranch), 50);
  else if (pendingIndustry) setTimeout(() => showIndustryMembers(pendingIndustry), 50);
}

function buildSearchUI() {
  return `
    <div id="search-ai-box" class="ai-box">
      <div class="ai-box-label">${escHtml(t('search_label'))}</div>
      <p class="search-format-hint">${escHtml(t('search_format_hint'))}</p>
      <ul class="search-format-guide" aria-label="${escHtml(t('search_format_hint'))}">
        <li><strong>【${escHtml(t('search_intent_iam'))}】</strong>${escHtml(t('search_format_iam'))}</li>
        <li><strong>【${escHtml(t('search_intent_offer'))}】</strong>${escHtml(t('search_format_offer'))}</li>
        <li><strong>【${escHtml(t('search_intent_seek'))}】</strong>${escHtml(t('search_format_seek'))}</li>
        <li><strong>【${escHtml(t('search_intent_exclude'))}】</strong>${escHtml(t('search_format_exclude'))}</li>
      </ul>
      <textarea id="ai-input" class="ai-textarea"
        placeholder="${escHtml(t('search_placeholder'))}"
        rows="6" aria-label="${escHtml(t('search_label'))}" maxlength="400"></textarea>
      <button id="ai-submit" class="btn-ai">${escHtml(t('search_btn'))}</button>
      <div class="ai-examples" aria-label="搜尋範例">
        <div class="ai-example-chip" role="button" tabindex="0">${escHtml(t('search_example1'))}</div>
        <div class="ai-example-chip" role="button" tabindex="0">${escHtml(t('search_example2'))}</div>
        <div class="ai-example-chip" role="button" tabindex="0">${escHtml(t('search_example3'))}</div>
      </div>
    </div>
    <div id="search-loading" style="display:none" role="status" aria-live="polite"></div>
    <div id="ai-result-area" style="display:none"></div>
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

function intentTagsHTML(intent) {
  const row = (label, items, cls) => {
    if (!items?.length) return '';
    return `
      <div class="intent-row">
        <span class="intent-row-label">${escHtml(label)}</span>
        <div class="intent-tags">${items.map(k => `<span class="intent-tag ${cls}">${escHtml(k)}</span>`).join('')}</div>
      </div>`;
  };
  return [
    row(t('search_intent_iam'), intent.iAm, 'intent-iam'),
    row(t('search_intent_offer'), intent.iOffer, 'intent-offer'),
    row(t('search_intent_seek'), intent.iSeek, 'intent-seek'),
    row(t('search_intent_refer'), intent.iRefer, 'intent-refer'),
    row(t('search_intent_exclude'), intent.exclude, 'intent-exclude'),
  ].filter(Boolean).join('');
}

async function triggerSearch(input) {
  const aiBox = document.getElementById('search-ai-box');
  const loading = document.getElementById('search-loading');
  const resultArea = document.getElementById('ai-result-area');
  const searchArea = document.getElementById('search-results-area');
  const submitBtn = document.getElementById('ai-submit');

  if (!aiBox || !loading) return;
  if (submitBtn) submitBtn.disabled = true;

  aiBox.style.display = 'none';
  resultArea.style.display = 'none';
  searchArea.style.display = 'none';
  hideBrowseChrome();
  loading.style.display = 'block';

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

  const intent = await getSearchIntentFromAI(input);

  if (!document.getElementById('search-loading')) return;

  loading.style.display = 'none';
  if (submitBtn) submitBtn.disabled = false;

  resultArea.style.display = 'block';
  resultArea.innerHTML = `
    <div class="ai-result-card" style="margin:16px">
      <div class="ai-result-query" style="font-size:12px;margin-bottom:8px;opacity:0.7">
        ${escHtml(input.length > 60 ? input.substring(0, 60) + '…' : input)}
      </div>
      <div class="intent-parse">${intentTagsHTML(intent)}</div>
      <button id="btn-reset-search" class="btn-reset">${escHtml(t('search_reset'))}</button>
    </div>`;

  document.getElementById('btn-reset-search').addEventListener('click', resetSearch);
  showResults(intent, searchArea);
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
    matchReasons: opts.showMatch ? (m.matchReasons || []) : [],
    staggerIndex: i,
  })).join('');

function sectionHTML(id, count, titleKey, subtitleKey, list, showMatch) {
  if (!list.length) return '';
  return `
    <div class="results-section results-section-${id}">
      <div class="results-header ${id}">
        <span class="results-count" aria-hidden="true">${count}</span>
        <div class="results-header-body">
          <div class="results-header-title">${escHtml(t(titleKey))}</div>
          <div class="results-header-sub">${escHtml(t(subtitleKey))}</div>
        </div>
      </div>
      <div id="cards-list-${id}">${cardsHTML(list, { showMatch })}</div>
    </div>`;
}

function showResults(intent, container) {
  container.style.display = 'block';
  const { precise, possible, referral } = searchMembersByIntent(intent);

  const preciseSection = precise.length
    ? sectionHTML('precise', precise.length, 'search_precise_title', 'search_precise_sub', precise, true)
    : `<div class="search-noexact">${escHtml(t('search_no_exact'))}</div>`;

  const referralSection = sectionHTML('referral', referral.length, 'search_referral_title', 'search_referral_sub', referral, true);
  const possibleSection = sectionHTML('possible', possible.length, 'search_possible_title', 'search_possible_sub', possible, true);

  const emptyHint = !precise.length && !possible.length && !referral.length
    ? `<div class="search-noexact">${escHtml(t('search_no_result'))}<br><span style="font-size:12px;opacity:0.8">${escHtml(t('search_no_result_sub'))}</span></div>`
    : '';

  container.innerHTML = `
    ${emptyHint || preciseSection}
    ${referralSection}
    ${possibleSection}
    ${REFINE_HINT()}`;

  for (const [id, list] of [['precise', precise], ['referral', referral], ['possible', possible]]) {
    const el = document.getElementById(`cards-list-${id}`);
    if (el && list.length) bindCardEvents(el, list);
  }
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
  const result = document.getElementById('ai-result-area');
  const search = document.getElementById('search-results-area');
  if (result) result.style.display = 'none';
  if (search) search.style.display = 'none';
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
    el.addEventListener('click', () => {
      container.querySelectorAll('.quick-filter-chip.active').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      showIndustryMembers(el.dataset.industry);
    });
  });
  container.querySelectorAll('[data-branch]').forEach(el => {
    el.addEventListener('click', () => {
      container.querySelectorAll('.quick-filter-chip.active').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      showBranchMembers(el.dataset.branch);
    });
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
    const chipEl = e.target.closest('[data-branch]');
    if (!chipEl) return;
    showBranchMembers(chipEl.dataset.branch);
  });
  container.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const chipEl = e.target.closest('[data-branch]');
    if (!chipEl) return;
    e.preventDefault();
    showBranchMembers(chipEl.dataset.branch);
  });
}

function showBranchMembers(branchName) {
  const members = getMembersByBranch(branchName);
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
