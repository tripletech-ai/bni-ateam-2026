import { escHtml, escAttr } from '../utils/html.js';
import { t } from '../i18n/translations.js';

export function searchInviteBannerHTML() {
  const joinUrl = `${window.location.origin}${window.location.pathname}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=8&data=${encodeURIComponent(joinUrl)}`;

  return `
    <section class="search-invite-banner" aria-label="${escHtml(t('search_invite_title'))}">
      <div class="search-invite-copy">
        <div class="search-invite-title">${escHtml(t('search_invite_title'))}</div>
        <p class="search-invite-sub">${escHtml(t('search_invite_sub'))}</p>
        <button type="button" class="btn-outline search-invite-copy-btn" data-join-url="${escAttr(joinUrl)}">
          ${escHtml(t('search_invite_copy'))}
        </button>
      </div>
      <div class="search-invite-qr">
        <img src="${qrSrc}" width="112" height="112" alt="${escHtml(t('search_invite_qr_alt'))}" loading="lazy">
      </div>
    </section>`;
}

export function bindSearchInviteBanner(container) {
  container?.querySelector('.search-invite-copy-btn')?.addEventListener('click', async (e) => {
    const url = e.currentTarget.dataset.joinUrl;
    try {
      await navigator.clipboard.writeText(url);
      const { showToast } = await import('../utils/toast.js');
      showToast(t('search_invite_copied'));
    } catch {
      const { showToast } = await import('../utils/toast.js');
      showToast(url);
    }
  });
}
