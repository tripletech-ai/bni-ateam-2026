import { escHtml } from '../utils/html.js';
import {
  getRegionForBranch,
  normalizeBranchName,
} from '../data/branches.js';
import {
  regionPickerHTML,
  eventBranchPickerHTML,
  searchEventChapters,
  getRegionById,
  isAteamRosterChapterName,
} from '../data/eventChapters.js';
import { fieldPlaceholder, referralPlaceholder } from '../utils/profileHints.js';
import {
  profileTemplatePanelHTML,
  profileFieldApplyButtonHTML,
  bindProfileTemplatePanel,
} from '../components/ProfileTemplatePanel.js';
import {
  signInWithGoogle,
  bindExistingMember,
  registerNewMember,
  getCurrentUser,
} from '../services/auth.js';
import { showToast } from '../utils/toast.js';
import { t } from '../i18n/translations.js';
import { industryPickerHTML, bindIndustryPicker, readIndustryPickerValues } from '../components/IndustryPicker.js';
import { inferIndustriesFromText } from '../data/industries.js';
import { isInAppBrowser } from '../utils/inAppBrowser.js';
import { inAppBrowserGateHTML, bindInAppBrowserGate } from '../components/InAppBrowserGate.js';
import { branchHasPickableRoster, getBranchMembers } from '../utils/rosterPick.js';
import { startGuestTrial } from '../utils/guestTrial.js';

/** region | branch | pick | manual | register-full */
let mode = 'region';
let selectedRegion = ''; // regionId e.g. taipei-north
let selectedBranch = '';

export function renderOnboard(container, { onComplete }) {
  const user = getCurrentUser();
  container.innerHTML = buildHTML(user);
  bindEvents(container, onComplete);
}

function memberCountHTML() {
  const n = window.BNI_PUBLIC_STATS?.total_members;
  if (n == null) return '';
  return `<div class="onboard-live-stats" role="status">
    ${escHtml(t('onboard_member_count_prefix'))}<strong>${n}</strong>${escHtml(t('onboard_member_count_suffix'))}
  </div>`;
}

