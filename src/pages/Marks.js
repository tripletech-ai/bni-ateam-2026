import { getMarks, getPendingMarks, removeMark, getOneMarkCount, getConnectionCount } from '../utils/storage.js';
import { showToast } from '../utils/toast.js';
import { renderTabBar } from '../components/TabBar.js';
import { goalProgressHTML, MARK_PARTNER_GOAL, MARK_ONE_GOAL } from '../components/GoalProgress.js';
import { escHtml, escAttr }     from '../utils/html.js';
import { t }                    from '../i18n/translations.js';
import { isGuestTrial } from '../utils/guestTrial.js';
import { bindGuestTrialLogin } from '../components/GuestTrialBanner.js';
import { endGuestTrial } from '../utils/guestTrial.js';
import { fetchIncomingMarks, ackIncomingMarks } from '../services/auth.js';
import {
  resolveIncomingMemberLine,
  setIncomingUnseenCount,
} from '../utils/incomingMarks.js';

function statsGridHTML(connected, oneCount, bizCount) {
  return `
    <div class="result-grid marks-stats-grid">
      <div class="result-stat stagger-1">
        <div class="result-stat-num serif">${connected}</div>
        <div class="result-stat-label">${escHtml(t('goal_connected_label'))}</div>
      </div>
      <div class="result-stat stagger-2">
        <div class="result-stat-num serif">${oneCount}</div>
        <div class="result-stat-label">${escHtml(t('result_one'))}</div>
      </div>
      <div class="result-stat stagger-3">
        <div class="result-stat-num serif">${bizCount}</div>
        <div class="result-stat-label">${escHtml(t('result_biz'))}</div>
      </div>
      <div class="result-stat stagger-4">
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
  const { lineId, lineLink } = resolveIncomingMemberLine(row);
  const isNew = !row.seen_by_target;
  const stagger = i < 4 ? `stagger-${i + 1}` : '';
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
        <span class="mark-badge one">${escHtml(t('mark_one_label'))}</span>
      </div>
      <div class="mark-actions">
        <button class="btn-sm btn-add-line"
          data-action="incoming-line"
          data-line-link="${escAttr(lineLink)}"
          data-line-id="${escAttr(lineId)}">${escHtml(t('marks_line'))}</button>
        ${isNew ? `<button class="btn-sm marks-incoming-ack"
          data-action="incoming-ack"
          data-incoming-id="${escAttr(row.id || '')}">${escHtml(t('marks_incoming_ack'))}</button>` : ''}
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

function emptyListHTML() {
  return `
    <div class="marks-empty-inline">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.2" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
      <div class="empty-state-title">${escHtml(t('marks_empty_title'))}</div>
      <div class="empty-state-sub">${t('marks_empty_sub').replace('\n', '<br>')}</div>
      <button type="button" class="btn-ai marks-go-search">${escHtml(t('marks_go'))}</button>
    </div>`;
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
  const list = container.querySelector('#marks-list');
  if (!list) return;

  list.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
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

function bindIncomingSection(container) {
  const section = container.querySelector('#marks-incoming');
  if (!section || section.dataset.bound === '1') return;
  section.dataset.bound = '1';

  section.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'incoming-line') {
      openLine({ lineLink: btn.dataset.lineLink, lineId: btn.dataset.lineId });
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

    if (action === 'incoming-ack-all') {
      const btnAll = btn;
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
    }
  });
}

async function loadIncomingSection(container) {
  const section = container.querySelector('#marks-incoming');
  if (!section) return;

  try {
    const rows = await fetchIncomingMarks(false);
    const unseen = rows.filter(r => !r.seen_by_target);
    setIncomingUnseenCount(unseen.length);
    section.innerHTML = incomingSectionHTML(rows);

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
        <div class="section-title">${escHtml(t('marks_incoming_title'))}</div>
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
      ${goalProgressHTML()}
      ${goalHintHTML(connected, oneCount)}
      <div class="section-header marks-list-header">
        <div class="section-title">${escHtml(t('marks_list_title'))}</div>
      </div>
      <div id="marks-list">
        ${marks.length ? marks.map(markCardHTML).join('') : emptyListHTML()}
      </div>
      <div style="height:24px"></div>
    </div>`;

  container.querySelector('.marks-go-search')?.addEventListener('click', () => {
    location.hash = 'search';
  });

  bindMarksList(container);
  bindIncomingSection(container);
  loadIncomingSection(container).then(() => {
    renderTabBar(document.getElementById('tab-bar'), window.location.hash || '#marks');
  });
}
