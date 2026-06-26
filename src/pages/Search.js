import { getSearchIntentFromAI, MIN_THINKING_MS } from '../utils/aiSearch.js';
import { searchMembersByIntent, getMembersByBranch, getMembersByIndustry } from '../utils/search.js';
import { personCardHTML, bindCardEvents } from '../components/PersonCard.js';
import { resolveBranchLists, normalizeBranchName } from '../data/branches.js';
import { industryLabel, mergeIndustryStatsFromPublic } from '../data/industries.js';
import { escHtml, escAttr } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { showMemberList } from '../utils/memberList.js';
import { findMemberByNameBranch } from '../utils/feedMemberNav.js';
import { industryPieChartHTML } from '../components/IndustryPieChart.js';
import { profileEnrichBannerHTML, bindProfileEnrichBanner } from '../components/ProfileEnrichBanner.js';
import { saveSearchSession, loadSearchSession, clearSearchSession } from '../utils/searchSession.js';

export function renderSearch(container) {
  container.classList.add('page-root');
  const pending = sessionStorage.getItem('bni_pending_search');
  const pendingBranch = sessionStorage.getItem('bni_pending_branch');
  const pendingIndustry = sessionStorage.getItem('bni_pending_industry');
  const pendingMemberRaw = sessionStorage.getItem('bni_pending_member');
  if (pending) sessionStorage.removeItem('bni_pending_search');
  if (pendingBranch) sessionStorage.removeItem('bni_pending_branch');
  if (pendingIndustry) sessionStorage.removeItem('bni_pending_industry');
  if (pendingMemberRaw) sessionStorage.removeItem('bni_pending_member');

  container.innerHTML = buildSearchUI();
  bindSearchEvents(container);
  bindProfileEnrichBanner();
  renderQuickFilters(document.getElementById('search-quick-filters'));
  renderBranchBrowse(document.getElementById('branch-browse-area'));

  if (pending) setTimeout(() => triggerSearch(pending), 50);
  else if (pendingBranch) setTimeout(() => showBranchMembers(pendingBranch), 50);
  else if (pendingIndustry) setTimeout(() => showIndustryMembers(pendingIndustry), 50);
  else if (pendingMemberRaw) {
    try {
      const { name, branch } = JSON.parse(pendingMemberRaw);
      setTimeout(() => showMemberProfile(name, branch), 50);
    } catch { /* ignore */ }
  } else {
    restoreSearchSession();
  }
}

function buildSearchUI() {
  return `
    ${profileEnrichBannerHTML()}
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
        rows="6" aria-label="${escHtml(t('search_label'))}" maxlength="500" autofocus></textarea>
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
    ${industryPieChartHTML({ stats: window.BNI_PUBLIC_STATS, members: window.BNI_MEMBERS })}
    <div id="search-quick-filters"></div>
    <div id="branch-browse-area"></div>
  `;
}

