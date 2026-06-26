import { personCardHTML, bindCardEvents } from '../components/PersonCard.js';
import { escHtml } from './html.js';
import { t } from '../i18n/translations.js';

/** 同頁顯示夥伴列表（首頁／搜尋共用） */
export function showMemberList(targetEl, { title, members, emptyTitle = '' } = {}) {
  if (!targetEl) return;

  if (!members?.length) {
    targetEl.innerHTML = `
      <div class="inline-results-panel">
        <div class="empty-state">
          <div class="empty-state-title">${escHtml(emptyTitle || title)}</div>
        </div>
      </div>`;
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
    </section>`;

  const cardsEl = targetEl.querySelector('.inline-results-cards');
  cardsEl.innerHTML = members.map((m, i) => personCardHTML(m, { staggerIndex: i })).join('');
  bindCardEvents(cardsEl, members);

  targetEl.querySelector('.inline-results-close')?.addEventListener('click', () => {
    targetEl.style.display = 'none';
    targetEl.innerHTML = '';
    targetEl.closest('.page-root')?.querySelectorAll('[data-industry].active, [data-branch].active, .industry-stat-chip.active')
      .forEach(el => el.classList.remove('active'));
  });

  targetEl.style.display = 'block';
  targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function hideMemberList(targetEl) {
  if (!targetEl) return;
  targetEl.style.display = 'none';
  targetEl.innerHTML = '';
}
