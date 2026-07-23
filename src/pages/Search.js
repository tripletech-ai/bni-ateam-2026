import { getSearchIntentFromAI, MIN_THINKING_MS } from '../utils/aiSearch.js';
import { searchMembersByIntent, getMembersByBranch, getMembersByIndustry, searchMembersDirect } from '../utils/search.js';
import { personCardHTML, bindCardEvents } from '../components/PersonCard.js';
import { resolveBranchLists, normalizeBranchName } from '../data/branches.js';
import { industryLabel, mergeIndustryStatsFromPublic } from '../data/industries.js';
import { escHtml, escAttr } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { showMemberList } from '../utils/memberList.js';
import { findMemberByNameBranch } from '../utils/feedMemberNav.js';
import { industryPieChartHTML } from '../components/IndustryPieChart.js';
import { profileEnrichBannerHTML, bindProfileEnrichBanner } from '../components/ProfileEnrichBanner.js';
import { showToast } from '../utils/toast.js';
import { saveSearchSession, loadSearchSession, clearSearchSession, loadSearchDraft, saveSearchDraft } from '../utils/searchSession.js';
import { fetchAllMembers, fetchPublicStats, getMyStatus, isBound } from '../services/auth.js';
import { refreshMembersCache } from '../services/membersApi.js';
import { eventRegistryBrowseHTML, bindEventChapterClicks } from '../components/EventChapterBrowse.js';
import { loadDinnerIdentity } from '../utils/dinnerSession.js';
import { isDinnerMode } from '../config/appMode.js';
import {
  CHANGHUI_DINNER_EVENT,
  CHANGHUI_DINNER_MEMBERS,
  CHANGHUI_DINNER_GUESTS,
  getChanghuiDinnerRoster,
} from '../data/changhuiDinner.js';

/** 找人脈：'direct' | 'ai' | null（未展開） */
let activeSearchMode = null;

function applySearchModeUI() {
  const direct = document.getElementById('search-direct-box');
  const aiBox = document.getElementById('search-ai-box');
  const launcher = document.getElementById('search-mode-launcher');

  launcher?.querySelectorAll('[data-search-mode]').forEach(btn => {
    const on = btn.dataset.searchMode === activeSearchMode;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-expanded', String(on));
  });

  if (direct) {
    const show = activeSearchMode === 'direct';
    direct.hidden = !show;
    direct.classList.toggle('search-panel-open', show);
  }
  if (aiBox) {
    const show = activeSearchMode === 'ai';
    aiBox.hidden = !show;
    aiBox.style.display = show ? 'block' : 'none';
    aiBox.classList.toggle('search-panel-open', show);
  }
}

function setSearchMode(mode, { focus = true } = {}) {
  activeSearchMode = mode;
  applySearchModeUI();
  if (!focus) return;
  if (mode === 'direct') {
    document.getElementById('direct-search-input')?.focus();
  } else if (mode === 'ai') {
    document.getElementById('ai-input')?.focus();
  }
}

function bindSearchModeLauncher() {
  document.getElementById('search-mode-launcher')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-search-mode]');
    if (!btn) return;
    setSearchMode(btn.dataset.searchMode);
  });
}

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

  activeSearchMode = null;

  container.innerHTML = buildSearchUI();
  bindSearchModeLauncher();
  bindSearchEvents(container);
  bindDirectSearchEvents(container);
  bindProfileEnrichBanner();
  renderQuickFilters(document.getElementById('search-quick-filters'));
  renderBranchBrowse(document.getElementById('branch-browse-area'));

  refreshMembersCache(fetchAllMembers, { force: true }).then(() => {
    if (!document.getElementById('branch-browse-area')) return;
    renderQuickFilters(document.getElementById('search-quick-filters'));
    renderBranchBrowse(document.getElementById('branch-browse-area'));
  }).catch(e => console.warn('refresh members:', e.message));

  if (pending) {
    setSearchMode('ai', { focus: false });
    setTimeout(() => triggerSearch(pending), 50);
  } else if (pendingBranch) setTimeout(() => showBranchMembers(pendingBranch), 50);
  else if (pendingIndustry) setTimeout(() => showIndustryMembers(pendingIndustry), 50);
  else if (pendingMemberRaw) {
    try {
      const { name, branch } = JSON.parse(pendingMemberRaw);
      setTimeout(() => showMemberProfile(name, branch), 50);
    } catch { /* ignore */ }
  } else {
    restoreSearchSession();
    // 預設展開「AI 幫我找」（核心動作）
    setSearchMode('ai');
  }
}

