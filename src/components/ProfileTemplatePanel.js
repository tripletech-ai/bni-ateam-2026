import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import {
  applyFieldExample,
  applyPresetToForm,
  getProfilePresets,
} from '../utils/profileHints.js';
import { showToast } from '../utils/toast.js';

const FIELD_APPLY_KEYS = [
  { key: 'profession', labelKey: 'profile_template_field_profession' },
  { key: 'have', labelKey: 'profile_template_field_have' },
  { key: 'wantMeet', labelKey: 'profile_template_field_want' },
  { key: 'wantReferral', labelKey: 'profile_template_field_referral' },
];

export function profileTemplatePanelHTML() {
  const presets = getProfilePresets().filter(p => p.id !== 'default');
  return `
    <div class="profile-template-panel">
      <div class="profile-template-head">
        <div class="profile-template-title">${escHtml(t('profile_template_title'))}</div>
        <p class="profile-template-sub">${escHtml(t('profile_template_sub'))}</p>
      </div>
      <div class="profile-template-presets" role="group" aria-label="${escHtml(t('profile_template_title'))}">
        <button type="button" class="profile-preset-chip profile-preset-chip-primary" data-preset="default">
          ${escHtml(t('profile_template_apply_default'))}
        </button>
        ${presets.map(p => `
          <button type="button" class="profile-preset-chip" data-preset="${escHtml(p.id)}">
            ${escHtml(p.label)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

export function profileFieldApplyButtonHTML(fieldKey, labelKey) {
  return `
    <button type="button" class="field-apply-example" data-apply-field="${escHtml(fieldKey)}">
      ${escHtml(t('profile_template_apply_field'))}${escHtml(t(labelKey))}
    </button>
  `;
}

export function bindProfileTemplatePanel(container, formSelector = 'form') {
  const form = container.querySelector(formSelector);
  if (!form) return;

  container.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      applyPresetToForm(form, btn.dataset.preset);
      showToast(t('profile_template_applied'));
    });
  });

  container.querySelectorAll('[data-apply-field]').forEach(btn => {
    btn.addEventListener('click', () => {
      applyFieldExample(form, btn.dataset.applyField);
      showToast(t('profile_template_field_applied'));
    });
  });
}