function buildHTML(user) {
  const email = user?.email || '';
  return `
    <div class="onboard-wrap onboard-flow-wrap">
      <header class="login-hero login-hero-compact">
        <div class="login-hero-eyebrow">BNI · ANDERSON TEAM · 2026 年會</div>
        <h1 class="login-hero-title serif">${escHtml(t('onboard_title'))}</h1>
      </header>
      <div class="onboard-card">
        <div class="onboard-steps-hint">
          <span class="onboard-step-pill done">① Google 登入</span>
          <span class="onboard-step-pill${mode === 'region' ? ' active' : mode !== 'region' ? ' done' : ''}">② 區域與分會</span>
          <span class="onboard-step-pill${mode === 'pick' || mode === 'manual' || mode === 'register-full' ? ' active' : ''}">③ 選擇或輸入姓名</span>
        </div>
        ${memberCountHTML()}
        <h2 class="onboard-title serif">${escHtml(t('onboard_welcome'))}</h2>
        <p class="onboard-sub">${escHtml(t('onboard_logged_in'))}<strong>${escHtml(email)}</strong></p>
        <p class="onboard-hint">${escHtml(t('onboard_hint_v4'))}</p>

        <div id="onboard-region" class="onboard-panel${mode !== 'region' ? ' hidden' : ''}">
          <label class="field-label" for="chapter-search">${escHtml(t('onboard_chapter_search_lbl'))}</label>
          <input id="chapter-search" class="field-input" placeholder="${escHtml(t('onboard_chapter_search_ph'))}" autocomplete="off">
          <div id="chapter-search-results" class="chapter-search-results hidden"></div>
          <p class="field-hint onboard-or-divider">${escHtml(t('onboard_or_pick_region'))}</p>
          <div class="onboard-area-groups">${regionPickerHTML()}</div>
        </div>

        <div id="onboard-branch" class="onboard-panel${mode !== 'branch' ? ' hidden' : ''}">
          <p class="field-hint">${escHtml(t('onboard_branch_hint'))}${selectedRegion ? ` · ${escHtml(getRegionById(selectedRegion)?.regionLabel || '')}` : ''}</p>
          <div id="branch-picker" class="ateam-branch-picker event-chapter-picker">${eventBranchPickerHTML(selectedRegion, selectedBranch)}</div>
          <p class="field-hint onboard-picked-branch" id="picked-branch-label">${selectedBranch ? escHtml(selectedBranch) : escHtml(t('onboard_pick_branch_first'))}</p>
          <button type="button" class="btn-ai onboard-btn" id="branch-next" ${selectedBranch ? '' : 'disabled'}>${escHtml(t('onboard_branch_next'))}</button>
          <button type="button" class="btn-text" data-back="region">${escHtml(t('onboard_back'))}</button>
        </div>

        <div id="onboard-pick" class="onboard-panel${mode !== 'pick' ? ' hidden' : ''}">
          <p class="field-hint">${escHtml(t('onboard_pick_hint', { branch: selectedBranch }))}</p>
          <div id="roster-pick-list" class="bind-results"></div>
          <button type="button" class="btn-text onboard-link-btn" data-mode="manual">${escHtml(t('onboard_pick_not_found'))}</button>
          <button type="button" class="btn-text" data-back="branch">${escHtml(t('onboard_back'))}</button>
        </div>

        <div id="onboard-manual" class="onboard-panel${mode !== 'manual' ? ' hidden' : ''}">
          ${manualNameFormHTML()}
          <button type="button" class="btn-text onboard-link-btn" data-mode="register-full">${escHtml(t('onboard_manual_full_form'))}</button>
          <button type="button" class="btn-text" data-back="branch">${escHtml(t('onboard_back'))}</button>
        </div>

        <div id="onboard-register" class="onboard-panel${mode !== 'register-full' ? ' hidden' : ''}">
          ${registerFormHTML()}
          <button type="button" class="btn-text" data-back="manual">${escHtml(t('onboard_back'))}</button>
        </div>
      </div>
    </div>
  `;
}

function normalizeRegisterBranch(branch) {
  const s = String(branch || '').trim();
  if (!s || s.startsWith('~') || s.includes('海外') || s.includes('籌備')) return s;
  return normalizeBranchName(s);
}

function memberRegionForRegister(branch) {
  const r = getRegionForBranch(branch);
  if (r !== 'guest') return r;
  return selectedRegion || 'guest';
}

function manualNameFormHTML() {
  return `
    <p class="field-hint">${escHtml(t('onboard_manual_hint', { branch: selectedBranch }))}</p>
    <form id="manual-name-form" class="register-form">
      <label class="field-label">${escHtml(t('onboard_name_lbl'))} *</label>
      <input name="name" class="field-input" required maxlength="50" autocomplete="name"
        placeholder="${escHtml(t('onboard_name_ph'))}">
      <input type="hidden" name="branch" value="${escHtml(selectedBranch)}">
      <button type="submit" class="btn-ai onboard-btn">${escHtml(t('onboard_manual_submit'))}</button>
    </form>
  `;
}

