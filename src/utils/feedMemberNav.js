import { normalizeBranchName } from '../data/branches.js';
import { normalizeChineseName } from './memberClaim.js';
import { goToPage } from './nav.js';

export function findMemberByNameBranch(name, branch) {
  const n = normalizeChineseName(name);
  const b = normalizeBranchName(branch || '');
  if (!n || !b) return null;
  return (window.BNI_MEMBERS || []).find(m =>
    normalizeChineseName(m.name) === n && normalizeBranchName(m.branch) === b,
  ) || null;
}

export function resolveFeedMember(item) {
  const name = item?.actor_name || '';
  const branch = item?.actor_branch || item?.meta?.branch || '';
  return { name, branch };
}

/** 聊天室／動態牆 → 找人脈頁顯示該夥伴名片 */
export function openMemberProfile(name, branch) {
  if (!name?.trim() || !branch?.trim()) return false;
  sessionStorage.setItem('bni_pending_member', JSON.stringify({
    name: name.trim(),
    branch: branch.trim(),
  }));
  goToPage('search');
  return true;
}
