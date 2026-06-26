import { getMarkCount } from '../utils/storage.js';
import { isBound } from '../services/auth.js';
import { t }            from '../i18n/translations.js';

export function renderTabBar(el, currentHash, opts = {}) {
  if (!el) return;
  const markCount = getMarkCount();
  const TABS = [
    { hash: '#home',    label: t('tab_home'),    icon: homeIcon()   },
    { hash: '#search',  label: t('tab_search'),  icon: searchIcon() },
    { hash: '#marks',   label: t('tab_marks'),   icon: marksTabIcon() },
    { hash: '#live',    label: t('tab_live'),    icon: liveIcon()   },
  ];
  if (opts.isBound) {
    TABS.splice(3, 0, { hash: '#profile', label: t('tab_profile'), icon: profileIcon() });
  }
  if (opts.isAdmin) {
    TABS.push({ hash: '#admin', label: t('tab_admin'), icon: adminIcon() });
  }
  el.innerHTML = TABS.map(tab => {
    const isMarks  = tab.hash === '#marks';
    const isActive = currentHash === tab.hash ||
      (currentHash === '#result' && tab.hash === '#marks') ||
      (currentHash === '' && tab.hash === '#home');
    const badge = isMarks && markCount > 0
      ? `<span class="tab-badge" aria-label="${markCount} 個標記">${markCount}</span>` : '';
    return `<button
      class="tab-item${isActive ? ' active' : ''}"
      onclick="location.hash='${tab.hash.slice(1)}'"
      aria-label="${tab.label}"
      aria-selected="${isActive}"
      role="tab">
      <span style="position:relative;display:inline-flex">${tab.icon}${badge}</span>
      <span>${tab.label}</span>
    </button>`;
  }).join('');
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
function heartIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
}
function chartIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
}
function liveIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;
}
function profileIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
}
function teamIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
}
function adminIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>`;
}
