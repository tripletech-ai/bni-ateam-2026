import { escHtml } from '../utils/html.js';
import { BRANCHES } from '../data/branches.js';
import {
  signInWithGoogle,
  bindExistingMember,
  registerNewMember,
  getCurrentUser,
  searchUnboundMembers,
} from '../services/auth.js';
import { mapDbMember } from '../services/membersApi.js';
import { showToast } from '../utils/toast.js';

let mode = 'choose'; // choose | bind | register

export function renderOnboard(container, { onComplete }) {
  const user = getCurrentUser();
  container.innerHTML = buildHTML(user);
  bindEvents(container, onComplete);
}

function buildHTML(user) {
  const email = user?.email || '';
  return `
    <div class="onboard-wrap">
      <div class="onboard-card">
        <div class="onboard-eyebrow">BNI A Team · 會員認領</div>
        <div class="onboard-steps-hint">
          <span class="onboard-step-pill done">① Google 登入</span>
          <span class="onboard-step-pill active">② 認領身分</span>
          <span class="onboard-step-pill">③ 新手教學</span>
        </div>
        <h1 class="onboard-title serif">歡迎加入商務連結</h1>
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
            <label class="field-label">產業 / 專業</label>
            <input name="profession" class="field-input" maxlength="120">
            <label class="field-label">我有的資源</label>
            <textarea name="have" class="field-input" rows="2"></textarea>
            <label class="field-label">想認識的對象</label>
            <textarea name="wantMeet" class="field-input" rows="2"></textarea>
            <label class="field-label">想引薦的對象</label>
            <textarea name="wantReferral" class="field-input" rows="2"></textarea>
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

export function renderLoginGate(container) {
  container.innerHTML = `
    <div class="onboard-wrap">
      <div class="onboard-card login-card">
        <div class="onboard-eyebrow">BNI A Team 商務連結系統</div>
        <h1 class="onboard-title serif">請先 Google 登入</h1>
        <p class="onboard-sub">掃描進入後需登入，才能認領／綁定會員身分並使用媒合功能。</p>
        <button type="button" id="google-login-btn" class="btn-google">
          <span class="google-icon" aria-hidden="true">G</span>
          使用 Google 帳號登入
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
