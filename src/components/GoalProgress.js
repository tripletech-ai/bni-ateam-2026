import { getOneMarkCount, getConnectionCount, getMarkPartnerGoal, getMarkOneGoal } from '../utils/storage.js';
import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { activeEventId } from '../utils/eventScope.js';

export { getMarkPartnerGoal, getMarkOneGoal } from '../utils/storage.js';

export function goalProgressHTML({ compact = false } = {}) {
  const connected = getConnectionCount();
  const oneCount = getOneMarkCount();
  const partnerGoal = getMarkPartnerGoal();
  const oneGoal = getMarkOneGoal();
  const partnerPct = Math.min(100, Math.round((connected / partnerGoal) * 100));
  const onePct = Math.min(100, Math.round((oneCount / oneGoal) * 100));
  const partnerDone = connected >= partnerGoal;
  const oneDone = oneCount >= oneGoal;
  const dinner = !!activeEventId();
  const partnerHint = dinner
    ? `今晚目標：與 ${partnerGoal} 位本場夥伴互相標記`
    : t('goal_mark_hint');
  const oneHint = dinner
    ? `至少標記 ${oneGoal} 位本場「想約 1-1」`
    : t('goal_one_hint');

  return `
    <div class="goal-progress-wrap${compact ? ' goal-progress-wrap-compact' : ''}" role="region" aria-label="${escHtml(t('goal_section_label'))}">
      <div class="goal-progress${compact ? ' goal-progress-compact' : ''}">
        <div class="goal-progress-head">
          <span class="goal-progress-label">${escHtml(t('goal_mark_partners'))}</span>
          <span class="goal-progress-count">${connected} / ${partnerGoal}</span>
        </div>
        <div class="goal-progress-track" role="progressbar" aria-valuenow="${connected}" aria-valuemin="0" aria-valuemax="${partnerGoal}">
          <div class="goal-progress-fill${partnerDone ? ' done' : ''}" style="width:${partnerPct}%"></div>
        </div>
        <div class="goal-progress-hint">
          ${partnerDone ? escHtml(t('goal_mark_done')) : escHtml(partnerHint)}
        </div>
      </div>
      <div class="goal-progress${compact ? ' goal-progress-compact' : ''}">
        <div class="goal-progress-head">
          <span class="goal-progress-label">${escHtml(t('goal_one_title'))}</span>
          <span class="goal-progress-count">${oneCount} / ${oneGoal}</span>
        </div>
        <div class="goal-progress-track" role="progressbar" aria-valuenow="${oneCount}" aria-valuemin="0" aria-valuemax="${oneGoal}">
          <div class="goal-progress-fill${oneDone ? ' done' : ''}" style="width:${onePct}%"></div>
        </div>
        <div class="goal-progress-hint">
          ${oneDone ? escHtml(t('goal_one_done')) : escHtml(oneHint)}
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
