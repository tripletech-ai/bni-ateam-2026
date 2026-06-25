import { escHtml } from '../utils/html.js';
import { BRANCHES } from '../data/branches.js';
import { referralPlaceholder } from '../utils/profileHints.js';
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
        <h1 class="login-hero-title serif">會員認領</h1>
      </header>
      <div class="onboard-card">
        <div class="onboard-steps-hint">
          <span class="onboard-step-pill done">① Google 登入</span>
          <span class="onboard-step-pill active">② 認領身分</span>
          <span class="onboard-step-pill">③ 新手教學</span>
        </div>
        <h2 class="onboard-title serif">歡迎加入商務連結</h2>
        <p class="onboard-sub">已登入：<strong>${escHtml(email)}</strong></p>
        <p class="onboard-hint">請選擇：若你已在名單上請「綁定舊會員」；若不在名單請「認領新會員」填寫資料。</p>

        <div id="onboard-choose" class="onboard-panel" ${mode !== 'choose' ? 'hidden' : ''}>
          <button type="button" class="btn-ai onboard-btn" data-mode="bind">我在名單上 · 綁定舊會員</button>
          <button type="button" class="btn-outline onboard-btn" data-mode="register">我不在名單 · 認領新會員</button>
        </div>

        <div id="onboard-bind" class="onboard-panel" ${mode !== 'bind' ? 'hidden' : ''}>
          <label class="field-label">搜尋你的名字或分會</label>
          <input id="bind-search" class="field-input" placeholder="例如：王銓、長輝分會" autocomplete="name">
          <div id="bind-results" class="bind-results"></div>
          <button type="button" class="btn-text" data-back>← 返回選擇</button>
        </div>

        <div id="onboard-register" class="onboard-panel" ${mode !== 'register' ? 'hidden' : ''}>
          <form id="register-form" class="register-form">
            <label class="field-label">姓名 *</label>
            <input name="name" class="field-input" required maxlength="50">
            <label class="field-label">分會 *</label>
            <select name="branch" class="field-input" required>
              ${branchOptions()}
            </select>
            <label class="field-label">${escHtml(t('profile_profession_label'))} *</label>
            <p class="field-hint">${escHtml(t('profile_profession_hint'))}</p>
            <input name="profession" class="field-input" maxlength="120" required
              placeholder="${escHtml(t('profile_profession_ph'))}">
            <label class="field-label">${escHtml(t('card_have'))}</label>
            <p class="field-hint">${escHtml(t('profile_have_hint'))}</p>
            <textarea name="have" class="field-input" rows="2"></textarea>
            <label class="field-label">${escHtml(t('card_want'))}</label>
            <p class="field-hint">${escHtml(t('profile_want_hint'))}</p>
            <textarea name="wantMeet" class="field-input" rows="2"></textarea>
            <label class="field-label">${escHtml(t('profile_referral_label'))}</label>
            <p class="field-hint">${escHtml(t('profile_referral_hint'))}</p>
            <textarea name="wantReferral" class="field-input" rows="4"
              placeholder="${escHtml(referralPlaceholder())}"></textarea>
            <label class="field-label">LINE ID</label>
            <input name="lineId" class="field-input">
            <label class="field-label">LINE 連結</label>
            <input name="lineLink" class="field-input" placeholder="https://line.me/...">
            <button type="submit" class="btn-ai onboard-btn">送出並完成認領</button>
          </form>
          <button type="button" class="btn-text" data-back>← 返回選擇</button>
        </div>
      </div>
    </div>
  `;
}

function branchOptions() {
  const names = new Set();
  BRANCHES.zhongshan.forEach(b => names.add(`${b.name}分會`));
  BRANCHES.sanlu.forEach(b => names.add(`${b.name}分會`));
  return [...names].sort((a, b) => a.localeCompare(b, 'zh-TW'))
    .map(n => `<option value="${escHtml(n)}">${escHtml(n)}</option>`).join('');
}

function setMode(next) {
  mode = next;
  document.getElementById('onboard-choose').classList.toggle('hidden', mode !== 'choose');
  document.getElementById('onboard-bind').classList.toggle('hidden', mode !== 'bind');
  document.getElementById('onboard-register').classList.toggle('hidden', mode !== 'register');
}

function bindEvents(container, onComplete) {
  container.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });
  container.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => setMode('choose'));
  });

  const searchInput = container.querySelector('#bind-search');
  let searchTimer;
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => runBindSearch(searchInput.value, onComplete), 300);
  });

  container.querySelector('#register-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const branch = fd.get('branch');
    const region = branch.includes('金') && !branch.includes('中山') ? 'sanlu' : 'zhongshan';
    try {
      await registerNewMember({
        name: fd.get('name'),
        branch,
        region,
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
      showToast(err.message || '認領失敗');
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
      box.innerHTML = '<div class="bind-empty">找不到未綁定的會員，可改選「認領新會員」</div>';
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
          const msg = err.message || '';
          if (msg.includes('ALREADY_CLAIMED')) showToast('此人已被其他人認領');
          else showToast(msg || '綁定失敗');
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
          <span class="onboard-step-pill">③ 新手教學</span>
        </div>
        <p class="onboard-sub login-lead">掃描進入後需登入，才能認領／綁定會員身分並使用媒合功能。</p>
        <button type="button" id="google-login-btn" class="btn-google">
          ${GOOGLE_ICON_SVG}
          <span class="btn-google-label">使用 Google 帳號登入</span>
        </button>
        <p class="onboard-foot">登入後可綁定名單上的舊會員，或填寫資料認領新會員。</p>
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
