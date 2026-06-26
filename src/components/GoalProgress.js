import { getOneMarkCount, getConnectionCount, MARK_PARTNER_GOAL, MARK_ONE_GOAL } from '../utils/storage.js';
import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';

export { MARK_PARTNER_GOAL, MARK_ONE_GOAL, MARK_PARTNER_GOAL as MARK_GOAL } from '../utils/storage.js';

export function goalProgressHTML({ compact = false } = {}) {
  const connected = getConnectionCount();
  const oneCount = getOneMarkCount();
  const partnerPct = Math.min(100, Math.round((connected / MARK_PARTNER_GOAL) * 100));
  const onePct = Math.min(100, Math.round((oneCount / MARK_ONE_GOAL) * 100));
  const partnerDone = connected >= MARK_PARTNER_GOAL;
  const oneDone = oneCount >= MARK_ONE_GOAL;

  return `
    <div class="goal-progress-wrap${compact ? ' goal-progress-wrap-compact' : ''}" role="region" aria-label="${escHtml(t('goal_section_label'))}">
      <div class="goal-progress${compact ? ' goal-progress-compact' : ''}">
        <div class="goal-progress-head">
          <span class="goal-progress-label">${escHtml(t('goal_mark_partners'))}</span>
          <span class="goal-progress-count">${connected} / ${MARK_PARTNER_GOAL}</span>
        </div>
        <div class="goal-progress-track" role="progressbar" aria-valuenow="${connected}" aria-valuemin="0" aria-valuemax="${MARK_PARTNER_GOAL}">
          <div class="goal-progress-fill${partnerDone ? ' done' : ''}" style="width:${partnerPct}%"></div>
        </div>
        <div class="goal-progress-hint">
          ${partnerDone ? escHtml(t('goal_mark_done')) : escHtml(t('goal_mark_hint'))}
        </div>
      </div>
      <div class="goal-progress${compact ? ' goal-progress-compact' : ''}">
        <div class="goal-progress-head">
          <span class="goal-progress-label">${escHtml(t('goal_one_title'))}</span>
          <span class="goal-progress-count">${oneCount} / ${MARK_ONE_GOAL}</span>
        </div>
        <div class="goal-progress-track" role="progressbar" aria-valuenow="${oneCount}" aria-valuemin="0" aria-valuemax="${MARK_ONE_GOAL}">
          <div class="goal-progress-fill${oneDone ? ' done' : ''}" style="width:${onePct}%"></div>
        </div>
        <div class="goal-progress-hint">
          ${oneDone ? escHtml(t('goal_one_done')) : escHtml(t('goal_one_hint'))}
        </div>
      </div>
      <div class="goal-connected-stat">
        <span class="goal-connected-label">${escHtml(t('goal_connected_label'))}</span>
        <span class="goal-connected-num serif">${connected}</span>
        <span class="goal-connected-unit">${escHtml(t('goal_connected_unit'))}</span>
      </div>
    </div>
  `;
}
