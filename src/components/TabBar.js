import { getMarkCount } from '../utils/storage.js';

const TABS = [
  { hash: '#home',   label: '首頁',    icon: homeIcon()   },
  { hash: '#search', label: '找人脈',  icon: searchIcon() },
  { hash: '#marks',  label: '我的標記', icon: heartIcon()  },
  { hash: '#result', label: '我的成果', icon: chartIcon()  },
  { hash: '#yang',   label: '我的',    icon: personIcon() },
];

export function renderTabBar(el, currentHash) {
  if (!el) return;
  const markCount = getMarkCount();
  el.innerHTML = TABS.map(t => {
    const isMarks = t.hash === '#marks';
    const isActive = currentHash === t.hash ||
      (currentHash === '' && t.hash === '#home');
    const badge = isMarks && markCount > 0
      ? `<span class="tab-badge" aria-label="${markCount} 個標記">${markCount}</span>` : '';
    return `<button
      class="tab-item${isActive ? ' active' : ''}"
      onclick="location.hash='${t.hash.slice(1)}'"
      aria-label="${t.label}"
      aria-selected="${isActive}"
      role="tab">
      <span style="position:relative;display:inline-flex">${t.icon}${badge}</span>
      <span>${t.label}</span>
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
function personIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
}