function registerFormHTML() {
  return `
    <form id="register-form" class="register-form">
      <label class="field-label">${escHtml(t('onboard_name_lbl'))} *</label>
      <input name="name" class="field-input" required maxlength="50">
      <label class="field-label">${escHtml(t('onboard_register_branch_lbl'))}</label>
      <input name="branch" class="field-input" readonly value="${escHtml(selectedBranch)}">
      ${profileTemplatePanelHTML()}
      <label class="field-label">${escHtml(t('ind_picker_label'))} *</label>
      <p class="field-hint">${escHtml(t('ind_picker_hint'))}</p>
      ${industryPickerHTML([], { required: true })}
      <label class="field-label">${escHtml(t('profile_profession_label'))} *</label>
      ${profileFieldApplyButtonHTML('profession', 'profile_template_field_profession')}
      <input name="profession" class="field-input" maxlength="120" required
        placeholder="${escHtml(fieldPlaceholder('profession'))}">
      <label class="field-label">${escHtml(t('card_have'))}</label>
      ${profileFieldApplyButtonHTML('have', 'profile_template_field_have')}
      <textarea name="have" class="field-input" rows="2" placeholder="${escHtml(fieldPlaceholder('have'))}"></textarea>
      <label class="field-label">${escHtml(t('card_want'))}</label>
      ${profileFieldApplyButtonHTML('wantMeet', 'profile_template_field_want')}
      <textarea name="wantMeet" class="field-input" rows="2" placeholder="${escHtml(fieldPlaceholder('wantMeet'))}"></textarea>
      <label class="field-label">${escHtml(t('profile_referral_label'))}</label>
      <textarea name="wantReferral" class="field-input" rows="3" placeholder="${escHtml(referralPlaceholder())}"></textarea>
      <label class="field-label">LINE ID</label>
      <input name="lineId" class="field-input">
      <button type="submit" class="btn-ai onboard-btn">${escHtml(t('onboard_submit'))}</button>
    </form>
  `;
}

function rosterPickListHTML() {
  const members = getBranchMembers(selectedBranch, { filledOnly: true });
  if (!members.length) return `<div class="bind-empty">${escHtml(t('onboard_pick_empty'))}</div>`;
  const short = selectedBranch.replace(/分會$/, '');
  const canBind = isAteamRosterChapterName(short);
  return members.map(m => {
    const claimed = !!m.authUserId;
    return `
      <button type="button" class="bind-item roster-pick-item${claimed ? ' bind-item-claimed' : ''}"
        data-id="${escHtml(m.dbId)}" data-name="${escHtml(m.name)}" data-can-bind="${canBind ? '1' : '0'}">
        <div class="bind-name">${escHtml(m.name)}</div>
        <div class="bind-meta">${escHtml(m.profession || '—')}</div>
        ${claimed ? `<div class="bind-claimed-tag">${escHtml(t('onboard_bind_claimed_tag'))}</div>` : ''}
      </button>`;
  }).join('');
}

function setMode(next) {
  mode = next;
  const panels = ['region', 'branch', 'pick', 'manual', 'register-full'];
  for (const key of panels) {
    const el = document.getElementById(`onboard-${key === 'register-full' ? 'register' : key}`);
    if (!el) continue;
    const show = mode === key;
    el.classList.toggle('hidden', !show);
    if (show) el.removeAttribute('hidden');
    else el.setAttribute('hidden', '');
  }
  if (mode === 'pick') {
    const list = document.getElementById('roster-pick-list');
    if (list) list.innerHTML = rosterPickListHTML();
  }
}

function rerender(container, onComplete) {
  const user = getCurrentUser();
  container.innerHTML = buildHTML(user);
  bindEvents(container, onComplete);
  setMode(mode);
  if (mode === 'pick') {
    const list = document.getElementById('roster-pick-list');
    if (list) list.innerHTML = rosterPickListHTML();
    bindRosterPick(container, onComplete);
  }
}

function mapAuthError(err) {
  const msg = err?.message || '';
  if (msg.includes('ALREADY_BOUND')) return t('onboard_err_bound');
  if (msg.includes('REGISTER_RPC_MISSING') || /could not find the function.*bni_register/i.test(msg)) {
    return t('onboard_err_register_rpc');
  }
  return msg || '操作失敗';
}

function goAfterBranchSelected(container, onComplete) {
  const short = selectedBranch.replace(/分會$/, '');
  if (isAteamRosterChapterName(short) && branchHasPickableRoster(selectedBranch)) {
    setMode('pick');
    rerender(container, onComplete);
  } else {
    setMode('manual');
    rerender(container, onComplete);
  }
}

