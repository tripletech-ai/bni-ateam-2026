const KEY = 'bni_dinner_identity';

export function saveDinnerIdentity(person) {
  if (!person?.name) return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({
      id: person.id,
      type: person.type,
      name: person.name,
      branch: person.branch,
      region: person.region,
      profession: person.profession || '',
      have: person.have || '',
      wantMeet: person.wantMeet || '',
      bio: person.bio || '',
      photo: person.photo || '',
      lineLink: person.lineLink || '',
      invitedBy: person.invitedBy || '',
      joinIntent: person.joinIntent || '',
      at: Date.now(),
    }));
  } catch (e) {
    console.warn('saveDinnerIdentity:', e);
  }
}

export function loadDinnerIdentity() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.name || !data?.branch) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearDinnerIdentity() {
  try { sessionStorage.removeItem(KEY); }
  catch { /* ignore */ }
}

export function isDinnerLoggedIn() {
  return !!loadDinnerIdentity();
}
