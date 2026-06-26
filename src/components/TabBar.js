import { getOneMarkCount } from '../utils/storage.js';
import { getIncomingUnseenCount } from '../utils/incomingMarks.js';
import { goToPage } from '../utils/nav.js';
import { escHtml } from '../utils/html.js';
import { profileBackendEmpty } from '../utils/profileHints.js';
import { getMyStatus, isBound } from '../services/auth.js';
import { t } from '../i18n/translations.js';

export function renderTabBar(el, currentHash, opts = {}) {
  if (!el) return;
  const bound = opts.isBound !== undefined ? opts.isBound : isBound();
  const oneMarkCount = getOneMarkCount();
  const incomingUnseen = getIncomingUnseenCount();
  const marksBadgeCount = incomingUnseen > 0 ? incomingUnseen : oneMarkCount;
  const profileNeedsFill = bound && profileBackendEmpty(getMyStatus()?.member);
  const TABS = [
    { hash: '#home',    label: t('tab_home'),    icon: homeIcon()   },
    { hash: '#search',  label: t('tab_search'),  icon: searchIcon() },
    { hash: '#marks',   label: t('tab_marks'),   icon: marksTabIcon() },
    { hash: '#live',    label: t('tab_live'),    icon: liveIcon()   },
  ];
  if (bound) {
    TABS.splice(3, 0, {
      hash: '#profile',
      label: t('tab_profile'),
      icon: profileIcon(),
      warn: profileNeedsFill,
    });
  }
  el.innerHTML = TABS.map(tab => {
    const isMarks  = tab.hash === '#marks';
    const isActive = currentHash === tab.hash ||
      (currentHash === '#result' && tab.hash === '#marks') ||
      (currentHash === '' && tab.hash === '#home');
    const badgeLabel = incomingUnseen > 0
      ? t('tab_badge_incoming', { n: incomingUnseen })
      : t('tab_badge_marks', { n: oneMarkCount });
    const badgeText = incomingUnseen > 0
      ? t('tab_badge_incoming_short', { n: incomingUnseen })
      : t('tab_badge_marks_short', { n: oneMarkCount });
    const badge = isMarks && marksBadgeCount > 0
      ? `<span class="tab-badge${incomingUnseen > 0 ? ' tab-badge-incoming tab-badge-pill' : ' tab-badge-pill'}" title="${escHtml(badgeLabel)}" aria-label="${escHtml(badgeLabel)}">${escHtml(badgeText)}</span>` : '';
    const warnDot = tab.warn
      ? `<span class="tab-warn-dot" aria-hidden="true"></span>` : '';
    return `<button
      type="button"
      class="tab-item${isActive ? ' active' : ''}${tab.warn ? ' tab-item-warn' : ''}"
      data-tab-hash="${tab.hash.slice(1)}"
      aria-label="${escHtml(tab.label)}${tab.warn ? escHtml(t('tab_warn_profile')) : ''}"
      aria-selected="${isActive}"
      role="tab">
      <span style="position:relative;display:inline-flex">${tab.icon}${badge}${warnDot}</span>
      <span>${tab.label}</span>
    </button>`;
  }).join('');

  el.querySelectorAll('.tab-item[data-tab-hash]').forEach(btn => {
    btn.addEventListener('click', () => {
      goToPage(btn.dataset.tabHash || 'home');
    });
  });
}

function homeIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
}
function searchIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
}
function marksTabIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
}
function liveIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;
}
function profileIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
}