function bindEvents(container, onComplete) {
  const searchInput = container.querySelector('#chapter-search');
  const searchBox = container.querySelector('#chapter-search-results');
  let searchTimer;
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const q = searchInput.value.trim();
      if (!searchBox) return;
      if (q.length < 1) {
        searchBox.classList.add('hidden');
        searchBox.innerHTML = '';
        return;
      }
      const hits = searchEventChapters(q, 25);
      if (!hits.length) {
        searchBox.classList.remove('hidden');
        searchBox.innerHTML = `<div class="bind-empty">${escHtml(t('onboard_search_empty'))}</div>`;
        return;
      }
      searchBox.classList.remove('hidden');
      searchBox.innerHTML = hits.map(h => `
        <button type="button" class="bind-item chapter-search-hit" data-region-id="${escHtml(h.regionId)}" data-branch="${escHtml(h.fullName)}">
          <div class="bind-name">${escHtml(h.fullName)}${h.isAteamRoster ? ' <span class="ateam-roster-badge">A Team</span>' : ''}</div>
          <div class="bind-meta">${escHtml(h.regionLabel)} · ${escHtml(h.areaGroup)}</div>
        </button>`).join('');
      searchBox.querySelectorAll('.chapter-search-hit').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedRegion = btn.dataset.regionId;
          selectedBranch = btn.dataset.branch;
          goAfterBranchSelected(container, onComplete);
        });
      });
    }, 200);
  });

  container.querySelectorAll('[data-region-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRegion = btn.dataset.regionId;
      selectedBranch = '';
      setMode('branch');
      rerender(container, onComplete);
    });
  });

  container.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      const back = btn.dataset.back;
      if (back === 'region') {
        selectedRegion = '';
        selectedBranch = '';
      }
      if (back === 'branch') selectedBranch = selectedBranch;
      setMode(back === 'register-full' ? 'manual' : back);
      rerender(container, onComplete);
    });
  });

  container.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      setMode(btn.dataset.mode);
      rerender(container, onComplete);
    });
  });

  container.querySelector('#branch-picker')?.querySelectorAll('[data-branch]').forEach(chip => {
    chip.addEventListener('click', () => {
      selectedBranch = chip.dataset.branch;
      container.querySelectorAll('#branch-picker [data-branch]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const label = container.querySelector('#picked-branch-label');
      if (label) label.textContent = selectedBranch;
      const next = container.querySelector('#branch-next');
      if (next) next.disabled = false;
    });
  });

  container.querySelector('#branch-next')?.addEventListener('click', () => {
    if (!selectedBranch) {
      showToast(t('onboard_pick_branch_first'));
      return;
    }
    goAfterBranchSelected(container, onComplete);
  });

  bindRosterPick(container, onComplete);
  bindManualForm(container, onComplete);
  bindRegisterForm(container, onComplete);
}

function bindRosterPick(container, onComplete) {
  container.querySelectorAll('.roster-pick-item').forEach(btn => {
    btn.addEventListener('click', async () => {
      const canBind = btn.dataset.canBind === '1';
      const memberId = btn.dataset.id;
      const name = btn.dataset.name;
      if (canBind && memberId) {
        try {
          const result = await bindExistingMember(memberId);
          showToast(result?.duplicate ? t('onboard_bind_dup_ok') : t('onboard_bind_ok'));
          onComplete();
        } catch (err) {
          showToast(mapAuthError(err));
        }
        return;
      }
      const nameInput = container.querySelector('#manual-name-form [name="name"]');
      if (nameInput) nameInput.value = name;
      setMode('manual');
      rerender(container, onComplete);
      const input = container.querySelector('#manual-name-form [name="name"]');
      if (input) input.value = name;
    });
  });
}

