import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { getMyStatus, updateMyProfile, fetchAllMembers, fetchCardBio } from '../services/auth.js';
import { getCardLink } from '../data/cardLinks.js';
import { fieldPlaceholder, referralPlaceholder } from '../utils/profileHints.js';
import {
  profileTemplatePanelHTML,
  profileFieldApplyButtonHTML,
  bindProfileTemplatePanel,
} from '../components/ProfileTemplatePanel.js';
import { showToast } from '../utils/toast.js';
import { loadMembersFromDb } from '../services/membersApi.js';
import { industryPickerHTML, bindIndustryPicker, readIndustryPickerValues } from '../components/IndustryPicker.js';
import { inferIndustriesFromText } from '../data/industries.js';
import { isGuestTrial } from '../utils/guestTrial.js';
import { guestHomeReminderHTML, bindGuestTrialLogin } from '../components/GuestTrialBanner.js';
import { endGuestTrial } from '../utils/guestTrial.js';

function fieldMember() {
  const m = getMyStatus()?.member || {};
  let industries = Array.isArray(m.industries) ? m.industries : [];
  if (!industries.length && m.profession) {
    industries = inferIndustriesFromText(m.profession, m.have);
  }
  return {
    profession: m.profession || '',
    have: m.have || '',
    wantMeet: m.want_meet || m.wantMeet || '',
    wantReferral: m.want_referral || m.wantReferral || '',
    lineId: m.line_id || m.lineId || '',
    lineLink: m.line_link || m.lineLink || '',
    bio: m.bio || '',
    cardLink: m.card_link || m.cardLink || getCardLink(m.name) || '',
    industries,
    name: m.name || '',
    branch: m.branch || '',
  };
}

export function renderProfileEdit(container) {
  if (isGuestTrial()) {
    container.innerHTML = `
      <div class="profile-edit-wrap guest-profile-blocked">
        ${guestHomeReminderHTML()}
      </div>`;
    bindGuestTrialLogin(container, { onBeforeLogin: endGuestTrial });
    return;
  }

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
        <label class="field-label">${escHtml(t('ind_picker_label'))} *</label>
        <p class="field-hint">${escHtml(t('ind_picker_hint'))}</p>
        ${industryPickerHTML(f.industries, { required: true })}

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

        <label class="field-label">${escHtml(t('profile_bio_label'))}</label>
        <p class="field-hint">${escHtml(t('profile_bio_hint'))}</p>
        <textarea name="bio" class="field-input" rows="4"
          placeholder="${escHtml(t('profile_bio_ph'))}">${escHtml(f.bio)}</textarea>
        ${f.cardLink ? `<button type="button" class="btn-outline profile-import-bio" id="import-bio-btn">${escHtml(t('profile_bio_import'))}</button>` : ''}
        <input type="hidden" name="cardLink" value="${escHtml(f.cardLink)}">

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
  bindIndustryPicker(container);

  container.querySelector('#profile-back')?.addEventListener('click', () => {
    location.hash = 'home';
  });

  container.querySelector('#import-bio-btn')?.addEventListener('click', async () => {
    const url = f.cardLink;
    const btn = container.querySelector('#import-bio-btn');
    const bioEl = container.querySelector('[name="bio"]');
    if (!url || !bioEl) return;
    if (btn) btn.disabled = true;
    try {
      const bio = await fetchCardBio(url);
      bioEl.value = bio;
      showToast(t('profile_bio_imported'));
    } catch (err) {
      showToast(err.message || t('profile_bio_import_fail'));
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  container.querySelector('#profile-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector('.profile-save-btn');
    const industries = readIndustryPickerValues(container);
    if (!industries.length) {
      showToast(t('ind_picker_required'));
      return;
    }
    if (btn) btn.disabled = true;
    try {
      await updateMyProfile({
        profession: fd.get('profession'),
        have: fd.get('have'),
        wantMeet: fd.get('wantMeet'),
        wantReferral: fd.get('wantReferral'),
        lineId: fd.get('lineId'),
        lineLink: fd.get('lineLink'),
        bio: fd.get('bio'),
        cardLink: fd.get('cardLink'),
        industries: readIndustryPickerValues(container),
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
