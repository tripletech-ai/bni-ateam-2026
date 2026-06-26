import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { getMyStatus, updateMyProfile, fetchAllMembers, fetchCardBio, signOut, ensureAuthSession } from '../services/auth.js';
import { getCardLink } from '../data/cardLinks.js';
import { fieldPlaceholder, referralPlaceholder, profileBackendEmpty } from '../utils/profileHints.js';
import {
  profileTemplatePanelHTML,
  profileFieldApplyButtonHTML,
  bindProfileTemplatePanel,
} from '../components/ProfileTemplatePanel.js';
import { showToast } from '../utils/toast.js';
import { loadMembersFromDb } from '../services/membersApi.js';
import { notifyProfileMilestone } from '../utils/profileMilestone.js';
import { industryPickerHTML, bindIndustryPicker, readIndustryPickerValues } from '../components/IndustryPicker.js';
import { inferIndustriesFromText } from '../data/industries.js';
import { isGuestTrial } from '../utils/guestTrial.js';
import { guestBlockedPageHTML, bindGuestTrialLogin } from '../components/GuestTrialBanner.js';
import { endGuestTrial } from '../utils/guestTrial.js';
import { goToPage } from '../utils/nav.js';
import { runReclaim } from '../utils/reclaim.js';
import { showConfirmDialog } from '../utils/confirmDialog.js';

function mapProfileError(err) {
  const msg = err?.message || '';
  if (/jwt expired|invalid jwt|token expired|unauthorized|invalid token|not authenticated/i.test(msg)) {
    return t('onboard_err_session');
  }
  if (msg.includes('NOT_BOUND')) return t('profile_err_not_bound');
  return msg || t('profile_save_fail');
}

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
        ${guestBlockedPageHTML('profile')}
      </div>`;
    bindGuestTrialLogin(container, { onBeforeLogin: endGuestTrial });
    return;
  }

  const f = fieldMember();
  const emptyProfile = profileBackendEmpty(getMyStatus()?.member);
  container.innerHTML = `
    <div class="profile-edit-wrap">
      <div class="profile-edit-head">
        <button type="button" class="btn-text profile-edit-back" id="profile-back">← ${escHtml(t('profile_back'))}</button>
        <h1 class="profile-edit-title serif">${escHtml(t('profile_title'))}</h1>
      </div>

      ${emptyProfile ? `
      <div class="profile-empty-alert" role="alert">
        <div class="profile-empty-alert-title">${escHtml(t('profile_enrich_empty_title'))}</div>
        <p class="profile-empty-alert-body">${escHtml(t('profile_enrich_empty_body'))}</p>
        <p class="profile-empty-alert-tip">${escHtml(t('profile_empty_form_tip'))}</p>
      </div>` : ''}

      <section class="account-identity-card" aria-label="${escHtml(t('account_identity'))}">
        <div class="account-identity-label">${escHtml(t('account_identity'))}</div>
        <div class="account-identity-name serif">${escHtml(f.name)}</div>
        <div class="account-identity-meta">${escHtml(f.branch)}</div>
      </section>

      <section class="profile-switch-identity-card" aria-labelledby="profile-switch-heading">
        <div class="profile-switch-badge">${escHtml(t('account_switch_badge'))}</div>
        <h2 id="profile-switch-heading" class="profile-switch-title">${escHtml(t('account_switch_title'))}</h2>
        <p class="profile-switch-lead">${escHtml(t('account_switch_hint'))}</p>
        <ol class="profile-switch-steps">
          <li>${escHtml(t('account_switch_steps_1'))}</li>
          <li>${escHtml(t('account_switch_steps_2'))}</li>
          <li>${escHtml(t('account_switch_steps_3'))}</li>
        </ol>
        <button type="button" class="btn-gold-outline profile-reclaim-btn profile-reclaim-btn-prominent" id="profile-reclaim-btn">${escHtml(t('user_bar_reclaim'))}</button>
      </section>

      <div class="profile-edit-tip profile-edit-tip-compact">${escHtml(t('profile_tip_short'))}</div>
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
        ${f.cardLink ? `<button type="button" class="btn-gold-outline profile-import-bio" id="import-bio-btn">${escHtml(t('profile_bio_import'))}</button>` : ''}
        <input type="hidden" name="cardLink" value="${escHtml(f.cardLink)}">

        <label class="field-label">LINE ID</label>
        <input name="lineId" class="field-input" value="${escHtml(f.lineId)}"
          placeholder="your.line.id">

        <label class="field-label">${escHtml(t('profile_line_link'))}</label>
        <input name="lineLink" class="field-input" value="${escHtml(f.lineLink)}"
          placeholder="https://line.me/...">

        <button type="submit" class="btn-ai profile-save-btn">${escHtml(t('profile_save'))}</button>
      </form>

      <section class="profile-account-section" aria-labelledby="profile-account-heading">
        <h2 id="profile-account-heading" class="profile-account-title">${escHtml(t('account_section_title'))}</h2>
        <p class="profile-signout-hint">${escHtml(t('account_signout_hint'))}</p>
        <button type="button" class="btn-text profile-signout-btn" id="profile-signout-btn">${escHtml(t('user_bar_signout'))}</button>
      </section>
    </div>
  `;

  bindProfileTemplatePanel(container);
  bindIndustryPicker(container);

  container.querySelector('#profile-back')?.addEventListener('click', () => {
    goToPage('home');
  });

  container.querySelector('#profile-reclaim-btn')?.addEventListener('click', () => {
    runReclaim();
  });

  container.querySelector('#profile-signout-btn')?.addEventListener('click', async () => {
    const ok = await showConfirmDialog({
      title: t('signout_confirm'),
      message: t('signout_confirm'),
      confirmLabel: t('user_bar_signout'),
    });
    if (!ok) return;
    try {
      await signOut();
      location.hash = '';
      location.reload();
    } catch (err) {
      showToast(err.message || '登出失敗');
    }
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
      if (!(await ensureAuthSession())) {
        showToast(t('onboard_err_session'));
        return;
      }
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
        const hit = notifyProfileMilestone(window.BNI_MEMBERS);
        if (hit) window.BNI_PROFILE_MILESTONE = hit;
      } catch (err) {
        console.warn('reload members:', err);
      }
      showToast(t('profile_saved'));
      goToPage('home');
    } catch (err) {
      showToast(mapProfileError(err));
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}
