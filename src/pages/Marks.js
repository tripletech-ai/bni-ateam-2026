import { getMarks, getPendingMarks, removeMark, getOneMarkCount, getConnectionCount, getMark, setMark, isMutuallyConnected } from '../utils/storage.js';
import { showToast } from '../utils/toast.js';
import { renderTabBar } from '../components/TabBar.js';
import { goalProgressHTML, MARK_PARTNER_GOAL, MARK_ONE_GOAL } from '../components/GoalProgress.js';
import { escHtml, escAttr }     from '../utils/html.js';
import { t }                    from '../i18n/translations.js';
import { isGuestTrial } from '../utils/guestTrial.js';
import { bindGuestTrialLogin } from '../components/GuestTrialBanner.js';
import { endGuestTrial } from '../utils/guestTrial.js';
import { fetchIncomingMarks, ackIncomingMarks, isBound } from '../services/auth.js';
import {
  resolveIncomingMemberLine,
  resolveIncomingMember,
  setIncomingUnseenCount,
  refreshConnectionCache,
} from '../utils/incomingMarks.js';
import { syncMarkToServer } from '../utils/markSync.js';
import { showConfirmDialog } from '../utils/confirmDialog.js';
import { openMemberProfile } from '../utils/feedMemberNav.js';

function statsGridHTML(connected, oneCount, bizCount) {
  return `
    <div class="result-grid marks-stats-grid">
      <button type="button" class="result-stat marks-stat-btn stagger-1" data-scroll-to="marks-incoming"
        aria-label="${escAttr(t('marks_stat_connected_aria', { n: connected }))}">
        <div class="result-stat-num serif">${connected}</div>
        <div class="result-stat-label">${escHtml(t('goal_connected_label'))}</div>
        ${connected > 0 ? `<div class="marks-stat-tap">${escHtml(t('marks_stat_tap'))}</div>` : ''}
      </button>
      <button type="button" class="result-stat marks-stat-btn marks-stat-one stagger-2" data-scroll-to="marks-one-section"
        aria-label="${escAttr(t('marks_stat_one_aria', { n: oneCount }))}">
        <div class="result-stat-num serif">${oneCount}</div>
        <div class="result-stat-label">${escHtml(t('result_one'))}</div>
        <div class="marks-stat-tap">${escHtml(t('marks_stat_tap'))}</div>
      </button>
      <button type="button" class="result-stat marks-stat-btn stagger-3" data-scroll-to="marks-biz-section"
        aria-label="${escAttr(t('marks_stat_biz_aria', { n: bizCount }))}">
        <div class="result-stat-num serif">${bizCount}</div>
        <div class="result-stat-label">${escHtml(t('result_biz'))}</div>
        ${bizCount > 0 ? `<div class="marks-stat-tap">${escHtml(t('marks_stat_tap'))}</div>` : ''}
      </button>
      <div class="result-stat stagger-4 marks-stat-goal" aria-hidden="true">
        <div class="result-stat-num serif">${MARK_PARTNER_GOAL}</div>
        <div class="result-stat-label">${escHtml(t('result_goal'))}</div>
      </div>
    </div>`;
}

function goalHintHTML(connected, oneCount) {
  const done = connected >= MARK_PARTNER_GOAL && oneCount >= MARK_ONE_GOAL;
  return `<p class="marks-goal-hint">${escHtml(done ? t('result_done') : t('result_goal_hint'))}</p>`;
}

