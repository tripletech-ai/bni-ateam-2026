import { escHtml } from '../utils/html.js';
import { getMyStatus, signOut, selfUnbind } from '../services/auth.js';
import { getMarkCount } from '../utils/storage.js';
import { profileNeedsEnrichment } from '../utils/profileHints.js';
import { t } from '../i18n/translations.js';
import { showToast } from '../utils/toast.js';

export function renderUserBar(el) {
  if (!el) return;
  const status = getMyStatus();
  const member = status?.member;
  if (!status?.bound || !member) {
    el.classList.add('hidden');
    el.innerHTML = '';
    return;
  }

  const initial = (member.name || '').match(/[一-鿿㐀-䶿]/g)?.slice(-1)[0] || '?';
  const marks = getMarkCount();

  el.classList.remove('hidden');
  el.innerHTML = `
    <div class="user-bar-inner">
      <div class="user-bar-avatar" aria-hidden="true">${escHtml(initial)}</div>
      <div class="user-bar-text">
        <div class="user-bar-greeting">${escHtml(t('user_bar_hello'))}，${escHtml(member.name)}</div>
        <div class="user-bar-meta">${escHtml(member.branch)} · ${escHtml(member.profession || t('user_bar_member'))}</div>
      </div>
      <div class="user-bar-actions">
        ${profileNeedsEnrichment(member)
          ? `<button type="button" class="user-bar-edit user-bar-edit-warn" id="user-profile-btn">${escHtml(t('profile_enrich_btn'))}</button>`
          : `<button type="button" class="user-bar-edit" id="user-profile-btn">${escHtml(t('profile_short'))}</button>`}
        ${marks > 0 ? `<span class="user-bar-marks" aria-label="${marks} 標記">${marks}</span>` : ''}
        <button type="button" class="user-bar-reclaim" id="user-reclaim-btn">${escHtml(t('user_bar_reclaim'))}</button>
        <button type="button" class="user-bar-signout" id="user-signout-btn" aria-label="${escHtml(t('user_bar_signout'))}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </div>
  `;

  el.querySelector('#user-profile-btn')?.addEventListener('click', () => {
    location.hash = 'profile';
  });

  el.querySelector('#user-reclaim-btn')?.addEventListener('click', async () => {
    if (!window.confirm(t('reclaim_confirm'))) return;
    try {
      await selfUnbind();
      showToast(t('reclaim_ok'));
      location.hash = '';
      location.reload();
    } catch (e) {
      showToast(e.message || t('reclaim_fail'));
    }
  });

  el.querySelector('#user-signout-btn')?.addEventListener('click', async () => {
    try {
      await signOut();
      location.hash = '';
      location.reload();
    } catch (e) {
      showToast(e.message || '登出失敗');
    }
  });
}
