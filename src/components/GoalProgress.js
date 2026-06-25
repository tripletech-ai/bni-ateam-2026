import { getMarks } from '../utils/storage.js';
import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';

export const MARK_GOAL = 5;

export function goalProgressHTML({ compact = false } = {}) {
  const total = getMarks().filter(m => m.one || m.biz).length;
  const pct = Math.min(100, Math.round((total / MARK_GOAL) * 100));
  const done = total >= MARK_GOAL;

  return `
    <div class="goal-progress${compact ? ' goal-progress-compact' : ''}" role="region" aria-label="${escHtml(t('result_progress'))}">
      <div class="goal-progress-head">
        <span class="goal-progress-label">${escHtml(t('result_progress'))}</span>
        <span class="goal-progress-count">${total} / ${MARK_GOAL}</span>
      </div>
      <div class="goal-progress-track" role="progressbar" aria-valuenow="${total}" aria-valuemin="0" aria-valuemax="${MARK_GOAL}">
        <div class="goal-progress-fill${done ? ' done' : ''}" style="width:${pct}%"></div>
      </div>
      <div class="goal-progress-hint">
        ${done ? escHtml(t('result_done')) : `${escHtml(t('result_remain'))} ${MARK_GOAL - total} ${escHtml(t('result_remain2'))}`}
      </div>
    </div>
  `;
}
