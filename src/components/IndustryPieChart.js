import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { industryLabel, mergeIndustryStatsFromPublic, getMemberTotalFromStats } from '../data/industries.js';

const PIE_COLORS = [
  '#FAC775', '#185FA5', '#4ade80', '#f87171', '#a78bfa',
  '#fb923c', '#38bdf8', '#e879f9', '#94a3b8', '#fbbf24',
];

export function industryPieChartHTML({ stats, members } = {}) {
  const rows = mergeIndustryStatsFromPublic(stats, members).filter(r => r.count > 0);
  if (!rows.length) return '';

  const memberTotal = getMemberTotalFromStats(stats, members);
  const tagTotal = rows.reduce((s, r) => s + r.count, 0);
  const pieBase = tagTotal > 0 ? tagTotal : memberTotal;
  let acc = 0;
  const segments = rows.map((row, i) => {
    const pct = (row.count / pieBase) * 100;
    const start = acc;
    acc += pct;
    return {
      id: row.id,
      count: row.count,
      label: industryLabel(row.id, t),
      start,
      end: acc,
      color: PIE_COLORS[i % PIE_COLORS.length],
    };
  });

  const gradient = segments.map(s => `${s.color} ${s.start}% ${s.end}%`).join(', ');
  const legend = segments.map(s => `
    <div class="pie-legend-item">
      <span class="pie-legend-dot" style="background:${s.color}"></span>
      <span class="pie-legend-label">${escHtml(s.label)}</span>
      <span class="pie-legend-count">${s.count}</span>
    </div>`).join('');

  return `
    <section class="industry-pie-section" aria-label="${escHtml(t('ind_pie_title'))}">
      <div class="section-header industry-pie-header">
        <div class="section-title">${escHtml(t('ind_pie_title'))}</div>
        <p class="section-sub">${escHtml(t('ind_pie_sub'))}</p>
        ${tagTotal > memberTotal ? `<p class="section-sub ind-pie-note">${escHtml(t('ind_pie_overlap_hint'))}</p>` : ''}
      </div>
      <div class="industry-pie-wrap">
        <div class="industry-pie-chart" style="background:conic-gradient(${gradient})" role="img"
          aria-label="${escHtml(t('ind_pie_title'))} ${memberTotal}">
          <div class="industry-pie-hole">
            <span class="industry-pie-total serif">${memberTotal}</span>
            <span class="industry-pie-total-label">${escHtml(t('stat_members'))}</span>
          </div>
        </div>
        <div class="pie-legend">${legend}</div>
      </div>
    </section>`;
}
