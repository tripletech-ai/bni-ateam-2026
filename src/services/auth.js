import { createClient } from 'https://esm.sh/@insforge/sdk@1.4.2';
import { INSFORGE_BASE_URL, INSFORGE_ANON_KEY } from '../config/insforge.js';
import { withRetry } from '../utils/retry.js';
import { loadSession, saveSession, clearSession } from './sessionStore.js';
import { isAdminEmail, normalizeAdminEmail } from '../config/admins.js';

const PKCE_KEY = 'bni_oauth_code_verifier';

let client = null;
let clientTokenKey = null;
let anonClient = null;
let currentUser = null;
let myStatus = null;

function isJwtError(error) {
  const msg = String(error?.message || error || '').toLowerCase();
  const status = error?.status || error?.statusCode;
  return status === 401
    || /jwt expired|invalid jwt|token expired|unauthorized|invalid token|not authenticated/i.test(msg);
}

/** Public RPCs — use anon key only (avoid 401 when access token expired). */
export function getAnonClient() {
  if (!anonClient) anonClient = buildClient(null);
  return anonClient;
}

function buildClient(accessToken = null) {
  return createClient({
    baseUrl: INSFORGE_BASE_URL,
    anonKey: INSFORGE_ANON_KEY,
    isServerMode: true,
    accessToken: accessToken || undefined,
    auth: { detectOAuthCallback: false },
  });
}

function resetClient() {
  client = null;
  clientTokenKey = null;
}

function applySessionToClient(insforge, session) {
  insforge.setAccessToken(session.accessToken);
  insforge.getHttpClient().setRefreshToken(session.refreshToken);
}

export function getClient() {
  const token = loadSession()?.accessToken || null;
  const key = token || '';
  if (!client || clientTokenKey !== key) {
    client = buildClient(token);
    clientTokenKey = key;
    const stored = loadSession();
    if (stored?.refreshToken) {
      client.getHttpClient().setRefreshToken(stored.refreshToken);
    }
  }
  return client;
}

export function getCurrentUser() {
  return currentUser;
}

export function getAuthEmail() {
  const u = currentUser || loadSession()?.user;
  if (!u) return '';
  return normalizeAdminEmail(
    u.email || u.user_metadata?.email || u.userMetadata?.email || ''
  );
}

export function getMyStatus() {
  return myStatus;
}

export function isBound() {
  return myStatus?.bound === true;
}

export function isTutorialDone() {
  return myStatus?.tutorial_done === true;
}

async function loadStatus() {
  return withRetry(async () => {
    const { data, error } = await getClient().database.rpc('bni_get_my_status');
    if (error) throw error;
    myStatus = data;
    if (typeof window !== 'undefined') {
      window.BNI_MY_BRANCH = myStatus?.member?.branch || '';
    }
    return myStatus;
  }, { label: 'bni_get_my_status' });
}

function cleanOAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('insforge_code') && !url.searchParams.has('error')) return;
  url.searchParams.delete('insforge_code');
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}

function persistAuthResponse(insforge, data) {
  const session = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
  };
  if (!session.accessToken || !session.refreshToken || !session.user) {
    throw new Error('OAuth 回傳缺少 token 或 user');
  }
  saveSession(session);
  resetClient();
  applySessionToClient(getClient(), session);
  return session;
}

async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const oauthError = params.get('error');
  if (oauthError) {
    cleanOAuthParamsFromUrl();
    throw new Error(params.get('error_description') || oauthError);
  }

  const code = params.get('insforge_code');
  if (!code) return null;

  const codeVerifier = sessionStorage.getItem(PKCE_KEY);
  sessionStorage.removeItem(PKCE_KEY);
  cleanOAuthParamsFromUrl();

  if (!codeVerifier) {
    throw new Error('OAuth 驗證碼遺失，請重新登入');
  }

  const insforge = getClient();
  const { data, error } = await insforge.auth.exchangeOAuthCode(code, codeVerifier);
  if (error) throw error;
  return persistAuthResponse(insforge, data);
}

async function refreshStoredSession(insforge, refreshToken) {
  const { data, error } = await insforge.auth.refreshSession({ refreshToken });
  if (error) throw error;
  return persistAuthResponse(insforge, data);
}

