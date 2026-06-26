import { escHtml } from '../utils/html.js';
import {
  searchEventChapters,
  ATEAM_ROSTER_NAMES,
  chapterFullName,
} from '../data/eventChapters.js';
import {
  ensureAuthSession,
  getCurrentUser,
} from '../services/auth.js';
import { showToast } from '../utils/toast.js';
import { t } from '../i18n/translations.js';
import { isInAppBrowser } from '../utils/inAppBrowser.js';
import { inAppBrowserGateHTML, bindInAppBrowserGate } from '../components/InAppBrowserGate.js';
import { startGuestTrial } from '../utils/guestTrial.js';
import {
  claimByNameBranch,
  isValidChineseName,
  loadPendingClaim,
  clearPendingClaim,
} from '../utils/memberClaim.js';
import { collect800HTML, bindCollect800Game, getCollect800Stats } from '../components/Collect800Game.js';

function memberCountLine() {
  const { registered, goal } = getCollect800Stats();
  return `<p class="login-member-count">${escHtml(t('login_member_count_prefix'))}<strong>${registered}</strong>${escHtml(t('login_member_count_suffix'))} · ${escHtml(t('collect800_goal_hint'))} ${goal}</p>`;
}

function ateamQuickChipsHTML(selectedBranch) {
  return ATEAM_ROSTER_NAMES.map(short => {
    const full = chapterFullName(short);
    const active = full === selectedBranch ? ' active' : '';
    return `<button type="button" class="quick-filter-chip branch ateam-roster${active}" data-branch="${escHtml(full)}">${escHtml(short)}</button>`;
  }).join('');
}

function simpleClaimFormHTML({ branch = '', name = '' } = {}) {
  return `
    <form id="simple-claim-form" class="simple-claim-form">
      <label class="field-label" for="claim-branch-input">${escHtml(t('onboard_chapter_search_lbl'))}</label>
      <input id="claim-branch-input" class="field-input" value="${escHtml(branch)}"
        placeholder="${escHtml(t('onboard_chapter_search_ph'))}" autocomplete="off" required>
      <div id="claim-branch-results" class="chapter-search-results hidden"></div>
      <div class="simple-claim-ateam">
        <div class="simple-claim-ateam-label">${escHtml(t('onboard_ateam_quick'))}</div>
        <div class="quick-filter-scroll simple-claim-chips" role="list">${ateamQuickChipsHTML(branch)}</div>
      </div>
      <input type="hidden" id="claim-branch-value" name="branch" value="${escHtml(branch)}">

      <label class="field-label" for="claim-name-input">${escHtml(t('onboard_name_lbl'))}</label>
      <input id="claim-name-input" name="name" class="field-input" value="${escHtml(name)}"
        required maxlength="20" autocomplete="name"
        placeholder="${escHtml(t('onboard_name_ph_full'))}">

      <button type="submit" class="btn-ai onboard-btn" id="claim-submit-btn">${escHtml(t('onboard_submit'))}</button>
      <p class="field-hint onboard-profile-later">${escHtml(t('onboard_profile_later'))}</p>
    </form>`;
}

export function mapAuthError(err) {
  const msg = err?.message || '';
  if (err?.message === 'INVALID_NAME') return t('onboard_err_name');
  if (err?.message === 'INVALID_BRANCH') return t('onboard_pick_branch_first');
  if (/jwt expired|invalid jwt|token expired|unauthorized|invalid token|not authenticated/i.test(msg)) {
    return t('onboard_err_session');
  }
  if (msg.includes('ALREADY_BOUND')) return t('onboard_err_already_device');
  if (msg.includes('REGISTER_RPC_MISSING') || /could not find the function.*bni_register/i.test(msg)) {
    return t('onboard_err_register_rpc');
  }
  if (msg === 'AUTH_NETWORK') return t('onboard_err_network');
  return msg || '操作失敗';
}

function readClaimForm(container) {
  const branch = container.querySelector('#claim-branch-value')?.value?.trim()
    || container.querySelector('#claim-branch-input')?.value?.trim()
    || '';
  const name = container.querySelector('#claim-name-input')?.value?.trim() || '';
  return { branch, name };
}

function validateClaimForm({ branch, name }) {
  if (!branch) {
    showToast(t('onboard_pick_branch_first'));
    return false;
  }
  if (!isValidChineseName(name)) {
    showToast(t('onboard_err_name'));
    return false;
  }
  return true;
}

