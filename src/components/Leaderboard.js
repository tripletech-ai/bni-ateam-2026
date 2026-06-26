import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';

const RANK_STYLES = {
  1: 'lb-rank-gold',
  2: 'lb-rank-silver',
  3: 'lb-rank-bronze',
};

export function leaderboardHTML(rows = [], { compact = false, limit = 30 } = {}) {
  const list = (rows || []).slice(0, limit);
  if (!list.length) {
    return `
      <div class="leaderboard-empty">
        <p>${escHtml(t('lb_empty'))}</p>
        <p class="leaderboard-empty-sub">${escHtml(t('lb_empty_sub'))}</p>
      </div>`;
  }

  const items = list.map(row => {
    const rank = row.rank ?? 0;
    const rankClass = RANK_STYLES[rank] || '';
    return `
      <div class="lb-row${rank <= 3 ? ` lb-row-top lb-row-${rank}` : ''}" data-rank="${rank}">
        <span class="lb-rank serif ${rankClass}" aria-label="第 ${rank} 名">${rank}</span>
        <div class="lb-info">
          <div class="lb-name">${escHtml(row.name || '')}</div>
          <div class="lb-meta">${escHtml(row.branch || '')}${row.profession ? ` · ${escHtml(row.profession)}` : ''}</div>
        </div>
        <span class="lb-score serif">${row.score ?? 0}</span>
      </div>`;
  }).join('');

  return `
    <div class="leaderboard-panel${compact ? ' leaderboard-panel-compact' : ''}">
      ${compact ? '' : `<p class="leaderboard-hint">${escHtml(t('lb_hint'))}</p>`}
      <div class="leaderboard-list" role="list">${items}</div>
    </div>`;
}

export function leaderboardSectionHTML(rows, opts = {}) {
  const { compact = false, showMore = false } = opts;
  return `
    <section class="leaderboard-section${compact ? ' leaderboard-section-compact' : ''}">
      <div class="section-header">
        <div class="section-title">${escHtml(t('lb_title'))}</div>
        ${compact ? '' : `<p class="section-sub">${escHtml(t('lb_sub'))}</p>`}
      </div>
      ${leaderboardHTML(rows, { compact, limit: compact ? 5 : 30 })}
      ${showMore ? `<button type="button" class="btn-outline lb-more-btn" data-hash="live">${escHtml(t('lb_view_all'))}</button>` : ''}
    </section>`;
}