async function tryRefreshSession() {
  const stored = loadSession();
  if (!stored?.refreshToken) return false;
  try {
    const insforge = buildClient(null);
    await refreshStoredSession(insforge, stored.refreshToken);
    const { data } = await getClient().auth.getCurrentUser();
    if (data?.user) currentUser = data.user;
    try { await loadStatus(); } catch { /* keep stale status */ }
    return true;
  } catch (e) {
    console.warn('tryRefreshSession:', e.message);
    return false;
  }
}

/** Retry once after refreshing access token (post / mark / profile). */
export async function withAuthRetry(fn) {
  try {
    return await fn();
  } catch (e) {
    if (!isJwtError(e)) throw e;
    if (await tryRefreshSession()) return await fn();
    throw e;
  }
}

export async function ensureSessionFresh() {
  const stored = loadSession();
  if (!stored?.accessToken) return false;
  try {
    const { data, error } = await getClient().auth.getCurrentUser();
    if (data?.user) {
      currentUser = data.user;
      return true;
    }
    if (isJwtError(error) || error) {
      return tryRefreshSession();
    }
  } catch (e) {
    if (isJwtError(e)) return tryRefreshSession();
  }
  return !!currentUser;
}

async function resolveCurrentUser() {
  const insforge = getClient();
  let stored = loadSession();
  if (!stored) return null;

  applySessionToClient(insforge, stored);

  let { data, error } = await insforge.auth.getCurrentUser();
  if (data?.user) return data.user;

  if (!stored.refreshToken) {
    clearSession();
    resetClient();
    if (error) console.warn('getCurrentUser:', error.message);
    return null;
  }

  try {
    stored = await refreshStoredSession(insforge, stored.refreshToken);
    ({ data, error } = await insforge.auth.getCurrentUser());
    if (data?.user) return data.user;
  } catch (e) {
    console.warn('session refresh failed:', e.message);
  }

  clearSession();
  resetClient();
  return null;
}

export async function initAuth() {
  try {
    await handleOAuthCallback();
  } catch (e) {
    console.warn('OAuth callback:', e.message);
    clearSession();
    resetClient();
  }

  currentUser = await resolveCurrentUser();

  if (currentUser) {
    try {
      await loadStatus();
    } catch (e) {
      console.warn('bni_get_my_status:', e.message);
      myStatus = { authenticated: true, bound: false, tutorial_done: false };
    }
  } else {
    myStatus = { authenticated: false };
  }

  return { user: currentUser, status: myStatus };
}

export async function signInWithGoogle() {
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { data, error } = await getClient().auth.signInWithOAuth('google', {
    redirectTo,
    additionalParams: { prompt: 'select_account' },
    skipBrowserRedirect: true,
  });
  if (error) throw error;
  if (!data?.url || !data?.codeVerifier) {
    throw new Error('無法啟動 Google 登入');
  }
  sessionStorage.setItem(PKCE_KEY, data.codeVerifier);
  window.location.href = data.url;
}

export async function signOut() {
  try {
    await getClient().auth.signOut();
  } catch {
    /* logout API optional when using mobile tokens */
  }
  clearSession();
  resetClient();
  currentUser = null;
  myStatus = { authenticated: false };
  if (typeof window !== 'undefined') window.BNI_MY_BRANCH = '';
}

export async function refreshStatus() {
  if (!currentUser) return myStatus;
  return loadStatus();
}

export async function bindExistingMember(memberId) {
  const { data, error } = await getClient().database.rpc('bni_bind_existing_member', {
    p_member_id: memberId,
  });
  if (error) throw error;
  await refreshStatus();
  return data;
}