function bindBranchSearch(container) {
  const input = container.querySelector('#claim-branch-input');
  const hidden = container.querySelector('#claim-branch-value');
  const box = container.querySelector('#claim-branch-results');
  let timer;

  const selectBranch = (full) => {
    if (input) input.value = full;
    if (hidden) hidden.value = full;
    box?.classList.add('hidden');
    container.querySelectorAll('.simple-claim-chips .quick-filter-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.branch === full);
    });
  };

  input?.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = input.value.trim();
      if (hidden) hidden.value = q;
      if (!box) return;
      if (q.length < 1) {
        box.classList.add('hidden');
        box.innerHTML = '';
        return;
      }
      const hits = searchEventChapters(q, 20);
      if (!hits.length) {
        box.classList.remove('hidden');
        box.innerHTML = `<div class="bind-empty">${escHtml(t('onboard_search_empty'))}</div>`;
        return;
      }
      box.classList.remove('hidden');
      box.innerHTML = hits.map(h => `
        <button type="button" class="bind-item chapter-search-hit" data-region-id="${escHtml(h.regionId)}" data-branch="${escHtml(h.fullName)}">
          <div class="bind-name">${escHtml(h.fullName)}</div>
        </button>`).join('');
      box.querySelectorAll('.chapter-search-hit').forEach(btn => {
        btn.addEventListener('click', () => selectBranch(btn.dataset.branch));
      });
    }, 180);
  });

  container.querySelectorAll('.simple-claim-chips [data-branch]').forEach(chip => {
    chip.addEventListener('click', () => selectBranch(chip.dataset.branch));
  });

  return { selectBranch };
}

async function submitClaim(container, { onComplete }) {
  const payload = readClaimForm(container);
  if (!validateClaimForm(payload)) return;

  const btn = container.querySelector('#claim-submit-btn');
  if (btn) btn.disabled = true;
  try {
    if (!(await ensureAuthSession())) {
      showToast(t('onboard_err_session'));
      return;
    }
    const result = await claimByNameBranch(payload);
    clearPendingClaim();
    if (result?.matched) {
      showToast(result.from_roster ? t('claim_matched_roster') : t('claim_matched_new'));
    }
    onComplete?.();
  } catch (err) {
    showToast(mapAuthError(err));
  } finally {
    if (btn) btn.disabled = false;
  }
}

function bindSimpleClaimForm(container, { onComplete } = {}) {
  bindBranchSearch(container);
  container.querySelector('#simple-claim-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    await submitClaim(container, { onComplete });
  });
}

function renderClaimScreen(container, {
  titleKey,
  subKey,
  showGuestTrial = false,
  onComplete,
  onGuestTrial,
} = {}) {
  const pending = loadPendingClaim();
  container.innerHTML = `
    <div class="onboard-wrap onboard-flow-wrap">
      <header class="login-hero login-hero-compact">
        <h1 class="login-hero-title serif">${escHtml(t(titleKey || 'onboard_title'))}</h1>
        <p class="login-hero-sub">${escHtml(t(subKey || 'onboard_simple_sub'))}</p>
      </header>
      <div class="onboard-card">
        ${memberCountLine()}
        ${collect800HTML()}
        ${isInAppBrowser() ? inAppBrowserGateHTML() : simpleClaimFormHTML({
          branch: pending?.branch || '',
          name: pending?.name || '',
        })}
        ${showGuestTrial ? `
        <button type="button" id="guest-trial-btn" class="btn-text login-guest-link">
          ${escHtml(t('login_guest_trial_btn'))}
        </button>` : ''}
      </div>
    </div>`;

  if (isInAppBrowser()) {
    bindInAppBrowserGate(container);
    return;
  }

  bindSimpleClaimForm(container, { onComplete });
  bindCollect800Game(container);

  document.getElementById('guest-trial-btn')?.addEventListener('click', () => {
    startGuestTrial();
    onGuestTrial?.();
  });
}

export async function tryPendingClaim() {
  const pending = loadPendingClaim();
  if (!pending || !getCurrentUser()) return false;
  try {
    if (!(await ensureAuthSession())) return false;
    await claimByNameBranch(pending);
    clearPendingClaim();
    return true;
  } catch (e) {
    console.warn('pending claim:', e.message);
    return false;
  }
}

export function renderOnboard(container, { onComplete }) {
  renderClaimScreen(container, {
    titleKey: 'onboard_title',
    subKey: 'onboard_simple_sub',
    onComplete,
  });
}

export function renderLoginGate(container, { onGuestTrial, onComplete } = {}) {
  renderClaimScreen(container, {
    titleKey: 'hero_title',
    subKey: 'login_sub',
    showGuestTrial: true,
    onComplete,
    onGuestTrial,
  });
}