function getMyMatchProfile() {
  const dinner = window.BNI_DINNER_PROFILE || loadDinnerIdentity();
  const member = getMyStatus()?.member;
  const profession = dinner?.profession || member?.profession || '';
  const have = dinner?.have || member?.have || '';
  const name = dinner?.name || member?.name || window.BNI_MY_NAME || '';
  return { name, profession, have };
}

function buildPrefillSeekQuery(seekText) {
  const seek = String(seekText || '').trim();
  const { profession, have } = getMyMatchProfile();
  const lines = [];
  if (profession) lines.push(`【我是】${profession}`);
  if (have) lines.push(`【我提供】${have}`);
  // 使用者可能已寫【想找】或只寫關鍵字
  if (/【想找】/.test(seek) || /\[Seeking\]/i.test(seek)) {
    lines.push(seek);
  } else {
    lines.push(`【想找】${seek}`);
  }
  return lines.join('\n');
}

function buildSearchUI() {
  const profile = getMyMatchProfile();
  const simplify = isBound() || isDinnerMode() || !!profile.profession || !!profile.name;
  const profileHint = simplify && (profile.profession || profile.name)
    ? `<div class="search-ai-autofill" role="status">
        <div class="search-ai-autofill-title">已帶入你的資料</div>
        <p class="search-ai-autofill-body">
          ${profile.name ? `<strong>${escHtml(profile.name)}</strong>` : ''}
          ${profile.profession ? ` · ${escHtml(profile.profession)}` : ''}
          ${profile.have ? `<br><span class="search-ai-autofill-have">提供：${escHtml(profile.have.slice(0, 80))}${profile.have.length > 80 ? '…' : ''}</span>` : ''}
        </p>
        <p class="search-ai-autofill-tip">你只要填「想找什麼資源／對象」即可</p>
      </div>`
    : '';

  return `
    ${profileEnrichBannerHTML()}
    <div class="search-mode-launcher" id="search-mode-launcher" role="group" aria-label="${escAttr(t('search_mode_group'))}">
      <button type="button" class="search-mode-btn search-mode-ai" data-search-mode="ai"
        aria-expanded="true" aria-controls="search-ai-box">
        <span class="search-mode-btn-label">${escHtml(t('search_mode_ai'))}</span>
        <span class="search-mode-btn-hint">${escHtml(simplify ? '填想找的資源即可' : t('search_mode_ai_hint'))}</span>
      </button>
      <button type="button" class="search-mode-btn search-mode-direct" data-search-mode="direct"
        aria-expanded="false" aria-controls="search-direct-box">
        <span class="search-mode-btn-label">${escHtml(t('search_mode_direct'))}</span>
        <span class="search-mode-btn-hint">${escHtml(t('search_mode_direct_hint'))}</span>
      </button>
    </div>
    <section class="search-direct-box search-panel" id="search-direct-box" hidden
      aria-label="${escAttr(t('search_direct_title'))}">
      <div class="search-direct-head">
        <div class="search-direct-title">${escHtml(t('search_direct_title'))}</div>
        <p class="search-direct-sub">${escHtml(t('search_direct_sub'))}</p>
      </div>
      <div class="search-direct-row">
        <input type="search" id="direct-search-input" class="search-direct-input"
          placeholder="${escAttr(t('search_direct_ph'))}" autocomplete="off" enterkeyhint="search"
          maxlength="40" aria-label="${escAttr(t('search_direct_ph'))}">
        <button type="button" id="direct-search-btn" class="btn-ai search-direct-btn">${escHtml(t('search_direct_btn'))}</button>
      </div>
    </section>
    <div id="search-ai-box" class="ai-box search-panel" hidden>
      ${profileHint}
      <div class="ai-box-label">${escHtml(simplify ? '你想找什麼？' : t('search_label'))}</div>
      ${simplify ? '' : `
      <details class="search-format-details">
        <summary>${escHtml(t('search_format_toggle'))}</summary>
        <p class="search-format-hint">${escHtml(t('search_format_hint'))}</p>
        <ul class="search-format-guide" aria-label="${escHtml(t('search_format_hint'))}">
          <li><strong>【${escHtml(t('search_intent_iam'))}】</strong>${escHtml(t('search_format_iam'))}</li>
          <li><strong>【${escHtml(t('search_intent_offer'))}】</strong>${escHtml(t('search_format_offer'))}</li>
          <li><strong>【${escHtml(t('search_intent_seek'))}】</strong>${escHtml(t('search_format_seek'))}</li>
          <li><strong>【${escHtml(t('search_intent_exclude'))}】</strong>${escHtml(t('search_format_exclude'))}</li>
        </ul>
      </details>`}
      <textarea id="ai-input" class="ai-textarea"
        placeholder="${escAttr(simplify ? '例：企業主、室內設計、醫美診所、AI 系統整合' : t('search_placeholder'))}"
        rows="${simplify ? 3 : 5}" aria-label="${escAttr(simplify ? '想找的資源' : t('search_label'))}" maxlength="500"></textarea>
      <div class="search-ai-actions">
        ${simplify
          ? `<button type="button" id="ai-copy-example" class="btn-text search-copy-example">填入範例</button>`
          : `<button type="button" id="ai-copy-example" class="btn-text search-copy-example">${escHtml(t('search_copy_example'))}</button>`}
        <span id="ai-char-count" class="search-char-count" aria-live="polite">0 / 500</span>
      </div>
      <button id="ai-submit" class="btn-ai">${escHtml(t('search_btn'))}</button>
    </div>
    <div id="search-loading" style="display:none" role="status" aria-live="polite"></div>
    <div id="ai-result-area" style="display:none"></div>
    <div id="search-results-area" style="display:none"></div>
    ${isDinnerMode() ? '' : industryPieChartHTML({ stats: window.BNI_PUBLIC_STATS, members: window.BNI_MEMBERS })}
    <div id="search-quick-filters"></div>
    <div id="branch-browse-area"></div>
  `;
}

