import { getMarks, removeMark } from '../utils/storage.js';
import { showToast } from '../utils/toast.js';
import { renderTabBar } from '../components/TabBar.js';
import { escHtml, escAttr } from '../utils/html.js';

export function renderMarks(container) {
  const marks = getMarks().filter(m => m.one || m.biz);

  if (marks.length === 0) {
    container.innerHTML = `
      <div class="section-header"><div class="section-title">我的標記</div></div>
      <div class="empty-state">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.2" style="margin-bottom:16px" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <div class="empty-state-title">還沒有標記</div>
        <div class="empty-state-sub">去找人脈頁搜尋夥伴<br>點「想約 1-1」或「有合作可能」即可標記</div>
        <button onclick="location.hash='search'" style="margin-top:20px;padding:12px 28px;background:var(--navy);color:#fff;border:none;border-radius:var(--r-sm);font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans TC',sans-serif">
          去找人脈
        </button>
      </div>`;
    return;
  }

  const cards = marks.map(m => `
    <div class="mark-card" data-key="${escAttr(m.key)}">
      <div class="mark-card-top">
        <div class="mark-avatar" aria-hidden="true">${escHtml((m.name || '?').slice(-1))}</div>
        <div style="flex:1;min-width:0">
          <div class="mark-name">${escHtml(m.name)}</div>
          <div class="mark-meta">${escHtml(m.branch)} · ${escHtml(m.profession)}</div>
        </div>
      </div>
      <div class="mark-badges">
        ${m.one ? '<span class="mark-badge one">想約 1-1</span>' : ''}
        ${m.biz ? '<span class="mark-badge biz">有合作可能</span>' : ''}
      </div>
      ${m.have ? `<div style="font-size:12px;color:var(--muted);margin:4px 0 8px;line-height:1.6;word-break:break-all">${escHtml(m.have.length > 80 ? m.have.substring(0, 80) + '…' : m.have)}</div>` : ''}
      <div class="mark-actions">
        <button class="btn-sm btn-add-line"
          data-action="line"
          data-key="${escAttr(m.key)}"
          data-line-link="${escAttr(m.lineLink || '')}"
          data-line-id="${escAttr(m.lineId || '')}">加 LINE</button>
        <button class="btn-sm btn-remove"
          data-action="remove"
          data-key="${escAttr(m.key)}">移除標記</button>
      </div>
    </div>`).join('');

  container.innerHTML = `
    <div class="section-header">
      <div class="section-title">我的標記 <span style="color:var(--muted);font-size:14px;font-weight:400">${marks.length} 位</span></div>
    </div>
    <div id="marks-list">${cards}</div>
    <div style="height:24px"></div>
  `;

  document.getElementById('marks-list').addEventListener('click', e => {
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
      const id   = btn.dataset.lineId;
      if (link && link.startsWith('http')) {
        window.open(link, '_blank', 'noopener');
      } else if (id) {
        navigator.clipboard.writeText(id)
          .then(() => showToast(`LINE ID 已複製：${id}`))
          .catch(() => showToast(`LINE ID：${id}（請手動複製）`));
        window.open('https://line.me/R/nv/addFriends', '_blank', 'noopener');
      } else {
        showToast('這位夥伴沒有填 LINE 連結');
      }
    }
  });
}
