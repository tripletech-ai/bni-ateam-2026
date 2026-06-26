import { fetchLeaderboard, fetchLiveSettings } from '../services/auth.js';

export function resolveLbModes(settings) {
  const modes = settings?.leaderboard_modes;
  if (Array.isArray(modes) && modes.length) {
    return modes.filter(m => m === 'mutual' || m === 'received_one');
  }
  return ['mutual', 'received_one'];
}

/** 重新抓取排行榜並更新 window 快取（標記同步後呼叫） */
export async function refreshLeaderboardCache() {
  try {
    const settings = await fetchLiveSettings();
    const modes = resolveLbModes(settings);
    const boards = await Promise.all(modes.map(mode => fetchLeaderboard(30, mode)));
    window.BNI_LEADERBOARDS = {};
    modes.forEach((mode, i) => { window.BNI_LEADERBOARDS[mode] = boards[i] || []; });
    window.BNI_LIVE_SETTINGS = settings;
    window.BNI_LEADERBOARD = window.BNI_LEADERBOARDS.mutual || boards[0] || [];
    window.dispatchEvent(new CustomEvent('bni-leaderboard-updated'));
    return window.BNI_LEADERBOARDS;
  } catch (e) {
    console.warn('refreshLeaderboardCache:', e.message);
    return window.BNI_LEADERBOARDS || {};
  }
}