function markCardHTML(m, i) {
  const stagger = i < 6 ? `stagger-${i + 1}` : '';
  return `
    <div class="mark-card ${stagger}" data-key="${escAttr(m.key)}">
      <div class="mark-card-top">
        <div style="flex:1;min-width:0">
          <div class="mark-name">${escHtml(m.name)}</div>
          <div class="mark-meta">${escHtml(m.branch)} · ${escHtml(m.profession)}</div>
        </div>
      </div>
      <div class="mark-badges">
        ${m.one ? `<span class="mark-badge one">${escHtml(t('mark_one_label'))}</span>` : ''}
        ${m.biz ? `<span class="mark-badge biz">${escHtml(t('mark_biz_label'))}</span>` : ''}
      </div>
      ${m.have ? `<div class="mark-have-snippet">${escHtml(m.have.length > 80 ? m.have.substring(0, 80) + '…' : m.have)}</div>` : ''}
      <div class="mark-actions">
        <button class="btn-sm btn-add-line"
          data-action="line" data-key="${escAttr(m.key)}"
          data-line-link="${escAttr(m.lineLink || '')}"
          data-line-id="${escAttr(m.lineId || '')}">${escHtml(t('marks_line'))}</button>
        <button class="btn-sm btn-remove"
          data-action="remove" data-key="${escAttr(m.key)}">${escHtml(t('marks_remove'))}</button>
      </div>
    </div>`;
}

function incomingCardHTML(row, i) {
  const member = resolveIncomingMember(row);
  const mark = member ? getMark(member) : { one: false, biz: false };
  const mutual = member ? isMutuallyConnected(member) : false;
  const { lineId, lineLink } = resolveIncomingMemberLine(row);
  const isNew = !row.seen_by_target;
  const stagger = i < 4 ? `stagger-${i + 1}` : '';
  const oneLabel = mutual ? t('card_mutual') : t('card_one');
  const oneActive = mark.one || mutual;
  return `
    <div class="mark-card marks-incoming-card ${isNew ? 'marks-incoming-new' : ''} ${stagger}"
      data-incoming-id="${escAttr(row.id || '')}">
      <div class="mark-card-top">
        <div style="flex:1;min-width:0">
          <div class="mark-name">
            ${escHtml(row.name)}
            ${isNew ? `<span class="marks-incoming-badge">${escHtml(t('marks_incoming_new'))}</span>` : ''}
          </div>
          <div class="mark-meta">${escHtml(row.branch)} · ${escHtml(row.profession || '—')}</div>
        </div>
      </div>
      <div class="mark-badges">
        <span class="mark-badge one marks-incoming-they">${escHtml(t('card_marked_you'))}</span>
        ${mutual ? `<span class="mutual-badge">${escHtml(t('card_mutual'))}</span>` : ''}
      </div>
      <div class="mark-actions marks-incoming-actions-row">
        <button type="button" class="btn-sm btn-incoming-one ${oneActive ? 'active' : ''}${mutual ? ' mutual' : ''}"
          data-action="incoming-one"
          data-incoming-id="${escAttr(row.id || '')}"
          data-name="${escAttr(row.name || '')}"
          data-branch="${escAttr(row.branch || '')}"
          data-from-id="${escAttr(row.from_id || '')}">
          ${escHtml(oneLabel)}
        </button>
        <button type="button" class="btn-sm btn-incoming-more"
          data-action="incoming-profile"
          data-name="${escAttr(row.name || '')}"
          data-branch="${escAttr(row.branch || '')}">
          ${escHtml(t('card_more'))}
        </button>
        <button type="button" class="btn-sm btn-add-line"
          data-action="incoming-line"
          data-line-link="${escAttr(lineLink)}"
          data-line-id="${escAttr(lineId)}">${escHtml(t('marks_line'))}</button>
      </div>
    </div>`;
}

function incomingSectionHTML(rows) {
  const list = (rows || []).filter(r => r.mark_type === 'one');
  if (!list.length) {
    return `
      <div class="marks-incoming-empty">${escHtml(t('marks_incoming_empty'))}</div>`;
  }
  return list.map(incomingCardHTML).join('');
}

function incomingLoadingHTML() {
  return `<div class="marks-incoming-loading">${escHtml(t('marks_incoming_loading'))}</div>`;
}

function emptyOneListHTML() {
  return `
    <div class="marks-empty-inline marks-empty-compact">
      <div class="empty-state-sub">${escHtml(t('marks_one_empty'))}</div>
      <button type="button" class="btn-ai marks-go-search">${escHtml(t('marks_go'))}</button>
    </div>`;
}

