import { PHOTOS } from '../data/photos.js';
import { escHtml } from './html.js';

// Inner content for any avatar (circle / squircle):
//   • the name-initial as the always-present fallback
//   • a photo layer on top that covers the initial when
//     assets/photos/<file> exists. If the file is missing
//     the <img> 404s, removes itself, and the initial shows.
export function avatarInner(name, initial) {
  const fallback = `<span class="avatar-initial">${escHtml(initial)}</span>`;
  const file = PHOTOS[name];
  if (!file) return fallback;
  const src = `assets/photos/${encodeURIComponent(file)}`;
  return `${fallback}<img class="avatar-img" src="${src}" alt="" loading="lazy" onerror="this.remove()">`;
}