function bindSearchEvents(container) {
  const input = document.getElementById('ai-input');
  const charCount = document.getElementById('ai-char-count');
  let draftTimer;

  const syncCharCount = () => {
    if (charCount && input) charCount.textContent = `${input.value.length} / 500`;
  };

  const applyDraft = () => {
    if (!input || input.value.trim()) return false;
    const draft = loadSearchDraft();
    if (!draft) return false;
    input.value = draft;
    syncCharCount();
    return true;
  };

  applyDraft();
  syncCharCount();

  input?.addEventListener('input', () => {
    syncCharCount();
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => saveSearchDraft(input.value), 400);
  });

  document.getElementById('ai-copy-example')?.addEventListener('click', () => {
    if (!input) return;
    const simplify = isBound() || isDinnerMode() || !!getMyMatchProfile().profession;
    input.value = simplify ? '企業主、室內設計、醫美診所' : t('search_placeholder');
    syncCharCount();
    saveSearchDraft(input.value);
    showToast(t('search_copy_example_ok'));
    input.focus();
  });

  document.getElementById('ai-submit').addEventListener('click', () => {
    const raw = document.getElementById('ai-input').value.trim();
    if (raw.length < 2) {
      showToast(t('search_need_more'));
      return;
    }
    const simplify = isBound() || isDinnerMode() || !!getMyMatchProfile().profession;
    const val = simplify ? buildPrefillSeekQuery(raw) : raw;
    saveSearchDraft(raw);
    triggerSearch(val);
  });

  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('ai-submit').click();
    }
  });
}

