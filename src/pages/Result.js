import { getMarks } from '../utils/storage.js';
import { escHtml } from '../utils/html.js';

const GOAL = 5;

export function renderResult(container) {
  const marks = getMarks().filter(m => m.one || m.biz);
  const oneCount = marks.filter(m => m.one).length;
  const bizCount = marks.filter(m => m.biz).length;
  const total = marks.length;
  const pct = Math.min(100, Math.round((total / GOAL) * 100));

  container.innerHTML = `
    <div class="section-header"><div class="section-title">我的成果</div></div>
    <div class="result-grid">
      <div class="result-stat">
        <div class="result-stat-num serif">${total}</div>
        <div class="result-stat-label">有效標記</div>
      </div>
      <div class="result-stat">
        <div class="result-stat-num serif">${oneCount}</div>
        <div class="result-stat-label">想約 1-1</div>
      </div>
      <div class="result-stat">
        <div class="result-stat-num serif">${bizCount}</div>
        <div class="result-stat-label">有合作可能</div>
      </div>
      <div class="result-stat">
        <div class="result-stat-num serif">${GOAL}</div>
        <div class="result-stat-label">今日目標</div>
      </div>
    </div>
    <div class="result-progress">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-size:14px;font-weight:600;color:var(--navy)">今日進度</span>
        <span style="font-size:13px;color:var(--muted)">${total} / ${GOAL}</span>
      </div>
      <div class="progress-bar-wrap" role="progressbar" aria-valuenow="${total}" aria-valuemin="0" aria-valuemax="${GOAL}">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-top:8px">
        ${total >= GOAL
          ? '🎉 目標達成！繼續創造更多商機'
          : `還差 ${GOAL - total} 位達標，繼續加油！`}
      </div>
    </div>
    ${marks.length > 0 ? `
      <div class="section-header" style="padding-top:12px">
        <div class="section-title" style="font-size:15px">已標記夥伴</div>
      </div>
      <div style="background:var(--surface);border-radius:var(--r);margin:0 16px;overflow:hidden;box-shadow:var(--shadow)">
        ${marks.map((m, i) => `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;${i > 0 ? 'border-top:1px solid var(--border)' : ''}">
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:14px">${escHtml(m.name)}</div>
              <div style="font-size:12px;color:var(--muted)">${escHtml(m.branch)}</div>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0">
              ${m.one ? '<span style="background:var(--navy-light);color:var(--navy);font-size:10px;font-weight:600;padding:3px 7px;border-radius:10px">1-1</span>' : ''}
              ${m.biz ? '<span style="background:#fdecea;color:var(--red);font-size:10px;font-weight:600;padding:3px 7px;border-radius:10px">合作</span>' : ''}
            </div>
          </div>`).join('')}
      </div>
    ` : ''}
    <div style="height:24px"></div>
  `;
}
