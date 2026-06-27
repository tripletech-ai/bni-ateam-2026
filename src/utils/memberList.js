import { personCardHTML, bindCardEvents } from '../components/PersonCard.js';
import { escHtml } from './html.js';
import { t } from '../i18n/translations.js';

function bindClose(panelEl, targetEl, onClose) {
  const close = () => {
    targetEl.style.display = 'none';
    targetEl.innerHTML = '';
    panelEl?.closest('.page-root')?.querySelectorAll(
      '[data-industry].active, [data-branch].active, .industry-stat-chip.active, .branch-chip.active, .quick-filter-chip.active',
    ).forEach(el => el.classList.remove('active'));
    onClose?.();
  };
  panelEl?.querySelector('.inline-results-close')?.addEventListener('click', close);
  panelEl?.querySelector('.inline-results-back')?.addEventListener('click', close);
  return close;
}

/** 同頁顯示夥伴列表（首頁／搜尋共用） */
export function showMemberList(targetEl, { title, members, emptyTitle = '', onClose, showBack = true } = {}) {
  if (!targetEl) return;

  if (!members?.length) {
    targetEl.innerHTML = `
      <div class="inline-results-panel">
        <div class="empty-state inline-results-empty">
          <div class="empty-state-title">${escHtml(emptyTitle || title)}</div>
          ${showBack ? `<button type="button" class="btn-gold-outline inline-results-back">${escHtml(t('search_back_browse'))}</button>` : ''}
        </div>
      </div>`;
    bindClose(targetEl.querySelector('.inline-results-panel'), targetEl, onClose);
    targetEl.style.display = 'block';
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  targetEl.innerHTML = `
    <section class="inline-results-panel" aria-live="polite">
      <div class="inline-results-header">
        <div class="results-header inline-results-title">
          <span>${members.length}</span> ${escHtml(title)}
        </div>
        <button type="button" class="inline-results-close" aria-label="${escHtml(t('inline_results_close'))}">×</button>
      </div>
      <div class="inline-results-cards"></div>
      ${showBack ? `
      <div class="inline-results-footer">
        <button type="button" class="btn-gold-outline inline-results-back">${escHtml(t('search_back_browse'))}</button>
      </div>` : ''}
    </section>`;

  const panel = targetEl.querySelector('.inline-results-panel');
  const cardsEl = targetEl.querySelector('.inline-results-cards');
  cardsEl.innerHTML = members.map((m, i) => personCardHTML(m, { staggerIndex: i })).join('');
  bindCardEvents(cardsEl, members);
  bindClose(panel, targetEl, onClose);

  targetEl.style.display = 'block';
  targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function hideMemberList(targetEl) {
  if (!targetEl) return;
  targetEl.style.display = 'none';
  targetEl.innerHTML = '';
}
