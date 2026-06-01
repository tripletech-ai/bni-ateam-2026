import { getMarkCount } from '../utils/storage.js';
import { t }            from '../i18n/translations.js';

export function renderTabBar(el, currentHash) {
  if (!el) return;
  const markCount = getMarkCount();
  const TABS = [
    { hash: '#home',    label: t('tab_home'),    icon: homeIcon()   },
    { hash: '#search',  label: t('tab_search'),  icon: searchIcon() },
    { hash: '#marks',   label: t('tab_marks'),   icon: heartIcon()  },
    { hash: '#result',  label: t('tab_result'),  icon: chartIcon()  },
    { hash: '#leaders', label: t('tab_leaders'), icon: teamIcon()   },
  ];
  el.innerHTML = TABS.map(tab => {
    const isMarks  = tab.hash === '#marks';
    const isActive = currentHash === tab.hash ||
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
function heartIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
}
function chartIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
}
function teamIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
}