function marksListSectionsHTML(marks) {
  const oneMarks = marks.filter(m => m.one);
  const bizMarks = marks.filter(m => m.biz);
  return `
    <div class="marks-list-section" id="marks-one-section">
      <div class="marks-list-section-head">
        <div class="section-title">${escHtml(t('marks_one_list_title', { n: oneMarks.length }))}</div>
      </div>
      <div id="marks-one-list">
        ${oneMarks.length ? oneMarks.map(markCardHTML).join('') : emptyOneListHTML()}
      </div>
    </div>
    ${bizMarks.length ? `
    <div class="marks-list-section" id="marks-biz-section">
      <div class="marks-list-section-head">
        <div class="section-title">${escHtml(t('marks_biz_list_title', { n: bizMarks.length }))}</div>
      </div>
      <div id="marks-biz-list">${bizMarks.map(markCardHTML).join('')}</div>
    </div>` : ''}`;
}

function bindStatsScroll(container) {
  container.querySelectorAll('.marks-stat-btn[data-scroll-to]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.scrollTo;
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('marks-section-highlight');
      setTimeout(() => el.classList.remove('marks-section-highlight'), 1600);
    });
  });
}

function openLine({ lineLink, lineId }) {
  if (lineLink && lineLink.startsWith('http')) {
    window.open(lineLink, '_blank', 'noopener');
    return;
  }
  if (lineId) {
    navigator.clipboard.writeText(lineId)
      .then(() => showToast(t('toast_line_copy')))
      .catch(() => showToast(`${t('toast_line_manual')}${lineId}`));
    window.open('https://line.me/R/nv/addFriends', '_blank', 'noopener');
    return;
  }
  showToast(t('toast_line_none'));
}

function bindMarksList(container) {
  const page = container.querySelector('.marks-page');
  if (!page) return;

  page.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn || !page.contains(btn)) return;
    const key = btn.dataset.key;
    const action = btn.dataset.action;

    if (action === 'remove') {
      removeMark(key);
      renderMarks(container);
      renderTabBar(document.getElementById('tab-bar'), '#marks');
    } else if (action === 'line') {
      openLine({ lineLink: btn.dataset.lineLink, lineId: btn.dataset.lineId });
    }
  });
}

function memberFromIncomingBtn(btn) {
  return resolveIncomingMember({
    id: btn.dataset.incomingId,
    from_id: btn.dataset.fromId || null,
    name: btn.dataset.name,
    branch: btn.dataset.branch,
  });
}

function refreshMarksStatsGrid(container) {
  const connected = getConnectionCount();
  const oneCount = getOneMarkCount();
  const bizCount = getMarks().filter(m => m.biz).length;
  const page = container.querySelector('.marks-page');
  if (!page) return;
  const nums = page.querySelectorAll('.marks-stats-grid .result-stat-num');
  if (nums[0]) nums[0].textContent = String(connected);
  if (nums[1]) nums[1].textContent = String(oneCount);
  if (nums[2]) nums[2].textContent = String(bizCount);
  const hint = page.querySelector('.marks-goal-hint');
  if (hint) {
    const done = connected >= MARK_PARTNER_GOAL && oneCount >= MARK_ONE_GOAL;
    hint.textContent = done ? t('result_done') : t('result_goal_hint');
  }
}

async function handleIncomingOne(btn, container) {
  const member = memberFromIncomingBtn(btn);
  if (!member) {
    showToast(t('marks_incoming_member_missing'));
    return;
  }
  const before = getMark(member);
  if (before.one) {
    const mutual = isMutuallyConnected(member);
    const ok = await showConfirmDialog({
      title: t('mark_unmark_confirm_title'),
      message: mutual ? t('mark_unmark_mutual_warn') : t('mark_unmark_confirm_body'),
      confirmLabel: t('mark_unmark_confirm_ok'),
      cancelLabel: t('confirm_cancel'),
    });
    if (!ok) return;
  }
  btn.disabled = true;
  setMark(member, 'one');
  const updated = getMark(member);
  if (isBound()) {
    const result = await syncMarkToServer(member, 'one', updated.one);
    if (result?.ok === false && !result.skipped) showToast(t('mark_sync_fail'));
  }
  await refreshConnectionCache().catch(() => {});
  const mutual = isMutuallyConnected(member);
  if (updated.one) {
    showToast(mutual ? t('marks_incoming_mutual') : t('marks_incoming_one_ok'));
    const incomingId = btn.dataset.incomingId;
    if (incomingId) {
      try { await ackIncomingMarks([incomingId]); } catch { /* ignore */ }
    }
  }
  refreshMarksStatsGrid(container);
  refreshGoalProgress(container);
  refreshOneMarksList(container);
  await loadIncomingSection(container);
  renderTabBar(document.getElementById('tab-bar'), window.location.hash || '#marks');
  btn.disabled = false;
}

