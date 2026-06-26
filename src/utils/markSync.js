import { recordConnectionMark, removeConnectionMark } from '../services/auth.js';
import { getCurrentUser } from '../services/auth.js';

export async function syncMarkToServer(member, type, active) {
  if (!getCurrentUser() || !member?.dbId) return;
  try {
    if (active) await recordConnectionMark(member.dbId, type);
    else await removeConnectionMark(member.dbId, type);
  } catch (e) {
    console.warn('syncMarkToServer:', e.message);
  }
}