function bindDirectSearchEvents(container) {
  const input = document.getElementById('direct-search-input');
  const btn = document.getElementById('direct-search-btn');

  const run = () => {
    const q = input?.value?.trim() || '';
    if (!q) {
      showToast(t('search_direct_need'));
      input?.focus();
      return;
    }
    triggerDirectSearch(q);
  };

  btn?.addEventListener('click', run);
  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      run();
    }
  });
}

async function triggerDirectSearch(query) {
  try {
    await refreshSearchRoster();
  } catch (e) {
    console.warn('refreshSearchRoster:', e.message);
  }
  const members = searchMembersDirect(query);
  const container = document.getElementById('search-results-area');
  if (!container) return;
  hideBrowseChrome();
  document.getElementById('ai-result-area').style.display = 'none';
  showMemberList(container, {
    title: t('search_direct_results', { q: query, n: members.length }),
    members,
    emptyTitle: t('search_direct_empty', { q: query }),
    onClose: closeSearchMemberList,
  });
}

function thinkingFallbackSteps(refreshLabel) {
  return [
    refreshLabel || t('search_thinking_0'),
    t('search_thinking_1'),
    t('search_thinking_2'),
    t('search_thinking_3'),
  ];
}

function searchThinkingLoadingHTML() {
  return `
    <div class="search-thinking-panel" role="status" aria-live="polite">
      <div class="search-thinking-heading">${escHtml(t('search_thinking_title'))}</div>
      <ol class="search-thinking-steps search-thinking-steps-4" id="search-thinking-steps">
        ${[0, 1, 2, 3].map(i => `
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
      <p class="search-ai-source-hint">${escHtml(t(intent._source === 'local' ? 'search_ai_source_local' : 'search_ai_source_ai'))}</p>
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
  const steps = saved.steps?.length >= 4
    ? saved.steps
    : saved.steps?.length >= 3
      ? [t('search_thinking_0_done', { n: window.BNI_MEMBERS?.length || 0 }), ...saved.steps]
      : thinkingFallbackSteps(t('search_thinking_0_done', { n: window.BNI_MEMBERS?.length || 0 }));
  displaySearchResults(saved.input, saved.intent, steps);
}

