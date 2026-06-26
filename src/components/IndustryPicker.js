import { escHtml, escAttr } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import {
  INDUSTRY_CATEGORIES,
  INDUSTRY_MAX,
  industryLabel,
  normalizeIndustryIds,
} from '../data/industries.js';

/**
 * @param {string[]} selected - 已選產業 id（最多 2）
 * @param {{ inputName?: string, required?: boolean }} opts
 */
export function industryPickerHTML(selected = [], opts = {}) {
  const { inputName = 'industries', required = false } = opts;
  const sel = normalizeIndustryIds(selected);
  const chips = INDUSTRY_CATEGORIES.map(cat => {
    const active = sel.includes(cat.id);
    return `<button type="button" class="industry-chip${active ? ' active' : ''}"
      data-industry-id="${escAttr(cat.id)}" aria-pressed="${active}">
      ${escHtml(t(cat.labelKey))}
    </button>`;
  }).join('');

  return `
    <div class="industry-picker" data-industry-picker data-max="${INDUSTRY_MAX}">
      <input type="hidden" name="${escAttr(inputName)}" value="${escAttr(sel.join(','))}"
        ${required ? 'required data-industry-required="1"' : ''}>
      <div class="industry-chip-grid" role="group" aria-label="${escHtml(t('ind_picker_label'))}">
        ${chips}
      </div>
      <p class="field-hint industry-picker-hint">${escHtml(t('ind_picker_hint'))}</p>
    </div>`;
}

export function readIndustryPickerValues(container, inputName = 'industries') {
  const hidden = container?.querySelector(`[name="${inputName}"]`);
  if (!hidden?.value) return [];
  return normalizeIndustryIds(hidden.value.split(',').map(s => s.trim()).filter(Boolean));
}

export function bindIndustryPicker(container, inputName = 'industries') {
  const picker = container?.querySelector(`[data-industry-picker]`);
  if (!picker) return;

  const hidden = picker.querySelector(`[name="${inputName}"]`);
  const max = parseInt(picker.dataset.max, 10) || INDUSTRY_MAX;

  picker.querySelectorAll('[data-industry-id]').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.industryId;
      let sel = readIndustryPickerValues(picker, inputName);
      if (sel.includes(id)) {
        sel = sel.filter(x => x !== id);
      } else if (sel.length < max) {
        sel = [...sel, id];
      } else {
        import('../utils/toast.js').then(({ showToast }) => showToast(t('ind_picker_max')));
        return;
      }
      hidden.value = sel.join(',');
      picker.querySelectorAll('[data-industry-id]').forEach(c => {
        const on = sel.includes(c.dataset.industryId);
        c.classList.toggle('active', on);
        c.setAttribute('aria-pressed', String(on));
      });
    });
  });
}

export function industryBadgesHTML(industries, { compact = false } = {}) {
  const ids = normalizeIndustryIds(industries);
  if (!ids.length) return '';
  return `<div class="industry-badges${compact ? ' industry-badges-compact' : ''}">${ids.map(id =>
    `<span class="industry-badge">${escHtml(industryLabel(id, t))}</span>`
  ).join('')}</div>`;
}
