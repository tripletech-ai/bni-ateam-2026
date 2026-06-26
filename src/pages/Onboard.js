import { escHtml } from '../utils/html.js';
import {
  ateamBranchGridHTML,
  ateamBranchPickerHTML,
  getRegionForBranch,
  normalizeBranchName,
  guestBranchSuggestions,
  findSimilarBranch,
  collectKnownBranchNames,
} from '../data/branches.js';
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
  searchUnboundMembers,
} from '../services/auth.js';
import { mapDbMember } from '../services/membersApi.js';
import { showToast } from '../utils/toast.js';
import { t } from '../i18n/translations.js';
import { industryPickerHTML, bindIndustryPicker, readIndustryPickerValues } from '../components/IndustryPicker.js';
import { inferIndustriesFromText } from '../data/industries.js';

/** choose | ateam | bind | guest-branch | register */
let mode = 'choose';
let regionType = null; // 'ateam' | 'guest'
let guestBranchDraft = '';
let selectedAteamBranch = '';

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
          <span class="onboard-step-pill active">② 認領身分</span>
          <span class="onboard-step-pill">③ 新手教學＋填寫資料</span>
        </div>
        ${memberCountHTML()}
        <h2 class="onboard-title serif">${escHtml(t('onboard_welcome'))}</h2>
        <p class="onboard-sub">${escHtml(t('onboard_logged_in'))}<strong>${escHtml(email)}</strong></p>
        <p class="onboard-hint">${escHtml(t('onboard_hint_v2'))}</p>

        <div id="onboard-choose" class="onboard-panel${mode !== 'choose' ? ' hidden' : ''}">
          <button type="button" class="btn-ai onboard-btn onboard-choice-btn" data-mode="ateam">
            <span class="onboard-choice-title">${escHtml(t('onboard_ateam_btn'))}</span>
            <span class="onboard-choice-sub">${escHtml(t('onboard_ateam_sub'))}</span>
          </button>
          <button type="button" class="btn-outline onboard-btn onboard-choice-btn" data-mode="guest-branch">
            <span class="onboard-choice-title">${escHtml(t('onboard_guest_btn'))}</span>
            <span class="onboard-choice-sub">${escHtml(t('onboard_guest_sub'))}</span>
          </button>
        </div>

        <div id="onboard-ateam" class="onboard-panel${mode !== 'ateam' ? ' hidden' : ''}">
          <p class="field-hint">${escHtml(t('onboard_ateam_grid_hint'))}</p>
          ${ateamBranchGridHTML()}
          <div class="onboard-ateam-actions">
            <button type="button" class="btn-ai onboard-btn" data-mode="bind">${escHtml(t('onboard_bind_btn_v2'))}</button>
            <button type="button" class="btn-outline onboard-btn" data-mode="register">${escHtml(t('onboard_new_btn_v2'))}</button>
          </div>
          <button type="button" class="btn-text" data-back="choose">${escHtml(t('onboard_back'))}</button>
        </div>

        <div id="onboard-bind" class="onboard-panel${mode !== 'bind' ? ' hidden' : ''}">
          <p class="field-hint">${escHtml(t('onboard_bind_scope_v2'))}</p>
          <label class="field-label">${escHtml(t('onboard_bind_search_lbl'))}</label>
          <input id="bind-search" class="field-input" placeholder="${escHtml(t('onboard_bind_search_ph'))}" autocomplete="name">
          <div id="bind-results" class="bind-results"></div>
          <button type="button" class="btn-text onboard-link-btn" data-mode="register">${escHtml(t('onboard_bind_not_found'))}</button>
          <button type="button" class="btn-text" data-back="ateam">${escHtml(t('onboard_back'))}</button>
        </div>

        <div id="onboard-guest-branch" class="onboard-panel${mode !== 'guest-branch' ? ' hidden' : ''}">
          <label class="field-label">${escHtml(t('onboard_guest_branch_lbl'))}</label>
          <p class="field-hint">${escHtml(t('onboard_guest_branch_hint'))}</p>
          <input id="guest-branch-input" class="field-input" maxlength="80"
            list="guest-branch-suggestions"
            placeholder="${escHtml(t('onboard_guest_branch_ph'))}" value="${escHtml(guestBranchDraft)}">
          <datalist id="guest-branch-suggestions">
            ${guestBranchSuggestions(window.BNI_PUBLIC_STATS).map(b =>
              `<option value="${escHtml(b)}">`).join('')}
          </datalist>
          <div id="guest-branch-similar" class="guest-branch-similar hidden" role="status"></div>
          <button type="button" class="btn-ai onboard-btn" id="guest-branch-next">${escHtml(t('onboard_guest_next'))}</button>
          <button type="button" class="btn-text" data-back="choose">${escHtml(t('onboard_back'))}</button>
        </div>

        <div id="onboard-register" class="onboard-panel${mode !== 'register' ? ' hidden' : ''}">
          ${registerFormHTML()}
          <button type="button" class="btn-text" data-back="${regionType === 'guest' ? 'guest-branch' : 'ateam'}">${escHtml(t('onboard_back'))}</button>
        </div>
      </div>
    </div>
  `;
}

function registerFormHTML() {
  const branchValue = regionType === 'guest'
    ? guestBranchDraft
    : selectedAteamBranch;
  const branchField = regionType === 'ateam'
    ? `
        <label class="field-label">${escHtml(t('onboard_register_branch_lbl'))} *</label>
        <p class="field-hint">${escHtml(t('onboard_register_branch_pick'))}</p>
        <input type="hidden" name="branch" id="register-branch-value" value="${escHtml(branchValue)}" required>
        <div id="ateam-branch-picker" class="ateam-branch-picker">${ateamBranchPickerHTML(branchValue)}</div>
        <div class="field-hint onboard-picked-branch" id="picked-branch-label">${branchValue ? escHtml(branchValue) : escHtml(t('onboard_pick_branch_first'))}</div>
      `
    : `
        <label class="field-label">${escHtml(t('onboard_register_branch_lbl'))}</label>
        <input name="branch" class="field-input" readonly value="${escHtml(normalizeBranchName(branchValue))}">
      `;

  return `
    <form id="register-form" class="register-form">
      <label class="field-label">姓名 *</label>
      <input name="name" class="field-input" required maxlength="50">
      ${branchField}
      ${profileTemplatePanelHTML()}
      <label class="field-label">${escHtml(t('ind_picker_label'))} *</label>
      <p class="field-hint">${escHtml(t('ind_picker_hint'))}</p>
      ${industryPickerHTML([], { required: true })}
      <label class="field-label">${escHtml(t('profile_profession_label'))} *</label>
      <p class="field-hint">${escHtml(t('profile_profession_hint'))}</p>
      ${profileFieldApplyButtonHTML('profession', 'profile_template_field_profession')}
      <input name="profession" class="field-input" maxlength="120" required
        placeholder="${escHtml(fieldPlaceholder('profession'))}">
      <label class="field-label">${escHtml(t('card_have'))}</label>
      ${profileFieldApplyButtonHTML('have', 'profile_template_field_have')}
      <textarea name="have" class="field-input" rows="2"
        placeholder="${escHtml(fieldPlaceholder('have'))}"></textarea>
      <label class="field-label">${escHtml(t('card_want'))}</label>
      ${profileFieldApplyButtonHTML('wantMeet', 'profile_template_field_want')}
      <textarea name="wantMeet" class="field-input" rows="2"
        placeholder="${escHtml(fieldPlaceholder('wantMeet'))}"></textarea>
      <label class="field-label">${escHtml(t('profile_referral_label'))}</label>
      ${profileFieldApplyButtonHTML('wantReferral', 'profile_template_field_referral')}
      <textarea name="wantReferral" class="field-input" rows="4"
        placeholder="${escHtml(referralPlaceholder())}"></textarea>
      <label class="field-label">LINE ID</label>
      <input name="lineId" class="field-input">
      <label class="field-label">LINE 連結</label>
      <input name="lineLink" class="field-input" placeholder="https://line.me/...">
      <button type="submit" class="btn-ai onboard-btn">${escHtml(t('onboard_submit'))}</button>
    </form>
  `;
}

function setMode(next) {
  mode = next;
  const panels = {
    choose: 'onboard-choose',
    ateam: 'onboard-ateam',
    bind: 'onboard-bind',
    'guest-branch': 'onboard-guest-branch',
    register: 'onboard-register',
  };
  for (const [key, id] of Object.entries(panels)) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.classList.toggle('hidden', mode !== key);
    if (mode === key) el.removeAttribute('hidden');
    else el.setAttribute('hidden', '');
  }
}

function mapAuthError(err) {
  const msg = err?.message || '';
  if (msg.includes('ALREADY_BOUND')) return t('onboard_err_bound');
  return msg || '操作失敗';
}

function bindEvents(container, onComplete) {
  container.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.mode;
      if (next === 'ateam') regionType = 'ateam';
      if (next === 'guest-branch') regionType = 'guest';
      if (next === 'register' && regionType === 'ateam' && !selectedAteamBranch) {
        selectedAteamBranch = '';
      }
      if (next === 'register') {
        if (regionType === 'guest' && !guestBranchDraft.trim()) {
          showToast(t('onboard_guest_branch_required'));
          setMode('guest-branch');
          return;
        }
        rerenderRegisterPanel(container, onComplete);
      }
      setMode(next === 'register' ? 'register' : next);
    });
  });

  container.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.back));
  });

  container.querySelector('#guest-branch-next')?.addEventListener('click', () => {
    const input = container.querySelector('#guest-branch-input');
    const raw = input?.value.trim() || '';
    if (!raw) {
      showToast(t('onboard_guest_branch_required'));
      return;
    }
    const known = collectKnownBranchNames(window.BNI_PUBLIC_STATS);
    guestBranchDraft = findSimilarBranch(raw, known) || normalizeBranchName(raw);
    if (!guestBranchDraft) {
      showToast(t('onboard_guest_branch_required'));
      return;
    }
    regionType = 'guest';
    rerenderRegisterPanel(container, onComplete);
    setMode('register');
  });

  container.querySelector('#guest-branch-input')?.addEventListener('input', () => {
    const input = container.querySelector('#guest-branch-input');
    const hint = container.querySelector('#guest-branch-similar');
    if (!input || !hint) return;
    const known = collectKnownBranchNames(window.BNI_PUBLIC_STATS);
    const similar = findSimilarBranch(input.value.trim(), known);
    const norm = normalizeBranchName(input.value.trim());
    if (similar && similar !== norm) {
      hint.classList.remove('hidden');
      hint.innerHTML = `${escHtml(t('onboard_guest_branch_similar'))}<button type="button" class="btn-text guest-use-similar">${escHtml(similar)}</button>`;
      hint.querySelector('.guest-use-similar')?.addEventListener('click', () => {
        input.value = similar;
        hint.classList.add('hidden');
      });
    } else {
      hint.classList.add('hidden');
    }
  });

  bindProfileTemplatePanel(container, '#register-form');
  bindIndustryPicker(container);
  bindRegisterForm(container, onComplete);
  bindBranchPicker(container);

  const searchInput = container.querySelector('#bind-search');
  let searchTimer;
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => runBindSearch(searchInput.value, onComplete), 300);
  });
}

function rerenderRegisterPanel(container, onComplete) {
  const panel = container.querySelector('#onboard-register');
  if (!panel) return;
  panel.innerHTML = `${registerFormHTML()}
    <button type="button" class="btn-text" data-back="${regionType === 'guest' ? 'guest-branch' : 'ateam'}">${escHtml(t('onboard_back'))}</button>`;
  bindProfileTemplatePanel(container, '#register-form');
  bindIndustryPicker(container);
  bindRegisterForm(container, onComplete);
  bindBranchPicker(container);
  panel.querySelector('[data-back]')?.addEventListener('click', () => {
    setMode(regionType === 'guest' ? 'guest-branch' : 'ateam');
  });
}

function bindBranchPicker(container) {
  const picker = container.querySelector('#ateam-branch-picker');
  if (!picker) return;
  picker.querySelectorAll('[data-branch]').forEach(chip => {
    chip.addEventListener('click', () => {
      selectedAteamBranch = chip.dataset.branch;
      picker.querySelectorAll('[data-branch]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const hidden = container.querySelector('#register-branch-value');
      if (hidden) hidden.value = selectedAteamBranch;
      const label = container.querySelector('#picked-branch-label');
      if (label) label.textContent = selectedAteamBranch;
    });
  });
}

function bindRegisterForm(container, onComplete) {
  container.querySelector('#register-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    let branch = String(fd.get('branch') || selectedAteamBranch || guestBranchDraft).trim();
    branch = normalizeBranchName(branch);
    if (regionType === 'guest') {
      const known = collectKnownBranchNames(window.BNI_PUBLIC_STATS);
      branch = findSimilarBranch(branch, known) || branch;
    }
    if (!branch) {
      showToast(t('onboard_pick_branch_first'));
      return;
    }
    const region = getRegionForBranch(branch);
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
        region,
        profession,
        have: fd.get('have'),
        wantMeet: fd.get('wantMeet'),
        wantReferral: fd.get('wantReferral'),
        lineId: fd.get('lineId'),
        lineLink: fd.get('lineLink'),
        industries,
      });
      showToast(t('onboard_success'));
      onComplete();
    } catch (err) {
      showToast(mapAuthError(err));
    }
  });
}

async function runBindSearch(keyword, onComplete) {
  const box = document.getElementById('bind-results');
  if (!box) return;
  if (keyword.trim().length < 1) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML = '<div class="bind-loading">搜尋中…</div>';
  try {
    const rows = await searchUnboundMembers(keyword);
    if (!rows.length) {
      box.innerHTML = `<div class="bind-empty">${escHtml(t('onboard_bind_empty_v2'))}</div>`;
      return;
    }
    box.innerHTML = rows.map(r => {
      const m = mapDbMember(r);
      const claimed = r.claimed === true;
      return `
        <button type="button" class="bind-item${claimed ? ' bind-item-claimed' : ''}" data-id="${escHtml(m.dbId)}">
          <div class="bind-name">${escHtml(m.name)}</div>
          <div class="bind-meta">${escHtml(m.branch)} · ${escHtml(m.profession || '—')}</div>
          ${claimed ? `<div class="bind-claimed-tag">${escHtml(t('onboard_bind_claimed_tag'))}</div>` : ''}
        </button>`;
    }).join('');
    box.querySelectorAll('.bind-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          const result = await bindExistingMember(btn.dataset.id);
          showToast(result?.duplicate ? t('onboard_bind_dup_ok') : t('onboard_bind_ok'));
          onComplete();
        } catch (err) {
          showToast(mapAuthError(err));
        }
      });
    });
  } catch (err) {
    box.innerHTML = `<div class="bind-empty">${escHtml(err.message)}</div>`;
  }
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

export function renderLoginGate(container) {
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
        <p class="onboard-sub login-lead">${escHtml(t('login_lead'))}</p>
        <button type="button" id="google-login-btn" class="btn-google">
          ${GOOGLE_ICON_SVG}
          <span class="btn-google-label">${escHtml(t('login_google_btn'))}</span>
        </button>
        <p class="onboard-foot">${escHtml(t('login_foot_v2'))}</p>
      </div>
    </div>
  `;
  document.getElementById('google-login-btn').addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      showToast(err.message || '登入失敗');
    }
  });
}
