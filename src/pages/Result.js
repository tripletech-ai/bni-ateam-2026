import { getMarks } from '../utils/storage.js';
import { escHtml }  from '../utils/html.js';
import { t }        from '../i18n/translations.js';

const GOAL = 5;

export function renderResult(container) {
  const marks    = getMarks().filter(m => m.one || m.biz);
  const oneCount = marks.filter(m => m.one).length;
  const bizCount = marks.filter(m => m.biz).length;
  const total    = marks.length;
  const pct      = Math.min(100, Math.round((total / GOAL) * 100));

  container.innerHTML = `
    <div class="section-header"><div class="section-title">${escHtml(t('result_title'))}</div></div>
    <div class="result-grid">
      <div class="result-stat stagger-1">
        <div class="result-stat-num serif">${total}</div>
        <div class="result-stat-label">${escHtml(t('result_total'))}</div>
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
        <div class="result-stat-num serif">${GOAL}</div>
        <div class="result-stat-label">${escHtml(t('result_goal'))}</div>
      </div>
    </div>
    <div class="result-progress stagger-5">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-size:14px;font-weight:600;color:var(--dark-text)">${escHtml(t('result_progress'))}</span>
        <span style="font-size:13px;color:var(--dark-muted)">${total} / ${GOAL}</span>
      </div>
      <div class="progress-bar-wrap" role="progressbar" aria-valuenow="${total}" aria-valuemin="0" aria-valuemax="${GOAL}">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
      <div style="font-size:12px;color:var(--dark-muted);margin-top:8px">
        ${total >= GOAL
          ? escHtml(t('result_done'))
          : `${escHtml(t('result_remain'))} ${GOAL - total} ${escHtml(t('result_remain2'))}`}
      </div>
    </div>
    ${marks.length > 0 ? `
      <div class="section-header" style="padding-top:12px">
        <div class="section-title" style="font-size:15px">${escHtml(t('result_list'))}</div>
      </div>
      <div style="background:var(--dark-surface);border:1px solid var(--dark-border);border-radius:var(--r);margin:0 16px;overflow:hidden">
        ${marks.map((m, i) => `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;${i > 0 ? 'border-top:1px solid var(--dark-border)' : ''}">
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:14px;color:var(--dark-text)">${escHtml(m.name)}</div>
              <div style="font-size:12px;color:var(--dark-muted)">${escHtml(m.branch)}</div>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0">
              ${m.one ? `<span style="background:rgba(24,95,165,0.25);color:#93c5fd;font-size:10px;font-weight:600;padding:3px 7px;border-radius:10px">1-1</span>` : ''}
              ${m.biz ? `<span style="background:rgba(163,45,45,0.25);color:#fca5a5;font-size:10px;font-weight:600;padding:3px 7px;border-radius:10px">${escHtml(t('mark_biz_label'))}</span>` : ''}
            </div>
          </div>`).join('')}
      </div>
    ` : ''}
    <div style="height:24px"></div>`;
}