function bindManualForm(container, onComplete) {
  container.querySelector('#manual-name-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = String(fd.get('name') || '').trim();
    const branch = normalizeRegisterBranch(String(fd.get('branch') || selectedBranch));
    if (!name || !branch) return;
    try {
      await registerNewMember({
        name,
        branch,
        region: memberRegionForRegister(branch),
        profession: '',
        have: '',
        wantMeet: '',
        wantReferral: '',
        industries: [],
      });
      showToast(t('onboard_success'));
      onComplete();
    } catch (err) {
      showToast(mapAuthError(err));
    }
  });
}

function bindRegisterForm(container, onComplete) {
  bindProfileTemplatePanel(container, '#register-form');
  bindIndustryPicker(container);
  container.querySelector('#register-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const branch = normalizeRegisterBranch(String(fd.get('branch') || selectedBranch));
    let industries = readIndustryPickerValues(container);
    const profession = String(fd.get('profession') || '').trim();
    if (!industries.length && profession) {
      industries = inferIndustriesFromText(profession, fd.get('have'));
    }
    if (!industries.length) {
      showToast(t('ind_picker_required'));
      return;
    }
    try {
      await registerNewMember({
        name: fd.get('name'),
        branch,
        region: memberRegionForRegister(branch),
        profession,
        have: fd.get('have'),
        wantMeet: fd.get('wantMeet'),
        wantReferral: fd.get('wantReferral'),
        lineId: fd.get('lineId'),
        lineLink: '',
        industries,
      });
      showToast(t('onboard_success'));
      onComplete();
    } catch (err) {
      showToast(mapAuthError(err));
    }
  });
}

const GOOGLE_ICON_SVG = `<svg class="google-logo" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
</svg>`;

function loginMemberCountHTML() {
  const n = window.BNI_PUBLIC_STATS?.total_members;
  if (n == null) return '';
  return `<p class="login-member-count">${escHtml(t('login_member_count_prefix'))}<strong>${n}</strong>${escHtml(t('login_member_count_suffix'))}</p>`;
}

export function renderLoginGate(container, { onGuestTrial } = {}) {
  const inApp = isInAppBrowser();
  container.innerHTML = `
    <div class="onboard-wrap login-gate-wrap">
      <header class="login-hero">
        <div class="login-hero-eyebrow">BNI · ANDERSON TEAM · 2026 年會</div>
        <h1 class="login-hero-title serif hero-title-shimmer">${escHtml(t('login_title'))}</h1>
        <p class="login-hero-sub">${escHtml(t('login_sub'))}</p>
      </header>
      <div class="onboard-card login-card">
        <div class="onboard-steps-hint" aria-label="使用步驟">
          <span class="onboard-step-pill active">① Google 登入</span>
          <span class="onboard-step-pill">② 認領身分</span>
          <span class="onboard-step-pill">③ 新手教學＋填寫資料</span>
        </div>
        ${loginMemberCountHTML()}
        ${inApp ? inAppBrowserGateHTML() : ''}
        ${inApp ? '' : `<p class="onboard-sub login-lead">${escHtml(t('login_lead'))}</p>`}
        ${inApp ? '' : `
        <button type="button" id="google-login-btn" class="btn-google">
          ${GOOGLE_ICON_SVG}
          <span class="btn-google-label">${escHtml(t('login_google_btn'))}</span>
        </button>`}
        <button type="button" id="guest-trial-btn" class="btn-outline login-guest-trial-btn">
          ${escHtml(t('login_guest_trial_btn'))}
        </button>
        <p class="login-skip-hint">${escHtml(t('login_skip_hint'))}</p>
      </div>
    </div>
  `;
  if (inApp) {
    bindInAppBrowserGate(container);
  } else {
    document.getElementById('google-login-btn')?.addEventListener('click', async () => {
      try {
        await signInWithGoogle();
      } catch (err) {
        showToast(err.message || '登入失敗');
      }
    });
  }
  document.getElementById('guest-trial-btn')?.addEventListener('click', () => {
    startGuestTrial();
    onGuestTrial?.();
  });
}