export async function registerNewMember(payload) {
  const base = {
    p_name: payload.name,
    p_branch: payload.branch,
    p_region: payload.region || 'zhongshan',
    p_profession: payload.profession || '',
    p_have: payload.have || '',
    p_want_meet: payload.wantMeet || '',
    p_want_referral: payload.wantReferral || '',
    p_line_id: payload.lineId || '',
    p_line_link: payload.lineLink || '',
    p_tags: payload.tags || [],
  };
  const industries = payload.industries || [];

  let { data, error } = await getClient().database.rpc('bni_register_new_member', {
    ...base,
    p_industries: industries,
  });

  // 後端若尚未部署含 p_industries 的新版 RPC，改用舊簽名再補寫產業
  if (error && isRpcMissing(error)) {
    ({ data, error } = await getClient().database.rpc('bni_register_new_member', base));
    if (!error && industries.length) {
      try {
        await getClient().database.rpc('bni_update_my_profile', {
          p_profession: base.p_profession,
          p_have: base.p_have,
          p_want_meet: base.p_want_meet,
          p_want_referral: base.p_want_referral,
          p_line_id: base.p_line_id,
          p_line_link: base.p_line_link,
          p_bio: '',
          p_card_link: '',
          p_industries: industries,
        });
      } catch (e) {
        console.warn('post-register industries update:', e.message);
      }
    }
  }

  if (error) {
    if (isRpcMissing(error)) {
      const e = new Error('REGISTER_RPC_MISSING');
      e.cause = error;
      throw e;
    }
    throw error;
  }
  await refreshStatus();
  return data;
}

export async function completeTutorial() {
  const { error } = await getClient().database.rpc('bni_complete_tutorial');
  if (error) throw error;
  await refreshStatus();
}

export async function checkIsAdmin() {
  if (isAdminEmail(getAuthEmail())) return true;

  try {
    const { data, error } = await getClient().database.rpc('bni_is_admin');
    if (error) {
      console.warn('bni_is_admin RPC:', error.message);
      return false;
    }
    return data === true;
  } catch (e) {
    console.warn('checkIsAdmin:', e.message);
    return false;
  }
}

export function checkIsAdminSync() {
  return isAdminEmail(getAuthEmail());
}

export async function fetchPublicStats() {
  return withRetry(async () => {
    const { data, error } = await getAnonClient().database.rpc('bni_get_public_stats');
    if (error) throw error;
    return data;
  }, { label: 'fetchPublicStats' });
}

export async function fetchEventPulse() {
  return withRetry(async () => {
    const { data, error } = await getClient().database.rpc('bni_get_event_pulse');
    if (error) throw error;
    return data;
  }, { label: 'fetchEventPulse' });
}

export async function recordEventPulse() {
  const { data, error } = await getClient().database.rpc('bni_record_event_pulse');
  if (error) throw error;
  return data;
}

export async function updateMyProfile(payload) {
  const { data, error } = await getClient().database.rpc('bni_update_my_profile', {
    p_profession: payload.profession || '',
    p_have: payload.have || '',
    p_want_meet: payload.wantMeet || '',
    p_want_referral: payload.wantReferral || '',
    p_line_id: payload.lineId || '',
    p_line_link: payload.lineLink || '',
    p_bio: payload.bio || '',
    p_card_link: payload.cardLink || '',
    p_industries: payload.industries || [],
  });
  if (error) throw error;
  myStatus = data;
  return myStatus;
}

export async function recordConnectionMark(toMemberId, markType) {
  const { data, error } = await getClient().database.rpc('bni_record_connection_mark', {
    p_to_member_id: toMemberId,
    p_mark_type: markType,
  });
  if (error) throw error;
  return data;
}

export async function removeConnectionMark(toMemberId, markType) {
  const { data, error } = await getClient().database.rpc('bni_remove_connection_mark', {
    p_to_member_id: toMemberId,
    p_mark_type: markType,
  });
  if (error) throw error;
  return data;
}

export async function fetchIncomingMarks(unseenOnly = true) {
  const { data, error } = await getClient().database.rpc('bni_get_incoming_marks', {
    p_unseen_only: unseenOnly,
  });
  if (error) {
    const msg = error.message || '';
    if (/could not find the function|PGRST202|404/i.test(msg)) {
      const e = new Error(msg);
      e.code = 'RPC_NOT_DEPLOYED';
      throw e;
    }
    throw error;
  }
  return Array.isArray(data) ? data : [];
}

export async function ackIncomingMarks(markIds = null) {
  const { data, error } = await getClient().database.rpc('bni_ack_incoming_marks', {
    p_mark_ids: markIds,
  });
  if (error) throw error;
  return data;
}

