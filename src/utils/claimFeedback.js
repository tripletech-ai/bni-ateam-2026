import { getMyStatus } from '../services/auth.js';
import { profileBackendEmpty, profileNeedsEnrichment } from './profileHints.js';
import { t } from '../i18n/translations.js';

/** 統一 bind / register / RPC 回傳格式 */
export function normalizeClaimResult(result) {
  if (!result || typeof result !== 'object') return {};
  if (result.matched !== undefined || result.from_roster !== undefined) return result;
  if (result.duplicate !== undefined) {
    return { matched: true, from_roster: true, duplicate: !!result.duplicate };
  }
  return { matched: false, from_roster: false, duplicate: false };
}

/**
 * 認領成功後依「是否匹配名單、資料是否完整」回傳使用者提示
 */
export function describeClaimOutcome(rawResult) {
  const result = normalizeClaimResult(rawResult);
  const member = getMyStatus()?.member;
  const empty = profileBackendEmpty(member);
  const partial = !empty && profileNeedsEnrichment(member);
  const { matched, from_roster: fromRoster, duplicate } = result;

  if (duplicate) {
    if (empty) return t('claim_success_dup_empty');
    if (partial) return t('claim_success_dup_partial');
    return t('claim_success_dup_filled');
  }

  if (matched && fromRoster) {
    if (empty) return t('claim_success_roster_empty');
    if (partial) return t('claim_success_roster_partial');
    return t('claim_success_roster_filled');
  }

  if (matched) {
    if (empty) return t('claim_success_matched_empty');
    if (partial) return t('claim_success_matched_partial');
    return t('claim_success_matched_filled');
  }

  if (empty) return t('claim_success_new_empty');
  if (partial) return t('claim_success_new_partial');
  return t('claim_success_new_filled');
}