async function refreshSearchRoster() {
  const [members] = await Promise.all([
    refreshMembersCache(fetchAllMembers, { force: true }),
    fetchPublicStats().then(s => { window.BNI_PUBLIC_STATS = s; }).catch(() => {}),
  ]);
  return members?.length ?? window.BNI_MEMBERS?.length ?? 0;
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

  revealThinkingStep(0, t('search_thinking_0'), { active: true });
  let rosterCount = window.BNI_MEMBERS?.length || 0;
  try {
    rosterCount = await refreshSearchRoster();
  } catch (e) {
    console.warn('refreshSearchRoster:', e.message);
  }
  if (!document.getElementById('search-loading')) return;

  const refreshDoneLabel = t('search_thinking_0_done', { n: rosterCount });
  revealThinkingStep(0, refreshDoneLabel, { done: true });

  const fallbacks = thinkingFallbackSteps(refreshDoneLabel);
  const stepTimers = [
    setTimeout(() => revealThinkingStep(1, fallbacks[1], { active: true }), 400),
    setTimeout(() => revealThinkingStep(2, fallbacks[2], { active: true }), 1800),
    setTimeout(() => revealThinkingStep(3, fallbacks[3], { active: true }), 3200),
  ];

  const [intent] = await Promise.all([
    getSearchIntentFromAI(input),
    new Promise(resolve => setTimeout(resolve, MIN_THINKING_MS)),
  ]);

  stepTimers.forEach(clearTimeout);

  if (!document.getElementById('search-loading')) return;

  const steps = intent.thinking_steps?.length >= 3
    ? [refreshDoneLabel, ...intent.thinking_steps.slice(0, 3)]
    : fallbacks;
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
    ? `<div class="search-noexact">
        <p class="search-noexact-title">${escHtml(t('search_no_result'))}</p>
        <p class="search-refine-hint">${escHtml(t('search_refine_hint'))}</p>
      </div>`
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

function closeSearchMemberList() {
  showBrowseChrome();
  const area = document.getElementById('search-results-area');
  if (area) {
    area.style.display = 'none';
    area.innerHTML = '';
  }
}

function hideBrowseChrome() {
  const launcher = document.getElementById('search-mode-launcher');
  const aiBox = document.getElementById('search-ai-box');
  const direct = document.getElementById('search-direct-box');
  const quick = document.getElementById('search-quick-filters');
  const branches = document.getElementById('branch-browse-area');
  const pie = document.querySelector('.industry-pie-section');
  if (launcher) launcher.style.display = 'none';
  if (direct) direct.hidden = true;
  if (aiBox) aiBox.style.display = 'none';
  if (quick) quick.style.display = 'none';
  if (branches) branches.style.display = 'none';
  if (pie) pie.style.display = 'none';
}

function showBrowseChrome() {
  const launcher = document.getElementById('search-mode-launcher');
  const quick = document.getElementById('search-quick-filters');
  const branches = document.getElementById('branch-browse-area');
  const pie = document.querySelector('.industry-pie-section');
  if (launcher) launcher.style.display = '';
  applySearchModeUI();
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
  setSearchMode('ai');
  document.querySelectorAll('.quick-filter-chip.active').forEach(c => c.classList.remove('active'));
  const input = document.getElementById('ai-input');
  if (input) {
    const draft = loadSearchDraft();
    input.value = draft || input.value;
    const charCount = document.getElementById('ai-char-count');
    if (charCount) charCount.textContent = `${input.value.length} / 500`;
    input.focus();
  }
}

function renderQuickFilters(container) {
  if (!container) return;

  // 晚宴模式：只保留本場快捷，不塞全台產業／分會
  if (isDinnerMode()) {
    container.innerHTML = `
      <div class="quick-filter-section">
        <div class="quick-filter-label">本場快捷</div>
        <div class="quick-filter-scroll" role="list">
          <button type="button" class="quick-filter-chip branch" data-dinner-group="member">
            長輝會員<span class="chip-count">${CHANGHUI_DINNER_MEMBERS.length}</span>
          </button>
          <button type="button" class="quick-filter-chip branch" data-dinner-group="guest">
            本場來賓<span class="chip-count">${CHANGHUI_DINNER_GUESTS.length}</span>
          </button>
          <button type="button" class="quick-filter-chip branch" data-branch="${escAttr(CHANGHUI_DINNER_EVENT.memberBranch)}">
            長輝白金分會
          </button>
        </div>
      </div>`;
    container.querySelectorAll('[data-dinner-group]').forEach(el => {
      el.addEventListener('click', () => {
        container.querySelectorAll('.quick-filter-chip.active').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        showDinnerGroup(el.dataset.dinnerGroup);
      });
    });
    container.querySelectorAll('[data-branch]').forEach(el => {
      el.addEventListener('click', () => {
        container.querySelectorAll('.quick-filter-chip.active').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        showBranchMembers(el.dataset.branch);
      });
    });
    return;
  }

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
  refreshSearchRoster().then(() => {
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
      onClose: closeSearchMemberList,
    });
  }).catch(e => console.warn('refresh members:', e.message));
}

