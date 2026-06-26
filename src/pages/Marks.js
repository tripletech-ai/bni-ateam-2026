import { getMarks, removeMark, getOneMarkCount, getConnectionCount } from '../utils/storage.js';
import { showToast } from '../utils/toast.js';
import { renderTabBar } from '../components/TabBar.js';
import { goalProgressHTML, MARK_PARTNER_GOAL, MARK_ONE_GOAL } from '../components/GoalProgress.js';
import { escHtml, escAttr } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { isGuestTrial } from '../utils/guestTrial.js';
import { guestHomeReminderHTML, bindGuestTrialLogin } from '../components/GuestTrialBanner.js';
import { endGuestTrial } from '../utils/guestTrial.js';

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
      const link = btn.dataset.lineLink;
      const id = btn.dataset.lineId;
      if (link && link.startsWith('http')) {
        window.open(link, '_blank', 'noopener');
      } else if (id) {
        navigator.clipboard.writeText(id)
          .then(() => showToast(t('toast_line_copy')))
          .catch(() => showToast(`${t('toast_line_manual')}${id}`));
        window.open('https://line.me/R/nv/addFriends', '_blank', 'noopener');
      } else {
        showToast(t('toast_line_none'));
      }
    }
  });
}

export function renderMarks(container) {
  if (isGuestTrial()) {
    container.innerHTML = `
      <div class="marks-page guest-marks-page">
        ${guestHomeReminderHTML()}
        <div class="guest-marks-actions">
          <button type="button" class="btn-outline" data-hash="search">${escHtml(t('marks_go'))}</button>
        </div>
      </div>`;
    container.querySelector('[data-hash="search"]')?.addEventListener('click', () => {
      location.hash = 'search';
    });
    bindGuestTrialLogin(container, { onBeforeLogin: endGuestTrial });
    return;
  }

  const marks = getMarks().filter(m => m.one || m.biz);
  const oneCount = getOneMarkCount();
  const connected = getConnectionCount();
  const bizCount = marks.filter(m => m.biz).length;

  container.innerHTML = `
    <div class="marks-page">
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
}
