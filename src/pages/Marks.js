import { getMarks, removeMark } from '../utils/storage.js';
import { showToast }            from '../utils/toast.js';
import { renderTabBar }         from '../components/TabBar.js';
import { escHtml, escAttr }     from '../utils/html.js';
import { avatarInner }          from '../utils/avatar.js';
import { t }                    from '../i18n/translations.js';

export function renderMarks(container) {
  const marks = getMarks().filter(m => m.one || m.biz);

  if (marks.length === 0) {
    container.innerHTML = `
      <div class="section-header"><div class="section-title">${escHtml(t('marks_title'))}</div></div>
      <div class="empty-state">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.2" style="margin-bottom:16px" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <div class="empty-state-title">${escHtml(t('marks_empty_title'))}</div>
        <div class="empty-state-sub">${t('marks_empty_sub').replace('\n', '<br>')}</div>
        <button onclick="location.hash='search'"
          class="btn-ai" style="margin-top:20px;border-radius:var(--r-sm);padding:12px 28px;font-size:14px">
          ${escHtml(t('marks_go'))}
        </button>
      </div>`;
    return;
  }

  const cards = marks.map((m, i) => {
    const initial = (m.name || '').match(/[一-鿿㐀-䶿]/g)?.slice(-1)[0] || '?';
    const stagger = i < 6 ? `stagger-${i + 1}` : '';
    return `
    <div class="mark-card ${stagger}" data-key="${escAttr(m.key)}">
      <div class="mark-card-top">
        <div class="mark-avatar" aria-hidden="true">${avatarInner(m.name, initial)}</div>
        <div style="flex:1;min-width:0">
          <div class="mark-name">${escHtml(m.name)}</div>
          <div class="mark-meta">${escHtml(m.branch)} · ${escHtml(m.profession)}</div>
        </div>
      </div>
      <div class="mark-badges">
        ${m.one ? `<span class="mark-badge one">${escHtml(t('mark_one_label'))}</span>` : ''}
        ${m.biz ? `<span class="mark-badge biz">${escHtml(t('mark_biz_label'))}</span>` : ''}
      </div>
      ${m.have ? `<div style="font-size:12px;color:var(--dark-muted);margin:4px 0 8px;line-height:1.6;word-break:break-all">
        ${escHtml(m.have.length > 80 ? m.have.substring(0, 80) + '…' : m.have)}
      </div>` : ''}
      <div class="mark-actions">
        <button class="btn-sm btn-add-line"
          data-action="line" data-key="${escAttr(m.key)}"
          data-line-link="${escAttr(m.lineLink || '')}"
          data-line-id="${escAttr(m.lineId || '')}">${escHtml(t('marks_line'))}</button>
        <button class="btn-sm btn-remove"
          data-action="remove" data-key="${escAttr(m.key)}">${escHtml(t('marks_remove'))}</button>
      </div>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="section-header">
      <div class="section-title">${escHtml(t('marks_title'))}
        <span style="color:var(--dark-muted);font-size:14px;font-weight:400"> ${marks.length} 位</span>
      </div>
    </div>
    <div id="marks-list">${cards}</div>
    <div style="height:24px"></div>`;

  document.getElementById('marks-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const key    = btn.dataset.key;
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
          .then(()  => showToast(t('toast_line_copy')))
          .catch(()  => showToast(`${t('toast_line_manual')}${id}`));
        window.open('https://line.me/R/nv/addFriends', '_blank', 'noopener');
      } else {
        showToast(t('toast_line_none'));
      }
    }
  });
}