export async function fetchCardBio(cardUrl) {
  const res = await fetch('/api/fetch-card-bio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: cardUrl }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.message || '無法讀取名片');
  return data.bio;
}

export async function fetchTutorialSteps() {
  return withRetry(async () => {
    const { data, error } = await getClient().database
      .from('bni_tutorial_steps')
      .select('step_order, step_key, title_zh, title_en, body_zh, body_en, tip_zh, tip_en')
      .eq('active', true)
      .order('step_order', { ascending: true });
    if (error) throw error;
    return data || [];
  }, { label: 'fetchTutorialSteps' });
}

export async function fetchAllMembers({ includeInactive = false } = {}) {
  return withRetry(async () => {
    let query = getClient().database
      .from('bni_members')
      .select('*')
      .order('roster_id', { ascending: true })
      .limit(1000);
    if (!includeInactive) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }, { label: 'fetchAllMembers' });
}

export async function fetchAdminDashboard() {
  const { data, error } = await getClient().database.rpc('bni_admin_dashboard');
  if (error) throw error;
  return data;
}

export async function adminUnbindMember(memberId) {
  const { data, error } = await getClient().database.rpc('bni_admin_unbind_member', {
    p_member_id: memberId,
  });
  if (error) throw error;
  return data;
}

export async function adminSetMemberActive(memberId, active) {
  const { data, error } = await getClient().database.rpc('bni_admin_set_member_active', {
    p_member_id: memberId,
    p_active: active,
  });
  if (error) throw error;
  return data;
}

export async function searchUnboundMembers(keyword) {
  const q = keyword.trim();
  if (q.length < 1) return [];
  return withRetry(async () => {
    const { data, error } = await getClient().database.rpc('bni_search_unbound_members', {
      p_query: q,
      p_limit: 20,
    });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }, { label: 'searchUnboundMembers' });
}

export async function adminUpdateMember(id, patch) {
  const { data, error } = await getClient().database
    .from('bni_members')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminCreateMember(row) {
  const { data, error } = await getClient().database
    .from('bni_members')
    .insert([row])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchAdminBranches() {
  const { data, error } = await getClient().database.rpc('bni_admin_list_branches');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function adminMergeBranches(fromBranch, toBranch) {
  const { data, error } = await getClient().database.rpc('bni_admin_merge_branches', {
    p_from: fromBranch,
    p_to: toBranch,
  });
  if (error) throw error;
  return data;
}

function isRpcMissing(error) {
  const msg = error?.message || '';
  return /could not find the function|PGRST202|404/i.test(msg);
}

export async function fetchLeaderboard(limit = 30, mode = 'mutual') {
  const { data, error } = await getAnonClient().database.rpc('bni_get_leaderboard', {
    p_limit: limit,
    p_mode: mode,
  });
  if (error) {
    if (isRpcMissing(error)) return [];
    throw error;
  }
  return Array.isArray(data) ? data : [];
}

export async function fetchLiveSettings() {
  const { data, error } = await getAnonClient().database.rpc('bni_get_live_settings');
  if (error) {
    if (isRpcMissing(error)) {
      return { leaderboard_modes: ['mutual', 'received_one'] };
    }
    throw error;
  }
  return data || { leaderboard_modes: ['mutual', 'received_one'] };
}

export async function adminSetLeaderboardModes(modes) {
  const { data, error } = await getClient().database.rpc('bni_admin_set_leaderboard_modes', {
    p_modes: modes,
  });
  if (error) throw error;
  return data;
}

export async function fetchMyMutualStats() {
  const { data, error } = await getClient().database.rpc('bni_get_my_mutual_stats');
  if (error) {
    if (isRpcMissing(error)) return null;
    throw error;
  }
  return data;
}

export async function fetchFeed(limit = 50, before = null) {
  const { data, error } = await getAnonClient().database.rpc('bni_get_feed', {
    p_limit: limit,
    p_before: before,
  });
  if (error) {
    if (isRpcMissing(error)) return [];
    throw error;
  }
  return Array.isArray(data) ? data : [];
}

export async function postFeedMessage(content) {
  return withAuthRetry(async () => {
    const { data, error } = await getClient().database.rpc('bni_post_feed_message', {
      p_content: content,
    });
    if (error) throw error;
    return data;
  });
}

export async function adminDeleteFeedMessage(feedId) {
  const { data, error } = await getClient().database.rpc('bni_admin_delete_feed', {
    p_feed_id: feedId,
  });
  if (error) throw error;
  return data;
}

export async function recordPresence() {
  const { data, error } = await getClient().database.rpc('bni_record_presence');
  if (error) {
    if (isRpcMissing(error)) return null;
    throw error;
  }
  return data;
}
