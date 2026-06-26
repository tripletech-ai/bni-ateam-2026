import { normalizeBranchName, getRegionForBranch } from '../data/branches.js';
import { bindExistingMember, registerNewMember } from '../services/auth.js';

const PENDING_CLAIM_KEY = 'bni_pending_claim';

export function isValidChineseName(name) {
  const s = String(name || '').trim();
  if (s.length < 2 || s.length > 20) return false;
  return /[一-鿿㐀-䶿]/.test(s);
}

export function findMembersByNameBranch(name, branch) {
  const n = String(name || '').trim();
  const norm = normalizeBranchName(branch);
  if (!n || !norm) return [];
  return (window.BNI_MEMBERS || []).filter(m =>
    m.name.trim() === n && normalizeBranchName(m.branch) === norm,
  );
}

export function savePendingClaim({ name, branch, region = '' }) {
  sessionStorage.setItem(PENDING_CLAIM_KEY, JSON.stringify({
    name: String(name || '').trim(),
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

/** 依分會 + 姓名綁定既有名單，或建立新檔案 */
export async function claimByNameBranch({ name, branch, region = '' }) {
  const trimmedName = String(name || '').trim();
  const normBranch = normalizeRegisterBranch(branch);
  if (!isValidChineseName(trimmedName)) {
    throw new Error('INVALID_NAME');
  }
  if (!normBranch) {
    throw new Error('INVALID_BRANCH');
  }

  const matches = findMembersByNameBranch(trimmedName, normBranch);
  const unclaimed = matches.filter(m => m.dbId && !m.authUserId);

  if (unclaimed.length === 1) {
    return bindExistingMember(unclaimed[0].dbId);
  }

  if (matches.length >= 1 && unclaimed.length === 0) {
    throw new Error('ALREADY_BOUND');
  }
  if (unclaimed.length > 1) {
    throw new Error('MULTIPLE_MATCHES');
  }

  return registerNewMember({
    name: trimmedName,
    branch: normBranch,
    region: regionForBranch(normBranch, region),
    profession: '',
    have: '',
    wantMeet: '',
    wantReferral: '',
    industries: [],
  });
}
