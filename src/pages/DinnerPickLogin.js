import { escHtml, escAttr } from '../utils/html.js';
import {
  CHANGHUI_DINNER_MEMBERS,
  CHANGHUI_DINNER_GUESTS,
  findDinnerPersonById,
} from '../data/changhuiDinner.js';
import { saveDinnerIdentity } from '../utils/dinnerSession.js';
import { ensureAuthSession, refreshStatus, applyDinnerBoundStatus, registerNewMember } from '../services/auth.js';
import { claimByNameBranch } from '../utils/memberClaim.js';
import { showToast } from '../utils/toast.js';
import { showConfirmDialog } from '../utils/confirmDialog.js';

function personCardHTML(p) {
  const badge = p.type === 'member' ? '會員' : '來賓';
  const sub = p.type === 'member'
    ? (p.profession || '長輝白金分會')
    : [p.profession, p.invitedBy ? `邀約：${p.invitedBy}` : '', p.joinIntent ? `意願：${p.joinIntent}` : '']
      .filter(Boolean).join(' · ');
  return `
    <button type="button" class="dinner-person-card" data-person-id="${escAttr(p.id)}">
      <span class="dinner-person-badge dinner-person-badge-${p.type}">${escHtml(badge)}</span>
      <span class="dinner-person-name">${escHtml(p.name)}</span>
      <span class="dinner-person-sub">${escHtml(sub)}</span>
    </button>`;
}

function listHTML(people) {
  if (!people.length) {
    return `<p class="dinner-pick-empty">找不到符合的名字，請換關鍵字</p>`;
  }
  return `<div class="dinner-person-grid">${people.map(personCardHTML).join('')}</div>`;
}

/**
 * 選人入場（確認本人）
 * @param {HTMLElement} container
 * @param {{ onComplete: () => void, onBack?: () => void }} opts
 */
export function renderDinnerPickLogin(container, { onComplete, onBack } = {}) {
  let tab = 'member';
  let query = '';

  const paint = () => {
    const q = query.trim().toLowerCase();
    const filter = (list) => list.filter(p => {
      if (!q) return true;
      const blob = `${p.name} ${p.profession} ${p.invitedBy}`.toLowerCase();
      return blob.includes(q) || p.name.includes(query.trim());
    });
    const members = filter(CHANGHUI_DINNER_MEMBERS);
    const guests = filter(CHANGHUI_DINNER_GUESTS);
    const list = tab === 'member' ? members : guests;

    container.className = 'page-root dinner-pick-page';
    container.innerHTML = `
      <div class="dinner-pick-wrap">
        <header class="dinner-pick-head">
          <button type="button" class="btn-text dinner-pick-back" id="dinner-pick-back">← 活動資訊</button>
          <h1 class="dinner-pick-title serif">選擇你的名字</h1>
          <p class="dinner-pick-sub">點選後會再請你確認「我是本人」</p>
        </header>

        <div class="dinner-pick-tabs" role="tablist">
          <button type="button" class="dinner-pick-tab${tab === 'member' ? ' active' : ''}"
            data-tab="member" role="tab" aria-selected="${tab === 'member'}">
            長輝會員（${members.length}）
          </button>
          <button type="button" class="dinner-pick-tab${tab === 'guest' ? ' active' : ''}"
            data-tab="guest" role="tab" aria-selected="${tab === 'guest'}">
            來賓（${guests.length}）
          </button>
        </div>

        <label class="dinner-pick-search-label" for="dinner-pick-search">搜尋姓名</label>
        <input type="search" id="dinner-pick-search" class="field-input dinner-pick-search"
          placeholder="輸入姓名或產業" value="${escAttr(query)}" autocomplete="off">

        <div id="dinner-pick-list" class="dinner-pick-list">${listHTML(list)}</div>
      </div>`;

    container.querySelector('#dinner-pick-back')?.addEventListener('click', () => onBack?.());
    container.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        tab = btn.dataset.tab;
        paint();
      });
    });
    const search = container.querySelector('#dinner-pick-search');
    search?.addEventListener('input', () => {
      query = search.value || '';
      const q2 = query.trim().toLowerCase();
      const filter2 = (arr) => arr.filter(p => {
        if (!q2) return true;
        const blob = `${p.name} ${p.profession} ${p.invitedBy}`.toLowerCase();
        return blob.includes(q2) || p.name.includes(query.trim());
      });
      const next = tab === 'member' ? filter2(CHANGHUI_DINNER_MEMBERS) : filter2(CHANGHUI_DINNER_GUESTS);
      const listEl = container.querySelector('#dinner-pick-list');
      if (listEl) listEl.innerHTML = listHTML(next);
      bindCards();
    });
    search?.focus();
    bindCards();
  };

  const bindCards = () => {
    container.querySelectorAll('[data-person-id]').forEach(btn => {
      btn.addEventListener('click', () => onPick(btn.dataset.personId));
    });
  };

  async function onPick(id) {
    const person = findDinnerPersonById(id);
    if (!person) return;

    const role = person.type === 'member' ? '長輝會員' : '來賓';
    const extra = person.type === 'guest' && person.profession
      ? `\n產業：${person.profession}`
      : (person.profession ? `\n產業：${person.profession}` : '');

    const ok = await showConfirmDialog({
      title: '確認身分',
      message: `你選擇的是【${person.name}】（${role}）${extra}\n\n請確認你是本人再進入。`,
      confirmLabel: '確認，我是本人',
      cancelLabel: '取消',
    });
    if (!ok) return;

    const submitBtn = container.querySelector(`[data-person-id="${id}"]`);
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
    }

    try {
      await ensureAuthSession();
      saveDinnerIdentity(person);
      window.BNI_DINNER_PROFILE = person;

      const claimName = (person.name.replace(/\s+[A-Za-z].*$/, '').trim() || person.name)
        .replace(/\s+/g, '');

      try {
        await claimByNameBranch({
          name: claimName,
          branch: person.branch,
          region: person.region,
        });
      } catch (claimErr) {
        console.warn('dinner claim:', claimErr.message);
        try {
          await registerNewMember({
            name: claimName,
            branch: person.branch,
            region: person.region || (person.type === 'guest' ? 'guest' : 'zhongshan'),
            profession: person.profession || '',
            have: person.have || '',
            wantMeet: person.wantMeet || '',
            tags: person.tags || [],
          });
        } catch (regErr) {
          console.warn('dinner register:', regErr.message);
          await refreshStatus().catch(() => {});
        }
      }

      // 無論 DB 認領是否成功，晚宴身分視為已入場（全功能）
      applyDinnerBoundStatus(person);

      showToast(`歡迎 ${person.name}`);
      onComplete?.();
    } catch (e) {
      console.error(e);
      showToast(e.message || '入場失敗，請再試一次');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
      }
    }
  }

  paint();
}
