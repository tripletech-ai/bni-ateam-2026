import { escHtml } from '../utils/html.js';
import { getMyStatus, signOut, selfUnbind } from '../services/auth.js';
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

  el.classList.remove('hidden');
  el.innerHTML = `
    <div class="user-bar-inner user-bar-compact">
      <button type="button" class="user-bar-main" id="user-bar-profile-link" aria-label="${escHtml(t('profile_short'))}">
        <div class="user-bar-avatar" aria-hidden="true">${escHtml(initial)}</div>
        <div class="user-bar-text">
          <div class="user-bar-greeting">${escHtml(member.name)}</div>
          <div class="user-bar-meta">${escHtml(member.branch)}</div>
        </div>
      </button>
      <div class="user-bar-actions">
        ${profileNeedsEnrichment(member)
          ? `<button type="button" class="user-bar-edit user-bar-edit-warn" id="user-profile-btn">${escHtml(t('profile_enrich_btn'))}</button>`
          : `<button type="button" class="user-bar-edit" id="user-profile-btn">${escHtml(t('profile_short'))}</button>`}
        <button type="button" class="user-bar-menu-btn" id="user-menu-btn" aria-label="${escHtml(t('account_section_title'))}" aria-haspopup="true">⋯</button>
      </div>
    </div>
    <div class="user-bar-menu hidden" id="user-bar-menu" role="menu">
      <button type="button" role="menuitem" id="user-menu-profile">${escHtml(t('profile_short'))}</button>
      <button type="button" role="menuitem" id="user-menu-reclaim">${escHtml(t('user_bar_reclaim'))}</button>
      <button type="button" role="menuitem" id="user-menu-signout">${escHtml(t('user_bar_signout'))}</button>
    </div>
  `;

  const goProfile = () => { location.hash = 'profile'; };
  el.querySelector('#user-bar-profile-link')?.addEventListener('click', goProfile);
  el.querySelector('#user-profile-btn')?.addEventListener('click', goProfile);
  el.querySelector('#user-menu-profile')?.addEventListener('click', () => {
    el.querySelector('#user-bar-menu')?.classList.add('hidden');
    goProfile();
  });

  const menuBtn = el.querySelector('#user-menu-btn');
  const menu = el.querySelector('#user-bar-menu');
  menuBtn?.addEventListener('click', e => {
    e.stopPropagation();
    menu?.classList.toggle('hidden');
  });
  menu?.addEventListener('click', e => e.stopPropagation());

  el.querySelector('#user-menu-reclaim')?.addEventListener('click', async () => {
    menu?.classList.add('hidden');
    if (!window.confirm(t('reclaim_confirm_detail'))) return;
    try {
      await selfUnbind();
      showToast(t('reclaim_ok'));
      location.hash = '';
      location.reload();
    } catch (e) {
      showToast(e.message || t('reclaim_fail'));
    }
  });

  el.querySelector('#user-menu-signout')?.addEventListener('click', async () => {
    menu?.classList.add('hidden');
    if (!window.confirm(t('signout_confirm'))) return;
    try {
      await signOut();
      location.hash = '';
      location.reload();
    } catch (e) {
      showToast(e.message || '登出失敗');
    }
  });
}
