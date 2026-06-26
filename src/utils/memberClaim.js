import { normalizeBranchName, getRegionForBranch } from '../data/branches.js';
import { bindExistingMember, registerNewMember, getClient, refreshStatus, getMyStatus, isBound } from '../services/auth.js';
import { resolveClaimCredentials } from '../config/yangBoss.js';

const PENDING_CLAIM_KEY = 'bni_pending_claim';

/** 比對用：去除空白 */
export function normalizeChineseName(name) {
  return String(name || '').trim().replace(/\s+/g, '');
}

export function isValidChineseName(name) {
  const s = normalizeChineseName(name);
  if (s.length < 2 || s.length > 20) return false;
  return /[一-鿿㐀-䶿]/.test(s);
}

export function findMembersByNameBranch(name, branch) {
  const n = normalizeChineseName(name);
  const norm = normalizeBranchName(branch);
  if (!n || !norm) return [];
  return (window.BNI_MEMBERS || []).filter(m =>
    normalizeChineseName(m.name) === n && normalizeBranchName(m.branch) === norm,
  );
}

export function savePendingClaim({ name, branch, region = '' }) {
  sessionStorage.setItem(PENDING_CLAIM_KEY, JSON.stringify({
    name: normalizeChineseName(name),
    branch: String(branch || '').trim(),
    region: region || '',
  }));
}

export function loadPendingClaim() {
  try {
    const raw = sessionStorage.getItem(PENDING_CLAIM_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.name || !data?.branch) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearPendingClaim() {
  sessionStorage.removeItem(PENDING_CLAIM_KEY);
}

function normalizeRegisterBranch(branch) {
  const s = String(branch || '').trim();
  if (!s || s.startsWith('~') || s.includes('海外') || s.includes('籌備')) return s;
  return normalizeBranchName(s);
}

function regionForBranch(branch, fallbackRegion = '') {
  const r = getRegionForBranch(branch);
  if (r !== 'guest') return r;
  return fallbackRegion || 'guest';
}

function isRpcMissing(err) {
  const msg = err?.message || '';
  return /could not find the function|PGRST202|404/i.test(msg);
}

function isAlreadyBoundError(err) {
  return /ALREADY_BOUND/i.test(err?.message || '');
}

/** 此裝置已綁定且與表單分會／姓名一致 → 可直接視為登入成功 */
export function matchesBoundIdentity({ name, branch }) {
  const member = getMyStatus()?.member;
  if (!member?.name || !member?.branch) return false;
  return normalizeChineseName(member.name) === normalizeChineseName(name)
    && normalizeBranchName(member.branch) === normalizeRegisterBranch(branch);
}

async function resumeIfAlreadyBound(payload, err) {
  if (!isAlreadyBoundError(err)) return null;
  await refreshStatus();
  if (isBound() && matchesBoundIdentity(payload)) {
    return { matched: true, from_roster: true, already_bound: true };
  }
  throw err;
}

/** 後端 RPC：依分會 + 姓名在 DB 精準匹配並認領 */
async function claimViaBackendRpc({ name, branch, region }) {
  const { data, error } = await getClient().database.rpc('bni_claim_by_name_branch', {
    p_name: name,
    p_branch: branch,
    p_region: region || null,
  });
  if (error) throw error;
  await refreshStatus();
  return data;
}

/** 前端 fallback：client 名單比對 + bind / register */
async function claimViaClientMatch({ name, branch, region }) {
  const matches = findMembersByNameBranch(name, branch);
  const withDb = matches.filter(m => m.dbId);

  const unclaimed = withDb.find(m => !m.claimed && !m.authUserId);
  if (unclaimed) {
    return bindExistingMember(unclaimed.dbId);
  }

  if (withDb.length >= 1) {
    const best = withDb.find(m => m.status === 'roster') || withDb[0];
    return bindExistingMember(best.dbId);
  }

  return registerNewMember({
    name,
    branch,
    region: regionForBranch(branch, region),
    profession: '',
    have: '',
    wantMeet: '',
    wantReferral: '',
    industries: [],
  });
}

/** 依分會 + 姓名認領：優先後端 DB 匹配既有名單 */
export async function claimByNameBranch({ name, branch, region = '' }) {
  const resolved = resolveClaimCredentials({ name, branch, region });
  const trimmedName = normalizeChineseName(resolved.name);
  const normBranch = normalizeRegisterBranch(resolved.branch);
  if (!resolved.fromBoss && !isValidChineseName(trimmedName)) {
    throw new Error('INVALID_NAME');
  }
  if (!normBranch) {
    throw new Error('INVALID_BRANCH');
  }

  const payload = {
    name: trimmedName,
    branch: normBranch,
    region: regionForBranch(normBranch, resolved.region || region),
  };

  try {
    return await claimViaBackendRpc(payload);
  } catch (err) {
    const resumed = await resumeIfAlreadyBound(payload, err);
    if (resumed) return resumed;
    if (!isRpcMissing(err)) throw err;
    console.warn('bni_claim_by_name_branch missing, fallback to client match');
    try {
      return await claimViaClientMatch(payload);
    } catch (fallbackErr) {
      const resumedFallback = await resumeIfAlreadyBound(payload, fallbackErr);
      if (resumedFallback) return resumedFallback;
      throw fallbackErr;
    }
  }
}
