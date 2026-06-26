import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { industryLabel, mergeIndustryStatsFromPublic } from '../data/industries.js';

export function industryStatsHTML({ stats, members } = {}) {
  const rows = mergeIndustryStatsFromPublic(stats, members);
  if (!rows.length) return '';

  const chips = rows.map((row, i) => `
    <button type="button" class="industry-stat-chip stagger-${Math.min(i + 1, 6)}"
      data-industry="${escHtml(row.id)}" aria-label="${escHtml(industryLabel(row.id, t))}">
      <span class="industry-stat-name">${escHtml(industryLabel(row.id, t))}</span>
      <span class="industry-stat-count">${row.count}</span>
    </button>`).join('');

  return `
    <section class="industry-stats-section" aria-label="${escHtml(t('ind_stats_title'))}">
      <div class="section-header industry-stats-header">
        <div class="section-title">${escHtml(t('ind_stats_title'))}</div>
        <p class="section-sub">${escHtml(t('ind_stats_sub'))}</p>
      </div>
      <div class="industry-stat-grid">${chips}</div>
    </section>`;
}

export function bindIndustryStats(container) {
  container?.querySelectorAll('.industry-stat-chip[data-industry]').forEach(chip => {
    chip.addEventListener('click', () => {
      sessionStorage.setItem('bni_pending_industry', chip.dataset.industry);
      location.hash = 'search';
    });
  });
}
