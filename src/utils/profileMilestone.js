import { t } from '../i18n/translations.js';
import { showToast } from './toast.js';

const STORAGE_KEY = 'bni_profile_milestone_seen';
const STEP = 50;

/** 已登入且填寫基本媒合資料（產業 + 內容） */
export function countFilledProfiles(members) {
  return (members || []).filter(m => {
    if (!m.authUserId) return false;
    const prof = (m.profession || '').trim();
    const hasInd = Array.isArray(m.industries) && m.industries.length > 0;
    const hasContent = Boolean(
      (m.have || '').trim() ||
      (m.bio || '').trim() ||
      (m.wantMeet || '').trim() ||
      (m.wantReferral || '').trim(),
    );
    return prof && hasInd && hasContent;
  }).length;
}

/** 回傳剛跨過、尚未提醒的 50 的倍數里程碑；null = 無新里程碑 */
export function checkProfileMilestone(members) {
  const filled = countFilledProfiles(members);
  const milestone = Math.floor(filled / STEP) * STEP;
  if (milestone < STEP) return null;

  let seen = 0;
  try { seen = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10); } catch { /* ignore */ }
  if (milestone <= seen) return null;

  try { localStorage.setItem(STORAGE_KEY, String(milestone)); } catch { /* ignore */ }
  return { milestone, filled };
}

export function profileMilestoneBannerHTML({ milestone, filled }) {
  const n = milestone || filled;
  return `
    <aside class="profile-milestone-banner" role="status" aria-live="polite">
      <div class="profile-milestone-inner">
        <div class="profile-milestone-icon" aria-hidden="true">🎉</div>
        <div class="profile-milestone-text">
          <div class="profile-milestone-title">${t('profile_milestone_title', { n })}</div>
          <p class="profile-milestone-sub">${t('profile_milestone_sub', { n })}</p>
        </div>
        <button type="button" class="profile-milestone-search btn-ai">${t('profile_milestone_cta')}</button>
      </div>
    </aside>`;
}

export function bindProfileMilestoneBanner(container) {
  container?.querySelector('.profile-milestone-search')?.addEventListener('click', () => {
    location.hash = '#search';
  });
  container?.querySelector('.profile-milestone-banner')?.addEventListener('click', e => {
    if (e.target.closest('.profile-milestone-search')) return;
    e.currentTarget?.remove();
  });
}

export function notifyProfileMilestone(members) {
  const hit = checkProfileMilestone(members);
  if (!hit) return null;
  showToast(t('profile_milestone_toast', { n: hit.milestone }));
  return hit;
}
