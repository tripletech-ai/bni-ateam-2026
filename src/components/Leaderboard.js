import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';

const RANK_STYLES = {
  1: 'lb-rank-gold',
  2: 'lb-rank-silver',
  3: 'lb-rank-bronze',
};

const LB_MODE_KEYS = {
  mutual: {
    hint: 'lb_hint',
    empty: 'lb_empty',
    emptySub: 'lb_empty_sub',
    scoreUnit: 'lb_score_mutual',
  },
  received_one: {
    hint: 'lb_hint_received',
    empty: 'lb_empty_received',
    emptySub: 'lb_empty_received_sub',
    scoreUnit: 'lb_score_received',
  },
};

export function getLeaderboardModeKeys(mode = 'mutual') {
  return LB_MODE_KEYS[mode] || LB_MODE_KEYS.mutual;
}

export function leaderboardHTML(rows = [], { compact = false, limit = 30, mode = 'mutual' } = {}) {
  const list = (rows || []).slice(0, limit);
  const keys = getLeaderboardModeKeys(mode);
  if (!list.length) {
    return `
      <div class="leaderboard-empty">
        <p>${escHtml(t(keys.empty))}</p>
        <p class="leaderboard-empty-sub">${escHtml(t(keys.emptySub))}</p>
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
        <div class="lb-score-wrap" aria-label="${escHtml(String(row.score ?? 0))} ${escHtml(t(keys.scoreUnit))}">
          <span class="lb-score serif">${row.score ?? 0}</span>
          <span class="lb-score-unit">${escHtml(t(keys.scoreUnit))}</span>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="leaderboard-panel${compact ? ' leaderboard-panel-compact' : ''}" data-lb-mode="${escHtml(mode)}">
      ${compact ? '' : `<p class="leaderboard-hint">${escHtml(t(keys.hint))}</p>`}
      <div class="leaderboard-list" role="list">${items}</div>
    </div>`;
}

export function leaderboardModeTabsHTML(modes = ['mutual', 'received_one'], active = 'mutual') {
  const defs = [
    { id: 'mutual', label: t('lb_mode_mutual') },
    { id: 'received_one', label: t('lb_mode_received') },
  ];
  const visible = defs.filter(d => modes.includes(d.id));
  if (visible.length < 2) return '';
  return `
    <div class="lb-mode-tabs" role="tablist" aria-label="${escHtml(t('lb_mode_label'))}">
      ${visible.map(d => `
        <button type="button" class="lb-mode-tab${d.id === active ? ' active' : ''}"
          role="tab" aria-selected="${d.id === active}"
          data-lb-mode="${escHtml(d.id)}">${escHtml(d.label)}</button>
      `).join('')}
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
