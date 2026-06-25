import { createClient } from 'https://esm.sh/@insforge/sdk@latest';
import { INSFORGE_BASE_URL, INSFORGE_ANON_KEY } from '../config/insforge.js';

let client = null;
let currentUser = null;
let myStatus = null;

export function getClient() {
  if (!client) {
    client = createClient({ baseUrl: INSFORGE_BASE_URL, anonKey: INSFORGE_ANON_KEY });
  }
  return client;
}

export function getCurrentUser() {
  return currentUser;
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
  const { data, error } = await getClient().database.rpc('bni_get_my_status');
  if (error) throw error;
  myStatus = data;
  return myStatus;
}

export async function initAuth() {
  const insforge = getClient();
  const { data, error } = await insforge.auth.getCurrentUser();
  if (error) console.warn('getCurrentUser:', error.message);
  currentUser = data?.user || null;
  if (currentUser) {
    try { await loadStatus(); } catch (e) {
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
  const { error } = await getClient().auth.signInWithOAuth('google', {
    redirectTo,
    additionalParams: { prompt: 'select_account' },
  });
  if (error) throw error;
}

export async function signOut() {
  await getClient().auth.signOut();
  currentUser = null;
  myStatus = { authenticated: false };
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
  const { data, error } = await getClient().database.rpc('bni_register_new_member', {
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
  });
  if (error) throw error;
  await refreshStatus();
  return data;
}

export async function completeTutorial() {
  const { error } = await getClient().database.rpc('bni_complete_tutorial');
  if (error) throw error;
  await refreshStatus();
}

export async function checkIsAdmin() {
  try {
    const { data, error } = await getClient().database.rpc('bni_is_admin');
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

export async function fetchAllMembers({ includeInactive = false } = {}) {
  let query = getClient().database
    .from('bni_members')
    .select('*')
    .order('roster_id', { ascending: true })
    .limit(1000);
  if (!includeInactive) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
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

export async function searchUnboundMembers(keyword) {
  const q = keyword.trim();
  if (q.length < 1) return [];
  const { data, error } = await getClient().database
    .from('bni_members')
    .select('*')
    .eq('active', true)
    .is('auth_user_id', null)
    .or(`name.ilike.%${q}%,branch.ilike.%${q}%`)
    .order('name', { ascending: true })
    .limit(20);
  if (error) throw error;
  return data || [];
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
