import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { getMyStatus, updateMyProfile, fetchAllMembers } from '../services/auth.js';
import { fieldPlaceholder, referralPlaceholder } from '../utils/profileHints.js';
import {
  profileTemplatePanelHTML,
  profileFieldApplyButtonHTML,
  bindProfileTemplatePanel,
} from '../components/ProfileTemplatePanel.js';
import { showToast } from '../utils/toast.js';
import { loadMembersFromDb } from '../services/membersApi.js';

function fieldMember() {
  const m = getMyStatus()?.member || {};
  return {
    profession: m.profession || '',
    have: m.have || '',
    wantMeet: m.want_meet || m.wantMeet || '',
    wantReferral: m.want_referral || m.wantReferral || '',
    lineId: m.line_id || m.lineId || '',
    lineLink: m.line_link || m.lineLink || '',
    name: m.name || '',
    branch: m.branch || '',
  };
}

export function renderProfileEdit(container) {
  const f = fieldMember();
  container.innerHTML = `
    <div class="profile-edit-wrap">
      <div class="profile-edit-head">
        <button type="button" class="btn-text profile-edit-back" id="profile-back">← ${escHtml(t('profile_back'))}</button>
        <h1 class="profile-edit-title serif">${escHtml(t('profile_title'))}</h1>
        <p class="profile-edit-sub">${escHtml(f.name)} · ${escHtml(f.branch)}</p>
      </div>

      <div class="profile-edit-tip">${escHtml(t('profile_tip'))}</div>
      ${profileTemplatePanelHTML()}

      <form id="profile-form" class="profile-edit-form">
        <label class="field-label">${escHtml(t('profile_profession_label'))} *</label>
        <p class="field-hint">${escHtml(t('profile_profession_hint'))}</p>
        ${profileFieldApplyButtonHTML('profession', 'profile_template_field_profession')}
        <input name="profession" class="field-input" maxlength="120" required
          value="${escHtml(f.profession)}" placeholder="${escHtml(fieldPlaceholder('profession'))}">

        <label class="field-label">${escHtml(t('card_have'))}</label>
        <p class="field-hint">${escHtml(t('profile_have_hint'))}</p>
        ${profileFieldApplyButtonHTML('have', 'profile_template_field_have')}
        <textarea name="have" class="field-input" rows="3"
          placeholder="${escHtml(fieldPlaceholder('have'))}">${escHtml(f.have)}</textarea>

        <label class="field-label">${escHtml(t('card_want'))}</label>
        <p class="field-hint">${escHtml(t('profile_want_hint'))}</p>
        ${profileFieldApplyButtonHTML('wantMeet', 'profile_template_field_want')}
        <textarea name="wantMeet" class="field-input" rows="3"
          placeholder="${escHtml(fieldPlaceholder('wantMeet'))}">${escHtml(f.wantMeet)}</textarea>

        <label class="field-label">${escHtml(t('profile_referral_label'))}</label>
        <p class="field-hint">${escHtml(t('profile_referral_hint'))}</p>
        ${profileFieldApplyButtonHTML('wantReferral', 'profile_template_field_referral')}
        <textarea name="wantReferral" class="field-input" rows="5"
          placeholder="${escHtml(referralPlaceholder())}">${escHtml(f.wantReferral)}</textarea>

        <label class="field-label">LINE ID</label>
        <input name="lineId" class="field-input" value="${escHtml(f.lineId)}"
          placeholder="your.line.id">

        <label class="field-label">${escHtml(t('profile_line_link'))}</label>
        <input name="lineLink" class="field-input" value="${escHtml(f.lineLink)}"
          placeholder="https://line.me/...">

        <button type="submit" class="btn-ai profile-save-btn">${escHtml(t('profile_save'))}</button>
      </form>
    </div>
  `;

  bindProfileTemplatePanel(container);

  container.querySelector('#profile-back')?.addEventListener('click', () => {
    location.hash = 'home';
  });

  container.querySelector('#profile-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector('.profile-save-btn');
    if (btn) btn.disabled = true;
    try {
      await updateMyProfile({
        profession: fd.get('profession'),
        have: fd.get('have'),
        wantMeet: fd.get('wantMeet'),
        wantReferral: fd.get('wantReferral'),
        lineId: fd.get('lineId'),
        lineLink: fd.get('lineLink'),
      });
      try {
        await loadMembersFromDb(fetchAllMembers);
      } catch (err) {
        console.warn('reload members:', err);
      }
      showToast(t('profile_saved'));
      location.hash = 'home';
    } catch (err) {
      showToast(err.message || t('profile_save_fail'));
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}
