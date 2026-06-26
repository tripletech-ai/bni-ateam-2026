import { normalizeBranchName } from '../data/branches.js';

/** 與後台 bni_member_profile_filled 一致：有 profession 且至少一項業務欄位 */
export function memberProfileFilled(m) {
  const prof = String(m?.profession || '').trim();
  if (!prof) return false;
  return ['have', 'wantMeet', 'wantReferral', 'bio'].some(k => String(m?.[k] || '').trim());
}

export function getBranchMembers(branch, { filledOnly = false } = {}) {
  const norm = normalizeBranchName(branch);
  if (!norm) return [];
  return (window.BNI_MEMBERS || [])
    .filter(m => normalizeBranchName(m.branch) === norm)
    .filter(m => !filledOnly || memberProfileFilled(m))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
}

export function branchHasPickableRoster(branch) {
  return getBranchMembers(branch, { filledOnly: true }).length > 0;
}
