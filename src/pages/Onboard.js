import { escHtml } from '../utils/html.js';
import { getAteamBranchSummary, isAteamBranch } from '../data/branches.js';
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

let mode = 'choose'; // choose | bind | register

export function renderOnboard(container, { onComplete }) {
  const user = getCurrentUser();
  container.innerHTML = buildHTML(user);
  bindEvents(container, onComplete);
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
        <h2 class="onboard-title serif">${escHtml(t('onboard_welcome'))}</h2>
        <p class="onboard-sub">${escHtml(t('onboard_logged_in'))}<strong>${escHtml(email)}</strong></p>
        <p class="onboard-hint">${escHtml(t('onboard_hint'))}</p>
        <p class="onboard-scope-hint">${escHtml(getAteamBranchSummary())}</p>

        <div id="onboard-choose" class="onboard-panel${mode !== 'choose' ? ' hidden' : ''}">
          <button type="button" class="btn-ai onboard-btn" data-mode="bind">${escHtml(t('onboard_bind_btn'))}</button>
          <button type="button" class="btn-outline onboard-btn" data-mode="register">${escHtml(t('onboard_register_btn'))}</button>
        </div>

        <div id="onboard-bind" class="onboard-panel${mode !== 'bind' ? ' hidden' : ''}">
          <p class="field-hint">${escHtml(t('onboard_bind_scope'))}</p>
          <label class="field-label">${escHtml(t('onboard_bind_search_lbl'))}</label>
          <input id="bind-search" class="field-input" placeholder="${escHtml(t('onboard_bind_search_ph'))}" autocomplete="name">
          <div id="bind-results" class="bind-results"></div>
          <button type="button" class="btn-text" data-back>${escHtml(t('onboard_back'))}</button>
        </div>

        <div id="onboard-register" class="onboard-panel${mode !== 'register' ? ' hidden' : ''}">
          <form id="register-form" class="register-form">
            <label class="field-label">姓名 *</label>
            <input name="name" class="field-input" required maxlength="50">
            <label class="field-label">${escHtml(t('onboard_register_branch_lbl'))}</label>
            <p class="field-hint">${escHtml(t('onboard_register_branch_hint'))}</p>
            <input name="branch" class="field-input" required maxlength="80"
              placeholder="${escHtml(t('onboard_register_branch_ph'))}">
            ${profileTemplatePanelHTML()}
            <label class="field-label">${escHtml(t('profile_profession_label'))} *</label>
            <p class="field-hint">${escHtml(t('profile_profession_hint'))}</p>
            ${profileFieldApplyButtonHTML('profession', 'profile_template_field_profession')}
            <input name="profession" class="field-input" maxlength="120" required
              placeholder="${escHtml(fieldPlaceholder('profession'))}">
            <label class="field-label">${escHtml(t('card_have'))}</label>
            <p class="field-hint">${escHtml(t('profile_have_hint'))}</p>
            ${profileFieldApplyButtonHTML('have', 'profile_template_field_have')}
            <textarea name="have" class="field-input" rows="2"
              placeholder="${escHtml(fieldPlaceholder('have'))}"></textarea>
            <label class="field-label">${escHtml(t('card_want'))}</label>
            <p class="field-hint">${escHtml(t('profile_want_hint'))}</p>
            ${profileFieldApplyButtonHTML('wantMeet', 'profile_template_field_want')}
            <textarea name="wantMeet" class="field-input" rows="2"
              placeholder="${escHtml(fieldPlaceholder('wantMeet'))}"></textarea>
            <label class="field-label">${escHtml(t('profile_referral_label'))}</label>
            <p class="field-hint">${escHtml(t('profile_referral_hint'))}</p>
            ${profileFieldApplyButtonHTML('wantReferral', 'profile_template_field_referral')}
            <textarea name="wantReferral" class="field-input" rows="4"
              placeholder="${escHtml(referralPlaceholder())}"></textarea>
            <label class="field-label">LINE ID</label>
            <input name="lineId" class="field-input">
            <label class="field-label">LINE 連結</label>
            <input name="lineLink" class="field-input" placeholder="https://line.me/...">
            <button type="submit" class="btn-ai onboard-btn">送出並完成認領</button>
          </form>
          <button type="button" class="btn-text" data-back>${escHtml(t('onboard_back'))}</button>
        </div>
      </div>
    </div>
  `;
}

function setMode(next) {
  mode = next;
  const panels = {
    choose: 'onboard-choose',
    bind: 'onboard-bind',
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
  if (msg.includes('ALREADY_CLAIMED')) return t('onboard_err_claimed');
  if (msg.includes('USE_BIND_EXISTING')) return t('onboard_err_use_bind');
  return msg || '操作失敗';
}

function bindEvents(container, onComplete) {
  container.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });
  container.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => setMode('choose'));
  });

  bindProfileTemplatePanel(container, '#register-form');

  const searchInput = container.querySelector('#bind-search');
  let searchTimer;
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => runBindSearch(searchInput.value, onComplete), 300);
  });

  container.querySelector('#register-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const branch = String(fd.get('branch') || '').trim();
    if (isAteamBranch(branch)) {
      showToast(t('onboard_err_use_bind'));
      return;
    }
    try {
      await registerNewMember({
        name: fd.get('name'),
        branch,
        region: 'guest',
        profession: fd.get('profession'),
        have: fd.get('have'),
        wantMeet: fd.get('wantMeet'),
        wantReferral: fd.get('wantReferral'),
        lineId: fd.get('lineId'),
        lineLink: fd.get('lineLink'),
      });
      showToast('認領成功！');
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
      box.innerHTML = `<div class="bind-empty">${escHtml(t('onboard_bind_empty'))}</div>`;
      return;
    }
    box.innerHTML = rows.map(r => {
      const m = mapDbMember(r);
      return `
        <button type="button" class="bind-item" data-id="${escHtml(m.dbId)}">
          <div class="bind-name">${escHtml(m.name)}</div>
          <div class="bind-meta">${escHtml(m.branch)} · ${escHtml(m.profession || '—')}</div>
        </button>`;
    }).join('');
    box.querySelectorAll('.bind-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await bindExistingMember(btn.dataset.id);
          showToast('綁定成功！');
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

export function renderLoginGate(container) {
  container.innerHTML = `
    <div class="onboard-wrap login-gate-wrap">
      <header class="login-hero">
        <div class="login-hero-eyebrow">BNI · ANDERSON TEAM · 2026 年會</div>
        <h1 class="login-hero-title serif hero-title-shimmer">請先 Google 登入</h1>
        <p class="login-hero-sub">A Team 商務連結系統</p>
      </header>
      <div class="onboard-card login-card">
        <div class="onboard-steps-hint" aria-label="使用步驟">
          <span class="onboard-step-pill active">① Google 登入</span>
          <span class="onboard-step-pill">② 認領身分</span>
          <span class="onboard-step-pill">③ 新手教學＋填寫資料</span>
        </div>
        <p class="onboard-sub login-lead">掃描進入後需登入，才能認領／綁定會員身分並使用媒合功能。</p>
        <button type="button" id="google-login-btn" class="btn-google">
          ${GOOGLE_ICON_SVG}
          <span class="btn-google-label">使用 Google 帳號登入</span>
        </button>
        <p class="onboard-foot">${escHtml(t('login_foot'))}</p>
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