function refreshGoalProgress(container) {
  const page = container.querySelector('.marks-page');
  const old = page?.querySelector('.goal-progress-wrap');
  if (!old) return;
  old.outerHTML = goalProgressHTML();
}

function refreshOneMarksList(container) {
  const listEl = container.querySelector('#marks-one-list');
  const headEl = container.querySelector('#marks-one-section .section-title');
  if (!listEl) return;
  const oneMarks = getMarks().filter(m => m.one);
  if (headEl) headEl.textContent = t('marks_one_list_title', { n: oneMarks.length });
  listEl.innerHTML = oneMarks.length ? oneMarks.map(markCardHTML).join('') : emptyOneListHTML();
  listEl.querySelectorAll('.marks-go-search').forEach(btn => {
    btn.addEventListener('click', () => { location.hash = 'search'; });
  });
}

function bindIncomingSection(container) {
  const section = container.querySelector('#marks-incoming');
  if (!section || section.dataset.bound === '1') return;
  section.dataset.bound = '1';

  const page = container.querySelector('.marks-page');
  section.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'incoming-line') {
      openLine({ lineLink: btn.dataset.lineLink, lineId: btn.dataset.lineId });
      return;
    }

    if (action === 'incoming-profile') {
      openMemberProfile(btn.dataset.name, btn.dataset.branch);
      return;
    }

    if (action === 'incoming-one') {
      await handleIncomingOne(btn, container);
      return;
    }

    if (action === 'incoming-ack') {
      const id = btn.dataset.incomingId;
      btn.disabled = true;
      try {
        await ackIncomingMarks(id ? [id] : null);
        await loadIncomingSection(container);
        renderTabBar(document.getElementById('tab-bar'), window.location.hash || '#marks');
      } catch (err) {
        console.warn('ack incoming:', err.message);
        btn.disabled = false;
        showToast(t('marks_incoming_ack_fail'));
      }
      return;
    }
  });

  page?.querySelector('#marks-incoming-ack-all')?.addEventListener('click', async e => {
    const btnAll = e.target.closest('[data-action="incoming-ack-all"]');
    if (!btnAll) return;
    btnAll.disabled = true;
    try {
      await ackIncomingMarks(null);
      await loadIncomingSection(container);
      renderTabBar(document.getElementById('tab-bar'), window.location.hash || '#marks');
    } catch (err) {
      console.warn('ack all incoming:', err.message);
      btnAll.disabled = false;
      showToast(t('marks_incoming_ack_fail'));
    }
  });
}

function updateIncomingCount(container, rows) {
  const countEl = container.querySelector('#marks-incoming-count');
  if (!countEl) return;
  const list = (rows || []).filter(r => r.mark_type === 'one');
  countEl.textContent = list.length ? t('marks_incoming_count', { n: list.length }) : '';
}

async function loadIncomingSection(container) {
  const section = container.querySelector('#marks-incoming');
  if (!section) return;

  try {
    const rows = await fetchIncomingMarks(false);
    const unseen = rows.filter(r => !r.seen_by_target);
    setIncomingUnseenCount(unseen.length);
    section.innerHTML = incomingSectionHTML(rows);
    updateIncomingCount(container, rows);

    const ackAll = container.querySelector('#marks-incoming-ack-all');
    if (ackAll) {
      ackAll.style.display = unseen.length ? '' : 'none';
    }
  } catch (err) {
    if (err.code === 'RPC_NOT_DEPLOYED') {
      section.innerHTML = '';
      return;
    }
    console.warn('incoming marks:', err.message);
    section.innerHTML = `<div class="marks-incoming-empty">${escHtml(t('marks_incoming_fail'))}</div>`;
  }
}

