import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { leaderboardHTML, leaderboardModeTabsHTML } from './Leaderboard.js';
import { fetchLeaderboard, fetchLiveSettings } from '../services/auth.js';
import { goToPage } from '../utils/nav.js';

let homeLbMode = 'mutual';
let homeLbModes = ['mutual', 'received_one'];

function resolveModes(settings) {
  const modes = settings?.leaderboard_modes;
  if (Array.isArray(modes) && modes.length) {
    return modes.filter(m => m === 'mutual' || m === 'received_one');
  }
  return ['mutual', 'received_one'];
}

function listHTML() {
  const boards = window.BNI_LEADERBOARDS || {};
  const rows = boards[homeLbMode] || [];
  return leaderboardHTML(rows, { compact: true, limit: 5, mode: homeLbMode });
}

export function homeLeaderboardHTML() {
  return `
    <section class="home-leaderboard-section" aria-label="${escHtml(t('lb_title'))}">
      <div class="section-header">
        <div class="section-title">${escHtml(t('lb_title'))}</div>
        <p class="section-sub home-lb-sub">${escHtml(t('lb_sub'))}</p>
      </div>
      ${leaderboardModeTabsHTML(homeLbModes, homeLbMode)}
      <div id="home-leaderboard-list">${listHTML()}</div>
      <button type="button" class="btn-ai home-lb-more" id="home-lb-more">${escHtml(t('lb_view_all'))}</button>
    </section>`;
}

async function refreshHomeLeaderboardList(container) {
  const listEl = container.querySelector('#home-leaderboard-list');
  if (!listEl) return;
  try {
    if (!window.BNI_LEADERBOARDS?.[homeLbMode]?.length) {
      const settings = await fetchLiveSettings();
      homeLbModes = resolveModes(settings);
      window.BNI_LIVE_SETTINGS = settings;
      if (!homeLbModes.includes(homeLbMode)) homeLbMode = homeLbModes[0] || 'mutual';
      const boards = await Promise.all(
        homeLbModes.map(mode => fetchLeaderboard(30, mode).then(rows => ({ mode, rows }))),
      );
      window.BNI_LEADERBOARDS = {};
      boards.forEach(({ mode, rows }) => { window.BNI_LEADERBOARDS[mode] = rows; });
      const tabs = container.querySelector('.lb-mode-tabs');
      if (tabs) {
        tabs.outerHTML = leaderboardModeTabsHTML(homeLbModes, homeLbMode);
        bindHomeLbModeTabs(container);
      }
    }
    listEl.innerHTML = listHTML();
  } catch (e) {
    console.warn('home leaderboard:', e.message);
  }
}

function bindHomeLbModeTabs(container) {
  container.querySelectorAll('.home-leaderboard-section .lb-mode-tab').forEach(btn => {
    btn.addEventListener('click', async () => {
      const mode = btn.dataset.lbMode;
      if (!mode || mode === homeLbMode || !homeLbModes.includes(mode)) return;
      homeLbMode = mode;
      container.querySelectorAll('.home-leaderboard-section .lb-mode-tab').forEach(b => {
        const on = b.dataset.lbMode === homeLbMode;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      const listEl = container.querySelector('#home-leaderboard-list');
      if (listEl) listEl.innerHTML = listHTML();
      if (!window.BNI_LEADERBOARDS?.[homeLbMode]?.length) {
        try {
          const rows = await fetchLeaderboard(30, homeLbMode);
          if (!window.BNI_LEADERBOARDS) window.BNI_LEADERBOARDS = {};
          window.BNI_LEADERBOARDS[homeLbMode] = rows;
          if (listEl) listEl.innerHTML = listHTML();
        } catch (e) {
          console.warn('home lb mode:', e.message);
        }
      }
    });
  });
}

export function bindHomeLeaderboard(container) {
  if (!container?.querySelector('.home-leaderboard-section')) return;

  container.querySelector('#home-lb-more')?.addEventListener('click', () => {
    try { sessionStorage.setItem('bni_live_tab', 'leaderboard'); } catch { /* ignore */ }
    goToPage('live');
  });

  bindHomeLbModeTabs(container);
  refreshHomeLeaderboardList(container);
}
