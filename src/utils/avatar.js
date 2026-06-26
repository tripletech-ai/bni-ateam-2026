import { PHOTOS } from '../data/photos.js';
import { escHtml } from './html.js';

/** Root-absolute URL — avoids 404 when hash route or pathname shifts */
export function photoUrl(file) {
  if (!file) return '';
  return `/assets/photos/${encodeURIComponent(file)}`;
}

export function getPhotoFile(name) {
  return PHOTOS[name] || null;
}

export function hasPhoto(name) {
  return !!getPhotoFile(name);
}

function nameInitial(name) {
  return (name || '').match(/[一-鿿㐀-䶿]/g)?.slice(-1)[0] || '?';
}

// Inner content for any avatar (circle / squircle):
//   • the name-initial as the always-present fallback
//   • a photo layer on top that covers the initial when
//     assets/photos/<file> exists. If the file is missing
//     the <img> 404s, removes itself, and the initial shows.
export function avatarInner(name, initial) {
  const letter = initial || nameInitial(name);
  const fallback = `<span class="avatar-initial">${escHtml(letter)}</span>`;
  const file = getPhotoFile(name);
  if (!file) return fallback;
  const src = photoUrl(file);
  return `${fallback}<img class="avatar-img" src="${src}" alt="" loading="lazy" onerror="this.remove()">`;
}

/** Developer / contributor card photo block — 僅在有照片檔時顯示 */
export function developerPhotoHTML(name, photoFile) {
  const file = getPhotoFile(name) || photoFile;
  if (!file) return '';
  const initial = nameInitial(name);
  const src = photoUrl(file);
  return `<div class="developer-photo">
    <img src="${src}" alt="" loading="lazy"
      onerror="this.style.display='none';this.parentElement.classList.add('no-photo')">
    <span class="developer-photo-fallback" aria-hidden="true">${escHtml(initial)}</span>
  </div>`;
}

/** Hero / card panel photo (e.g. 楊董) */
export function heroPhotoHTML(name, { className = 'yang-photo-img' } = {}) {
  const file = getPhotoFile(name);
  if (!file) return '';
  const src = photoUrl(file);
  return `<img class="${className}" src="${src}" alt="${escHtml(name)}" loading="lazy" onerror="this.remove()">`;
}