/** 輪詢發現新標記時，若已在標記分頁則刷新區塊 */
export function refreshIncomingMarksSection(container) {
  if (!container?.querySelector?.('#marks-incoming')) return;
  return loadIncomingSection(container);
}

export function renderMarks(container) {
  if (isGuestTrial()) {
    const marks = getPendingMarks().filter(m => m.one || m.biz);
    container.innerHTML = `
      <div class="marks-page guest-marks-page">
        <section class="guest-pending-marks-banner" aria-live="polite">
          <h2 class="guest-blocked-title">${escHtml(t('guest_marks_pending_title'))}</h2>
          <p class="guest-blocked-body">${escHtml(t('guest_marks_pending_body'))}</p>
          <div class="guest-blocked-actions">
            <button type="button" class="btn-ai guest-trial-login-btn">${escHtml(t('guest_banner_login'))}</button>
            <button type="button" class="btn-outline guest-blocked-secondary" data-hash="search">${escHtml(t('marks_go'))}</button>
          </div>
        </section>
        ${marks.length ? `
          <div class="section-header marks-list-header">
            <div class="section-title">${escHtml(t('marks_list_title'))}</div>
          </div>
          <div id="marks-list">${marks.map(markCardHTML).join('')}</div>` : `
          <div class="marks-empty-inline">
            <div class="empty-state-title">${escHtml(t('guest_marks_blocked_title'))}</div>
            <div class="empty-state-sub">${escHtml(t('guest_marks_blocked_body'))}</div>
          </div>`}
        <div style="height:24px"></div>
      </div>`;
    container.querySelector('[data-hash="search"]')?.addEventListener('click', () => {
      location.hash = 'search';
    });
    bindGuestTrialLogin(container, { onBeforeLogin: endGuestTrial });
    if (marks.length) bindMarksList(container);
    return;
  }

  const marks = getMarks().filter(m => m.one || m.biz);
  const oneCount = getOneMarkCount();
  const connected = getConnectionCount();
  const bizCount = marks.filter(m => m.biz).length;

  container.innerHTML = `
    <div class="marks-page">
      <div class="section-header marks-incoming-header">
        <div class="section-title">${escHtml(t('marks_incoming_title'))}<span id="marks-incoming-count" class="marks-incoming-count" aria-live="polite"></span></div>
        <p class="marks-incoming-sub">${escHtml(t('marks_incoming_sub'))}</p>
      </div>
      <div id="marks-incoming" class="marks-incoming-list" aria-live="polite">
        ${incomingLoadingHTML()}
      </div>
      <div class="marks-incoming-actions">
        <button type="button" class="btn-sm marks-incoming-ack-all" id="marks-incoming-ack-all"
          data-action="incoming-ack-all" style="display:none">
          ${escHtml(t('marks_incoming_ack_all'))}
        </button>
      </div>
      <div class="section-header"><div class="section-title">${escHtml(t('marks_page_title'))}</div></div>
      ${statsGridHTML(connected, oneCount, bizCount)}
      <p class="marks-stats-hint">${escHtml(t('marks_stats_hint'))}</p>
      ${goalProgressHTML()}
      ${goalHintHTML(connected, oneCount)}
      ${marksListSectionsHTML(marks)}
      <div style="height:24px"></div>
    </div>`;

  container.querySelectorAll('.marks-go-search').forEach(btn => {
    btn.addEventListener('click', () => { location.hash = 'search'; });
  });

  bindStatsScroll(container);
  bindMarksList(container);
  bindIncomingSection(container);
  loadIncomingSection(container).then(() => {
    renderTabBar(document.getElementById('tab-bar'), window.location.hash || '#marks');
  });
}