function bindSearchEvents(container) {
  const input = document.getElementById('ai-input');
  if (input && !input.value) {
    try { input.focus({ preventScroll: true }); } catch { input.focus(); }
  }
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

function thinkingFallbackSteps() {
  return [t('search_thinking_1'), t('search_thinking_2'), t('search_thinking_3')];
}

function searchThinkingLoadingHTML() {
  return `
    <div class="search-thinking-panel" role="status" aria-live="polite">
      <div class="search-thinking-heading">${escHtml(t('search_thinking_title'))}</div>
      <ol class="search-thinking-steps" id="search-thinking-steps">
        ${[0, 1, 2].map(i => `
          <li class="thinking-step" data-step="${i}">
            <span class="thinking-step-label">${i + 1}</span>
            <span class="thinking-step-text"></span>
          </li>`).join('')}
      </ol>
      <p class="search-waiting-dev">${escHtml(t('search_waiting_dev'))}</p>
      <div class="search-loading-spinner" aria-hidden="true"></div>
    </div>`;
}

function revealThinkingStep(index, text, { active = false, done = false } = {}) {
  const list = document.getElementById('search-thinking-steps');
  if (!list) return;
  const step = list.querySelector(`.thinking-step[data-step="${index}"]`);
  if (!step) return;
  const textEl = step.querySelector('.thinking-step-text');
  if (textEl) textEl.textContent = text;
  step.classList.add('visible');
  step.classList.toggle('active', active);
  step.classList.toggle('done', done);
  list.querySelectorAll('.thinking-step').forEach((el, i) => {
    if (i < index) {
      el.classList.add('visible', 'done');
      el.classList.remove('active');
    }
  });
}

function finalizeThinkingSteps(steps) {
  steps.forEach((text, i) => revealThinkingStep(i, text, { done: true }));
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

function buildResultCardHTML(input, steps, intent) {
  return `
    <div class="ai-result-card" style="margin:16px">
      <div class="ai-result-query">${escHtml(input.length > 60 ? input.substring(0, 60) + '…' : input)}</div>
      <div class="search-thinking-recap">
        <div class="search-thinking-heading">${escHtml(t('search_thinking_title'))}</div>
        <ol class="search-thinking-steps search-thinking-steps-done">
          ${steps.map((text, i) => `
            <li class="thinking-step visible done" data-step="${i}">
              <span class="thinking-step-label">${i + 1}</span>
              <span class="thinking-step-text">${escHtml(text)}</span>
            </li>`).join('')}
        </ol>
      </div>
      ${intent.analysis ? `<p class="ai-result-analysis"><span class="ai-result-analysis-label">${escHtml(t('search_ai_analysis'))}</span>${escHtml(intent.analysis)}</p>` : ''}
      <div class="intent-parse">${intentTagsHTML(intent)}</div>
      <p class="search-dev-promo-inline">${escHtml(t('search_waiting_dev'))}</p>
      <button id="btn-reset-search" class="btn-reset">${escHtml(t('search_reset'))}</button>
    </div>`;
}

function displaySearchResults(input, intent, steps) {
  const aiBox = document.getElementById('search-ai-box');
  const loading = document.getElementById('search-loading');
  const resultArea = document.getElementById('ai-result-area');
  const searchArea = document.getElementById('search-results-area');
  const submitBtn = document.getElementById('ai-submit');

  if (!resultArea || !searchArea) return;

  if (loading) loading.style.display = 'none';
  if (submitBtn) submitBtn.disabled = false;
  hideBrowseChrome();
  if (aiBox) aiBox.style.display = 'none';

  const inputEl = document.getElementById('ai-input');
  if (inputEl) inputEl.value = input;

  resultArea.style.display = 'block';
  resultArea.innerHTML = buildResultCardHTML(input, steps, intent);
  document.getElementById('btn-reset-search')?.addEventListener('click', resetSearch);
  showResults(intent, searchArea);
  saveSearchSession({ input, intent, steps });
}

function restoreSearchSession() {
  const saved = loadSearchSession();
  if (!saved?.input || !saved?.intent) return;
  const steps = saved.steps?.length >= 3
    ? saved.steps
    : thinkingFallbackSteps();
  displaySearchResults(saved.input, saved.intent, steps);
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
  loading.innerHTML = searchThinkingLoadingHTML();

  const fallbacks = thinkingFallbackSteps();
  const stepTimers = [
    setTimeout(() => revealThinkingStep(0, fallbacks[0], { active: true }), 0),
    setTimeout(() => revealThinkingStep(1, fallbacks[1], { active: true }), 1400),
    setTimeout(() => revealThinkingStep(2, fallbacks[2], { active: true }), 2800),
  ];

  const [intent] = await Promise.all([
    getSearchIntentFromAI(input),
    new Promise(resolve => setTimeout(resolve, MIN_THINKING_MS)),
  ]);

  stepTimers.forEach(clearTimeout);

  if (!document.getElementById('search-loading')) return;

  const steps = intent.thinking_steps?.length >= 3 ? intent.thinking_steps : fallbacks;
  finalizeThinkingSteps(steps);

  await new Promise(resolve => setTimeout(resolve, 600));

  if (!document.getElementById('search-loading')) return;

  displaySearchResults(input, intent, steps);
}

const cardsHTML = (list, opts = {}) =>
  list.map((m, i) => personCardHTML(m, {
    matchedKeywords: opts.showMatch ? (m.matchedKeywords || []) : [],
    matchReasons: opts.showMatch ? (m.matchReasons || []) : [],
    staggerIndex: i,
  })).join('');

function sectionHTML(id, count, titleKey, list, showMatch, subTitleKey = '') {
  if (!list.length) return '';
  const sub = subTitleKey ? `<div class="results-header-sub">${escHtml(t(subTitleKey))}</div>` : '';
  return `
    <div class="results-section results-section-${id}">
      <div class="results-header ${id}">
        <span class="results-count" aria-hidden="true">${count}</span>
        <div class="results-header-body">
          <div class="results-header-title">${escHtml(t(titleKey))}</div>
          ${sub}
        </div>
      </div>
      <div id="cards-list-${id}">${cardsHTML(list, { showMatch })}</div>
    </div>`;
}

function showResults(intent, container) {
  container.style.display = 'block';
  const { precise, network, referral, possible } = searchMembersByIntent(intent);
  const collaborate = [...precise, ...network];

  const collaborateSection = sectionHTML(
    'collaborate', collaborate.length, 'search_collaborate_title', collaborate, true, 'search_collaborate_sub',
  );
  const referralSection = sectionHTML('referral', referral.length, 'search_referral_title', referral, true);
  const possibleSection = sectionHTML('possible', possible.length, 'search_possible_title', possible, true);

  const emptyHint = !collaborate.length && !possible.length && !referral.length
    ? `<div class="search-noexact">${escHtml(t('search_no_result'))}</div>`
    : '';

  container.innerHTML = `
    ${emptyHint || collaborateSection}
    ${referralSection}
    ${possibleSection}`;

  for (const [id, list] of [['collaborate', collaborate], ['referral', referral], ['possible', possible]]) {
    const el = document.getElementById(`cards-list-${id}`);
    if (el && list.length) bindCardEvents(el, list);
  }
}

function hideBrowseChrome() {
  const aiBox = document.getElementById('search-ai-box');
  const quick = document.getElementById('search-quick-filters');
  const branches = document.getElementById('branch-browse-area');
  const pie = document.querySelector('.industry-pie-section');
  if (aiBox) aiBox.style.display = 'none';
  if (quick) quick.style.display = 'none';
  if (branches) branches.style.display = 'none';
  if (pie) pie.style.display = 'none';
}

function showBrowseChrome() {
  const aiBox = document.getElementById('search-ai-box');
  const quick = document.getElementById('search-quick-filters');
  const branches = document.getElementById('branch-browse-area');
  const pie = document.querySelector('.industry-pie-section');
  if (aiBox) aiBox.style.display = 'block';
  if (quick) quick.style.display = 'block';
  if (branches) branches.style.display = 'block';
  if (pie) pie.style.display = '';
}

function resetSearch() {
  clearSearchSession();
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
    <section class="branch-browse-card" aria-label="${escAttr(t('search_browse_all_branches'))}">
      <div class="branch-browse-header">
        <span class="branch-browse-icon" aria-hidden="true">📋</span>
        <div class="branch-browse-head-text">
          <div class="branch-browse-title">${escHtml(t('search_browse_all_branches'))}</div>
          <div class="branch-browse-sub">${escHtml(t('search_browse_all_branches_sub'))}</div>
        </div>
      </div>
      <div class="branch-browse-body">
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
      </div>
    </section>`;

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

function showMemberProfile(name, branch) {
  const member = findMemberByNameBranch(name, branch);
  const container = document.getElementById('search-results-area');
  if (!container) return;
  hideBrowseChrome();
  document.getElementById('ai-result-area').style.display = 'none';
  const branchLabel = branch || '';
  showMemberList(container, {
    title: branchLabel ? `${name} · ${branchLabel}` : name,
    members: member ? [member] : [],
    emptyTitle: branchLabel ? `${name} · ${branchLabel} — ${t('feed_member_not_found')}` : t('feed_member_not_found'),
  });
}