function showDinnerGroup(group) {
  const list = group === 'guest' ? CHANGHUI_DINNER_GUESTS : CHANGHUI_DINNER_MEMBERS;
  const title = group === 'guest' ? '本場來賓' : '本場長輝會員';
  const members = list.map(p => {
    const hit = (window.BNI_MEMBERS || []).find(m =>
      String(m.name || '').replace(/\s+/g, '') === String(p.name || '').replace(/\s+/g, '')
      && (m.branch === p.branch || !m.branch));
    return hit || p;
  });
  const container = document.getElementById('search-results-area');
  if (!container) return;
  hideBrowseChrome();
  document.getElementById('ai-result-area').style.display = 'none';
  showMemberList(container, {
    title: `${title}（${members.length}）`,
    members,
    emptyTitle: `${title} — 目前沒有資料`,
    onClose: closeSearchMemberList,
  });
}

function dinnerBrowseHTML() {
  const ev = CHANGHUI_DINNER_EVENT;
  const roster = getChanghuiDinnerRoster();
  return `
    <section class="branch-browse-card dinner-browse-card" aria-label="本場夥伴">
      <div class="branch-browse-header">
        <div class="branch-browse-head-text">
          <div class="branch-browse-title">${escHtml(ev.title)}</div>
          <div class="branch-browse-sub">AI 媒合僅限本場 ${roster.length} 人</div>
        </div>
      </div>
      <div class="branch-browse-body">
        <div class="dinner-browse-row">
          <button type="button" class="btn-gold-outline dinner-browse-btn" data-dinner-group="member">
            本場長輝會員（${CHANGHUI_DINNER_MEMBERS.length}）
          </button>
          <button type="button" class="btn-gold-outline dinner-browse-btn" data-dinner-group="guest">
            本場來賓（${CHANGHUI_DINNER_GUESTS.length}）
          </button>
        </div>
        <p class="dinner-browse-total">本場合計 ${roster.length} 人</p>
        <p class="dinner-evershine-link-wrap">
          <a class="dinner-evershine-link" href="${escAttr(ev.website)}" target="_blank" rel="noopener noreferrer">
            ${escHtml(ev.websiteLabel || '長輝分會網站 evershine.tw')}
          </a>
        </p>
      </div>
    </section>`;
}

function renderBranchBrowse(container) {
  if (!container) return;
  if (isDinnerMode()) {
    container.innerHTML = dinnerBrowseHTML();
    container.querySelectorAll('[data-dinner-group]').forEach(el => {
      el.addEventListener('click', () => showDinnerGroup(el.dataset.dinnerGroup));
    });
    container.querySelectorAll('[data-branch]').forEach(el => {
      el.addEventListener('click', () => showBranchMembers(el.dataset.branch));
    });
    return;
  }
  container.innerHTML = eventRegistryBrowseHTML({ stats: window.BNI_PUBLIC_STATS });
  bindEventChapterClicks(container, showBranchMembers);
}

function showBranchMembers(branchName) {
  refreshSearchRoster().then(() => {
    const members = getMembersByBranch(branchName);
    const container = document.getElementById('search-results-area');
    if (!container) return;
    hideBrowseChrome();
    document.getElementById('ai-result-area').style.display = 'none';
    showMemberList(container, {
      title: `${branchName} 夥伴`,
      members,
      emptyTitle: `${branchName} 目前沒有夥伴資料`,
      onClose: closeSearchMemberList,
    });
  }).catch(e => console.warn('refresh members:', e.message));
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
    onClose: closeSearchMemberList,
  });
  if (member) {
    queueMicrotask(() => {
      const card = container.querySelector('.person-card');
      if (!card) return;
      card.classList.add('expanded');
      card.dataset.expanded = 'true';
      const cue = card.querySelector('.cue-text');
      if (cue) cue.textContent = t('card_less');
    });
  }
}
